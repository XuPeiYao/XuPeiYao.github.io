---
layout: post
title:  "使用TypeScript撰寫Express"
categories: NodeJs
tags: NodeJs Express TypeScript
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

前篇文章「[構建Express服務的Docker映像](https://xpy.gofa.cloud/2019/05/02/make_a_express_web_service_docker_image/)」中使用JavaScript簡易的寫了一個HelloWorld網站
，但我們希望可以使用TypeScript，借助TypeScript的型別輔助讓開發過程更順利。

本文將簡單的使用上篇文章中使用的範例專案加入TypeScript支援。

<!--more-->

在開始之前先取得上面提到的文章的範例專案。

## 安裝套件

在專案目錄中執行以下指令:

```shell
~# npm i @types/express typescript nodemon --save-dev
```

這句命令在`devDependencies`安裝了`typescript`作為TypeScript編譯、`nodemon`用來監聽文件變更自動重Build、`@types/express`為Express框架的類型定義檔。

## 修改package.json

將package.json修改如下:

```javascript
{
  "name": "express-test",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "start": "node ./dist/index.js", // 執行TypeScript編譯後的Express結果
    "tsc": "tsc", // TypeScript編譯
    "debug": "nodemon --watch src -e ts --exec \"npm run tsc && npm run start\"" // 監聽src目錄下的ts檔案變化，如果變化則重新編譯並重新啟動Express服務
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.16.4"
  },
  "devDependencies": {
    "@types/express": "^4.16.1",
    "nodemon": "^1.19.0",
    "typescript": "^2.9.2"
  }
}
```

## 建立index.ts

修改原有的`index.js`，變更副檔名為`index.ts`，且更新檔案內容如下:

```typescript
import express from 'express';
var app = express();

app.get('/', function (req, res) {
  // 收到 GET 則回應Hello World
  res.send('Hello World');
});

app.listen(80, function () {
  console.log('runing');
});
```

## 執行

在專案目錄中執行以下指令:

```shell
npm run debug
```

執行後Express服務將於`index.ts`指定的Port中運行，此時打開瀏覽器瀏覽根目錄就會看到`Hello World`字樣。

剛才我們有在`package.json`的`debug`腳本中使用了`nodemon`這個套件監聽`src`目錄下的`*.ts`檔案的變化，現在隨意修改`index.ts`後儲存，將會觸發重新編譯與執行，在瀏覽器重新整理即可看到效果。
