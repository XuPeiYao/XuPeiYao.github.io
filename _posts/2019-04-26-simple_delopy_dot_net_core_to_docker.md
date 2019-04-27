---
layout: post
title:  "簡易的使用Docker佈署ASP.Net Core網頁"
categories: .NET
tags: .NETCore .NET Docker
author: XuPeiYao
excerpt_separator: <!--more-->
---
 
- content
{:toc}

在VisualStudio中，針對ASP.NET Core專案，提供Docker的快速導入功能，但是在每一次的發行都要重新包裝與上傳一次Docker Image，想要在短時間內快速的佈署測試稍為麻煩，
在本文中參考原有VisualStudio中提供的Dockerfile，修改後只要針對Volume內容就可以快速測試Docker中的運行結果。

<!--more-->

首先將Dockerfile修改如下:

```dockerfile
# 引入AspNetCore執行階段2.2版
FROM microsoft/dotnet:2.2-aspnetcore-runtime

# 輸出Port 80
EXPOSE 80 

# 宣告環境變數與預設值，可以在外部設定進入點dll檔案名稱
ENV DLL_FILENAME=YourAppDllFileName

# 目錄
VOLUME [ "/app" ] 

# 切換工作目錄
WORKDIR /app 

# 進入點
ENTRYPOINT [ "sh" ,"-c", "dotnet $DLL_FILENAME" ] 
```

使用上列的Dockerfile，在Container啟動時將執行`dotnet YourAppDllFileName`指令，啟動網站。

如此設定之後再重新發布進行測試時，只需要發行針對`linux x64`環境下的就可以了，將發行的檔案放入Contrainer內Volume並且重新啟動Container就可以成功運行。
