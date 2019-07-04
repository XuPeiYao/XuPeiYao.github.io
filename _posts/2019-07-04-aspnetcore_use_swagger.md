---
layout: post
title:  "ASP.NET Core使用NSwag產生API文件"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp NSwag Swagger
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在前後端分離開發網站的情形或提供其他客戶端界接API時，通常都需要提供API文件，但當系統隨時間增大、擴充與廢氣功能，傳統自行編輯的文件若沒長更新常與實係有時間落差，而NSwag套件可以自動產生API文件；另外進行API測試時也要另外開ARC或Postman等工具較麻煩，若使用SwaggerUI則可以直接在網頁上輸入參數進行測試。
本文將講解如何在ASP.NET Core的WebAPI專案中加入NSwag。

<!--more-->

## 安裝套件

使用套件管理器安裝`NSwag.AspNetCore`或在專案執行以下指令:

```shell
dotnet add package NSwag.AspNetCore
```

## 加入DI

在`Startup.ConfigureServices`方法中加入以下段落，加入Swagger文件產生器:

```csharp
// 加入Swagger文件產生器以及設定Swagger文件標題與敘述
services.AddSwaggerDocument(config => {
    config.Title = "文件標題";
    config.Description = "文件敘述";
});
```

或者另外使用OpenAPI文件產生器

```csharp
// 加入OpenAPI文件產生器以及設定OpenAPI文件標題與敘述
services.AddOpenApiDocument(config => {
    config.Title = "文件標題";
    config.Description = "文件敘述";
});
```

## 加入Middleware

在`Startup.Configure`方法中加入以下段落:

```csharp
// 加入Swagger或OpenAPI文件路由
app.UseOpenApi();

// 加入SwaggerUI
app.UseSwaggerUi3();
```

此時瀏覽`/swagger`可以看到SwaggerUI的畫面。

![Imgur](https://i.imgur.com/6x6nEtT.png)

NSwag套件除了有提供SwaggerUI以外，也另外提供了ReDoc。

```csharp
// 加入ReDoc
app.UseReDoc();
```

![Imgur](https://i.imgur.com/sUG3Q6W.png)

## 為Swagger文件加入說明

從上面步驟得出的文件中沒有任何的說明文字，而NSwag的Swagger文件產生器可以從編譯後的XML檔案中提取方法註解。將專案屬性中的`建置/輸出/XML文件檔案`勾選(各組態視情況勾選)。

將XML輸出目錄設定為編譯輸出目錄中。

![Imgur](https://i.imgur.com/a1Ib84k.png)

如此設定再次執行即可在SwaggerUI或ReDoc中看到對應方法的說明。

![Imgur](https://i.imgur.com/20okvjo.png)