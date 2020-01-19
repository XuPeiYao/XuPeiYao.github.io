---
layout: post
title: "ASP.NET Core使用LINE Notify發送通知"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp LINE Notify
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

平時推送訊息除了可以使用 Web Notifications 也可以使用現在常用的通訊軟體提供的 Message API 將通知送給使用者，而本文將使用 LINE 所提供的 Notify 服務來推送訊息。

<!--more-->

## 註冊 LINE Notify 服務

前往並登入[LINE Notify 管理登入服務](https://notify-bot.line.me/my/services/)。登入後點選「登入服務」按鈕。

![Imgur](https://imgur.com/aUFQlpK.png)

依照畫面中要求的內容填寫服務內容。

![Imgur](https://imgur.com/GLlzukw.png)

服務網址以及 Callback URL 項目可先填寫一個無用的網址暫時替代。

填寫完畢點選下一步後，選擇「登入」。接下來請前往剛才填寫的信箱驗證。

![Imgur](https://imgur.com/3Pxje98.png)

驗證結束後在 LINE Notify 畫面中即可看到剛才所建立的服務項目。

![Imgur](https://imgur.com/f6g4goS.png)

進入建立的服務項目即可獲得該服務的 Client ID、Client Secret，這兩個稍候會使用到，且剛才隨意設定的 Callback URL 以及 服務網址 可在項目畫面中修改。

![Imgur](https://imgur.com/WYlKbcc.png)

## 建立服務

首先建立一個簡單的 ASP.NET Core MVC 專案且取得運行的 Port，使用 ngrok 工具或其他工具將本地服務對外。本文使用 ngrok 將服務對外。

```bash
ngrok http 5000
```

![Imgur](https://imgur.com/rZO4kLV.png)

指令運行時將該視窗放置先不管，畫面中的 ngrok Forwarding 網址稍後將會使用到。

### 綁定 LINE 帳號的實作

首先建立一個 NotifyController 並設定路由。

除此之外使用靜態 Dictionary 作為本範例的測試資料庫，

```csharp
[Route("[controller]")]
public class NotifyController : Controller
{
    static Dictionary<string, string> TestDatabase { get; set; } = new Dictionary<string, string>()
    {
        ["tester"] = null
    };
}
```

#### LINE 登入畫面跳轉

在剛才的 NotifyController 中加入兩個 Action 用以跳轉畫面至 LINE Notify 的授權畫面。
其中第二個 BindCallback 方法為前一章節所提及的 Callback URL 項目，請先進入 LINE Notify 的控制介面變更網址為你 ngrok 的 BindCallback Action 的網址。
本範例為`https://xxxxxxx.ngrok.io/Notify/bind-callback`

```csharp
/// <summary>
/// 跳轉至指定使用者的LINE Notify授權畫面
/// </summary>
[HttpGet("bind")]
public IActionResult Bind(string userId)
{

}

/// <summary>
/// LINE Notify授權畫面的返回目標
/// </summary>
/// <returns></returns>
[HttpGet("bind-callback")]
public async Task<IActionResult> BindCallback(string code, string state)
{
    // 這個方法將在稍後章節實作
    throw new NotImplementedException();
}
```

這個範例的 Bind 方法使用 Query 方式傳入 userId 只是為了方便展示，實際上由 Session 或 JWT 取得目前使用者識別。

接下來要參考 LINE Notify 的[文件](https://notify-bot.line.me/doc/en/)，組裝 LINE Notify 授權畫面的 URL 參數。

我們要在這階段

```csharp
/// <summary>
/// 跳轉至指定使用者的LINE Notify授權畫面
/// </summary>
[HttpGet("bind")]
public IActionResult Bind(string userId)
{
    var lineAuthUrl = $"https://notify-bot.line.me/oauth/authorize";
    var authParameters = new Dictionary<string, string>()
    {
        ["response_type"] = "code", // 固定
        ["scope"] = "notify", // 固定
        ["client_id"] = LineNotifyConfig.ClientId, // 填寫自己的ClientId
    };

    // 取得並產生LINE Notify授權返回的網址
    var bindCallbackUrl = this.Url.ActionLink(nameof(BindCallback)); // 取得BindCallback這個Action的網址
    // 返回網址也要傳送出去
    authParameters["redirect_uri"] = bindCallbackUrl;

    // 狀態值，這個值可以用來防止CSRF攻擊，在本文用來防止返回網址的userId參數被變更(這裡只是簡單做)
    // 本文只是簡單的做一下HASH來檢查userId是否被竄改等等。
    // 這個值將再返回時附加在QueryString中
    authParameters["state"] = userId + ";" + (userId + "@簡單的做一下HASH").ToHashString<MD5>();

    // 組裝網址
    lineAuthUrl = QueryHelpers.AddQueryString(lineAuthUrl, authParameters);
    // 跳轉畫面到LINE Notify授權畫面
    return Redirect(lineAuthUrl);
}
```

接下來運行程式並開啟瀏覽器使用 ngrok 的網址瀏覽如下網址: `https://xxxxxxx.ngrok.io/Notify/bind?userId=test`即可看到 LINE Notify 授權畫面。

![Imgur](https://imgur.com/XwVa9GF.png)

當看到這個授權畫面時候表示導引到 LINe Notify 授權畫面的方法實作已經完成。

### LINE Notify 授權返回

LINE Notify 授權後返回會在 QueryString 中返回`code`以及`state`兩個參數，code 參數可用來取得 accessToken，而 state 則在前面有提過用以驗證。

```csharp
/// <summary>
/// LINE Notify授權畫面的返回目標
/// </summary>
/// <returns></returns>
[HttpGet("bind-callback")]
public async Task<IActionResult> BindCallback(string ode, string state)
{
    var userAndHash = state.Split(';');
    var userId = userAndHash[0];
    var hash = (userId + "@簡單的做一下HASH").ToHashString<MD5>();
    if (userAndHash[1] != hash) // 雜湊不符，表示被竄改過
    {
        return BadRequest();
    }
    // 使用code取得access token
    var tokenResult = await Http.Request("https://notify-bot.line.me/oauth/token")
               .SendJson(new
               {
                   grant_type = "authorization_code",
                   code = code,
                   redirect_uri = this.Url.ActionLink(nameof(BindCallback)),
                   client_id = LineNotifyConfig.ClientId,
                   client_secret = LineNotifyConfig.ClientSecret
               })
               .ExpectJson<TokenResult>()
               .PostAsync();
    // 記錄使用者對應的access token
    var access_token = tokenResult.Data.access_token;
    TestDatabase[userId] = access_token;
    return Content("綁定LINE Notify成功");
}

public class TokenResult
{
    public string access_token { get; set; }
}
```

依照以上流程執行後畫面將顯示`綁定LINE Notify成功`訊息。
此時綁定 LINE Notify 流程結束。

### 推送通知

上述流程已經將使用者與其對應的 Notify 的 Token 對應，接下來只要使用特定使用者 Token 調用 API 急可以傳送通知。

```csharp
// 使用code取得access token
 var formData = new NameValueCollection();
 formData["message"] = "HelloWorld"; // 訊息

 var result = await Http.Request("https://notify-api.line.me/api/notify")
    .AddHeader("Authorization", "Bearer " + TestDatabase[userId]) // 取得對應的Token
    .SendForm(formData)
    .ExpectJson<TokenResult>()
    .PostAsync();
```

如此調用 API 即可在 LINE 接收到以下訊息:

![Imgur](https://imgur.com/czpsRUH.png)
