---
layout: post
title:  "變更Docker儲存路徑"
categories: .NET
tags: Docker
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

Docker安裝完成後利用`docker volume create myVolume`建立的Volume與Docker Image將放置於Docker預設目錄(`/var/lib/docker`)之下，而如果希望將Docker檔案放置於其他目錄或者是硬碟就必須變更Docker的Data Root目錄。

本文將教學如何變更Docker的目錄。

<!--more-->

## 編輯`docker.service`

Docker服務的Data Root設定可以在`docker.service`檔案中進行設定。

使用root權限開啟`/lib/systemd/system/docker.service`。

```shell
~/# nano /lib/systemd/system/docker.service
```

開啟檔案後找到`ExecStart`項目，並且在指令中插入以下指令，並編輯如下圖所示:

```
--data-root <YOUR_DATA_ROOT_PATH>
```

![Imgur](https://i.imgur.com/I5oKudn.png)

編輯完成後儲存並退出。

## 重啟Docker服務

接下來只要重啟Docker服務即可。

```shell
systemctl restart docker
```
