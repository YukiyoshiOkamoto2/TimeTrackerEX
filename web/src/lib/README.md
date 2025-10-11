# lib/ - ユーティリティライブラリ

アプリケーション全体で使用される汎用機能。

## モジュール

| モジュール | 説明 | テスト |
|-----------|------|-------|
| **asyncQueue** | 非同期タスクのキュー管理 (HTTP通信、タイムアウト対応) | 10 |
| **logger** | ログ出力とレベル管理 | 20 |
| **storage** | localStorage抽象化 | 33 |
| **dateUtil** | タイムゾーンに依存しない日付操作 | 27 |

## 使用方法

### logger
```typescript
import { getLogger, LogLevel } from '@/lib'
const logger = getLogger('MyComponent')
logger.debug('message', data)
logger.setLevel(LogLevel.WARN)
```

### storage
```typescript
import { getStorage } from '@/lib'
const storage = getStorage()
storage.setValue('key', value)
const value = storage.getValue<T>('key')
```

### asyncQueue
```typescript
import { HttpRequestQueue } from '@/lib'

// waitTime: キュー処理間隔(ms), retryCount: リトライ回数, headers: 共通ヘッダー, timeout: タイムアウト時間(ms)
const queue = new HttpRequestQueue(100, 2, {}, 30000)

// タスクをキューに追加（AbortControllerによるタイムアウト対応）
const response = await queue.enqueueAsync({ 
  url: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' },
  json: { data: 'value' }  // POSTの場合
})
```

### dateUtil
```typescript
import { formatDateKey, isSameDay, resetTime, parseDateKey, addDays } from '@/lib'

// 日付をYYYY-MM-DD形式に変換（タイムゾーン安全）
const dateKey = formatDateKey(new Date(2024, 1, 3)) // "2024-02-03"

// 日付文字列からDateオブジェクトを作成
const date = parseDateKey("2024-02-03")

// 時刻をリセット（00:00:00.000）
const midnight = resetTime(new Date())

// 同じ日かチェック（時刻無視）
const isToday = isSameDay(new Date(), someDate)

// 日数を加算/減算
const tomorrow = addDays(new Date(), 1)
const yesterday = addDays(new Date(), -1)
```
