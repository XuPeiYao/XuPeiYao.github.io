---
layout: post
title:  "支援AWS S3 API的Storage服務－Minio"
categories: Docker
tags: Docker
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在網頁開發上，時常有檔案儲存的需求，現在各大雲端服務提供商都有提供Storage服務，但各家有自己的API形式，這也造成了在未來如果要替換網站的儲存服務，像是從AWS換為Azure，在資料串接方面就需要依照Azure的形式替換掉SDK與相關的程式，但只是為了更換儲存服務提供商就要變更原有程式很不方便。
而 [Minio](https://min.io/) 可做為一個代理服務，本身使用AWS S3 API而且支援作為其他現有雲端儲存服務的代理，如Azure、GCP或是NFS、直接使用本地作為儲存地，開發時只要透過Minio做代理，可以克服未來變換儲存服務提供商要修改的問題，只要修改Minio的設定即可。

<!--more-->

## 安裝

> 本文使用 **docker** 作為安裝佈署方式，僅針對本地儲存做教學，若需要針對Azure、GCP等服務的代理服務，可以參考Minio的[文件](https://docs.min.io/docs/minio-gateway-for-azure.html)。

### 建立本地Volume

運行以下指令建立本地儲存空間，稍後將映射進去Minio容器的儲存位置

```shell
~# docker volume create --name myMinio
```

建立完成後可透過以下指令查看是否建立成功:

```shell
~# docker volume ls
```

### 拉取映像並佈署Minio容器

運行下列指令，並將下列由`<`與`>`框起範圍替換為自己環境的設定。

```shell
~# docker run -d -p <HOST_PORT>:9000 -e MINIO_ACCESS_KEY=<ACCESS_KEY> -e MINIO_SECRET_KEY=<SECRET_KEY> -v myMinio:/data --name <CONTAINER_NAME> minio/minio server /data
```

運行後即可開啟瀏覽器至指定主機指定的`HOST_PORT`中就可以看到如下圖畫面，可以使用上列指令中指定的`ACCESS_KEY`與`SECRET_KEY`進行登入。

![Imgur](https://i.imgur.com/HGtFDJt.png)

### 服務串接

> Minio針對JavaScript、Python、Go、.NET有提供各自的SDK，而本文中使用 **.NET Core** 作為範例。如需其他語言的SDK使用說明可參考官方[文件](https://docs.min.io/docs/javascript-client-quickstart-guide.html)左方的 **MINIO SDKS** 章節。

#### 使用NuGet安裝Minio套件

```powershell
Install-Package Minio -Version 3.0.8
```

#### 建立Client

```csharp
var client = new MinioClient(
    "192.168.1.2:10000", // 替換為自己的服務位址
    "ACCESS_KEY", // 替換為前面提到的自訂權杖資訊
    "SECRET_KEY"
).WithSSL(); // 可選的，若連線透過Https則需要此項目
```

#### 建立儲存桶

```csharp
// 檢查要建立的儲存桶是否存在
if(!(await client.BucketExistsAsync("FirstBucket")){
    // 不存在則建立儲存桶
    await client.MakeBucketAsync("FirstBucket");
}
```

#### 上傳檔案

```csharp
var file = File.Open("test.png", FileMode.Open);

// 上傳檔案
await client.PutObjectAsync("FirstBucket", "test.png", file, file.Length, "image/png");

// 取得限時的檔案網址
await client.PresignedGetObjectAsync("FirstBucket"), "test.png", 60 * 60 * 24);
```

上列範例中的網址部分是取得限時網址，如需要取得永久存取網址可以在Minio管理介面終將指定特定名稱開頭的檔案列為公開，之後可以直接使用`http://${EndPoint}/${BucketName}/{ObjectName}`的方式存取到檔案。

#### 刪除檔案
```csharp
await client.RemoveObjectAsync("FirstBucket", "test.png");
```
<br/>
<br/>
針對.NET的SDK若需要更深入了解可以參考GitHub上的[Minio .NET SDK Repositories](https://github.com/minio/minio-dotnet)。