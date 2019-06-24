---
layout: post
title:  "ASP.NET Core加入MiniProfiler"
categories: .NET
tags: .NETCore .NET CSharp ASP.NET MVC MiniProfiler
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在開發過程中常需要精確地知道每個處理步驟的耗時，在過去常常直接使用Stopwatch甚至直接使用DateTime.Now來做相減。

但在多個步驟中要加入許多計時器，物件的管理與最後的結果呈現上也比較不方便。

而MiniProfiler可以簡單的解決這個問題，透過簡單的DI與加入Middleware就可以簡單的呈現與加入計時區間。

這篇文章將介紹如何在一個ASP.NET Core專案中加入MiniProfiler支援。

<!--more-->
