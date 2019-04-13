---
layout: post
title:  "SQL內NULL排序問題"
categories: SQL
tags: SQL EFCore
author: XuPeiYao
excerpt_separator: <!--more-->
---

- content
{:toc}

使用SQL排序時，若排序基準包含了NULL值，在不同的資料庫中NULL出現的順位不一樣。
如在SQL Server中NULL在ASC排序中首先出現，在PostgreSQL中是在最後出現。
因為平時是使用SQL Server，最近使用PostgreSQL上遇到了排序不符習慣的情況。

<!--more-->

## SQL Server中的NULL排序

根據SQL Server的[文件](https://docs.microsoft.com/zh-tw/sql/t-sql/queries/select-order-by-clause-transact-sql?view=sql-server-2017)中提到了以下一點:

> ASC 從最低值到最高值進行排序。 DESC 從最高值到最低值進行排序。 ASC 是預設排序次序。 Null 值會當做最低的可能值來處理。

## PostgreSQL中的NULL排序

根據PostgreSQL的[文件](https://www.postgresql.org/docs/8.3/queries-order.html)中提到以下一點:

> The NULLS FIRST and NULLS LAST options can be used to determine whether nulls appear before or after non-null values in the sort ordering. By default, null values sort as if larger than any non-null value; that is, NULLS FIRST is the default for DESC order, and NULLS LAST otherwise.

簡而言之就是在PostgresSQL中NULL值大於所有非NULL值，在這個情況下在ASC排序中NULL將會排在最後。
但是文件也提到了可以透過在`ORDER BY`後補充`NULL FIRST`或`NULL LAST`語句來改變NULL在排序中的位置。

## 在EntityFrameworeCore中的處理

在EFCore中可以使用FromSql的方式執行自訂的SQL指令，可以直接在SQL中依據前項補充`NULL LAST`使得在查詢結果中獲得與SQL Server中NULL先出現的結果。

但我個人並不喜歡直接去使用FromSql，較偏愛使用Expression查詢。就這次的問題而言，就只是NULL值的問題，如果我們將NULL值轉換為0，或者為值域中的 **最小值** 後再排序也是可以獲得一樣的效果。
直接使用`COALESCE`的方式將NULL轉換為 **最小值** ，在EFCore中可以再調用`OrderBy`或`OrderByDescending`的Expression表示為`x => x.Value ?? 0`。

但如果排序的項目像是`SUM`的結果，在查詢中`Sum`方法返回的類型是非空類型，無法直接使用`??`運算子。
可以轉型為`Nullable<T>`例如表示為`x => ((int?)x.Values.Sum()) ?? 0`的形式，轉譯的SQL終將使用`COALESCE`。
但是如果直接將`Sum`結果直接`as int?`後進行`??`表示為`x => x.Values.Sum() as int? ?? 0`，將會變成在本地進行排序，沒有轉譯為SQL查詢。