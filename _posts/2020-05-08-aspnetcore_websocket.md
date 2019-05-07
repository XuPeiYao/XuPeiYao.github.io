---
layout: post
title:  "ASP.Net Core使用WebSocket"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp WebSocket
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

WebSocket是基於HTTP的全雙工通訊協定，能夠實作伺服器與客戶端資料的推送傳輸，伺服器可以透過WebSocket向客戶端推送資料，這使用傳統HTTP方式是無法達成的。
ASP.NET Core提供WebSocket套件，簡單就可以實作，本文將使用套件並加以整理簡化使用。

<!--more-->

## 專案與環境建置

首先建立一個空的ASP.NET Core網站專案(也可以使用現有的)，使用套件管理器安裝`Microsoft.AspNetCore.WebSockets`或在專案執行以下指令:

```shell
dotnet add package Microsoft.AspNetCore.WebSockets
```

## WebSockets套件基本使用

安裝好套件後可以直接在`Startup.cs`類別中的`Configure`方法加入以下程式碼，就可以實現一個簡單的Echo功能的WebSocket服務，當然也可以另外抽Middleware類別。

```csharp
public void Configure(IApplicationBuilder app, IHostingEnvironment env) {
    // ... something ...
    app.UseWebSockets(new WebSocketOptions() {
        ReceiveBufferSize = 4 * 1024
    });

    app.Run(async (context) => {
        // 如果Request為WebSocket的
        if (context.WebSockets.IsWebSocketRequest) {
            // 容許WebSocket連線並取得WebSocket實例
            var socket = await context.WebSockets.AcceptWebSocketAsync();   
            // 當WebSocket維持在連線狀態則循環監聽接收資料
            while (socket.State == WebSocketState.Open) {
                WebSocketReceiveResult receivedData = null; 
                // 接收一次訊息中的所有段落
                do {
                    // 接收緩衝區
                    ArraySegment<byte> buffer = new ArraySegment<byte>(new byte[4 * 1024]);

                    // 接收
                    receivedData = await socket.ReceiveAsync(buffer, CancellationToken.None);  

                    // 回傳
                    await socket.SendAsync(
                        buffer.Take(receivedData.Count).ToArray(),
                        receivedData.MessageType,
                        receivedData.EndOfMessage,
                        CancellationToken.None);
                } while (!receivedData.EndOfMessage); // 是否為最後一的段落
            }
        }
        await context.Response.WriteAsync("Hello World!");
    });
}
```