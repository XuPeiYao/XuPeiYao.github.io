---
layout: post
title:  ".NET Core串接RabbitMQ"
categories: .NET
tags: .NETCore .NET CSharp RabbitMQ
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

最近使用RMQ來溝通各MicroService，而不是使用各自服務API來溝通，簡化服務溝通的方法。

本文將簡單的使用FFMpeg轉檔作為範例，示範將轉檔程式與主程式分離為各自微服務，透過RabbitMQ進行工作派發示範。

<!--more-->

> 本文不做RabbitMQ的佈署教學

## 基本概念

這邊只針對Queue的處理做一個簡單的說明，關於RabbitMQ的處理請參考[官方文件](https://www.rabbitmq.com/documentation.html)將一個Message放入RabbitMQ的Queue中，RMQ將會透過Exchange把訊息分配給對應的Consumer，當Consumer正確的處理訊息後則要回復ACK訊息，此時RMQ將把這個UNACK的訊息自Queue剔除。
如果處理不正常或拒絕處理也可以使用NACK將訊息重新地放回Queue，或直接REJECT。

## 實作

本範例使用.NET Core Console開發兩個Console程式，分別為工作派發程式跟工作程式。

### 工作派發程式

首先建立RMQ連線與Channel

```csharp
var factory = new ConnectionFactory() { HostName = "192.168.1.2" };
var connection = factory.CreateConnection();
var channel = connection.CreateModel();
```

接下來Channel建立三個Queue，分別為`convert`、`convert-success`、`convert-fail`，並且將其設定為durable的，使在RMQ當機失效時重啟後依舊維持狀態。

```csharp
channel.QueueDeclare(
        queue: "convert",
        durable: true, // 持久性，確保RMQ出問題可以繼續存在
        exclusive: false, // 不獨佔
        autoDelete: false, // 不自動清除
        arguments: null);
channel.QueueDeclare(
        queue: "convert-success",
        durable: true, // 持久性，確保RMQ出問題可以繼續存在
        exclusive: false, // 不獨佔
        autoDelete: false, // 不自動清除
        arguments: null);
channel.QueueDeclare(
        queue: "convert-fail",
        durable: true, // 持久性，確保RMQ出問題可以繼續存在
        exclusive: false, // 不獨佔
        autoDelete: false, // 不自動清除
        arguments: null);
```

建立好Queue後則建立兩個Consumer用以接收轉檔成功與失敗的訊息。

```csharp
var convertSuccess = new EventingBasicConsumer(channel);
convertSuccess.Received += (model, ea) => { // 收到轉檔成功訊息的事件
    var path = Encoding.UTF8.GetString(ea.Body);
    Console.WriteLine("轉檔成功: " + path);
};

var convertFail = new EventingBasicConsumer(channel);
convertFail.Received += (model, ea) => { // 收到轉檔失敗訊息的事件
    var message = Encoding.UTF8.GetString(ea.Body);
    Console.WriteLine("轉檔失敗: " + message);
};

channel.BasicConsume( // 綁定Consumer
    queue: "convert-success",
    autoAck: true, // 自動ACK，當收到訊息後自動回復ACK
    consumer: convertSuccess);
channel.BasicConsume( // 綁定Consumer
    queue: "convert-fail",
    autoAck: true, // 自動ACK，當收到訊息後自動回復ACK
    consumer: convertFail);
```

接下來在最後加入兩個轉檔測試的項目，由於本文只是簡單的示範而已，所以轉檔檔案都放在同一台電腦，如果是使用WebAPI或其他的架構部屬，傳輸的資訊可以傳送NFS路徑或使用SharedStorage來共享。

```csharp
channel.BasicPublish(string.Empty, "convert", null, Encoding.UTF8.GetBytes(@"D:\不存在檔案.mp4")); // 不存在的檔案，故意觸發轉檔失敗
channel.BasicPublish(string.Empty, "convert", null, Encoding.UTF8.GetBytes(@"D:\SampleFiles\SampleVideo_1280x720_10mb.mp4")); // 實際存在的檔案
```

### 工作程式(FFMPEG轉檔程式)

首先建立一個將影片轉換為SD畫質的FFMPEG轉檔器(這裡使用的是我自己的XWidget.FFMpeg套件做Wrapper)。

```csharp
var sdConverter = new FFMpegConverterBuilder()
    .SetExecutePath(@"D:\FFMpeg-Runtime\bin\ffmpeg.exe") // 設定執行檔位置
    .ConfigVideo(v => { // 執行檔案
        v.SetSize(CommonSize.SD);
    })
    .Build();
```

建立RMQ連線。

```csharp
var factory = new ConnectionFactory() { HostName = "192.168.1.2" };
    var connection = factory.CreateConnection();
    var channel = connection.CreateModel();
```

建立接收轉檔任務的Consumer。

```csharp
var consumer = new EventingBasicConsumer(channel);
consumer.Received += (model, ea) => {
    var path = Encoding.UTF8.GetString(ea.Body); // 取得傳輸訊息(轉檔路徑)
    var temp_outputPath = @"D:\OutputFiles\" + Guid.NewGuid() + ".mp4";
    sdConverter.Convert(path, temp_outputPath) // 轉檔
        .Subscribe(
            (ConvertResult result) => {
                channel.BasicAck(ea.DeliveryTag, false); // 任務處理完畢，剔除Queue
                if (result.ExitCode == 0) {
                    // 送出轉檔成功訊息
                    channel.BasicPublish(string.Empty, "convert-success", null, Encoding.UTF8.GetBytes(temp_outputPath));
                } else {
                    // 送出轉檔失敗訊息
                    channel.BasicPublish(string.Empty, "convert-fail", null, Encoding.UTF8.GetBytes(path));
                }
            }, (Exception e) => {
                channel.BasicAck(ea.DeliveryTag, false); // 任務處理完畢，剔除Queue
                // 送出轉檔失敗訊息
                channel.BasicPublish(string.Empty, "convert-fail", null, Encoding.UTF8.GetBytes(path + Environment.NewLine + e.ToString()));
            });
};
channel.BasicConsume( // 綁定Consumer
    queue: "convert",
    autoAck: false,
    consumer: consumer);
```

### 實際運作

上面Console執行後在工作分配程式中可以獲得以下結果:

```
轉檔失敗: D:\不存在檔案.mp4
轉檔成功: D:\OutputFiles\71515394-908a-4f07-a4f8-d3329e88d368.mp4
```

> 本篇參考資料:
> 1. [https://www.cnblogs.com/rader/archive/2012/06/28/2567779.html](https://www.cnblogs.com/rader/archive/2012/06/28/2567779.html)
> 2. [https://blog.gtwang.org/programming/rabbitmq-work-queues-in-python/](https://blog.gtwang.org/programming/rabbitmq-work-queues-in-python/)
> 3. [https://www.cnblogs.com/stulzq/p/7551819.html](https://www.cnblogs.com/stulzq/p/7551819.html)
> 4. [https://docs.microsoft.com/zh-tw/dotnet/standard/microservices-architecture/multi-container-microservice-net-applications/rabbitmq-event-bus-development-test-environment](https://docs.microsoft.com/zh-tw/dotnet/standard/microservices-architecture/multi-container-microservice-net-applications/rabbitmq-event-bus-development-test-environment)
> 5. [http://www.csharpkit.com/2017-10-08_52009.html](http://www.csharpkit.com/2017-10-08_52009.html)
> 6. [https://cloud.tencent.com/developer/article/1151202](https://cloud.tencent.com/developer/article/1151202)
> 7. [https://www.rabbitmq.com/dotnet.html](https://www.rabbitmq.com/dotnet.html)
> 8. [https://codeday.me/bug/20190523/1156038.html](https://codeday.me/bug/20190523/1156038.html)
> 9. [https://blog.csdn.net/nandao158/article/details/81065892](https://blog.csdn.net/nandao158/article/details/81065892)