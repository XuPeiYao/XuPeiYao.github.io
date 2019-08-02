---
layout: post
title:  "ASP.NET Core實作自訂HTTP基本驗證"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp Middleware
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在API開發過程中使用Swagger作為API文件產生器，但在安全上希望只有通過驗證的使用者才可以觀看Swagger文件畫面，在[ASP.NET Core中有提供Basic HTTP Authentication](http://jasonwatmore.com/post/2018/09/08/aspnet-core-21-basic-authentication-tutorial-with-example-api)，但實作上比較麻煩，在這個案例中只是想要針對特定的路徑做基本驗證，限制文件指有特定的用戶可以存取。

在這篇文章中將使用Middleware實作指定路徑下的基本驗證。

<!--more-->

## 基本原理

HTTP基本驗證的原理可以參考[這篇](https://zh.wikipedia.org/wiki/HTTP%E5%9F%BA%E6%9C%AC%E8%AE%A4%E8%AF%81)文章中的說明。
簡而言之，在瀏覽器瀏覽沒有夾帶`Authorization`標頭的情況下，返回401狀態碼以及`WWW-Authenticate: Basic realm="Developer Only"`，如此將會觸發瀏覽器的使用者驗證視窗，回應標頭的`realm`項目詳細說明可參考[這篇](https://stackoverflow.com/questions/12701085/what-is-the-realm-in-basic-authentication)，其意義表示在同一個realm下，同樣的驗證資訊都應該可以存取，例如使用者已經在`realm="A"`的資源進行驗證並通過，在使用者存取另一個資源時，假設`realm="A"`則會使用相同的驗證資訊驗證，如果`realm`不同且使用者不存在對應的驗證資訊，則會重新出現驗證視窗。

用戶接收要求驗證的回應後輸入驗證資訊並確認送出後，瀏覽器將會在請求標頭中附加`Authorization: Basic <user account and password encoding by base64>`資訊，其中`Basic`後的`<區域>`則為使用者驗證資訊的Base64編碼資訊(即`BASE64($"{使用者帳號}:{使用者密碼}")`)的結果。當伺服器接收後即取出標頭內的資訊進行驗證，如果驗證失敗則反回前面提到的401狀態。
當驗證成功即可進行後續處理。

## Middleware實作

講完基本驗證的運作原理與過程，下面這邊開始說明我的實作方式。

### 定義基本驗證處理介面

首先定義一個基礎驗證處理介面，用來處理當需要基礎驗證時的帳號密碼確認的處理，由於是用介面去定義的，使用者可以自行在建構子實作所需要的DI，可以在建構子注入DbContext而實現使用資料庫中的資料做基本驗證，而這個使用者實作的處理類別也將加入DI中，稍後被Middleware調用。

```csharp
public interface IBaseAuthorizeHandler {
    /// <summary>
    /// 驗證方法
    /// </summary>
    Task<bool> Authorize(string account, string password);
}
```

### 定義基本驗證選項參數

現在定義一個Options類型用以設定Middleware作用的路由以及Realm判斷。

```csharp
public class BasicAuthenticateScopeOption {
    public PathString Path { get; set; }
    public string Realm { get; set; }
}
```

### 定義Middleware類

接下來建立一個Middleware類別，當然也可以直接使用`IApplicationBuilder.Use`的方式。

```csharp
/// <summary>
/// 基本HTTP驗證中間層
/// </summary>
/// <typeparam name="TBaseAuthorizeHandler">基礎驗證處理類型，為使用者實作的基礎驗證別</typeparam>
public class BasicAuthenticateScopeMiddleware<TBaseAuthorizeHandler>
    where TBaseAuthorizeHandler : IBaseAuthorizeHandler {
    // HTTP管線下一個步驟
    public RequestDelegate Next { get; set; }

    // 需要基本驗證的路由
    private PathString Path { get; set; }

    // 領域
    private string Realm { get; set; }

    // 建構子，取得下一階段管線流程以及自UseMiddleware方法中使用的路徑以及驗證方法
    public BasicAuthenticateScopeMiddleware(
        RequestDelegate next,
        IOptions<BasicAuthenticateScopeOption> authOption
        ) {
        Next = next;
        Path = authOption.Value.Path;
        Realm = authOption.Value.Realm;
    }
    // 中間層流程
    public async Task InvokeAsync(HttpContext context) {
        // 檢驗目前的Request Path是否為要進行基本驗證的路由
        if (context.Request.Path.StartsWithSegments(Path)) {
            // 檢查是否攜帶驗證標頭
            if (context.Request.Headers.ContainsKey("Authorization")) {
                // 發現驗證標頭，解析驗證資訊
                try {
                    var authData = Encoding.UTF8.GetString(Convert.FromBase64String(context.Request.Headers["Authorization"].ToString().Split(' ')[1])).Split(':');
                    // 自DI提供者中取得泛型中指定的基礎驗證處理類別實例
                    var handler = context.RequestServices.GetService<TBaseAuthorizeHandler>();
                    // 調用驗證方法確認驗證是否通過
                    if (await handler.Authorize(authData[0], authData[1])) {
                        // 通過驗證則繼續處理後去動作
                        await Next(context);
                    } else {
                        // 驗證失敗拋出401狀態與錯誤訊息
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "text/plain";
                        await context.Response.WriteAsync("401 Unauthorized.");
                    }
                } catch {
                    // 驗證與剖析過程出現例外，拋回錯誤
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "text/plain";
                    await context.Response.WriteAsync("401 Unauthorized.");
                }
            } else {
                // 未攜帶資訊，拋出驗證需求標頭、401狀態以及realm資訊
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "text/plain";
                context.Response.Headers["WWW-Authenticate"] = $"Basic realm=\"{Realm}\"";
                await context.Response.WriteAsync("401 Unauthorized.");
            }
        } else {
            // 非指定路由則不檢查直接下一步
            await Next(context);
        }
    }
}
```

### 使用Middleware

前面我們定義了`IBaseAuthorizeHandler`，在這個範例中我們簡單定義如下的處理類別。

```csharp
public class MyBaseAuthorizeHandler: IBaseAuthorizeHandler {    
    public async Task<bool> Authorize(string account, string password){
        // 帳號密碼等於admin
        return account == "admin" && password == "admin";
    }
}
```

並且將該處理類型加入DI中。

```csharp
public void ConfigureServices(IServiceCollection services) {
    // ... something ...

    // 基本驗證處理類型加入DI
    services.AddScoped<MyBaseAuthorizeHandler>();

    // ... something ...
}
```

接下來就是要在Startup中的Configure的管線流程中加入上面的Middleware了，由於ASP.NET Core的HTTP Request Pipe的順序由此處決定，所以驗證務必要加入在實際執行項目運行前。

```csharp
public void Configure(IApplicationBuilder app, IHostingEnvironment env) {
    // ... something ...

    // 使用基礎驗證Middleware
    app.UseMiddleware<BasicAuthenticateScopeMiddleware<MyBaseAuthorizeHandler>>(
        Options.Create(new BasicAuthenticateScopeOption() {
            Path = "/swagger",
            Realm = "Dev"
        }
    ));

    // 需要基本驗證的內容
    app.UseSwagger();
    app.UseSwaggerUI();

    // ... something ...
}
```

如此的使用就可以在使用者瀏覽`/swagger/*`路由的項目時，要求使用者使用基本驗證。

![Imgur](https://i.imgur.com/ijFmxyh.png)
