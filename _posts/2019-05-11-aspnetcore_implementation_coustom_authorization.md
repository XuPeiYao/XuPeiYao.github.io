---
layout: post
title:  "ASP.NET Core自訂Token驗證"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在API的驗證上面JWT是比較常用的方式，但是如果有需求需要自行定義Token格式，同時兼容ASP.NET Core自身的Authorization機制。這時候就必須要定義，本文將以建立一個簡易的自訂Token作為介紹。

<!--more-->

## Authorization標頭的基本介紹

Authorization標頭是HTTP在做驗證時攜帶驗證資訊的標頭，通常標頭內容的格式為`xxx yyyyy`其中x表示類型、y表示內容。如HTTP基本驗證的格式就是`basic yyyyy`，JWT的常見格式則為`bearer yyyyy`。

```
Authorization: <type> <credentials>
```

有關詳細的資訊可以參考此[文件](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)

## 實作自訂Token驗證

### 自訂驗證處理程序

在本文我們打算自訂一個格式為`mytoken yyyyy`的Token形式。

**由於這只是個示範，所以`yyyyy`部分直接就是使用者ID。**

ASP.NET Core提供自訂`AuthenticationHandler`的功能，首先先定義一個`MyTokenHandler`。

```csharp
public class MyTokenHandler : AuthenticationHandler<MyTokenOptions> {
    public MyTokenHandler(
        IOptionsMonitor<MyTokenOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock)
        : base(options, logger, encoder, clock) { }

    // 驗證處理方法
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync() {
        // 如果帶有`Authorization`標頭
        if (Context.Request.Headers.TryGetValue("Authorization", out StringValues token)) {
            // 切割`Authorization`標頭的內容，這是為了切割Authorization的規格與內容
            var tokenInfo = token[0].Split(' ');
            // 切割後長度必須為2(因為依照格式來切割恰好會等於兩個，當然這邊可以自己決定)
            // 如果長度等於2且格式為`mytoken`時處理Token
            if (tokenInfo.Length == 2 &&
                "mytoken".Equals(tokenInfo[0], StringComparison.CurrentCultureIgnoreCase)) {
                // 建立Claims
                var claims = new ClaimsPrincipal(new ClaimsIdentity[]{
                    new ClaimsIdentity(
                        new Claim[] {
                            new Claim(ClaimsIdentity.DefaultNameClaimType, tokenInfo[1]) // 直接回使用者ID
                        },
                        "自訂Token" // 必須要加入authenticationType，否則會被作為未登入
                    )
                });

                // 回傳驗證成功訊息並返回Claims
                return AuthenticateResult.Success(new AuthenticationTicket(claims, "mytoken"));
            }
            return AuthenticateResult.Fail("Token Format Error");
        } else {
            return AuthenticateResult.NoResult();
        }
    }
}
```

> 關於ClaimsIdentity的`authenticationType`可參考GitHub上的[原始碼](https://github.com/dotnet/corefx/blob/a6f76f4f620cbe74821c6445af3f13e048361658/src/System.Security.Claims/src/System/Security/Claims/ClaimsIdentity.cs)

其中上列`MyTokenHandler`類別使用的泛型`MyTokenOptions`需要額外進行定義，這個類別用以提供Handler進行驗證的選項參數，可以在`Startup.ConfigureServices`加入Handler時加入其他選項設定。
可以在上列`MyTokenHandler.HandleAuthenticateAsync`中取得前面帶入的選項變化。

在本範例中只是簡單定義一個空類別。

```csharp
public class MyTokenOptions : AuthenticationSchemeOptions {
}
```

> 有關Claims可參考以下網頁:
> 1. https://www.cnblogs.com/jesse2013/p/aspnet-identity-claims-based-authentication-and-owin.html
> 2. https://docs.microsoft.com/zh-tw/aspnet/core/security/authorization/claims?view=aspnetcore-2.2
> 3. http://kevin-junghans.blogspot.com/2013/12/using-claims-in-aspnet-identity.html
> 4. https://stackoverflow.com/questions/21645323/what-is-the-claims-in-asp-net-identity

### 加入自訂Token

經過上面步驟已經定義定義一個簡單的Token，現在要在`Startup.ConfigureServices`中加入。

```csharp
// 加入認證
services
    .AddAuthentication("mytoken")
    .AddJwtBearer() // 同時使用JWT
    .AddScheme<MyTokenOptions, MyTokenHandler>("mytoken", null);
// 加入授權
services.AddAuthorization();
```

同時在`Startup.Configure`中的MVC Middleware **之前** 加入。

```csharp
app.UseAuthentication();

// ...something...

app.UseMvc();
```

> Authentication相關設定可以參考ASP.NET Core的[文件](https://docs.microsoft.com/zh-tw/aspnet/core/security/authorization/limitingidentitybyscheme?view=aspnetcore-2.2&tabs=aspnetcore2x)。
>

### 使用自訂Token

建立一個簡單的Controller以及Action，並在方法加入`Authorize`的Attribute。

```csharp
[Route("api/[controller]")]
public class ValuesController : ControllerBase { 
    [HttpGet]
    [Authorize]
    public string Get() {
        return User.Identity.Name;
    }
}
```

接下來執行並使用工具調用，在沒有附加`Authorization`標頭情況下，狀態碼將是`401`。

![Imgur](https://i.imgur.com/vckQTlv.png)

如果帶有標頭情況下則可以正常呼叫。

![Imgur](https://i.imgur.com/pRArrBO.png)