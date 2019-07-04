---
layout: post
title:  "使用ILSpy和Reflexil編輯IL"
categories: .NET
tags: .NET CSharp ILSpy
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

[ILSpy](https://github.com/icsharpcode/ILSpy)是個針對.NET的開源的反組譯工具，可以將EXE或DLL的IL反組譯為C#程式碼；而加上了[Reflexil](http://reflexil.net/)套件則可以進一步的去編輯EXE或DLL的內容。
本文將簡單的說明ILSpy的下載安裝、以及加入Reflexil套件。

<!--more-->

## 安裝ILSpy

瀏覽ILSpy的GitHub Repository中的[Releases](https://github.com/icsharpcode/ILSpy/releases)頁面下載最新版本(2019/7/5為4.0.1)的壓縮檔。

![Imgur](https://i.imgur.com/LatkCe7.png)

將下載的檔案解壓縮到目錄中。

## 安裝Reflexil

瀏覽Reflex的[官網](http://reflexil.net/)，點選`Download`後將被導引到該專案的GitHub Repository中的Releases頁面中，點選最新版下載AIO壓縮檔。

![Imgur](https://i.imgur.com/4jydg3o.png)

將這個壓縮檔解壓縮至上一個步驟下載ILSpy解壓縮的相同目錄下。

## 開啟ILSpy

進入剛才解壓縮的目錄，點選`ILSpy.exe`即可看到以下畫面。

![Imgur](https://i.imgur.com/z91fY2A.png)

## 反組譯一個.NET Core Console專案

這邊直接使用一個只有Hello World功能的Console專案編譯後的結果作為反組譯範例。

![Imgur](https://i.imgur.com/0c02w9L.png)

將`ConsoleApp1.dll`拖入ILSpy左方列表中。
在左方展開選擇Program類別即可在右方看到將IL轉換為C#的結果。

![Imgur](https://i.imgur.com/qbE20wn.png)

## 使用Reflexil替換字串

本文打算把`Hello World`替換成中文的`你好世界`，首先開啟Reflexil套件，點選ILSpy工具列的齒輪按鈕。

![Imgur](https://i.imgur.com/qDRoxu1.png)

將左邊選項選擇至Main方法中，在右下角的Reflexil視窗中即可看到這個方法的IL。

![Imgur](https://i.imgur.com/XaAku3V.png)

找到要替換的字串區域，使用滑鼠右鍵點選開啟選單，點選`Edit`。

![Imgur](https://i.imgur.com/sGFYDFU.png)

在彈出視窗終將`Hello World`字串替換為`你好世界`後點選`Update`。

![Imgur](https://i.imgur.com/ek2MwEA.png)
![Imgur](https://i.imgur.com/Rzhw7GW.png)

替換完成後載左方列表中點選目前編輯的DLL項目，使用滑鼠點選右鍵開啟選單，點選`Save As`，將原有的`ConsoleApp1.dll`先改為`ConsoleApp1.Backup.dll`(當然也可以直接覆蓋)，將目前編輯的結果直接儲存原名稱。

![Imgur](https://i.imgur.com/rzaPQEn.png)

## 替換前後比較

![Imgur](https://i.imgur.com/hnE4OLt.png)
