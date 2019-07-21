---
layout: post
title:  "使用Docker佈署SQL Server"
categories: Docker
tags: Docker
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

SQL Server從2017版開始有提供Linux平台的支援，也提供Docker的佈署方法，本文將講述如何使用Docker佈署一個SQL Server Express並掛載Volume備份與還原資料庫。

<!--more-->

## 安裝

### 建立本地Volume

運行以下指令建立本地儲存空間，稍後將映射進容器內作為備份位置。

```shell
~# docker volume create --name mssql-backup
```

建立完成後可透過以下指令查看是否建立成功:

```shell
~# docker volume ls
```

### 拉取映像並佈署SQL SERVER容器

運行下列指令，並將下列由`<`與`>`框起範圍替換為自己環境的設定。本文安裝的版本是SQL SERVER 2017。

```shell
~# docker run -d -p <HOST_PORT>:1433 -e ACCEPT_EULA=Y -e SA_PASSWORD=<SA PASSWORD> -v mssql-backup:/data --name <CONTAINER_NAME> mcr.microsoft.com/mssql/server:2017-latest-ubuntu
```

### 登入SQL SERVER

運行後即可開啟`Microsoft SQL Server Management Studio`連線至上列指令設定的的`HOST_PORT`並使用帳號`sa`與上面輸入的密碼`SA PASSWORD`登入。

![Imgur](https://i.imgur.com/UsJHDwb.png)

上面畫面可以看到已經成功登入SQL SERVER內，接下來可以建立新資料庫或自過去的備份檔還原資料庫。

### 備份與還原資料庫

#### 備份

首先選定要備份的資料庫，點選滑鼠右鍵選擇`備份`。

![Imgur](https://i.imgur.com/izkOkoj.png)

接下來加入新的備份目的地，而目的地位置就是在前項佈署SQL SERVER指令中的Volume對象`mssql-backup`，而我們將這個Volume映射至容器中的`/data`路徑。

![Imgur](https://i.imgur.com/xIZeuau.png)

![Imgur](https://i.imgur.com/1VTOYrl.png)

備份完成後可以在`mssql-backup`Volume中可以看到剛才的備份檔案。

![Imgur](https://i.imgur.com/JdQqCYe.png)

#### 還原

再還原之前先將資料庫備份檔案放入上面佈署使用的`mssql-backup`Volume內，這個範例直接使用上面備份的檔案。
連入資料庫使用滑鼠右鍵，點選`還原資料庫`。

![Imgur](https://i.imgur.com/YCdyfMH.png)

在還原資料庫視窗中的來源選擇`裝置`，且在備份媒體中加入備份檔案。

![Imgur](https://i.imgur.com/hxngFIl.png)

還原目的地選擇後點選確認完成，之後就可以正常存取這個資料庫了。

![Imgur](https://i.imgur.com/EqzPoc0.png)