---
layout: post
title:  "ASP.Net Core使用WebSocket"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp WebSocket
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

WebSocket是基於HTTP的全雙工通訊協定，能夠實作伺服器與客戶端資料的推送傳輸，伺服器可以透過WebSocket向客戶端推送資料，這使用傳統HTTP方式是無法達成的。
ASP.NET Core提供WebSocket套件，簡單就可以實作，本文將使用套件並加以整理簡化使用。

<!--more-->

