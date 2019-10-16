---
layout: post
title:  "桌面應用程式Google登入強制使用IE瀏覽器"
categories: .NET
tags: .NET OAuth2 Google
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

開發桌面應用程式過程中若需要使用到Google登入，除了[自己實作Google OAuth2流程](https://github.com/googlesamples/oauth-apps-for-windows)外，通常就是使用[google-api-dotnet-client](https://github.com/googleapis/google-api-dotnet-client)來實現Google登入流程。

而在登入過程中此套件將自動開啟預設瀏覽器，導引至Google授權視窗，但在登入流程跑完時畫面將顯示`Received verification code. You may now close this window.`訊息，提示使用者可關閉此視窗。
但這個視窗只在IE瀏覽器情況下會自動關閉。本文將說明此問題原因以及我的解決方式。

<!--more-->

## 問題重現

首先建立一個空專案(.NET Framework)並使用NuGet或以下指令安裝`Google.Apis.Oauth2.v2`套件。

```shell
Install-Package Google.Apis.Oauth2.v2 -Version 1.41.1.1602
```

安裝套件後使用以下程式:

```csharp
using Google.Apis.Auth.OAuth2;
using Google.Apis.Util.Store;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public class Program {
    static async Task Main(string[] args) {
        using (var secretsFile = new FileStream("client_secrets.json", FileMode.Open, FileAccess.Read)){
            UserCredential credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                GoogleClientSecrets.Load(secretsFile).Secrets,
                new[] { "https://www.googleapis.com/auth/userinfo.profile" },
                "user",
                CancellationToken.None,
                new NullDataStore()
            );
        }
        Console.WriteLine("Google登入完成");
        Console.ReadKey();
    }
}
```

在這個測試範例中我電腦的預設瀏覽器為`Chrome`，程式執行時將出現以下畫面。

![Imgur](https://imgur.com/qoNaolT.png)

登入完成後將顯示以下面畫面。

![Imgur](https://imgur.com/ADFkd2Z.png)

## 問題原因

首先查看`Google.Apis.Oauth2.v2`程式碼中顯示`Received verification code. You may now close this window.`訊息的畫面程式碼，檢查是否有關閉視窗的行為。在[這段程式碼](https://github.com/googleapis/google-api-dotnet-client/blob/master/Src/Support/Google.Apis.Auth/OAuth2/LocalServerCodeReceiver.cs#L63)中可以看到是有進行`window.close()`行為的，所以問題應該在瀏覽器上。

在`Chrome`瀏覽器中顯示訊息畫面中按下`F12`開啟開發者工具並切換至`Console`標籤，即可看到以下警告訊息。

![Imgur](https://imgur.com/MvoAeZm.png)

會發生這個警告是因為`window.close()`的運作規範，詳細原因可以參考[這篇](https://stackoverflow.com/questions/19761241/window-close-and-self-close-do-not-close-the-window-in-chrome)在stackoverflow上的發問。

## 解決問題

由於這個問題在預設瀏覽器為IE的情況下是不存在的，所以我採取的方案是設法讓`Google.Apis.Oauth2.v2`套件使用IE瀏覽器而非系統預設瀏覽器。

但在嘗試尋找相關支援時查詢到該套件的[這段](https://github.com/googleapis/google-api-dotnet-client/blob/v1.41.1/Src/Support/Google.Apis.Auth/OAuth2/LocalServerCodeReceiver.cs#L539)程式，這個`OpenBrowser`方法直接使用預設瀏覽器開啟。

雖然Github上有這個套件的原始碼，但為了修改這行為去重新編譯似乎有點小題大作，所以在解決這個問題我使用`Harmony`套件在執行階段替換掉`OpenBrowser`方法，達到強制使用IE瀏覽器的需求。

首先使用NuGet或以下指令安裝`Harmony`套件。

```shell
dotnet add package Lib.Harmony
```

在執行Google登入前加入以下程式碼:

```csharp
using Harmony;

var harmony = HarmonyInstance.Create("test.xpy");
// 取得要替換的方法
var originalOpenBrowserMethod = typeofLocalServerCodeReceiver)
    .GetMethod("OpenBrowser", BindingFlags.Instance | BindingFlags.NonPublic);
// 取得補丁方法
var newOpenBrowserMethod = typeof(Program)
    .GetMethod("Transpiler", BindingFlags.Static | BindingFlags.NonPublic);
// 打補丁
harmony.Patch(originalOpenBrowserMethod, ranspiler: new HarmonyMethod(newOpenBrowserMethod);
```

這段程式碼將使用`Transpiler`方法去變更`OpenBrowser`方法的IL，有關Harmony的詳細使用方法可以參考[文件](https://github.com/pardeike/Harmony/wiki)。

而`Transpiler`方法內容如下:

```csharp
private static IEnumerable<CodeInstruction> Transpiler(MethodBase original, IEnumerable<CodeInstruction> instructions) {
    // 異動原有SDK的OpenBrowser方法的IL Code
    var result = instructions.ToList();
    // 在堆疊前端加入字串參數
    result.Insert(0, new CodeInstruction(OpCodes.Ldstr, "IExplore.exe"));
    // 替換調用方法為兩個參數的Process.Start
    var start = typeof(Process).GetMethod("Start", new Type[] { typeof(string), typeof(string) });
    result[2] = new CodeInstruction(OpCodes.Call, start);

    return result;
}
```

在這個方法將會把原有調用的`Process.Start(string)`替換為`Process.Start(string,string)`，並且第一個參數為`IExplore.exe`表示IE瀏覽器，第二參數則是原有方法帶入的URL。如此就達成強制使用IE瀏覽器的目的，完整的程式碼如下:

```csharp
using Harmony;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Util.Store;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public class Program {
    static async Task Main(string[] args) {
        var harmony = HarmonyInstance.Create("test.xpy");
        // 取得要替換的方法
        var originalOpenBrowserMethod = typeof(LocalServerCodeReceiver)
            .GetMethod("OpenBrowser", BindingFlags.Instance | BindingFlags.NonPublic);
        // 取得補丁方法
        var newOpenBrowserMethod = typeof(Program)
            .GetMethod("Transpiler", BindingFlags.Static | BindingFlags.NonPublic);
        // 打補丁
        harmony.Patch(originalOpenBrowserMethod, transpiler: new HarmonyMethod(newOpenBrowserMethod));
        Console.WriteLine("打補丁完成，強制使用IE");
        using (var secretsFile = new FileStream("client_secrets.json", FileMode.Open, FileAccess.Read)) {
            UserCredential credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                    GoogleClientSecrets.Load(secretsFile).Secrets,
                    new[] { "https://www.googleapis.com/auth/userinfo.profile" },
                    "user",
                    CancellationToken.None,
                    new NullDataStore()
            );
        }
        Console.WriteLine("Google登入完成");
        Console.ReadKey();
    }
    private static IEnumerable<CodeInstruction> Transpiler(MethodBase original, IEnumerable<CodeInstruction> instructions) {
        // 異動原有SDK的OpenBrowser方法的IL Code
        var result = instructions.ToList();
        // 在堆疊前端加入字串參數
        result.Insert(0, new CodeInstruction(OpCodes.Ldstr, "IExplore.exe"));
        // 替換調用方法為兩個參數的Process.Start
        var start = typeof(Process).GetMethod("Start", new Type[] { typeof(string), typeof(string) });
        result[2] = new CodeInstruction(OpCodes.Call, start);
        return result;
    }
}
```