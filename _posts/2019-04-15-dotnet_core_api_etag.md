---
layout: post
title:  "ASP.NET Core實作API的ETag快取機制"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp API Cache
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在做網頁開發時，常針對靜態資源設定快取，在HTTP Cache有多種不同的方式設定，想要了解更多可以參考[這篇](https://blog.techbridge.cc/2017/06/17/cache-introduction/)文章，大致上快取方式可以分為兩類: **依據快取壽命** 、 **依據變更時間或標籤**

針對靜態檔案的快取這樣是沒有問題的，大部分的Web Server可以直接設定快取參數並依照內容產出ETag，而在API上若直接使用Web Server產生的Cache方法，將會導致API結果無法顯示即時結果，或者API的結果是依照呼叫的使用者身分決定等等一系列的問題。

而在這篇文章中將針對需要有即時變化、無使用者身分問題的API加入ETag快取機制。

<!--more-->

## 基本原理

HTTP ETag的快取機制可以參考[這篇](https://zh.wikipedia.org/wiki/HTTP_ETag)文章中的說明。
簡而言之，當伺服器回應內容時必須附加`ETag: "xxxxxx"`標頭，其中`"xxxxxx"`的值為開發者或Web Server定義的一個標誌符， **一旦內容變化產出將不同** ，當下一次請求同一個URL時將會附加`If-None-Match: "xxxxxx"`標頭，將上一次自同樣URL獲取的ETag一併送出給伺服器，當伺服器收到這個標頭將檢驗該URL的資源目前的ETag與使用者送過來的ETag是否一樣，如果一樣則直接回應304狀態碼，如果不同則當作第一次請求，並附帶ETag。

完整的流程圖可以參考下圖(來源: [https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#etag](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#etag))。

![Google Develop](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/images/http-cache-control.png?hl=zh-tw%EF%BC%89)

## 實作

由於ETag必須要能夠識別出內容有異動，但在API結果為資料庫查詢結果的情況下，要得知Response內容的變化就需要查詢後才知道之後有異動，但是查詢後再計算ETag要等待資料庫查詢時間，這並不是我希望的，況且都已經查詢完結果了不如直接把結果送回客戶端。

雖說查詢完後計算出ETag後回應也是可行的，可以節省`Content Download`的時間，但在`TTFB`時間上沒有差別。

在Restful API中Post、Put、Delete操作將會影響到內容，所以針對對URL的這三個操作發生時使用`DateTime.Now.Ticks`作為操作資源的ETag(這裡沒有用`Last-Modified`只是因為不想處理時間格式)。
也就是在對資源進行異動時才變更ETag。

> 這篇文章不考慮在多個執行個體加上附載平衡的情況下，跨個體間ETag同步的問題。

### 案例

這篇文章中的示範案例中定義了以下兩隻API:

```
GET /api/News   最新消息列表
POST /api/News 建立最新消息內容
```

本文將針對這兩隻API進行ETag的產生與刷新做範例。

### UpdateETagAttribute建構

我們必須要另外去定義一個UpdateETagAttribute，用來在Controller Action上標明當成功執行API後要更新那些API的ETag，如新增最新消息API成功執行後應該要更新最新消息列表的API。

```csharp
// 限制此Attribute僅可使用於Method且可重複定義，因為可能同一支API會影響多個API結果
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class UpdateETagAttribute : Attribute {
    // Action Name
    public string ActionName { get; set; }

    // Controller Name
    public string ControllerName { get; set; }

    // 沒指定controllerName則表示為相同的controller
    public UpdateETagAttribute(string actionName) {
        ActionName = actionName;
    }

    // 明確的指定controller與action
    public UpdateETagAttribute(string controllerName, string actionName) {
        ControllerName = controllerName;
        ActionName = actionName;
    }
}
```

### ETagBaseController建構

由於我們只要針對API進行ETag的快取設計，且Controller內部已經提供了`OnActionExecuting`、`OnActionExecuted`兩個可複寫方法，分別提供Action執行前與執行後的處理，而我們在這兩個方法分別處理快取判斷與ETag產生的作業。首先建立一個空的ETagBaseController，作為底層的類別。

```csharp
public class ETagBaseController : Controller {
}
```

首先我們要建立一個字典用來儲存各Action的ETag狀態，在本文章中簡單的用一個靜態變數儲存就好。但由於這個字店可能同時有多個併發存取，所以我們必須使用`ConcurrentDictionary`。

```csharp
// 暫存各Action的ETag
static ConcurrentDictionary<string, string> eTags = new ConcurrentDictionary<string, string>();
```

接下來我們要定義一個ETag產生的形式，這邊簡單的直接使用TimeTicks作為ETag，而前面的`W/`表示這個ETag弱校驗的ETag匹配要求兩個資源在語義上相等，資源不需要每個byte相同。

```csharp
/// <summary>
/// 產生ETag標頭的值 
/// </summary>
/// <returns>ETag</returns>
private string NewETag() {
    return $"W//\"{DateTime.Now.Ticks}\"";
}
```

定義好ETag的儲存以及產生的格式後，接下來要定義每個Action的Key。從前面提到的Controller中的`OnActionExecuting`、`OnActionExecuted`方法中的`ActionExecutingContext`與`ActionExecutedContext`接帶有`RouteValues`資訊，可以從中得知目前的ControllerName以及ActionName，這邊直接透過串接這兩個值的方式產生Key。

```csharp
/// <summary>
/// 取得調用的Action內容並產生唯一Key
/// </summary>
/// <returns>唯一Key</returns>
private string GetActionKey(ActionDescriptor actionDescriptor) {
    return actionDescriptor.RouteValues["controller"] + "." + actionDescriptor.RouteValues["action"]; 
}
```

到此處我們已經寫好ETag的儲存與產生，現在我們要準備開始對Action執行的前後補充ETag的行為，首先處理`OnActionExecuting`的部分，這個方法在Action執行前將會執行，我們將在這邊進行客戶端的ETag的檢查，而這個查詢只需要在`GET`方法且客戶端有時`If-None-Match`標頭時執行即可。

運行時只是檢查`If-None-Match`的內容與對應Action的ETag相符，如果相符表示這段時間內並沒有相關操作影響內容，則直接返回302狀態。反之則繼續執行。

```csharp
/// <summary>
/// Action執行前
/// </summary>
public override void OnActionExecuting(ActionExecutingContext context) {
    if (HttpMethods.IsGet(Request.Method) && // GET
        Request.Headers.ContainsKey("If-None-Match") && // 用戶曾經對目前URL做請求且有Cache
        context.ActionDescriptor.RouteValues.ContainsKey("controller") && // 取得ControllerName
        context.ActionDescriptor.RouteValues.ContainsKey("action") && // 取得ActionName
        eTags.ContainsKey(GetActionKey(context.ActionDescriptor)) && // 本地是否有此URL的ETag
        eTags[GetActionKey(context.ActionDescriptor)] == Request.Headers["If-None-Match"][0]) { //是否匹配 
        // 若無變更則直接回應304
        var NotModifiedResult = new StatusCodeResult((int)HttpStatusCode.NotModified);
        context.Result = NotModifiedResult;
        return;
    }
    base.OnActionExecuting(context);
}
```

在Action執行後，區分兩塊執行，分別為 **Get方法的後續處理** 以及 **非Get方法的後續處理**，分別如下:

1. Get方法的後續處理: 對目前執行的Action產生新的ETag，並且在回應標頭補充ETag標頭。
2. 非Get方法的後續處理: 如果成功運行Action，則表示可能有其他Action有異動，這時候必須要取得目前執行的MethodInfo，透過MethodInfo取得方法的`UpdateETagAttribute`標籤，得知影響的API，更新它們的ETag。

```csharp
public override void OnActionExecuted(ActionExecutedContext context) {
    if (HttpMethods.IsGet(Request.Method)) { // GET
        if (context.ActionDescriptor.RouteValues.ContainsKey("controller") && // 取得ControllerName
            context.ActionDescriptor.RouteValues.ContainsKey("action") && // 取得ActionName
            !eTags.ContainsKey(GetActionKey(context.ActionDescriptor))) { // 如果不存在ETag
            eTags[GetActionKey(context.ActionDescriptor)] = NewETag(); // 產生新的Key
        }
        // Header補充ETag
        Response.Headers.TryAdd("ETag", eTags[GetActionKey(context.ActionDescriptor)]);
    } else if (
        context.Exception == null && // 成功執行非GET的方法
        context.ActionDescriptor.RouteValues.ContainsKey("controller") && // 取得ControllerName
        context.ActionDescriptor.RouteValues.ContainsKey("action") &&// 取得ActionName
        context.ActionDescriptor is ControllerActionDescriptor controllerAction) {
        // 取得Attributes
        var updateAttributes = controllerAction.MethodInfo.GetCustomAttributes<UpdateETagAttribute>();
        foreach (var attr in updateAttributes) { // 更新Cache
            if (attr.ControllerName == null) { // 相同Controller
                eTags[context.ActionDescriptor.RouteValues["controller"] + "." + attr.ActionName] = NewETag();
            } else {
                eTags[attr.ActionName] = NewETag();
            }
        }
    }
    base.OnActionExecuted(context);
}
```

### 使用ETagBaseController

經過上面繁瑣的撰寫，現在已經完成一個基本的ETag機制，接下來著手案例中要求的API。
這邊先簡單的使用一個List模擬資料表，並且在List方法中加入一秒的延遲模擬查詢，之後可以用來比較ETag的作用。另外定義一個Create方法，且該方法可以更新List API的ETag。

```csharp
[Route("api/[controller]")]
[ApiController]
public class NewsController : ETagBaseController {
    // 測試用
    static List<News> list = new List<News>(
        new News[] {
            new News() {
                Id = Guid.NewGuid(),
                Title = "測試用",
                Content = "內容"
            }
        });

    [HttpGet]
    public async Task<IEnumerable<News>> List() {
        // 模擬查詢的延遲
        Thread.Sleep(1 * 1000);
        return list;
    }

    [UpdateETag(nameof(List))] // 成功執行後更新List的Cache
    [HttpPost]
    public async Task<News> Create([FromBody]News news) {
        list.Add(news);
        return news;
    }
}
```

定義好API後我們可以來執行這兩隻API，透過Chrome的開發工具可以知道整個過程耗時。

#### 第一次對List Request

初次執行API因為沒有ETag所以執行Action的行為。

![Imgur](https://i.imgur.com/n2EOLXG.png)

#### 第二次對List Request

再次呼叫時因為ETag沒變化所以直接使用快取。

![Imgur](https://i.imgur.com/75vIwT8.png)

#### 建立最新消息

加入一則最新消息，同時自動刷新了List的ETag。

![Imgur](https://i.imgur.com/TGkwMff.png)

#### 再次呼叫List API

ETag刷新後重新執行Action的行為。

![Imgur](https://i.imgur.com/rIuzyoT.png)