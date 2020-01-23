---
layout: post
title: "使用Docker佈署Sentry"
categories: Docker
tags: Docker Sentry
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

Sentry是一個錯誤追蹤平台，在應用程式中引用Sentry套件後就可以使用Sentry中追蹤應用程式錯誤訊息，本文將利用Docker搭建一個Sentry平台並在.NET Core應用程式中使用並追蹤錯誤。

<!--more-->

## 安裝

### 拉取 Git 儲存庫

首先使用git指令拉取GitHub上的`getsentry/onpremise`庫，這個庫是sentry的docker佈署懶人包。

```bash
git clone https://github.com/getsentry/onpremise.git
```

> Sentry至少需要2400MB的記憶體(RAM)

### 修改 Config

進入拉取的git儲存庫目錄`onpremise`中的`sentry`目錄。

```bash
cd onpremise/sentry
```

該目錄內有Sentry設定的相關檔案，由於本範例稍後將會使用Caddy作為反向代理伺服器，所以我們要複製`sentry.conf.example.py`為`sentry.conf.py`且進行編輯。

```bash
# 複製檔案
cp sentry.conf.example.py sentry.conf.py
```

編輯`sentry.conf.py`的`SSL/TLS`項目，將`SECURE_PROXY_SSL_HEADER`項目前面的`#`符號移除。

```
###########
# SSL/TLS #
###########

# If you're using a reverse SSL proxy, you should enable the X-Forwarded-Proto
# header and enable the settings below

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SOCIAL_AUTH_REDIRECT_IS_HTTPS = True
```

接下來複製`config.example.yml`為`config.yml`並編輯。

```bash
cp config.example.yml config.yml
```

修改這個檔案的`System Settings`的`system.secret-key`中的字串，這個將作為Sentry服務的JWT的SecureKey，所以必須要修改。

```
###################
# System Settings #
###################

# If this file ever becomes compromised, it's important to regenerate your a new key
# Changing this value will result in all current sessions being invalidated.
# A new key can be generated with `$ sentry config generate-secret-key`
system.secret-key: '這裡要改成自己的SecureKey!!!!'
```

> 有關設定參數可以參考`onpremise`儲存庫的README。

### 調整Email SMTP設定

修改`config.yml`的`Mail Server`中的`mail.host`為Gmail的SMTP，此處可以依照自己需求進行調整，也可不進行設定。

```
###############
# Mail Server #
###############

# mail.backend: 'smtp'  # Use dummy if you want to disable email entirely
mail.host: 'smtp.gmail.com'
```

#### 調整Sentry服務的Port

由於Sentry的Web服務使用9000 Port，若該Port已經被其他服務占用(如:Portainer)，則需要調整`onpremise`目錄中的`docker-compose.yml`檔案的`web`容器的設定。

```yml
web:
    << : *sentry_defaults
    ports:
      - '19000:9000/tcp'
```

在這個範例我將Sentry服務對外的Port改為19000。

### 運行安裝

接下來將移動位置至`onpremise`目錄，執行以下指令開始安裝。
運行前請確保有安裝docker-compose，有關docker-compose的安裝請參考Docker官網中的[說明](https://docs.docker.com/compose/install/)。

```bash
./install.sh
```

安裝過程較久請等片刻。
在安裝過程最後將提示建立使用者帳號，請建立第一個使用者。

```
Would you like to create a user account now? [Y/n]: Y
Email: YOUREMAIL
Password:
Repeat for confirmation:
```

接下來執行結束後運行下列指令啟動服務:

```bash
docker-compose up -d
```

### 反向代理設定

由於Sentry預設是在 9000 Port 運行，在本範例中我將使用之前介紹過的 `Caddy` 來做反向代理且利用其加入Let's Encrypt提供的免費HTTPS服務。

修改`Caddyfile`加入以下(請依照你的環境自行調整)，有關設定可以參考之前關於Caddy的[文章](https://xpy.gofa.cloud/2019/04/27/caddy_http2_web_server/)。

```
# GOFA網域TLS設定
(MY_TLS_SETTING) {
	tls <YOUR_EMAIL>
}

# 常用反向代理標頭
(ProxyHeaders) {
	insecure_skip_verify
	header_upstream Host {host}
	header_upstream X-Real-IP {remote}
	header_upstream X-Forwarded-For {remote}
	header_upstream X-Forwarded-Port {server_port}
	header_upstream X-Forwarded-Proto {scheme}
	header_upstream Connection {>Connection}
	header_upstream Upgrade {>Upgrade}
}

YOUR_SENTRY_DOMAIN {
	import MY_TLS_SETTING
	proxy / YOUR_IP:19000 {
		import ProxyHeaders
	}
}
```

變更並儲存後重啟caddy的容器。

### 初次登入Sentry

開啟瀏覽器並輸入剛才在Caddy設定的反向代理網址即可看到Sentry的登入畫面，在此處輸入剛才安裝過程中所設定的帳號密碼。

![Imgur](https://imgur.com/mu4vrXp.png)

初次登入需要對系統進行初步設定。

![Imgur](https://imgur.com/J7TibNH.png)

設定結束後就會進入主控畫面，到這個步驟Sentry平台的架設就完成了。

![Imgur](https://imgur.com/DM30JN5.png)

### 調整帳號名稱以及語系、時區

若需要調整目前帳號所見的語系等選項可以點選左上方帳號按鈕開啟入下的設定畫面。

![Imgur](https://imgur.com/pdBcdBB.png)

調整後重新整理頁面就可以看到有中文介面。

![Imgur](https://imgur.com/eIu9a2Z.png)

## 為應用程式加入追蹤

經過上面過程我們已經成功地架設了Sentry服務，接下來我們將建立一個簡單的.NET Core Console專案，且導入Sentry套件，實際測試在錯誤情況下平台上會顯示哪些資訊以及Sentry新增應用程式的操作

### 新增應用程式

點選左邊導覽列的`專案`進入專案列表畫面。點選畫面中的`新增專案`按鈕。

![Imgur](https://imgur.com/UwjXP0U.png)

在應用程式類型選項選擇`C#`並設定專案名稱。

![Imgur](https://imgur.com/qqwa7KD.png)

建立後畫面將會顯示在.NET專案中使用Sentry的範例。

![Imgur](https://imgur.com/BEEsD9R.png)


### 建立專案並加入Sentry套件

建立一個.NET Core Console專案並使用以下指令安裝Sentry套件。

```bash
dotnet add package Sentry --version 1.2.0
```

ASP.NET Core專案等請參考Sentry[文件](https://docs.sentry.io/platforms/dotnet/)。

並加入以下程式碼至`Program.cs`。

```csharp
using Sentry;
using System;

namespace Test
{
    class Program
    {
        static void Main(string[] args)
        {
            using (SentrySdk.Init("https://YOUR_SENTRY_URL/2"))
            {
                throw new Exception("故意錯誤");
            }
        }
    }
}
```

### 查看錯誤訊息

執行後即可在Sentry的專案頁面中的錯誤列表中看到項目。

![Imgur](https://imgur.com/v4zUdFu.png)

點選該項目後可以進入觀看錯誤的詳細訊息以及使用者的環境基本資訊。

![Imgur](https://imgur.com/OxRuKwr.png)