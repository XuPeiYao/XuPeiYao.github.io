---
layout: post
title:  "ASP.Net Core使用WebSocket與製作Middleware"
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

## 將原始使用方法規劃使用Middleware簡化

### 建立WebSocket訊息處理類型

首先定義一個WebSocket訊息處理的基礎類型`WebSocketHandler`，定義為一個`abstract`的類型，預期在實際中使用的Handler必須要繼承這個基礎類型，這個類型提供一個`Events`屬性，為`Subject`類型，使用Reactive方式傳遞訊息。

```csharp
public abstract class WebSocketHandlerBase {
    /// <summary>
    /// 事件訂閱
    /// </summary>
    public Subject<WebSocketEvent> Events { get; private set; }
        = new Subject<WebSocketEvent>();
}
```

同時我們另外定義WebSocket接收事件類型用以讓上列`Events`屬性使用。

```csharp
public class WebSocketEvent {
    /// <summary>
    /// 事件類型
    /// </summary>
    public WebSocketEventType Type { get; set; }

    /// <summary>
    /// 本次事件的訊息WebSocket原始類型
    /// </summary>
    public WebSocketMessageType? MessageType { get; set; }

    /// <summary>
    /// 本次事件的接收資料
    /// </summary>
    public ArraySegment<byte> ReceivedData { get; set; }

    /// <summary>
    /// 本次連線的HttpContext
    /// </summary>
    public HttpContext Context { get; set; }

    /// <summary>
    /// 引動事件的WebSocket物件
    /// </summary>
    public WebSocket WebSocket { get; internal set; }
}
```

同時大略的將WebSocket在整個週期中的事件劃分為`Connect`、`Disconnected`、`Receiving`、`Received`四個事件並定義以下列舉作為`WebSocketEvent`的值。

```csharp
public enum WebSocketEventType {
    /// <summary>
    /// 連線
    /// </summary>   
    Connect,

    /// <summary>
    /// 斷線
    /// </summary> 
    Disconnected,

    /// <summary>
    /// 接收訊息中
    /// </summary> 
    Receiving,

    /// <summary>
    /// 接收到訊息
    /// </summary> 
    Received
}
```

### 建立WebSocket訊息處理Middleware

建立一個`WebSocketsMiddleware<THandler>`類別，且`THandler`必須繼承上面定義的`WebSocketHandlerBase`類別。

此類別是整個流程的核心，處理並分配事件到`THandler`實例。

```csharp
public class WebSocketsMiddleware<THandler>
    where THandler : WebSocketHandlerBase {
    // ...something...

    /// <summary>
    /// Middleware的下一個管線流程
    /// </summary>
    private readonly RequestDelegate Next;

    /// <summary>
    /// WebSocket設定選項
    /// </summary>
    private readonly WebSocketOptions Options;

    /// <summary>
    /// 預設的接收訊息緩衝區大小
    /// </summary>
    private const int _defaultBufferSize = 8 * 1024;

    /// <summary>
    /// Middleware建構子
    /// </summary>
    public WebSocketsMiddleware(RequestDelegate next, WebSocketOptions options) {
        Next = next;
        Options = options;
    }

    // ...something...
}
```

接下來對Middleware的`Invoke`作定義，這邊是整個Middleware的主要處理內容。在這邊我們首先必須要判斷目前的Request是否是WebSocket的，不過不是則直接將Pipeline丟給下個流程處理。

```csharp
public async Task Invoke(HttpContext context) {
    // 如果不是WebSocket請求
    if (!context.WebSockets.IsWebSocketRequest) {
        await Next(context); // 交由下個管線流程處理請求
        return; 
    }

    // ...something...
}
```

而如果這個Request是WebSocket的，我們首先是使用DI取得使用者定義的`THandler`類型的實例，作為接下來WebSocket連線事件的派發對象。

```csharp
// 取得Thandler實例，請注意THandler類型必須註冊DI
var handler = (THandler)context.RequestServices.GetService(typeof(THandler));
```

最後我們要定義WebSocket訊息流程的處理以及訊息監聽迴圈。

