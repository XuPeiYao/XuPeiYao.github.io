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

```
dotnet add package Aliyun.OSS.SDK.NetCore
```

## 列出Bucket中的所有物件

## 建立軟連結
