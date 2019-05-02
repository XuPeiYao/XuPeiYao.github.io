---
layout: post
title:  "構建Express服務的Docker映像"
categories: Docker
tags: Docker NodeJs Express
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

本文將示範將一個簡單的Express服務包裝為Docker映像檔。

<!--more-->

## 建立Express應用程式

#### 1.建立NodeJs專案
建立一個空目錄`expressTest`並運行`npm init`。

#### 2.安裝Express套件
初始化完成後運行`npm i express`安裝express套件。

#### 3.加入範例
修改`package.json`中的`main`為`src/index.js`，且在src目錄內建立這個檔案，使用以下內容:

```javascript
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  // 收到 GET 則回應Hello World
  res.send('Hello World!');
});

app.listen(80, function () {
  console.log('runing');
});
```

#### 4.建立以下的目錄結構
```
expressTest
┠package.json
┠Dockerfile
┠node_modules
└src─index.js
```

## 建立Dockerfile與構建、發布映像

建立以下Dockerfile內容:

```dockerfile
FROM node:latest
#引入官方NodeJs映像

WORKDIR /app 
#切換並使用/app作為工作目錄

EXPOSE 80
EXPOSE 443
# 輸出PORT

COPY . . 
#複製程式碼至容器內的/app目錄

ENTRYPOINT ["node", "."]
```

在`expressTest`目錄下執行以下指令，其中`-t`參數標示標誌這個映像。
其中以下指令以`<`與`>`範圍，如未來有要PUSH至DockerHub的話需要填寫，如果僅在本地中使用可以忽略。

```shell
~# docker build -t <YOUR DOCKER HUB NAME>/express-test:latest .
```

運行上面指令後可以執行以下指令檢查映像是否成功產生:

```shell
~# docker image ls
```

## 部屬Docker容器

執行以下指令直接執行容器並瀏覽網頁至`localhost`即可看到畫面中顯示`Hello World`內容。

```shell
~# docker run -p 80:80 xupeiyao/express-test:latest
```
