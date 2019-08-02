---
layout: post
title:  ".NET Core的WebP轉檔包裝套件"
categories: .NET
tags: .NETCore .NET CSharp WebP 套件
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

WebP是一個較新的圖片格式，提供無損與有損壓縮，這個格式可以建立較小的圖片讓網站更快。

較詳細的資訊可以參考[WebP官網](https://developers.google.com/speed/webp/)，本文將簡單的介紹如何使用WebP轉檔套件。

另外這個套件是我利用官網提供的執行檔包裝出來的。

<!--more-->

## 安裝套件

使用套件管理器安裝`WebPWrapper`或在專案執行以下指令:

```shell
dotnet add package WebPWrapper
```

## 使用

引用類別庫。

```csharp
using WebPWrapper;
using WebPWrapper.Encoder;
using WebPWrapper.Decoder; 
```

首先必須要使用套件內的下載器下載WebP轉檔器:

```csharp
WebPExecuteDownloader.Download();
```

### 編碼

```csharp
var builder = new WebPEncoderBuilder();

var encoder = builder
	.Resize(100, 0) // 調整寬度為100，等比縮放(因為高度為0)
	.AlphaConfig(x => x // 透明處理設定
		.TransparentProcess(
			TransparentProcesses.Blend, // 透明部分將底色視為黃色混合
			Color.Yellow
		)
	)
	.CompressionConfig(x => x // 壓縮設定
		.Lossless(y => y.Quality(75)) // 使用無損壓縮且壓縮品質設為75
	) 
	.Build(); // 建立編碼器

using (var outputFile = File.Open("output.webp", FileMode.Create))
using (var inputFile = File.Open("input.png", FileMode.Open)) {
	encoder.Encode(inputFile, outputFile); // 編碼
}
```

### 解碼

```csharp
var builder = new WebPDecoderBuilder();

var encoder = builder
	.Resize(32, 0) // 調整寬度為32，等比縮放(因為高度為0)
	.Build(); // 建立解碼器
 
using (var outputFile = File.Open("output.png", FileMode.Create))
using (var inputFile = File.Open("input.webp", FileMode.Open)) {
	encoder.Decode(inputFile, outputFile); // 解碼
}
```
