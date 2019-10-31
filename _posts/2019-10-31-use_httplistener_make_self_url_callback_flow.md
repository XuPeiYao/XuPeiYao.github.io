---
layout: post
title: "WPF使用HttpListener實作自己的驗證流程或接收外部網頁操作的回調"
categories: .NET
tags: .NET HttpListener WPF
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
  {:toc}

在開發 Windows 桌面應用程式時，若需要使用到自訂的登入流程，較常見的是調用 API 或使用內嵌網頁框的方式實現登入過程，但若是登入過程中需要使用到外部登入或者需使用到網頁操作驗證流程，在這種情況下無法使用前面提到的兩種方式實作。

在必須要在過程中開啟外部瀏覽器操作的情況下，若是應用程式本身需要能夠接收用戶在外部瀏覽器的操作結果，就必須要像前篇文章提到的「[自己實作 Google OAuth2 流程](https://github.com/googlesamples/oauth-apps-for-windows)」範例中使用 HttpListener 建立臨時本地 HTTP 服務並在網頁過程的最後導引或送出資訊至 HttpListener。

本篇將簡單說明如何利用 HttpListener 使得外部網頁操作結果可以送至桌面應用程式。

<!--more-->
