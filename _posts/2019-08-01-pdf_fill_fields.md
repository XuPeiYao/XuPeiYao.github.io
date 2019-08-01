---
layout: post
title:  "使用iTextSharp進行PDF套版輸出"
categories: .NET
tags: .NET .NETCore PDF iTextSharp 套版
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

最近接到一個工作項目要實現成績套版列印功能，而且成績的表單是PDF格式，想到使用iTextSharp實作PDF表單的套版。
所幸NuGet上有支援.NET Core的套件可使用，本文將簡單示範PDF套版輸出的流程。

<!--more-->

## 準備模板PDF

首先要準備一個套版用的PDF，並且在上面加入PDF表單欄位，本文中使用的是一個履歷表的[PDF](https://www.lyee.gov.tw/attachments/article/471/01%E5%B1%A5%E6%AD%B7%E8%A1%A8.pdf)。
可以使用目前有的PDF編輯軟體在PDF中加入文字欄位，如果沒有PDF編輯軟體可以直接使用[PDFescape](https://www.pdfescape.com/open/)提供的線上PDF編輯器服務。

### 在PDFescape開啟檔案

進入PDFescape網站，點選`Upload PDF to PDFescape`選擇檔案上傳。

![Imgur](https://i.imgur.com/3fhUUiY.png)

### 加入輸入欄位

上傳成功後即可看到PDF編輯器畫面，此時選擇左方工具中的`Form Field`項目。

![Imgur](https://i.imgur.com/sx9M9Ik.png)

欄位類型選擇`Text`或所需要的類型點選`Select`。

![Imgur](https://i.imgur.com/e6AoDQH.png)

之後用滑鼠圈選出欄位範圍。

![Imgur](https://i.imgur.com/M1SEGzB.png)

> 在本文中的圖片欄位將使用Text類型圈選範圍。

最後在該欄位上點選滑鼠右鍵，選擇`Object Properties`項目。

![Imgur](https://i.imgur.com/NTtmHwr.png)

設定欄位屬性並且針對該欄位命名，這個在稍後的套版過程中會使用到。

![Imgur](https://i.imgur.com/NfM9snq.png)

本文將這份PDF處理成下面這個樣子:

![Imgur](https://i.imgur.com/vqWBa3J.png)

### 匯出

接下來點選編輯器左方的`Save and Download PDF`按鈕下載PDF。

![Imgur](https://i.imgur.com/fDHod7A.png)

## 開始套版

### 安裝套件

使用套件管理器安裝`iTextSharp.LGPLv2.Core`或在專案執行以下指令:

```
dotnet add package iTextSharp.LGPLv2.Core
```

### 讀取檔案並設定文字欄位值

首先開啟要套版的PDF與套版結果輸出的檔案。

```csharp
using (var inputStream = new FileStream("template.pdf", FileMode.Open))
using (var outputStream = File.Create($"result-{DateTime.Now.Ticks}.pdf")) {
}
```

在Using區塊內開始主要的PDF套版操作。

首先使用PdfReader與PdfStamper讀寫PDF。

```csharp
// 讀取PDF
PdfReader pdfReader = new PdfReader(inputStream);
var pdfStamper = new PdfStamper(pdfReader, outputStream);
```

接下來加入標楷體字體，這個過程是為了避免中文亂碼問題。

```csharp
// 讀取標楷體字體
BaseFont chBaseFont = BaseFont.CreateFont(@"C:\windows\fonts\kaiu.ttf", BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
```

加入字體後要修正所有欄位中使用的字體設定，如果沒有變更字體的需要可以省略這個步驟。

```csharp
// 取得PDF中的表單欄位
AcroFields acroFields = pdfStamper.AcroFields;

foreach (string field in acroFields.Fields.Keys) {
    // 更新字體
    acroFields.SetFieldProperty(field, "textfont", chBaseFont, null);
}
```

欄位設定調整完成後接下來就可以設定欄位的值了，這裡的欄位名稱是在樣板PDF中決定的。

```csharp
acroFields.SetField("Name", "王小明");
acroFields.SetField("Location", "台灣");
acroFields.SetField("BloodType", "O");
acroFields.SetField("Birthday_Y", "99");
acroFields.SetField("Birthday_M", "11");
acroFields.SetField("Birthday_D", "22");
acroFields.SetField("Gender", "男");
acroFields.SetField("MilitaryService", "未役");
```

經過上述操作已經完成了PDF的套版，接下來只要進行以下指令就完成PDF文字部分的套版，可以在剛才定義的PDF輸出路徑中取得成品。

```csharp
// 設定PDF壓縮
pdfStamper.SetFullCompression();

// PDF表單扁平化
pdfStamper.FormFlattening = true;

pdfStamper.Close();
```

### 插入圖片

上面動作只完成了文字部分的套版，如果樣板中有插入圖片(如:大頭照)等需求，可以在製作樣板過程中使用文字框拉出區域來定義範圍以及欄位名稱，這個小節將講述如何在PDF中插入圖片並放到文字欄位所定義的範圍內。

首先讀取要插入的圖片。

```csharp
//讀取圖片
var photo = Image.GetInstance(
    Path.Combine(Directory.GetCurrentDirectory(), "TEST.jpg")
);
```

取得要填充的文字框位置，並縮放圖片。

```csharp
// 取得Photo文字框的位置，index=0為所在頁數，index=1~4則是左上與右下角座標
var photoSize = acroFields.GetFieldPositions("Photo");

// 依照文字框大小進行縮放
photo.ScaleAbsolute(photoSize[3] - photoSize[1], photoSize[4] - photoSize[2]);

// 設定圖片位置等於文字框座標
photo.SetAbsolutePosition(photoSize[1], photoSize[2]);
```

接下來因為要在現有的PDF中插入圖片，所以必須要取得指定頁數的OverContent，並且插入後要移除掉用來定位的文字欄位。

```csharp
// 取得Photo文字框所在頁的OverContent
var photoOverContent = pdfStamper.GetOverContent((int)photoSize[0]);

// 加入圖片
photoOverContent.AddImage(photo);

// 移除Photo文字框
acroFields.RemoveField("Photo");
```

### 完成


