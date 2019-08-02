---
layout: post
title:  "Ubuntu安裝Docker環境以及Portainer"
categories: Docker
tags: Docker Ubuntu Portainer
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

現在許多的服務都可以使用Docker進行部屬，在部屬過程中節省了許多的時間以及避免了服務在部屬時的環境問題。

本文將在Ubuntu系統上安裝Docker環境，並且搭配 **Portainer** 服務，這個服務提供網頁介面進行Docker容器管理操作。

<!--more-->

## 安裝Docker

在終端機執行以下指令:

```shell
~# apt install docker.io -y
~# systemctl enable docker
~# systemctl start docker
```

## 安裝Portainer

### 建立本地Volume

運行以下指令建立本地儲存空間，作為Portainer設定儲存空間:

```shell
~# docker volume create --name portainer_data
```

建立完成後可透過以下指令查看是否建立成功:

```shell
~# docker volume ls
```

### 拉取映像並佈署Portainer容器

運行以下指令，Portainer服務將執行在9000 Port，並且將實機的`docker.sock`映射至容器內，並自動重啟。

```shell
~# docker run -d -p 9000:9000 -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data --name portainer --restart always portainer/portainer
```

開啟瀏覽器即可看到Portainer畫面，首先進行管理員帳號設定。

![Imgur](https://i.imgur.com/LwkZCEG.png)

設定管理對象為本地。

![Imgur](https://i.imgur.com/4gCcuxK.png)

經過上述設定後，即可看到以下管理介面。詳細操作可以參考[Portainer官方網站](https://www.portainer.io/)。

![Imgur](https://i.imgur.com/Jdtm3nG.png)