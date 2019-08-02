---
layout: post
title:  "ASP.NET Core實作API的ETag快取機制搭配使用EF"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp API Cache
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

[前篇文章](http://xpy.gofa.cloud/2019/04/15/dotnet_core_api_etag/)有示範簡單的在ASP.NET Core API中時做ETag快取機制，但手動綁定個別API是較麻煩的，
所以本篇將使用EntityFramework Core的ChangeTracker獲取調用API異動的類型，對個別類型賦予個別ETag雜湊，而Web API回應的ETag則是使用該API回應內容中使用到
的所有相關類型的個別ETag串接後的Hash，如此在單一類型改變時，有使用到的API的ETag狀態也會隨之變動，解決了。

<!--more-->

## Middleware實作

### 建立Middleware類型

首先建立一個`EFETagMiddleware<TContext> where TContext: DbContext`的Middleware。

```csharp
public class EFETagMiddleware<TContext>
    where TContext : DbContext {
    private readonly RequestDelegate Next;
    public EFETagMiddleware(RequestDelegate next) {
        Next = next;
    }
}
```

### 建立Middleware Invoke方法

建立一個`Invoke`方法處理Middleware Pipeline。

```csharp
public async Task Invoke(HttpContext context) {
}
```

### 加入ETags儲存屬性

加入兩個屬性分別用來儲存MVC Action回傳類型集合以及各自類型的ETag值。

```csharp
// 由於ETags可能由能發生同時存取，所以使用支援併發的字典類型
public static ConcurrentDictionary<string, string> ETags = new ConcurrentDictionary<string, string>();

// 儲存Action對應的回應類型使用到的類型
public static Dictionary<string, Type[]> ActionRefType = new Dictionary<string, Type[]>();
```

### ETags字典初始化

由於我們需要取得MVC的所有EndPoint，以及EF Core的EntityType，這個過程只需要在第一次執行。
加入一個bool屬性用以紀錄是否為初始化後。

```csharp
bool Inited{ get; set; } = false;
```

```csharp
public async Task Invoke(HttpContext context) {
    #region 初次運行
    if (!Inited) {
        Inited = true; //封閉初次執行入口

        #region 取得Entity Type
        var modelTypes = typeof(TContext)
            .GetProperties() // 列出公開屬性
            .Where(x => x.PropertyType.IsGenericType && x.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>)) // 找出屬性類型為DbSet的
            .Select(x => x.PropertyType.GenericTypeArguments[0]).Distinct(); // 取得泛型參數並去除重複

        // 使用Ticks作為初始的類型的ETag Value
        foreach (var modelType in modelTypes) {
            ETags[modelType.Name] = DateTime.Now.Ticks.ToString();
        }
        #endregion

        // 取出所有MVC路由
        var actionMethods = (
                (IActionDescriptorCollectionProvider)context
                .RequestServices.GetService(typeof(IActionDescriptorCollectionProvider))
            )
            .ActionDescriptors.Items.Where(x => x is ControllerActionDescriptor)
            .Cast<ControllerActionDescriptor>()
            .Select(x => x.MethodInfo); // 取出所有Action的MethodInfo

        #region 獲取每個Action回傳值關聯的Model

        // 這個本地方法用來取得類型的繼承鏈上的所有類型
        Type[] GetAllBaseTypes(Type type) {
            List<Type> result = new List<Type>();

            if (type.BaseType != null && type.BaseType != typeof(object)) {
                result.Add(type.BaseType);
                result.AddRange(GetAllBaseTypes(type.BaseType));
            }

            return result.ToArray();
        }

        // 取得指定類型中可以被JSON序列化輸出的類型
        List<Type> GetAllJsonType(Type type, List<Type> result = null) {
            // 檢查結果暫存List是否為空，如果是建立一個空的List，只有第一次呼叫會如此
            if (result == null) {
                result = new List<Type>();
            }

            // 如果發現List已經存在目前要遞迴的類型，則結束遞迴
            if (result.Contains(type)) {
                return result;
            }

            // 取得JsonObjectAttribute
            var jsonObjectDef = type.GetCustomAttribute<JsonObjectAttribute>();
            if (jsonObjectDef == null) {
                // 沒有則產生預設的
                jsonObjectDef = new JsonObjectAttribute() { MemberSerialization = MemberSerialization.OptOut };
            }

            // 將目前類型加入暫存List
            result.Add(type);

            // 將目前類型的父類型加入暫存List
            result.AddRange(GetAllBaseTypes(type));

            // 如果目前類型是泛型，則將泛型參數中的Type呼叫這個方法遞迴
            if (type.IsGenericType) {
                foreach (var gType in type.GenericTypeArguments) {
                    result.AddRange(GetAllJsonType(gType, result));
                }
            }

            // 再次檢驗經過上面遞迴後是否又重複執行這個類型的遞迴，重複則跳脫
            if (result.Contains(type)) {
                return result;
            }

            // 目前類型的實例
            object tempObj = null;

            try { // 取得一個未初始化的類型實例
                tempObj = FormatterServices.GetUninitializedObject(type);
            } catch { }

            if (jsonObjectDef.MemberSerialization == MemberSerialization.Fields) {
                // 若成員序列化設定為Fields則將欄位取出後遞迴取得相關類型
                result.AddRange(
                    type.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
                        .Select(x => x.FieldType)
                        .SelectMany(x => GetAllJsonType(type, result))
                );
            } else if (jsonObjectDef.MemberSerialization == MemberSerialization.OptIn) {
                // 若成員序列化設定為OptIn則表示標記項目屬性才會序列化，則使用JsonPropertyAttribute與ShouldSerialize方法確定是否為相關類型
                result.AddRange(
                    type.GetProperties(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
                        .Where(x => x.GetCustomAttribute<JsonPropertyAttribute>() != null)
                        .Where(x => {
                            var ssm = type.GetMethod("ShouldSerialize" + x.Name);
                            if (ssm == null) return true;
                            if (tempObj == null) return true;
                            return true.Equals(ssm.Invoke(tempObj, new object[0]));
                        })
                        .Select(x => x.PropertyType)
                        .Where(x => x.IsClass && x != typeof(string))
                        .SelectMany(x => GetAllJsonType(type, result))
                );
            } else if (jsonObjectDef.MemberSerialization == MemberSerialization.OptOut) {
                // 此處同OptIn只是相反
                result.AddRange(
                    type.GetProperties(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
                        .Where(x => x.GetCustomAttribute<JsonIgnoreAttribute>() == null)
                        .Where(x => {
                            var ssm = type.GetMethod("ShouldSerialize" + x.Name);
                            if (ssm == null) return true;
                            if (tempObj == null) return true;
                            return true.Equals(ssm.Invoke(tempObj, new object[0]));
                        })
                        .Select(x => x.PropertyType)
                        .Where(x => x.IsClass && x != typeof(string))
                        .SelectMany(x => GetAllJsonType(type, result))
                );
            }

            return result;
        }

        // 列舉所有MVC Action        
        foreach (var actionMethod in actionMethods) {
            // 使用方法完整的定義類型以及名稱、參數類型作為Action的ID
            var actionId = $"{actionMethod.DeclaringType.FullName}.{actionMethod.Name}<{string.Join(", ", actionMethod.GetParameters().Select(x => x.ParameterType.FullName))}>".ToLower();

            // 如果該方法沒回傳任何類型，則直接忽略
            if (actionMethod.ReturnType == null) {
                continue;
            }

            // 調用上列取得所有相關類型方法
            ActionRefType[actionId] = GetAllJsonType(actionMethod.ReturnType).Distinct()
                .Intersect(modelTypes).OrderBy(x => x.Name).ToArray();
        }
        #endregion
    }
    #endregion
}
```

### DbContext異動追蹤

執行完上列初始化後，接下來要針對EntityFramework的DbContext異動監聽。

```csharp
public async Task Invoke(HttpContext context) {
    #region 初次運行
    // ...something...
    #endregion

    #region 追蹤DBContext異動
    // 取得DbContext
    var dbcontext = (TContext)context.RequestServices.GetService(typeof(TContext));
    
    // 用以儲存本次Request異動ModelTypes
    ConcurrentBag<Type> modifiedTypes = new ConcurrentBag<Type>();

    // Model狀態變化Handler
    EventHandler<EntityStateChangedEventArgs> eventHandler =
        delegate (object sender, EntityStateChangedEventArgs e) {
            // 重複略過
            if (modifiedTypes.Contains(e.Entry.Metadata.ClrType)) return;

            // 舊狀態為Added則表示為剛新增的Instance
            // 變更以及被刪除的項目加入異動項目
            if (e.OldState == EntityState.Added ||
            e.NewState == EntityState.Modified ||
            e.NewState == EntityState.Deleted) {
                modifiedTypes.Add(e.Entry.Metadata.ClrType);
            }
        };

    // 加入事件綁定
    dbcontext.ChangeTracker.StateChanged += eventHandler;
    #endregion
}
```

### 獲取目前Request的Action資訊

接下來則必須要知道目前這個Request所對應的Action對象。

```csharp
public async Task Invoke(HttpContext context) {
    #region 初次運行
    // ...something...
    #endregion

    #region 追蹤DBContext異動
    // ...something...
    #endregion

    #region 抓出目前Request的作用Action MethodInfo
    // 取出所有MVC路由
    var actions = (
            (IActionDescriptorCollectionProvider)context.RequestServices.GetService(typeof(IActionDescriptorCollectionProvider))
        )
        .ActionDescriptors.Items.Where(x => x is ControllerActionDescriptor)
        .Cast<ControllerActionDescriptor>();

    // 找出目前作用中的Action的MethodInfo
    var action = actions.FirstOrDefault(x => {
        // 此處將所有的Action的路由轉換為Regex，用來與目前的Request路徑是否相符，以此判斷是否為目標Method
        var templateUrl = ("^/" + Regex.Replace(x.AttributeRouteInfo.Template, "\\{[^\\{\\}]+\\}", ".+") + "/?$")
                .ToLower();

        var isMatch = new Regex(templateUrl).IsMatch(context.Request.Path.ToString().ToLower());

        if (!isMatch) return false;

        var actionConstraint = x.ActionConstraints.FirstOrDefault(y => y is HttpMethodActionConstraint) as HttpMethodActionConstraint;

        return actionConstraint.HttpMethods.Any(y => context.Request.Method.Equals(y, StringComparison.CurrentCultureIgnoreCase));
    })?.MethodInfo;
    #endregion
}
```

### 現有Cache判斷

取得目前的Action Method，我們要判斷目前是否有這個Action的Cache。

```csharp
public async Task Invoke(HttpContext context) {
    #region 初次運行
    // ...something...
    #endregion

    #region 追蹤DBContext異動
    // ...something...
    #endregion

    #region 抓出目前Request的作用Action MethodInfo
    // ...something...    
    #endregion

    #region 現有Cache判斷
    string currentActionId = null;
    if (action != null) { //為MVC Action
        // 目前Action的識別
        currentActionId = $"{action.DeclaringType.FullName}.{action.Name}<{string.Join(", ", action.GetParameters().Select(x => x.ParameterType.FullName))}>".ToLower();

        // 只有GET可以快取
        if(HttpMethods.IsGet(context.Request.Method)){
            // 取得目前該Action的ETag
            string etag;
            if (!ActionRefType.ContainsKey(currentActionId) || ActionRefType[currentActionId].Length == 0) {
                // 如果找不到該Action所使用的Type清單則表示該方法為void或尚未初始化完成，直接使用Ticks的MD5作為ETag
                etag = DateTime.Now.Ticks.ToString().ToHashString<MD5>();
            } else {
                // 如果有找到該Action的回傳類型列表，則將這些類型對應的ETag值串接並計算MD5作為該方法目前的ETag
                etag = string.Join(",", ActionRefType[currentActionId].Select(x => ETags[x.Name])).ToHashString<MD5>();
            }

            string currentETag = "W/\"" + etag + "\"";

            // 如果客戶端有送上一次的ETag，則檢查這個ETag是否與上列計算結果相等
            if (context.Request.Headers.TryGetValue("If-None-Match", out StringValues oldETag)) {
                // ETag相等於計算的，表示內容無變化，返回304
                if (oldETag[0] == currentETag) {
                    context.Response.StatusCode = (int)HttpStatusCode.NotModified;
                    return;
                }
            }
        }
    }
    #endregion

    // 若上列快取檢驗中查無快取，則繼續執行下一個流程
    await Next(context); 
}
```

### 更新ETag

在上一個步驟中如果已經進入Next方法中，表示已經運行了Action，這就有可能改變資料庫的內容，所以接下來要使用前面對DbContext的異動追蹤取得異動的類型，更新這些類型的ETag。

```csharp
public async Task Invoke(HttpContext context) {
    #region 初次運行
    // ...something...
    #endregion

    #region 追蹤DBContext異動
    // ...something...
    #endregion

    #region 抓出目前Request的作用Action MethodInfo
    // ...something...    
    #endregion

    #region 現有Cache判斷
    // ...something...
    #endregion

    // 若上列快取檢驗中查無快取，則繼續執行下一個流程
    await Next(context); 

    #region 更新ETag
    // 解除事件綁定
    dbcontext.ChangeTracker.StateChanged -= eventHandler;

    // 更新異動ModelType的ETag標記
    foreach (var modifiedType in modifiedTypes) {
         ETags[modifiedType.Name] = DateTime.Now.Ticks.ToString();
    }

    if (currentActionId != null &&
        HttpMethods.IsGet(context.Request.Method)) { // 如果調用的是MVC Action且為GET
        // 如果有找到該Action的回傳類型列表，則將這些類型對應的ETag值串接並計算MD5作為該方法目前的ETag
        string currentETag = "W/\"" + string.Join(",", ActionRefType[currentActionId].Select(x => ETags[x.Name])).ToHashString<MD5>() + "\"";

        // 寫入標頭
        context.Response.Headers.Add("ETag", currentETag);
    }
    #endregion
}
```

### 建立`IApplicationBuilder`擴充方法

建立一個`EFETagMiddlewareExtension`類型包含以下內容:

```csharp
public static class EFETagMiddlewareExtension {
    public static IApplicationBuilder UseEFETag<TContext>(this IApplicationBuilder app)
        where TContext : DbContext {
        return app.UseResponseBuffering() // 必須要使用Buffering，如此才能在寫入Body後還可以修改狀態碼(Microsoft.AspNetCore.Buffering)
            .UseMiddleware<EFETagMiddleware<TContext>>(); // 使用前面建立的Middleware
    }
}
```

## 使用Middleware

在`Startup`類型的`Configure`方法中包含下列內容:

```csharp
public void Configure(IApplicationBuilder app, IHostingEnvironment env) {
    // ...something...
    app.UseEFETag<YOUR_CONTEXT_TYPE>();
    app.UseMvc();
    // ...something...
}
```

> 本文章的程式碼可至[這裡](https://github.com/XuPeiYao/ASPNETCORE_ETag_With_EF)下載