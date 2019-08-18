---
layout: post
title:  "MVC Response檔案後刪除該檔案"
categories: .NET
tags: .NET .NETCore MVC
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在開發系統中偶有需要產生暫存檔或壓縮檔提供使用者下載，而這類檔案需要再下載後刪除，可以使用定時清除的方式或使用Middleware在Response結束時刪除檔案。但其實.NET本身就有提供類似的功能，本文將提供.NET內建的功能實現下載後刪除的範例。

<!--more-->

## 範例

在回傳檔案的時候使用FileStream類別回傳，且設定FileOptions為DeleteOnClose，如此在Response完成後關檔時將刪除這個檔案。

```csharp
[HttpGet("download")]
public ActionResult DownloadFile() {
    var file = new System.IO.FileStream(
        "temp.xml",
        System.IO.FileMode.Open,
        System.IO.FileAccess.Read,
        System.IO.FileShare.Read,
        4096,
        System.IO.FileOptions.DeleteOnClose); // 這個選項將可以在關檔時刪除開啟的檔案
    return File(file, "text/xml");
}
```
