---
layout: post
title: "WPF使用HttpListener實作自己的驗證流程或接收外部網頁操作的回調"
categories: .NET
tags: .NET HttpListener WPF
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
  {:toc}

在開發 Windows 桌面應用程式時，若需要使用到自訂的登入流程，較常見的是調用 API 或使用內嵌網頁框的方式實現登入過程，但若是登入過程中需要使用到外部登入或者需使用到網頁操作驗證流程，在這種情況下無法使用前面提到的兩種方式實作。

在必須要在過程中開啟外部瀏覽器操作的情況下，若是應用程式本身需要能夠接收用戶在外部瀏覽器的操作結果，就必須要像前篇文章提到的「[自己實作 Google OAuth2 流程](https://github.com/googlesamples/oauth-apps-for-windows)」範例中使用 HttpListener 建立臨時本地 HTTP 服務並在網頁過程的最後導引或送出資訊至 HttpListener。

本篇將簡單說明如何利用 HttpListener 使得外部網頁操作結果可以送至桌面應用程式。

<!--more-->

## 準備一個簡易的 WPF 專案

首先建立一個僅有一個視窗、一顆按鈕(`LoginButton`)、一個文字標籤(`MessageLabel`)的視窗如下。

![Imgur](https://imgur.com/hySQEjY.png)

## 獲取尚未占用的 Port

建立 HttpListener 前需先取得目前系統中尚未占用的 Port，透過建立一個未定 Port 的 TcpListener 取得隨機 Port 後隨即釋放 TcpListener，如此就可以取得未占用的 Port。

```csharp
using System.Net.Sockets;

// ...something...

private int GetUnusedPort()
{
    TcpListener tcp = new TcpListener(IPAddress.Loopback, 0);
    tcp.Start();
    int port = ((IPEndPoint)tcp.LocalEndpoint).Port;
    tcp.Stop();
    return port;
}
```

## 建立 HttpListener

取得未占用 Port 後我們可以開始撰寫 HttpListener 的部分；HttpListener 是透過`Prefixes`加入監聽的路由作用，並透過`GetContextAsync()`方法取得 Request 的`HttpContext`。
這個步驟我們在按鈕加入`Click`事件，並在事件內開始實作開啟瀏覽器瀏覽外部網頁的流程以及透過 HttpListener 監聽回調的部分。

```csharp
using System.Net;

// ...something...

private void LoginButton_Click(object sender, RoutedEventArgs e)
{
    int port = GetUnusedPort();
    HttpListener http = new HttpListener();
    // 加入監聽的路由
    http.Prefixes.Add($"http://localhost:{port}/");
    http.Prefixes.Add($"http://127.0.0.1:{port}/");
    http.Start(); // 開始監聽

    // 待後續章節實作
}
```

## 建立測試用的偽登入頁面

在這個範例中我們建立一個測試用的 HTML 頁面，用以模擬外部操作流程完成後的回調。並且回調過程中再目標網址夾帶`token`參數。
這個頁面將作為本範例中的外部流程的頁面，稍後將補充前面步驟中的`LoginButton_Click`方法的後續動作。

```html
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <h2>假登入畫面</h2>
    <br />
    這個網頁將直接返回Query中帶有的redirectUrl的網址並附加token參數。
    <br />
    <script>
      function redirect() {
        var query = location.search
          .substring(1)
          .split("&")
          .map(x => x.split("="));
        for (var i = 0; i < query.length; i++) {
          if (query[i][0] == "redirectUrl") {
            location.href =
              decodeURIComponent(query[i][1]) + "?token=xxxxxxxxxxxxxxxxxxxx";
          }
        }
      }
    </script>
    <button style="font-size:32px" onclick="redirect()">登入完成</button>
  </body>
</html>
```

將上面的 HTML 儲存為`index.html`並使用 HTTP Server 掛起，或者可以使用[Web Server for Chrome](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb)這個簡單的 HTTP Server 工具將測試頁面掛起。

## 在桌面應用程式開啟偽登入頁面

建立好模擬外部網頁的 HTTP Server 後，接下來補充前面的`LoginButton_Click`方法如下:

```csharp
 private void LoginButton_Click(object sender, RoutedEventArgs e)
{
    int port = GetUnusedPort();
    HttpListener http = new HttpListener();
    // 加入監聽的路由
    http.Prefixes.Add($"http://localhost:{port}/");
    http.Prefixes.Add($"http://127.0.0.1:{port}/");
    http.Start(); // 開始監聽
    http.GetContextAsync().ContinueWith(async (context) => {
        // 取得QueryString參數中的token
        var token = (await context).Request.QueryString["token"];

        this.Dispatcher.Invoke(() => {
            // 啟用按鈕
            LoginButton.IsEnabled = true;

            // 將取得的TOKEN寫在Label中
            MessageLabel.Content = "TOKEN=" + token;
        });

        // 關閉視窗的訊息，此處用以提示使用者可以關閉由WPF開啟的網頁視窗，也可以寫JS關閉視窗，但僅在IE可作用
        byte[] message = Encoding.UTF8.GetBytes("您可以關閉此頁");
        context.Result.Response.StatusCode = 200;
        context.Result.Response.ContentType = "text/plain";
        context.Result.Response.ContentLength64 = message.Length;
        context.Result.Response.OutputStream.Write(message, 0, message.Length);
        context.Result.Response.OutputStream.Flush();
        context.Result.Response.Close();

        // 停止監聽並關閉HttpListener
        http.Stop();
        http.Close();
    });
    // 停用此按鈕，防止重複開啟
    LoginButton.IsEnabled = false;
    // 產生給偽登入頁面使用的redirectUrl參數
    var redirectUrl = $"http://127.0.0.1:{port}/";
    redirectUrl = Uri.EscapeDataString(redirectUrl);
    // 開啟預設瀏覽器，這個網址取決於你的外部操作網頁的設定，本範例將範例HTML頁面掛載在127.0.0.1:8887
    Process.Start($"http://127.0.0.1:8887?redirectUrl={redirectUrl}");
}
```

## 執行與操作效果

執行此 WPF 程式並點選`登入`按鈕，將開啟預設瀏覽器出現前面自訂義的偽登入畫面。

![Imgur](https://imgur.com/NqDfA2S.png)

點選網頁上的登入完成按鈕，模擬在外部操作登入完成後的回調。

![Imgur](https://imgur.com/n9g3Wz1.png)

如此實作將可以把外部瀏覽器中的操作結果傳遞至桌面應用程式。
