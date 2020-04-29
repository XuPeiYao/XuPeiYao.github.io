---
layout: post
title: 'ASP.NET Core使用Unity Container'
categories: .NET
tags: ASP.NET .NETCore .NET CSharp UnityContainer DI
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

ASP.NET Core 有內建的 DI Provider，雖然具有常用的 DI 操作，但有些進階或便利的 DI 操作並沒有提供(例如: 屬性注入等)，本文將替換 ASP.NET Core內建的 DI Provider 為 Unity Container。

<!--more-->

## 安裝套件

使用套件管理器安裝`Unity.Microsoft.DependencyInjection`或在專案執行以下指令:

```shell
dotnet add package Unity.Microsoft.DependencyInjection
```

## 替換 DI Provider

在`Program`類別中的`CreateHostBuilder`方法中加入以下段落，替換 DI Provider:

```csharp
using Unity.Microsoft.DependencyInjection;

// ...something...

public static IHostBuilder CreateHostBuilder(string[] args) =>
    Host.CreateDefaultBuilder(args)
        .UseUnityServiceProvider() // 替換 DI Provider
        .ConfigureWebHostDefaults(webBuilder => {
            webBuilder.UseStartup<Startup>();
        });
```

## 將 Controller 視為 DI 項目

因稍後範例將直接在 Controller 中使用屬性注入的範例，所以在此將 Controller 作為 DI 項目。

修改`Startup`的`ConfigureServices`方法中的 MVC DI。

```csharp
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers()
                .AddControllersAsServices(); // 將 Controller 作為 DI 項目
    }
}
```

## 加入屬性注入

在要做 DI 的 Controller 中加入 DI 相關程式碼。本範例以加入一個`ILogger` DI 項目。

```csharp
public class TestController : ControllerBase
{
    [Dependency] // 加入DI Attribute，標註該屬性要DI
    public ILogger<TestController> Logger { get; set; }

    // ...something...

    public TestController()
    {
    }

    // ...something...
}
```

經過上面標記要做 DI 的屬性後就可以不用再建構子中加入該參數取得項目。

> 本文只講述如何將預設 DI Provider 替換為 Unity Container，有關 Unity Container 的詳細資訊請查看[官方GitHub](https://github.com/unitycontainer/unity)。