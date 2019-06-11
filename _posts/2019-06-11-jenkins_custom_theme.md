---
layout: post
title:  "替換Jenkins樣式"
categories: .NET
tags: Jenkins
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

最近覺得Jenkins的介面樣式不太好看，想要嘗試換換樣式，而Jenkins本身並沒有替換樣式功能，慶幸的是Jenkins的Plugin有提供自訂CSS的擴充功能，我們可以透過這個功能覆蓋掉原有的樣式，達到這篇文章的目標，本篇文章將介紹自訂樣式擴充元件的安裝以及現成樣式的取得。

<!--more-->

## 安裝Jenkins自訂樣式擴充

首先登入Jenkins管理者帳號後，選擇「管理Jenkins」並選擇管理頁面中的「管理外掛程式」。

![Imgur](https://i.imgur.com/MmpoTJb.png)

切換頁簽至「可用的」後再右上方過濾條件輸入「theme」，將過濾出的套件「Simple Theme」勾選後直接安裝。

![Imgur](https://i.imgur.com/vrZd2Tc.png)

## 取得樣式

打開瀏覽器至「[jenkins-material-theme](http://afonsof.com/jenkins-material-theme/)」。

![Imgur](https://i.imgur.com/JPHeVmQ.png)

在這個網站介面中選擇樣式主色調，並選擇Logo。這個動作完成後即可點選「DOWNLOAD YOUR THEME!」按鈕下載樣式。

![Imgur](https://i.imgur.com/O5ttGOW.png)

## 設定樣式

進入「管理Jenkins」中的「設定系統」。

![Imgur](https://i.imgur.com/niaHiCn.png)

在「設定系統」介面中找到「Theme」項目。

![Imgur](https://i.imgur.com/eRMUNKO.png)

點選「新增」按鈕，選擇「Extra CSS」項目，將上面下載的CSS檔案的內容複製貼上至CSS輸入框中後點選「儲存」。

![Imgur](https://i.imgur.com/R1Dp5fs.png)

## 樣式效果

設定樣式回到首頁後即可看到樣式效果。

![Imgur](https://i.imgur.com/Emx63CO.png)

## 其他的樣式

除了上面提供的樣式外，我在GitHub也找了一些其他的樣式:

1. [jenkins-atlassian-theme](https://github.com/djonsson/jenkins-atlassian-theme)
2. [jenkins-neo-theme](https://github.com/jenkins-contrib-themes/jenkins-neo-theme)
3. [mirage](https://github.com/crocofdev/mirage)
4. [jenkins-reloaded-theme](https://github.com/artberri/jenkins-reloaded-theme)
5. [ModernJenkins-Theme](https://github.com/mikepenz/ModernJenkins-Theme)