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

#### 1.建立一個空目錄`expressTest`並運行`npm init`。

#### 2.初始化完成後運行`npm i express`安裝express套件。

#### 3.修改`package.json`中的`main`為`src/index.js`

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
FROM node # 引入官方node映像
WORKDIR /app # 切換並使用/app作為工作目錄
EXPOSE 80 # 輸出80與443 Port
EXPOSE 443

COPY . . #複製程式碼至容器內的/app目錄
ENTRYPOINT ["node", "."]
```

## 部屬Docker容器
