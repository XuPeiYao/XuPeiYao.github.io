---
layout: post
title:  "Ubuntu 18安裝Docker CE"
categories: Docker
tags: Docker Linux
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

先前的[文章](https://xpy.gofa.cloud/2019/05/02/ubuntu_install_docker_and_portainer/)中有簡單的教學Ubuntu的Docker與Portainer環境的佈署。這篇文使用的是`docker.io`套件，而Docker在1.13版本後分為CE(社群)與EE(企業)版，本文將講述在Ubuntu 18環境下安裝Docker CE。

<!--more-->

> 本文中涉及的指令項目將使用[explainshell.com](explainshell.com)網站作為說明。

## 加入Repository 

首先必須要手動加入Repository項目，否則無法找到`docker-ce`套件。

第一步先新增APT Key。

```shell
~# curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
```

而以上指令的意義可以參考這個[網址](https://explainshell.com/explain?cmd=curl+-fsSL+https%3A%2F%2Fdownload.docker.com%2Flinux%2Fubuntu%2Fgpg+%7C+sudo+apt-key+add+-)

現在執行以下指令加入Repository，並刷新apt。

```shell
~# add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
~# apt-get update
```

上述指令意義可參考這個[網址](https://explainshell.com/explain?cmd=add-apt-repository+%22deb+%5Barch%3Damd64%5D+https%3A%2F%2Fdownload.docker.com%2Flinux%2Fubuntu+%24%28lsb_release+-cs%29+stable%22)

## 安裝Docker CE

執行完前面的項目後，接下來就可以直接執行以下指令安裝套件。

```
~# apt-get install -y docker-ce
```

## 驗證安裝

```shell
~# docker --version
Docker version 18.09.7, build 2d0083d
```

## 設定開機啟動服務

```shell
systemctl enable docker
systemctl start docker
```

執行以上命令後重開機執行`sudo systemctl status docker`可以看到以下畫面，表示服務已經在開機時自動啟動。

![Imgur](https://i.imgur.com/ModaQqL.png)

經上述的流程已經在Ubuntu 18中安裝好Docker CE環境。