```csharp
WebSocket socket = null;
try {
    // 同意WebSocket連線並取得WebSocket物件
    socket = await context.WebSockets.AcceptWebSocketAsync();

    // 將`連線`事件丟給Handler
    handler.Events.OnNext(new WebSocketEvent() {
        Type = WebSocketEventType.Connect,
        Context = context,
        WebSocket = socket
    });

    // 完整接收訊息
    var receivedSegs = new List<ArraySegment<byte>>();

    // 監聽迴圈，在WebSocket是打開的情況下持續監聽
    while (socket.State == WebSocketState.Open) {
        WebSocketReceiveResult receiveResult;

        #region 片段接收迴圈
        do {
            // 緩衝區
            var buffer = new ArraySegment<byte>(new byte[Options?.ReceiveBufferSize ?? _defaultBufferSize]);

            // 接收資料
            receiveResult = await socket.ReceiveAsync(buffer, CancellationToken.None);

            // 本次接收循環資料區段
            var receiving = new ArraySegment<byte>(buffer.Array, 0, receiveResult.Count);

            // 傳遞`接收中`事件
            handler.Events.OnNext(new WebSocketEvent() {
                Type = WebSocketEventType.Receiving,
                MessageType = receiveResult.MessageType,
                ReceivedData = receiving,
                Context = context,
                WebSocket = socket
            });

            // 保留本次接收區段
            receivedSegs.Add(receiving);
        } while (!receiveResult.EndOfMessage); // 確保本次接收片段已經結束
        #endregion

        #region 合併接收片段
        var received = new byte[receivedSegs.Sum(x => x.Count)];
        int offset = 0;
        foreach (var seg in receivedSegs) {
            Buffer.BlockCopy(seg.Array, 0, received, offset, seg.Count);
            offset += seg.Count;
        }
        #endregion

        // 全部片段接收完成後傳遞`接收`事件，傳遞所有片段拼裝的結果
        handler.Events.OnNext(new WebSocketEvent() {
            Type = WebSocketEventType.Received,
            MessageType = receiveResult.MessageType,
            ReceivedData = new ArraySegment<byte>(received),
            Context = context,
            WebSocket = socket
        });
    }

    // 跳脫監聽迴圈表示WebSocket已經斷線，傳遞`斷線事件`
    handler.Events.OnNext(new WebSocketEvent() {
        Type = WebSocketEventType.Disconnected,
        Context = context,
        WebSocket = socket
    });

    // 結束Subject
    handler.Events.OnCompleted();
} catch (Exception e) {
    // 發生例外，傳遞事件
    handler.Events.OnError(e);

    // 如果WebSocket還連線中則關閉連線
    if (socket.State == WebSocketState.Open) {
        await socket.CloseAsync(WebSocketCloseStatus.Empty, e.ToString(), CancellationToken.None);
    }
}
```

### 建立Middleware的擴充方法

經過上列的程式撰寫其實可以直接在`Startup.Configure`中用`UseMiddleware`方法使用，但為了方便使用我們另外定義一個`WebSocketsMiddlewareExtension`類別用來定義擴充方法，
方便我們使用，使得可以在`Startup.Configure`中使用`app.UseWebSockets<THandler>`方式簡單使用Middleware。
同時我們增加一個`Path`屬性並搭配了`Map`方法，讓Middleware只作用在指令的路由內。

```csharp
public static class WebSocketsMiddlewareExtension {
    /// <summary>
    /// 將WebSocket服務加入管線流程，使用指定的WebSocketHandler
    /// </summary>
    /// <typeparam name="THandler">處理容器型別，必須繼承自WebSocketHandler</typeparam>
    /// <param name="app">擴充對象</param>
    /// <param name="path">路徑</param>
    /// <param name="options">WebSocket選項</param>
    public static IApplicationBuilder UseWebSockets<THandler>(
        this IApplicationBuilder app,
        PathString path,
        WebSocketOptions options = null) 
        where THandler : WebSocketHandlerBase {

        if (options == null) {
            app.UseWebSockets();
        } else {
            app.UseWebSockets(options);
        }

        THandler handler = (THandler)Activator.CreateInstance(typeof(THandler));

        app.Map(path, app2 => {
            app2.UseMiddleware<WebSocketsMiddleware<THandler>>(options);
        });

        return app;
    }
}
```

### 使用Middleware

現在可以直接在`Startup.Configure`中使用`app.UseWebSockets<THandler>`設定Middleware了!

```csharp
app.UseWebSockets<EchoHandler>(
    "/ws", // 路由
    new WebSocketOptions() {
        ReceiveBufferSize = 1024 * 10 // 自訂緩衝區大小
    }
);
```