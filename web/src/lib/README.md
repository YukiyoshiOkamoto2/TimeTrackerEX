# lib/ - ユーティリティライブラリ

アプリケーション全体で使用される汎用機能。

## モジュール

| モジュール | 説明 | テスト |
|-----------|------|-------|
| **asyncQueue** | 非同期タスクのキュー管理 (HTTP通信、タイムアウト対応) | 10 |
| **logger** | ログ出力とレベル管理 | 20 |
| **storage** | localStorage抽象化 | 33 |

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
