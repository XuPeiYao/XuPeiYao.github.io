---
layout: post
title:  "自動HTTPS與支援HTTP/2的網頁伺服器－Caddy"
categories: Docker
tags: Docker WebServer HTTP2
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

隨著HTTPS的普及，Chromeo等主流瀏覽器在瀏覽HTTP網站時會出現不安全的提示，而為了增加HTTPS的普及，在2015年成立的 [Let's Encrypt](https://letsencrypt.org/) 服務，為安全網站提供免費的SSL/TLS憑證。

現在有許多自動取得Let's Encrypt的工具，但都需要特別去設定或定時執行，還要將得到的憑證掛到HTTP Server上；而本文中要介紹的 [Caddy](https://caddyserver.com/) 就直接內建了 Let's Encrypt 憑證的取得以及掛載SSL憑證，而且原生就支援了HTTP/2協定，設定上很簡單。

本文將架設一個簡單的HTTPS+HTTP/2網站。

<!--more-->

## 安裝

> 本文使用 **docker** 作為安裝佈署方式，若需要針對實機安裝，可以參考Caddy的[文件](https://caddyserver.com/tutorial)。

### 建立本地Volume

運行以下指令建立本地儲存空間，稍後將映射進去Caddy容器，用來作為儲存靜態頁面的空間。

```shell
~# docker volume create --name myCaddyStatic
```

建立完成後可透過以下指令查看是否建立成功:

```shell
~# docker volume ls
```

接著在想要的目錄建立一個`Caddyfile`空檔案。

```shell
~# touch Caddyfile
```

在Caddyfile檔案內輸入以下內容，本文先以簡易的靜態網頁做為範例:

```
yourdomain {
    tls youremail@example.com
    root /srv
    gzip
    browse
}
```

將yourdomain替換為自己的網域，以下為參數的簡易說明:

* `tls`項目表示Let's Encrypt註冊信箱
* `root`項目則為靜態檔案目錄
* `gzip`表示回應內容使用GZIP壓縮
* `browse`表示顯示檔案列表

> 如果需要進行Proxy的行為可以使用[proxy](https://caddyserver.com/docs/proxy)；更多的設定可以參考Caddy的[文件](https://caddyserver.com/docs)。

### 拉取映像並佈署Caddy容器

運行下列指令，並將下列由`<`與`>`框起範圍替換為自己環境的設定。Port轉發設定中的UDP設定是針對[QUIC](https://zh.wikipedia.org/zh-tw/%E5%BF%AB%E9%80%9FUDP%E7%BD%91%E7%BB%9C%E8%BF%9E%E6%8E%A5)的功能設定，若不須要此功能可移除該設定。

```shell
~# docker run -d -p 80:80 -p 80:80/udp -p 443:443 -p 443:443/udp -v myCaddyStatic:/srv -v <YOUR_CADDYFILE_PATH>:/etc/Caddyfile --name <CONTAINER_NAME> abiosoft/caddy --conf /etc/Caddyfile --log stdout --agree=true --quic
```

接下來開啟瀏覽器即可看到效果，如果你有在Chrome中安裝[HTTP/2 and SPDY indicator](https://chrome.google.com/webstore/detail/http2-and-spdy-indicator/mpbpobfflnpcgagjijhmgnchggcjblin)套件則擴充元件位置看到閃電的圖示，如未開啟QUIC或目前環境只能執行HTTP/2則顯示紫色的閃電符號，支援的話將顯示綠色。

![Imgur](https://i.imgur.com/2LaaPIX.png)
