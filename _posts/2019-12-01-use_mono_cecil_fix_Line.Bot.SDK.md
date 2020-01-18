---
layout: post
title: "使用Mono.Cecil修改Line.Bot.SDK套件以容許自訂ISendMessage"
categories: .NET
tags: .NET Mono.Cecil LineBot
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在開發 Line 機器人的過程中我常使用[Line.Bot.SDK](https://github.com/dlemstra/line-bot-sdk-dotnet)套件開發，但這個套件並不支援 FlexMessage，且自訂的訊息類型無法支援。本文將說明問題原因並使用`Mono.Cecil`套件解決這個套件不支援自訂訊息類型的問題。

<!--more-->

## 問題原因

本次提及的`Line.Bot.SDK`套件中我們可以使用`LineBot.Reply`方法回應`ISendMessage`介面的回應訊息，但實際上我們自行實作這個介面情況下，這個方法會出現例外，無法使用自訂的 Message 類別。

而這個套件本身是有將原始碼放在[Github 上](https://github.com/dlemstra/line-bot-sdk-dotnet)的，投過查看`Reply`時發生的例外堆疊，我們可以知道是在`ISendMessageExtensions.IsInvalidMessageType`方法出錯，在 Github 查看[該段程式碼](https://github.com/dlemstra/line-bot-sdk-dotnet/blob/1c32f243cbd8e557c257f1f91eb464a612324858/src/LineBot/Messages/Extensions/ISendMessageExtensions.cs#L49)

```csharp
 private static bool IsInvalidMessageType(ISendMessage message)
 {
  if (message is TextMessage)
      return false;

  if (message is ImageMessage)
      return false;

  if (message is VideoMessage)
      return false;

  if (message is AudioMessage)
      return false;

  if (message is LocationMessage)
      return false;

  if (message is StickerMessage)
      return false;

  if (message is ImagemapMessage)
      return false;

  if (message is TemplateMessage)
      return false;

  return true;
}
```

由此可以知道除了這個套件中已經定義的類型外，其餘類型既使實作`ISendMessage`介面也將視為不合法的。

## 解決問題

要解決這個問題當然也可以直接 Fork 這個專案另外自行建構，但我希望能夠不需要重建套件，只需要調用自訂方法允許任何`ISendMessage`。

為了達成這個方法我們必須去改變上述方法的 IL，這方面可以想到過去「[桌面應用程式 Google 登入強制使用 IE 瀏覽器](http://xpy.gofa.cloud/2019/10/16/google_oauth2_force_use_ie/)」一文中提到的 Harmony 套件，但可惜的是目前這個套件在 NuGet 上最新版本(1.2.0.1)在.NET Core 環境中無法運行。

所以本次將使用`Mono.Cecil`套件來修改這個方法，以下將說明我的步驟與程式。

### 安裝套件

使用套件管理器安裝`Mono.Cecil`或在專案執行以下指令:

```
dotnet add package Mono.Cecil
```

### 實作 IL 替換

首先要先取得目前運行目錄的位置。

```csharp
// 取得目前運行中的Assembly路徑僅取目錄
var lineBotDll = System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

// 串接Line.Bot.SDK套件的DLL檔案名稱
lineBotDll = System.IO.Path.Combine(lineBotDll,  "LineBot.dll");
```

接下來引入`Mono.Cecil`並讀取`Line.Bot.SDK`套件中的`ISendMessageExtensions.IsInvalidMessageType`方法。

```csharp
var asm = Mono.Cecil.AssemblyDefinition.ReadAssembly(lineBotDll, new Mono.Cecil.ReaderParameters()
  {
      ReadWrite = true // 設定可讀寫
  });
var type = asm.MainModule.Types.Single(x =>x.Name == "ISendMessageExtensions");

var method = type.Methods.Single(x => x.Name == "IsInvalidMessageType");
```

取得方法後透過 ILProcessor 替換並寫入新的 IL 至 Assembly。

```csharp
var ilp = method.Body.GetILProcessor();
ilp.Replace(method.Body.Instructions[40], ilp.Create(OpCodes.Ldc_I4, 0)); // 將該方法最後回傳的true替代為false

asm.Write(); // 寫入Assembly
asm.Dispose(); // 釋放
```

### 包裝成方法並使用

經過上列步驟已經完成對`IsInvalidMessageType`方法最後回傳的`true`替換為`false`的操作，我將其包裝為`LineSdkPatch.AllowAnyCustomMessageType()`方法，在 ASP.NET Core 專案中的程式進入點`Program.Main`方法調用。

```csharp
public static void Main(string[] args)
{
    LineSdkPatch.AllowAnyCustomMessageType(); // 替換IL步驟必須要在程式讀入Assembly之前執行
    CreateHostBuilder(args).Build().Run();
}
```

### 自訂 FlexMessage 類別

查看[Line 官方文件](https://developers.line.biz/en/docs/messaging-api/using-flex-messages/)中說明的 FlexMessage 訊息格式說明並繼承`ISendMessage`，實作以下類別:

```csharp
public class FlexMessage : ISendMessage
{
    [JsonProperty("type")]
    public string Type => "flex";

    [JsonProperty("altText")]
    public string AlternativeText { get; set; }

    [JsonProperty("contents")]
    public JObject Contents { get; set; }

    public void Validate()
    {
      // 根據Line文件表示必須要有altText
      if (AlternativeText == null) throw new ArgumentNullException(nameof(AlternativeText));
    }
}
```

此處的`Contents`屬性由於 FlexMessage 的結構較複雜，而我目前使用的類型並不多樣，所以沒有另外抽類別結構化，若有需要可以根據文件建立模型。

之後就可以在`LineBot.Reply`中使用剛才自訂的 FlexMessage 類別回覆訊息。

在設計 FlexMessage 過程可以使用官方提供的[FLEX MESSAGE SIMULATOR](https://developers.line.biz/console/fx-beta/)進行設計並導出 JSON，直接使用在上面定義的`FlexMessage`類別中的`Contents`屬性。
