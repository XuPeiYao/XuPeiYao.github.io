---
layout: post
title:  ".NET Core ZIP解壓檔案亂碼問題"
categories: .NET
tags: .NET .NETCore Encoding
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在開發一個讓使用者上傳壓縮檔的功能，並且在站台上解壓縮的功能，但在壓縮檔內含中文檔案名稱時發生檔案名稱亂碼的狀況。本文將簡單說明我是如何解決這個問題的。

<!--more-->

## 問題重現

首先使用Windows建立一個空的文字檔案`中文檔案名稱.txt`，並在上面點選滑鼠右鍵開啟選單選擇「傳送到/壓縮(zipped)資料夾」，如此將會建立一個`中文檔案名稱.zip`檔案。

使用以下程式讀取這個ZIP檔案。

```csharp
using System;
using System.IO.Compression;
using System.Text;

public class Program {
    public static void Main(string[] args) {
        var archive = new ZipArchive(
                System.IO.File.Open(
                    @"中文檔案名稱.zip",
                    System.IO.FileMode.Open
                ),
                ZipArchiveMode.Read,
                true
            );

        Console.WriteLine(archive.Entries[0].FullName);
    }
}
```

以上程式將獲得以下結果:

![Imgur](https://imgur.com/6CV59Q7.png)

## 問題原因

會發生中文檔案名稱亂碼的原因是因為在Windows系統下，壓縮檔編碼使用預設編碼，而台灣的Windows系統預設編碼使用Big5，導致了這個問題。

若使用Linux環境直行以下指令壓縮檔案

```shell
zip 中文檔案名稱 中文檔案名稱.txt
```

以上程式讀取這個指令產生的壓縮檔則正常顯示，這是因為Linux使用UTF8進行檔案名稱編碼。

## 解決問題

要解決問題很簡單，只要在 `ZipArchive` 建構子內加入編碼參數，就可以解決這個問題，將範例程式修改如下:

```csharp
using System;
using System.IO.Compression;
using System.Text;

public class Program {
    public static void Main(string[] args) {
        var archive = new ZipArchive(
                System.IO.File.Open(
                    @"中文檔案名稱.zip",
                    System.IO.FileMode.Open
                ),
                ZipArchiveMode.Read,
                true,
                Encoding.GetEncoding("Big5") // 設定編碼為Big5
            );

        Console.WriteLine(archive.Entries[0].FullName);
    }
}
```

執行後將會出現以下錯誤:

![Imgur](https://imgur.com/vjGA9UE.png)

這是因為.NET Core並沒有內建Big5的CodePage，所以必須使用NuGet安裝 `System.Text.Encoding.CodePages` 套件或使用以下指令安裝。

```shell
dotnet add package System.Text.Encoding.CodePages
```

套件安裝完成後再 `Encoding.GetEncoding("Big5")` 之前加入下面程式註冊CodePage:

```csharp
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
```

修改完成後即可正常解析文字。

![Imgur](https://imgur.com/pjo7wyM.png)
