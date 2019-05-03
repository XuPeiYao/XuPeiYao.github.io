---
layout: post
title:  ".NET Core也可以使用的中文分詞套件"
categories: .NET
tags: .NETCore .NET jieba 分詞 文字處理 搜尋 套件
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

[結吧分詞](https://github.com/fxsjy/jieba)是在`python`中使用的中文分詞套件，可以將句子切割成詞語方便搜尋與建立關鍵字。

現在在NuGet上也有人提供支援.NETCore的結吧分詞套件「[Lucene.JIEba.net](https://www.nuget.org/packages/Lucene.JIEba.net/)」，這個套件已經集成了必要的資訊，所以可以開箱即用。

<!--more-->

## 安裝套件

使用套件管理器安裝`Lucene.JIEba.net`或在專案執行以下指令:

```shell
dotnet add package Lucene.JIEba.net
```

## 使用

引用類別庫。

```csharp
using JiebaNet.Segmenter;
```

宣告分詞器並且輸入文字進行分詞。

```csharp
var segmenter = new JiebaSegmenter();
var keywords = segmenter.CutForSearch(myText); //切割為搜尋用的分詞
```

> 有關結吧分詞詳細的資訊請參考[原專案](https://github.com/fxsjy/jieba)
