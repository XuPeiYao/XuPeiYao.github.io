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

現在有許多自動取得Let's Encrypt的工具，但都需要特別去設定或定時執行，還要將得到的憑證掛到HTTP Server上；而本文中要介紹的 [Caddy](https://caddyserver.com/) 就直接內建了 Let's Encrypt 憑證的取得，而且原生就支援了HTTP/2協定。

本文將架設一個簡單的HTTPS+HTTP/2網站。

<!--more-->

