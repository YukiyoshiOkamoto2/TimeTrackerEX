# core/ics

ICSファイル（iCalendar形式）のパースとイベント抽出機能を提供します。

## 概要

このモジュールは、Outlook/GoogleカレンダーからエクスポートされたICSファイルを読み込み、イベント情報を抽出します。

**Python実装**: `app/input_ics.py` からの移行

## 主な機能

### parseICS

ICSファイルの内容をパースし、イベントリストを返します。

```typescript
import { parseICS } from '@/core/ics'

const result = parseICS(fileContent)

if (result.errorMessage) {
  console.error('エラー:', result.errorMessage)
} else {
  console.log('イベント数:', result.events.length)
}
```

**機能:**
- ICSファイルのパース
- イベント情報の抽出
- 繰り返しイベントの展開
- 過去イベントのフィルタリング

### extractRecentEvents

ICSファイルから最近のイベントのみを抽出します。

```typescript
import { extractRecentEvents } from '@/core/ics'

// 30日以内のイベントのみ抽出
const filteredICS = extractRecentEvents(fileContent, 30)
```

## データ構造

### InputICSResult

```typescript
interface InputICSResult {
  events: Event[]        // パースされたイベントリスト
  errorMessage?: string  // エラーメッセージ（エラー時）
}
```

## イベント処理

### 抽出される情報

- **基本情報**: 名前、UUID、開催者、場所
- **日時情報**: 開始日時、終了日時
- **状態**: プライベート、キャンセル済み
- **繰り返し**: 繰り返しルール（RRULE）の展開

### フィルタリング条件

1. **過去イベント**: デフォルトで30日前以降のイベントのみ対象
2. **キャンセル済み**: `TRANSP=TRANSPARENT`または名前が`Canceled:`/`キャンセル済み:`で始まる
3. **プライベート**: `CLASS=PRIVATE`

## 実装状況

✅ **実装完了**

### 実装済み機能

- [x] ICSパーサーの実装（ical.js使用）
- [x] 繰り返しイベント（RRULE）の処理
- [x] 日時のタイムゾーン処理
- [x] エラーハンドリング
- [x] 11個のテスト（すべて合格）

## 依存ライブラリ

- **ical.js** (v2.2.1) - ICSファイルのパース
  - TypeScript型定義を含む
  - iCalendar (RFC5545) 準拠
  - 繰り返しイベント（RRULE）サポート

### ical.js 基本的な使い方

```typescript
import ICAL from 'ical.js'

// ICSファイルをパース
const jcalData = ICAL.parse(icsContent)
const comp = new ICAL.Component(jcalData)

// VEVENTを取得
const vevents = comp.getAllSubcomponents('vevent')

vevents.forEach(vevent => {
  const event = new ICAL.Event(vevent)
  
  console.log('Summary:', event.summary)
  console.log('Start:', event.startDate.toJSDate())
  console.log('End:', event.endDate.toJSDate())
  console.log('Location:', event.location)
  
  // 繰り返しイベントの場合
  if (event.isRecurring()) {
    const expand = new ICAL.RecurExpansion({
      component: vevent,
      dtstart: event.startDate
    })
    
    // 次の10回分を展開
    for (let i = 0; i < 10; i++) {
      const next = expand.next()
      if (!next) break
      console.log('Next occurrence:', next.toJSDate())
    }
  }
})
```

## 使用例

### ファイルアップロード処理

```typescript
import { parseICS } from '@/core/ics'

function handleFileUpload(file: File) {
  const reader = new FileReader()
  
  reader.onload = (e) => {
    const content = e.target?.result as string
    const result = parseICS(content)
    
    if (result.errorMessages.length > 0) {
      console.warn('警告:', result.errorMessages.join('\n'))
    }
    
    // イベントを処理
    result.events.forEach(event => {
      if (!event.isCancelled && !event.isPrivate) {
        console.log(`${event.name}: ${event.schedule.start} - ${event.schedule.end}`)
      }
    })
  }
  
  reader.readAsText(file)
}
```

## 注意事項

1. **ブラウザ環境**: ファイル読み込みはブラウザのFileReader APIを使用
2. **タイムゾーン**: ICSファイルのタイムゾーン情報を正しく処理
3. **大容量ファイル**: メモリ使用量に注意（数千イベント以上の場合）
4. **文字エンコーディング**: UTF-8を想定

## 関連

- `types/index.ts` - Event, Schedule型定義
- `core/algorithm/` - イベントの時間計算処理
