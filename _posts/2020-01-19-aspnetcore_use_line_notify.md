---
layout: post
title: "ASP.NET Core使用LINE Notify發送通知"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp LINE Notify
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
  {:toc}

平時推送訊息除了可以使用 Web Notifications 也可以使用現在常用的通訊軟體提供的 Message API 將通知送給使用者，而本文將使用 LINE 所提供的 Notify 服務來推送訊息。

<!--more-->

## 註冊 LINE Notify 服務

前往並登入[LINE Notify 管理登入服務](https://notify-bot.line.me/my/services/)。登入後點選「登入服務」按鈕。

![Imgur](https://imgur.com/aUFQlpK.png)

依照畫面中要求的內容填寫服務內容。

![Imgur](https://imgur.com/GLlzukw.png)

服務網址以及 Callback URL 項目可先填寫一個無用的網址暫時替代。

填寫完畢點選下一步後，選擇「登入」。接下來請前往剛才填寫的信箱驗證。

![Imgur](https://imgur.com/3Pxje98.png)

驗證結束後在 LINE Notify 畫面中即可看到剛才所建立的服務項目。

![Imgur](https://imgur.com/f6g4goS.png)

進入建立的服務項目即可獲得該服務的 Client ID、Client Secret，這兩個稍候會使用到，且剛才隨意設定的 Callback URL 以及 服務網址 可在項目畫面中修改。

![Imgur](https://imgur.com/WYlKbcc.png)

## 建立服務

### 綁定 LINE 帳號的實作

### 推送通知
