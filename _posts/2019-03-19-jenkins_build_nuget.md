---
layout: post
title:  "使用Jenkins建構NuGet套件並發佈"
categories: .NET
tags: .NETCore .NET Jenkins Docker Nuget
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

在.NET套件的開發後，通常都是發佈到NuGet或者是內部的NuGet平台，但如果使用手動到網站上面上傳將花費較多的時間。若結合Jenkins，可以達到在正式發行時，自動發布套件至指定的平台上。

本文將簡單的使用Jenkins進行NuGet套件的推送。

<!--more-->

> 本文使用 **docker** 作為安裝Jenkins的環境。

## 構建包含.NET Core SDK的Jenkins Docker Image

```dockerfile
# 引入jenkins
FROM jenkins/jenkins

#切換使用者為ROOT
USER root

# The method driver /usr/lib/apt/methods/https could not be found
# https://askubuntu.com/questions/104160/method-driver-usr-lib-apt-methods-https-could-not-be-found-update-error
RUN apt-get update
RUN apt-get install apt-transport-https

# Register Microsoft key and feed，參考https://www.microsoft.com/net/download/linux-package-manager/debian9/sdk-current
RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.asc.gpg
RUN mv microsoft.asc.gpg /etc/apt/trusted.gpg.d/
RUN wget -q https://packages.microsoft.com/config/debian/9/prod.list
RUN mv prod.list /etc/apt/sources.list.d/microsoft-prod.list
RUN chown root:root /etc/apt/trusted.gpg.d/microsoft.asc.gpg
RUN chown root:root /etc/apt/sources.list.d/microsoft-prod.list

# Install .NET SDK
RUN apt-get update
RUN apt-get install -y dotnet-sdk-2.2

# 切換回Jenkins
USER jenkins
```

## 建立Jenkins作業，設定Pipeline

```
pipeline {
    agent any
    stages {
        stage('Git Clone') {
            steps {
                script {
                    def branchName = 'master';
                    try {
                        branchName = "$ref".replace("refs/heads/","");
                        println branchName;
                    } catch (Exception e) {
                        println '建置非WebHook啟動'
                    }
                    
                    println '下載儲存庫分支: ' + branchName
                    
                    if(branchName == 'master'){
                        // 使用指定的git認證clone
                        git branch: branchName, credentialsId: 'xxxxxxxx', url: 'https://github.com/xxxxxxxx.git'
                    }else{
                        println '不作用'
                    }
                }
            }
        }
        stage('Build') {
            steps {
                script {
                    def branchName = 'master';
                    try {
                        branchName = "$ref".replace("refs/heads/","");
                        println branchName;
                    } catch (Exception e) {
                        println '建置非WebHook啟動'
                    }
                        
                    if(branchName == 'master'){
                        // 運行建構腳本，見第三點
                        sh 'bash ./build.sh'
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    def branchName = 'master';
                    try {
                        branchName = "$ref".replace("refs/heads/","");
                        println branchName;
                    } catch (Exception e) {
                        println '建置非WebHook啟動'
                    }
                        
                    if(branchName == 'master'){
                        // 切換至ngpkgs目錄並推送所有nupkg包到NuGet， xxxx項目為NuGet API KEY
                        sh 'cd ./ngpkgs; ls | grep ".nupkg$" | { while read -r nupkg; do eval "dotnet nuget push $nupkg -k xxxxxxxxxxxxxxxxxxxxxxxxx -s https://www.nuget.org/;"; done }';
                    }
                }
            }
        }
    }
}
```

## 撰寫build.sh建構腳本

```shell
set -e

# Read Version  需要再專案寫入一個version檔案，內容為套件版本號且NewLine符號
version=$(cat version)

# Output Path
path=$(pwd)
path="$path/ngpkgs"

# Remove Old Output
rm -R -f $path

# Restore Projects  grep區段為過濾實際建構目錄
find . -type d | grep '^./XWidget.[^/]*$' | { while read -r project; do eval "dotnet restore $project;"; done }

# Unit Test
find . -type d | grep '^./XWidget.[^/]*$' | grep '\b\.Test$' | { while read -r project; do eval "dotnet test $project;"; done }

# Build
find . -type d | grep '^./XWidget.[^/]*$' | { while read -r project; do eval "dotnet build $project;"; done }

# Pack
find . -type d | grep '^./XWidget.[^/]*$' | grep -v '\b\.Test$' | { while read -r project; do eval "dotnet pack $project -p:Version=$version --output $path; "; done }
```
