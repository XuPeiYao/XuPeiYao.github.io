---
layout: post
title:  "使用Docker佈署Redis資料庫並使用C#存取"
categories: Docker
tags: Docker NoSQL Redis 
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

Redis是一個NoSQL資料庫，是一種基於Key-Value的鍵值儲存的資料庫；資料儲存於記憶體中達到高性能的存取，使用者可以設定持久化來保存記憶體中的資料。

Redis有著極高的性能以及提供常見的資料結構類型等功能，本文將做基礎的部屬教學以及使用C#進行存取的範例。

<!--more-->

## 安裝

> 本文使用 **docker** 作為安裝佈署方式，若需要針對實機安裝，可以參考Redis的[文件](https://redis.io/topics/quickstart)。

### 建立本地Volume

運行以下指令建立本地儲存空間，稍後將映射進去Redis容器，用來作為持續性儲存的空間。

```shell
~# docker volume create --name redis
```

建立完成後可透過以下指令查看是否建立成功:

```shell
~# docker volume ls
```

### 拉取映像並佈署Redis容器

運行下列指令，並將下列由`<`與`>`框起範圍替換為自己環境的設定。`requirepass`參數為使用密碼驗證，若不須要此功能可移除該設定。

```shell
~# docker run -d -p 6379:6379 -v redis:/data --name <CONTAINER_NAME> redis:latest --requirepass <YOUR_PASSWORD>
```

接下來開啟Redis CLI或GUI工具連接Redis。而我使用`Medis`輸入剛才部屬設定的資訊後連線即可。

![Imgur](https://i.imgur.com/moefXHE.png)

連接進入Redis後可以點選`+`符號新增資料。到此步驟，一個基本的Redis已經部屬完成。

![Imgur](https://i.imgur.com/INPZW3N.png)

## 使用C#存取

### 安裝套件

建立一個.NET Core專案後執行以下指令安裝`StackExchange.Redis`套件或使用NuGet套件管理器安裝。

```shell
dotnet add package StackExchange.Redis
```

### 建立連線並存取

首先引入類別庫。

```csharp
using StackExchange.Redis;
```

接下來建立與Redis的連線與資料庫並存取。

```csharp
var redisConnection = ConnectionMultiplexer.Connect("<SERVER_HOST>:<PORT>,password=<PASSWORD>");
var redisDatabase = redisConnection.GetDatabase();

// 設定Key-Value
redisDatabase.StringSet("TestKey", "AAAA");

// 取得指定的值
var value = redisDatabase.StringGet("TestKey");
```

以上只是針對String類型的Value設定，其他方法可以參考[Redis的文件](https://redis.io/topics/data-types)以及[StackExchange.Redis的文件](https://stackexchange.github.io/StackExchange.Redis/)。
