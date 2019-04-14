---
layout: post
title:  "ASP.NET Core實作API的ETag快取機制"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp API Cache
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在做網頁開發時，常針對靜態資源設定快取，在HTTP Cache有多種不同的方式設定，想要了解更多可以參考[這篇](https://blog.techbridge.cc/2017/06/17/cache-introduction/)文章，大致上快取方式可以分為兩類: **依據快取壽命** 、 **依據變更時間或標籤**

針對靜態檔案的快取這樣是沒有問題的，大部分的Web Server可以直接設定快取參數並依照內容產出ETag，而在API上若直接使用Web Server產生的Cache方法，將會導致API結果無法顯示即時結果，或者API的結果是依照呼叫的使用者身分決定等等一系列的問題。

而在這篇文章中將針對需要有即時變化、無使用者身分問題的API加入ETag快取機制。

<!--more-->

## 基本原理

HTTP ETag的快取機制可以參考[這篇](https://zh.wikipedia.org/wiki/HTTP_ETag)文章中的說明。
簡而言之，當伺服器回應內容時必須附加`ETag: "xxxxxx"`標頭，其中`"xxxxxx"`的值為開發者或Web Server定義的一個標誌符， **一旦內容變化產出將不同** ，當下一次請求同一個URL時將會附加`If-None-Match: "xxxxxx"`標頭，將上一次自同樣URL獲取的ETag一併送出給伺服器，當伺服器收到這個標頭將檢驗該URL的資源目前的ETag與使用者送過來的ETag是否一樣，如果一樣則直接回應304狀態碼，如果不同則當作第一次請求，並附帶ETag。

完整的流程圖可以參考下圖(來源: [https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#etag](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#etag))。

![Google Develop](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/images/http-cache-control.png?hl=zh-tw%EF%BC%89)

## 實作

由於ETag必須要能夠識別出內容有異動，但在API結果為資料庫查詢結果的情況下，要得知Response內容的變化就需要查詢後才知道之後有異動，但是查詢後再計算ETag要等待資料庫查詢時間，這並不是我希望的，況且都已經查詢完結果了不如直接把結果送回客戶端。

雖說查詢完後計算出ETag後回應也是可行的，可以節省`Content Download`的時間，但在`TTFB`時間上沒有差別。

在Restful API中Post、Put、Delete操作將會影響到內容，所以針對對URL的這三個操作發生時使用時間MD5雜湊作為操作資源的ETag(這裡沒有用`Last-Modified`只是因為不想處理時間格式)。
也就是在對資源進行異動時才變更ETag。

> 這篇文章不考慮在多個執行個體加上附載平衡的情況下，跨個體間ETag同步的問題。

### 案例

這篇文章中的示範案例中定義了以下兩隻API:

```
GET /api/News   最新消息列表
POST /api/News/{newsId} 建立最新消息內容
```

本文將針對這兩隻API進行ETag的產生與刷新做範例。



### Middleware實作

###