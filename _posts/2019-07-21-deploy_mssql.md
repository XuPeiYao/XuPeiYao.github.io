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

運行下列指令，並將下列由`<`與`>`框起範圍替換為自己環境的設定。

```shell
~# docker run -d -p <HOST_PORT>:1433 -e ACCEPT_EULA=Y -e SA_PASSWORD=<SA PASSWORD> -v mssql-backup:/data --name <CONTAINER_NAME> microsoft-mssql-server:2017-GA-ubuntu
```

### 登入SQL SERVER

運行後即可開啟`Microsoft SQL Server Management Studio`連線至上列指令設定的的`HOST_PORT`並使用帳號`sa`與上面輸入的密碼`SA PASSWORD`登入。

