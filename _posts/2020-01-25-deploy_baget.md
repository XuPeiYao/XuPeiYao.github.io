---
layout: post
title: "使用Docker佈署BaGet，自建NuGet服務"
categories: Docker
tags: Docker NuGet
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

NuGet是在開發.NET應用時常用的套件管理平台，可以解決過去複製DLL參考的問題，但某些情況並不希望將自己的套件發布至公開的NuGet平台，這時候就需要自行架設NuGet服務。BaGet就是一個提供自建NuGet的一個選項，這個專案提供Docker的安裝方法，本文將介紹如何使用Docker搭建BaGet平台並使用。

<!--more-->

## 安裝

### 建立本地Volume

運行以下指令建立本地儲存空間，稍後將映射進容器內作為備份位置。

```shell
~# docker volume create --name baget
```

建立完成後可透過以下指令查看是否建立成功:

```shell
docker volume ls
```

### 建立環境變數檔案

建立一個`baget.env`檔案，內容如下:

```
# The following config is the API Key used to publish packages.
# You should change this to a secret value to secure your server.
ApiKey=NUGET-SERVER-API-KEY

Storage__Type=FileSystem
Storage__Path=/var/baget/packages
Database__Type=Sqlite
Database__ConnectionString=Data Source=/var/baget/baget.db
Search__Type=Database
```

請將`ApiKey`項目修改為自己的KEY。

### 拉取映像並佈署BaGet容器

執行以下指令拉取映像。

```bash
docker pull loicsharma/baget
```

使用以下指令佈署容器，請將`env-file`項目替換為前面提到的`baget.env`檔案路徑。這個範例使用5555 Port。

```bash
docker run -d --name BaGet -p 5555:80 --env-file baget.env -v baget:/var/baget loicsharma/baget:latest
```

### 確認佈署成功

上述步驟執行結束後BaGet服務已經架設完畢，此時可以開啟瀏覽器瀏覽5555 Port即可看到以下畫面。

![Imgur](https://imgur.com/0SPc2W0.png)

## 上傳套件

### 設定NuGet Client

運行以下指令新增NuGet Source:

```bash
nuget sources add -Name "MyNuGet" -Source http://YOUR_DOMAIN:5555/v3/index.json
```

在執行以下指令設定API KEY:

```bash
nuget setapikey NUGET-SERVER-API-KEY -Source "MyNuGet"
```

### 上傳NuGet套件

首先建立自己套件的nupkg檔案並使用以下指令指定Source為自己的NuGet Server推送。

```bash
nuget push Test.nupkg -Source "MyNuGet"
```

成功上傳後即可在BaGet的網頁中看到套件。

![Imgur](https://imgur.com/x0wh9jv.png)

## 下載套件

### 加入NuGet套件來源

本文以Visual Studio為例，首先開啟NuGet管理員，點選套件來源設定，並依照BaGet的路徑進行設定如下:

![Imgur](https://imgur.com/D6Rm0hC.png)

### 搜尋並安裝套件

經過上述操作後將套件管理員的來源調整為MyNuGet後搜尋即可找到自己的NuGet中的套件，此時只要依照往常安裝NuGet套件的方法就好。

![Imgur](https://imgur.com/ZD8x1rT.png)