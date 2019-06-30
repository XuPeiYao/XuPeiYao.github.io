---
layout: post
title:  "在IE11的正規表示式中使用群組－XRegExp"
categories: NodeJs
tags: IE JavaScript Polyfill
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在一串字串中要取得符合某特徵的特定位置的值，最方便的方式就是使用Regex來處理，使用Regex的群組語法，即可在剖析結果中透過自訂的群組名稱取得該位置的值，而這個語法在IE11是不支援的，這時候就需要外部庫來替代原有的RegExp，本文將使用[XRegExp](http://xregexp.com/)套件來實現。

<!--more-->

> 本文章只講解關於這個套件的基本使用方式，若需要詳細資訊請參考這個套件的[GitHub Repository](https://github.com/slevithan/xregexp)

## 引用套件

### JS

可以直接在HTML中插入以下UNPKG的Script，直接在瀏覽器中使用。

```html
<script src="https://unpkg.com/xregexp@4.2.4/xregexp-all.js"></script>
```

### NPM

也可以在NodeJS專案中使用，使用以下指令安裝套件。

```shell
npm install xregexp
```

在程式碼中使用:

```javascript
const XRegExp = require('xregexp');
```

## 使用套件

### 在IE11中使用原始的RegExp帶入群組語法

IE11中的RegExp是不支援群組語法，使用到群組語法將會出現錯誤。

![Imgur](https://i.imgur.com/0nk65pq.png)

### 在IE使用XRegExp

現在在IE11中引入套件後用以下方是即可以達到使用群組正則的效果。

![Imgur](https://i.imgur.com/dCXmNho.png)

