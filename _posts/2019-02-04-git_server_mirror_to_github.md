---
layout: post
title:  "Git server repositories鏡像至GitHub"
categories: git
tags: git gitea github
author: XuPeiYao
excerpt_separator: <!--more-->
---

Github在今年一月初開始提供免費的無限數量的private repositories(參考: [New year, new GitHub: Announcing unlimited free private repos and unified Enterprise offering](https://github.blog/2019-01-07-new-year-new-github/))，但每個repository只能有 **三位協作者** ，需要更多人可以協作就必須要購買至少GitHub Pro，或購買GitHub Team(最少25美金)。

<!--more-->

剛好是三個人的團隊就不用去買方案就可以免費使用了，但是如果是超過三人的團隊不想要購買Team方案可以建立一個共用帳號購買Pro方案一起使用，但就沒那麼方便了。

當然如果有自己的主機可以自己架設一個git服務，只是要自行做備份。但如果是使用定期備份，如果資料丟失發生在兩個備份周期內，則這段時間中間的資料就有遺失(雖說每個User都有一份，只要repository還在就可以再重新推送一次)。

git有提供git hooks的功能(參考: [Git Hooks](https://git-scm.com/book/zh-tw/v1/Git-%E5%AE%A2%E8%A3%BD%E5%8C%96-Git-Hooks?fbclid=IwAR2dW-gUBFKgv0KGuO3UOgpvuHSeMNC4lIL0UvqCFTT_HUHmLk5wWlI09gk))，以透過這個方式在git server上掛勾push to GitHub的指令，這樣一來就可以在每次有新Push到自架git server時，同時自動推送至GitHub private repository，實現實時備份，也因為主要的服務是自行架設，解決了備份以及共用帳號的問題。

本範例使用gitea作為git server，不過其他的服務也是差不多的操作。

## 設定方法
**1.至GitHub，登入後選擇「使用者Icon(右上方)/Setting」**

![Imgur](https://i.imgur.com/04syIe7.png)

**2.進入Setting畫面後選擇左方選單的「Developer settings」**

![Imgur](https://i.imgur.com/uewkkaG.png)

**3.進入Developer settings畫面中選擇左方選單的「Personal access tokens」**

![Imgur](https://i.imgur.com/CITrLgz.png)

**4.點選畫面中右上方的「Generate new token」產生一組可供存取repository的token。**

![Imgur](https://i.imgur.com/r1UzGsD.png)

**5.在GitHub建立一個用來備份的repository**

**6.進入自建gitea服務中的儲存庫頁面，點選儲存庫設定**

![Imgur](https://i.imgur.com/NfcUDsp.png)

**7.點選「管理Git Hooks」並選擇「update」項目右方的編輯圖示。**

![Imgur](https://i.imgur.com/E7yyDuu.png)

**8.在Hook內容文字框內清空並輸入以下指令:**
```bash
git push --mirror --quiet https://<GitHub Account>:<Token>@github.com/<GitHub Account>/<GitHub Repository Name>.git &> /dev/null &
echo 'update ok'
```
> 請將上列由"<"與">"的範圍包含符號替換為你的GitHub資訊與Token。

**9.設定完後儲存，並向自建的git server推送，推送時將會觸發剛才輸入的指令，將git repository推送至指定的github repository。可以到GitHub repository的頁面中看到內容與自建git server一致。**

* Gitea畫面

![Imgur](https://i.imgur.com/EeGyFci.png)

* GitHub畫面

![Imgur](https://i.imgur.com/Ojmevvt.png)
