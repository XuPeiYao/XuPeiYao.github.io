---
layout: post
title:  "阿里雲OSS列出所有物件並建立軟連結"
categories: .NET
tags: .NETCore .NET CSharp OSS Aliyun
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

最近要把原有系統的Storage機制調整為使用阿里雲OSS，在花了一些時間將檔案轉移到OSS後發現阿里雲的URL是區分大小寫的，這意味著原有系統紀錄的檔案名稱可能會對不上，
原本機制直接使用Guid作為檔案名稱，但在資料庫紀錄時是小寫的，包含一些HTML類型資訊的字串欄位中參考的img src等等。
所以只好寫支小程式利用OSS的軟連結功能對所有的檔案建立小寫檔名的軟連結。

<!--more-->

## 引用阿里雲OSS NuGet套件

首先建立一個空的.NET Core的Console專案，使用套件管理器安裝Aliyun.OSS.SDK.NetCore或在專案執行以下指令:

```shell
dotnet add package Aliyun.OSS.SDK.NetCore
```

## 列出Bucket中的所有物件

建立一個OssClien實例。

```csharp
OssClient client = new OssClient("<endpoint>","<accessKeyId>","<accessKeySecret>");
```

調用ListObjects方法取得物件列表分頁。

```csharp
string bucketName = "<bucketName>"; 
ObjectListing result = null; 
string nextMarker = string.Empty;
List<string> ObjectKeys = new List<string>();
do {
    // 建立目前分頁的請求物件
    var listObjectsRequest = new ListObjectsRequest(bucketName) {
        Marker = nextMarker,
        MaxKeys = 100 // 最多取得100筆
    };
    
    // 取得上面請求物件表示的物件列表分頁結果
    result = client.ListObjects(listObjectsRequest);
    
    // 取出本次分頁結果清單
    foreach (var item in result.ObjectSummaries) {
        if (item.Key == item.Key.ToLower()) { // 略過本來就是小寫的(本案例小寫的都是軟連結)
            ObjectKeys.Add(item.Key);
        }
    }

    nextMarker = result.NextMarker;
} while (result.IsTruncated); // 判斷是否到結尾
```

## 建立軟連結

經過上列操作我們已經取得要建立軟連結的目標，接下來調用OSS的CreateSymlink方法建立軟連結。

```csharp
foreach (var item in ObjectKeys) {
    client.CreateSymlink(
        bucketName, 
        symlink: item.ToLower(),
        target: item);
}
```

> 有關SDK使用可以參考Aliyun在GitHub中的[Repository](https://github.com/aliyun/aliyun-oss-csharp-sdk)
