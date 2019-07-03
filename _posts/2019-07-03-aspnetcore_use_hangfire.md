---
layout: post
title:  "ASP.NET Core使用Hangfire做排程"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp Hangfire
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

Hangfire是一個支援背景執行、排程而且提供簡易Dashboard的套件，透過程式定義排程時間與內容，另外也支援FireAndForget等功能；本文章將講解在一個ASP.NET Core專案安裝並使用Hangfire。

<!--more-->

## 安裝套件

使用套件管理器安裝`Hangfire.AspNetCore`或在專案執行以下指令:

```shell
dotnet add package Hangfire.AspNetCore
```

安裝後在本範例中使用MemoryStorage做示範，若需要使用資料庫做持久化可自行在NuGet尋找相應的Storage套件。在本範例中安裝`Hangfire.MemoryStorage`套件使用InMemory的方式做示範。

```shell
dotnet add package Hangfire.MemoryStorage
```

若希望可以輸出自訂的運行資訊(像是Console)，可以追加`Hangfire.Console`套件。

```shell
dotnet add package Hangfire.Console
```

## 加入DI

在`Startup.ConfigureServices`方法中加入以下段落:

```csharp
services.AddHangfire(config => {
    // 設定使用MemoryStorage
    config.UseMemoryStorage();
    // 支援Console(選用)
    config.UseConsole();
});
```

## 加入Middleware

在`Startup.Configure`方法中加入以下段落:

```csharp
// 加入Hangfire伺服器
app.UseHangfireServer();

// 加入Hangfire控制面板
app.UseHangfireDashboard(
    pathMatch: "/hangfire",
    options: new DashboardOptions() { // 使用自訂的認證過濾器
        Authorization = new[] { new MyAuthorizeFilter() }
    }
);
```

接下來建立自訂的認證過濾類`MyAuthorizeFilter`。

```csharp
public class MyAuthorizeFilter : IDashboardAuthorizationFilter {
    public MyAuthorizeFilter() { }

    public bool Authorize([NotNull] DashboardContext context) {
        return true; // 任何人都可以直接觀看
    }
}
```

到目前為止執行專案後瀏覽`/hangfire`就可以看到如下的控制面板。

![Imgur](https://i.imgur.com/2wAZZlq.png)

## Dashboard的驗證

通常控制面板並不希望可以讓所有人可以檢視與控制，所以我們在這個步驟要修改上面自訂的過濾類`MyAuthorizeFilter`，用以限制存取對象。

在本範例中我們使用簡單的Session作為驗證手段，在實作前我們先安裝`Microsoft.AspNetCore.Session`套件加入Session支援。

### 加入Session支援

```shell
dotnet add package Microsoft.AspNetCore.Session
```

之後在`Startup.ConfigureServices`方法中加入以下段落:

```csharp
services.AddSession();
```

並且也在`Startup.Configure`方法中加入以下段落:

```csharp
app.UseSession(); // 必須要在UseHangfireDashboard之前
```

### Session認證

建立一個MVC Controller並提供一個方法授予認證，這個簡單的範例直接使用GET方法且不做任何資料驗證的方式，設定Session後直接導引至`/hangfire`。

```csharp
[Route("[controller]")]
public class UserController : Controller {
    [HttpGet]
    public IActionResult Get() {
        // 寫入使用者ID
        HttpContext.Session.Set("userId", Encoding.UTF8.GetBytes("tester"));
        // 導向至控制面板
        return Redirect("/hangfire");
    }
}
```

### Session驗證

上面步驟已經進行Session的認證，現在我們要修改`MyAuthorizeFilter`類別，讓驗證的方式讀取Session的項目作為依據。

```csharp
public class MyAuthorizeFilter : IDashboardAuthorizationFilter {
    public MyAuthorizeFilter() { }
    public bool Authorize([NotNull] DashboardContext context) {
        return context.GetHttpContext().Session // 取得HttpContext中的Session
            .TryGetValue("userId", out byte[] userIdBytes) && // 嘗試取得userId的值比對，是tester才允許進入
            Encoding.UTF8.GetString(userIdBytes) == "tester";
    }
}
```

### 效果驗證

現在在瀏覽器直接瀏覽`/hangfire`將會得到一個401的狀態。

![Imgur](https://i.imgur.com/Sy8lHmD.png)

接下來透過剛才設定的建議認證路徑`/user`導引至`/hangfire`過程中授予Session驗證即可正常的瀏覽。

![Imgur](https://i.imgur.com/1h26Qkj.png)

## 加入定期工作

接下來嘗試加入一個定時執行的任務，由於這個操作必須要使用到`RecurringJobManager`，所以我們在`Startup.ConfigureServices`方法中加入以下段落，之後要加入排程任務透過DI取得這個物件:

```csharp
services.AddSingleton(s => {
   return new RecurringJobManager();
});
```

建立一個簡單的類別並帶有`SayHello`靜態方法作為排程工作內容。

```csharp
public class MyJob {
    public static void SayHello() {
        Console.WriteLine("Hello!");
    }
}
```

建立一個簡單的API如下:

```csharp
[HttpGet("AddJob")]
public void AddNewJob(
    [FromServices]RecurringJobManager jobManager) {
    // 每分鐘執行SayHello
    jobManager.AddOrUpdate(DateTime.Now.Ticks.ToString(), () => MyJob.SayHello(), Cron.Minutely());
}
```

調用該API後即可在控制面板看到這個定期工作。

![Imgur](https://i.imgur.com/pPWT951.png)

在.NET Core應用程式的Console窗口中可以看到上面工作內容的輸出。

![Imgur](https://i.imgur.com/2Is2cZW.png)

在控制面板的`工作`是可以看到運行完成的項目與資訊。

![Imgur](https://i.imgur.com/ZWtTep7.png)

## 工作中輸出資訊

上面範例是將內容Console.Write到視窗，但在控制面板是無法看到的，若想要觀看輸出內容則需要安裝前面有稍微提到的`Hangfire.Console`套件，安裝套件後可以使用如下方式將內容輸出到控制面板中觀看。

我們將`SayHello`方法修改如下:

```csharp
public static void SayHello(PerformContext pcontext) {
    pcontext.WriteLine("Hello!");
}
```

另外將加入工作的部分改為這樣:

```csharp
jobManager.AddOrUpdate(c, () => MyJob.SayHello(null), Cron.Minutely()); // null部分Hangfire將自動補上
```

如此在控制面板中將可以看到以下結果。

![Imgur](https://i.imgur.com/ag0mwHi.png)

> `Hangfire.Console`套件除了可以寫出訊息外，也可以顯示進度條，詳細使用可以參考這個套件的[README](https://github.com/pieceofsummer/Hangfire.Console#progress-bars)。