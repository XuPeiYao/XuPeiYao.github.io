---
layout: post
title:  "在Controller使用其他Controller實例"
categories: .NET
tags: ASP.NET .NETCore .NET CSharp MVC DI
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在ASP.NET Core MVC中預設在DI過程中使用了`AddMvc()`注入MVC服務，透過DI可以在Controller建構子中引用其他DI過的物件，但預設是無法引入其他的Controller實例的，本文將說明如何在Controller中使用其他Controller實例。

<!--more-->

## 補充DI項目

找到`Startup.cs`的`ConfigureServices`方法編輯以下項目。

```csharp
public void ConfigureServices(IServiceCollection services) {
    // ...something...
    services.AddMvc()
        .AddControllersAsServices(); // 加入這個項目將Controller也作為DI項目
    // ...something...
}
```

## 在Controller使用

開啟要使用其他Controller的Controller，並在建構子加入DI項目。
如此就可以在Action中使用其他Controller的Action。

```csharp
public partial class ThisController : Controller {
    OtherController OtherController { get; set; }
    public ThisController(
        OtherController otherController, // 在建構子使用其他Controller實例
        // ...something parameters....
        ) {
        OtherController = otherController;
    }
}
```

> 有關詳細的原理說明可以參考[這篇文章](https://andrewlock.net/controller-activation-and-dependency-injection-in-asp-net-core-mvc/)。