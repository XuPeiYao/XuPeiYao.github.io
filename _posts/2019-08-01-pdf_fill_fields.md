---
layout: post
title:  "使用iTextSharp進行PDF套版輸出"
categories: .NET
tags: .NET .NETCore PDF iTextSharp 套版
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

最近接到一個工作項目要實現成績套版列印功能，而且成績的表單是PDF格式，想到使用iTextSharp實作PDF表單的套版。
所幸NuGet上有支援.NET Core的套件可使用，本文將簡單示範PDF套版輸出的流程。

<!--more-->

## 準備模板PDF

首先要準備一個套版用的PDF，並且在上面加入PDF表單欄位，本文中使用的是一個履歷表的[PDF](https://www.lyee.gov.tw/attachments/article/471/01%E5%B1%A5%E6%AD%B7%E8%A1%A8.pdf)。
可以使用目前有的PDF編輯軟體在PDF中加入文字欄位，如果沒有PDF編輯軟體可以直接使用[PDFescape](https://www.pdfescape.com/open/)提供的線上PDF編輯器服務。

### 在PDFescape開啟檔案

進入PDFescape網站，點選`Upload PDF to PDFescape`選擇檔案上傳。

![Imgur](https://imgur.com/3fhUUiY)

### 加入輸入欄位

上傳成功後即可看到PDF編輯器畫面，此時選擇左方工具中的`Form Field`項目。

![Imgur](https://imgur.com/sx9M9Ik)

欄位類型選擇`Text`或所需要的類型點選`Select`。

![Imgur](https://imgur.com/e6AoDQH)

之後用滑鼠圈選出欄位範圍。

![Imgur](https://imgur.com/M1SEGzB)

> 在本文中的圖片欄位將使用Text類型圈選範圍。

最後在該欄位上點選滑鼠右鍵，選擇`Object Properties`項目。

![Imgur](https://imgur.com/NTtmHwr)

設定欄位屬性並且針對該欄位命名，這個在稍後的套版過程中會使用到。



### 匯出

## 開始套版

### 安裝套件

### 文字欄位設定

### 插入圖片

### 完成
