---
layout: post
title: "Chrome Headless儲存網頁為PDF檔"
categories: .NET
tags: .NET Chrome Headless PDF
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

平常在匯出 PDF 檔案較常使用 iTextSharp 實作，使用程式定義匯出的項目位置，要執行取得匯出的 PDF 慢慢調整；如果直接使用 HTML 來編寫 PDF 樣板，在編輯過程中可以直接使用瀏覽器來預覽效果較為方便，本文將簡單介紹使用 Chrome 的 Headless API 將 HTML 轉存 PDF。

<!--more-->

## 安裝套件

使用套件管理器安裝`PuppeteerSharp`或在專案執行以下指令:

```shell
dotnet add package PuppeteerSharp
```

## 準備 HTML 樣板

首先準備一個要轉存 PDF 的 HTML 樣板如下:

```html
<html>
  <head>
    <style>
      table {
        border-spacing: 0;
      }

      th,
      td {
        padding: 10px;
        margin: 0;
        border: 1px solid black;
        border-left-width: 0px;
      }

      th:first-child,
      td:first-child {
        border-left-width: 1px;
      }

      td {
        border-top-width: 0px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <p>親愛的 OOO 先生/小姐:</p>
    <p>以下為本月行程資訊:</p>
    <table>
      <thead>
        <tr>
          <th style="width:100px;">時間</th>
          <th style="width:100px;">名稱</th>
          <th style="width:100px;">地點</th>
          <th style="width:300px;">敘述</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>2020/1/11</td>
          <td>投票</td>
          <td>台南</td>
          <td></td>
        </tr>
        <tr>
          <td>2020/1/23</td>
          <td>春節連假</td>
          <td>台南</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
```

## HTML 轉存 PDF 流程

### 下載 Chromeium 程式

使用 PuppeteerSharp 套件提供的 BrowserFetcher 類別下載 Chromium 程式。

```csharp
// 若存在 .local-chromium 目錄則表示已經有 Chromeium 程式
if (!Directory.Exists(".local-chromium"))
{
    // 如果找不到 Chromeium 則下載
    await new BrowserFetcher().DownloadAsync(BrowserFetcher.DefaultRevision);
}
```

### 啟動 Chromeium Headless

啟動 Chromeium Headless 用以準備燒後的轉檔調用。

```csharp
// 啟動 Chromeium Headless
var browser = await Puppeteer.LaunchAsync(new LaunchOptions() { // 此處可以自訂Chromeium程式路徑
});
```

### 開啟分頁並轉存 PDF

開啟 Chromeium 後必須要開啟新分頁且瀏覽至剛才所建立的樣板檔案，或直接寫入 HTML 至

```csharp
// 開啟 Chromeium 分頁
var page = await browser.NewPageAsync();

// 前往要列印的頁面(網址)
await page.GoToAsync(Path.GetFullPath("template.html"));

// 或者可以直接寫入HTML
// await page.SetContentAsync("<h1>HELLO WORLD</h1>");

// 另存為PDF，格式為A4且內容內縮3cm
await page.PdfAsync("output.pdf", new PdfOptions()
{
    Format = PaperFormat.A4,
    MarginOptions = new MarginOptions()
    {
        Top = "3cm",
        Bottom = "3cm",
        Left = "3cm",
        Right = "3cm"
    }
});

// 關閉分頁
await page.CloseAsync();
page.Dispose();

// 關閉 Chromeium
await browser.CloseAsync();
browser.Dispose();
```

### 成果

![Imgur](https://imgur.com/4xKqP9j.png)
