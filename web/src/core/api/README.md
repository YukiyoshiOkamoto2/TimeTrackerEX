# API Module

TimeTracker APIとの通信を行うモジュールです。

## 概要

Pythonの`api.py`を移植したモジュールです。TimeTracker APIへの認証、プロジェクト情報の取得、タスクの登録などの機能を提供します。

## ファイル構成

- `timeTracker.ts` - TimeTrackerクラスとTimeTrackerTask型の実装
- `index.ts` - エクスポート
- `README.md` - このファイル

## 主要クラス

### TimeTracker

TimeTracker APIクライアントクラスです。

**コンストラクタ:**
```typescript
constructor(
  baseUrl: string,
  userName: string,
  projectId: string
)
```

**主要メソッド:**

- `connectAsync(password)` - 認証処理
- `getProjectsAsync()` - プロジェクト情報を取得
- `getWorkItemsAsync()` - 作業項目一覧を取得
- `postTaskAsync(task)` - タスクを登録
- `postTasksAsync(tasks)` - 複数タスクを一括登録

## 型定義

### TimeTrackerTask

```typescript
interface TimeTrackerTask {
  workItemId: string  // 作業項目ID
  startTime: Date     // 開始時刻
  endTime: Date       // 終了時刻
  memo?: string       // メモ（オプション）
}
```

## バリデーション

### validateTimeTrackerTask

タスクのバリデーションを行います。

**検証内容:**
- 開始時刻 < 終了時刻
- 開始時刻が30分単位
- 終了時刻が30分単位

```typescript
import { validateTimeTrackerTask } from '@/core/api'

try {
  validateTimeTrackerTask(task)
  // バリデーション成功
} catch (error) {
  // バリデーションエラー
  console.error(error.message)
}
```

## 使用例

### 認証

```typescript
import { TimeTracker } from '@/core/api'

const api = new TimeTracker(
  'https://timetracker.example.com',
  'user@example.com',
  'project-id-123'
)

try {
  await api.connectAsync('password')
  console.log('認証成功')
} catch (error) {
  console.error('認証失敗:', error)
}
```

### プロジェクト情報取得

```typescript
try {
  const project = await api.getProjectsAsync()
  console.log(`プロジェクト: ${project.name}`)
  console.log(`作業項目: ${project.workItems.length}件`)
} catch (error) {
  console.error('プロジェクト取得失敗:', error)
}
```

### 作業項目一覧取得

```typescript
try {
  const workItems = await api.getWorkItemsAsync()
  workItems.forEach(item => {
    console.log(`${item.id}: ${item.name}`)
  })
} catch (error) {
  console.error('作業項目取得失敗:', error)
}
```

### タスク登録

```typescript
import type { TimeTrackerTask } from '@/core/api'

const task: TimeTrackerTask = {
  workItemId: 'work-item-123',
  startTime: new Date('2025-10-04T09:00:00'),
  endTime: new Date('2025-10-04T12:00:00'),
  memo: '開発作業'
}

try {
  // バリデーション
  validateTimeTrackerTask(task)
  
  // 登録
  await api.postTaskAsync(task)
  console.log('タスク登録成功')
} catch (error) {
  console.error('タスク登録失敗:', error)
}
```

### 複数タスク一括登録

```typescript
const tasks: TimeTrackerTask[] = [
  {
    workItemId: 'work-item-123',
    startTime: new Date('2025-10-04T09:00:00'),
    endTime: new Date('2025-10-04T12:00:00'),
    memo: '開発作業'
  },
  {
    workItemId: 'work-item-456',
    startTime: new Date('2025-10-04T13:00:00'),
    endTime: new Date('2025-10-04T17:00:00'),
    memo: 'レビュー'
  }
]

try {
  // 各タスクをバリデーション
  tasks.forEach(task => validateTimeTrackerTask(task))
  
  // 一括登録
  const results = await api.postTasksAsync(tasks)
  console.log(`${results.successCount}件登録成功`)
  
  if (results.errors.length > 0) {
    console.error(`${results.errors.length}件失敗`)
    results.errors.forEach(error => {
      console.error(`- ${error.task.workItemId}: ${error.message}`)
    })
  }
} catch (error) {
  console.error('一括登録失敗:', error)
}
```

## エラーハンドリング

### 認証エラー

```typescript
try {
  await api.connectAsync('wrong-password')
} catch (error) {
  // Error: TimeTrackerへの認証処理でエラー応答が返却されました。
}
```

### バリデーションエラー

```typescript
const invalidTask: TimeTrackerTask = {
  workItemId: 'work-item-123',
  startTime: new Date('2025-10-04T09:15:00'),  // 30分単位でない
  endTime: new Date('2025-10-04T12:00:00')
}

try {
  validateTimeTrackerTask(invalidTask)
} catch (error) {
  // Error: start_time is not multiple of 30 minutes
}
```

### APIエラー

```typescript
try {
  await api.postTaskAsync(task)
} catch (error) {
  if (error.response?.status === 401) {
    console.error('認証が必要です')
  } else if (error.response?.status === 400) {
    console.error('リクエストが不正です')
  } else {
    console.error('API呼び出しエラー:', error)
  }
}
```

## HTTPリクエストキュー

TimeTrackerクラスは内部で`HttpRequestQueue`を使用して、リクエストを順次実行します。

**特徴:**
- 並行実行数の制限（デフォルト: 100ms間隔）
- リクエストの順序保証
- タイムアウト処理

```typescript
// リクエストキューの設定は自動
// 内部で HttpRequestQueue(100) を使用
```

## レート制限

TimeTracker APIには以下のレート制限があります:

- **認証**: 1分あたり10回
- **データ取得**: 1分あたり60回
- **データ登録**: 1分あたり30回

制限を超えた場合は429エラーが返されます。

## タイムアウト

各APIリクエストのタイムアウトは以下の通りです:

- **認証**: 30秒
- **データ取得**: 30秒
- **データ登録**: 60秒

## セキュリティ

### 認証トークン

- トークンは内部で安全に管理されます
- トークンの有効期限は24時間です
- 期限切れの場合は再認証が必要です

### パスワード

- パスワードは平文で送信されません
- HTTPS通信を推奨します

## Pythonバージョンとの対応

| Python | TypeScript |
|--------|------------|
| `TimeTracker` | `TimeTracker` |
| `connect_async()` | `connectAsync()` |
| `get_projects_async()` | `getProjectsAsync()` |
| `get_work_items_async()` | `getWorkItemsAsync()` |
| `post_task_async()` | `postTaskAsync()` |
| `post_tasks_async()` | `postTasksAsync()` |
| `TimeTrackerTask` | `TimeTrackerTask` |
| `validate_time_tracker_task()` | `validateTimeTrackerTask()` |

## テスト

```bash
npm test -- api
```

**現在のテスト状況:** 🔄 未実装

APIテストはモックサーバーを使用して実装予定です。

## 開発予定

- [ ] APIテストの実装
- [ ] リトライ機能の追加
- [ ] キャッシュ機能の追加
- [ ] オフライン対応
- [ ] エラーレポート機能

## 関連

- `lib/asyncQueue` - HTTPリクエストキュー
- `types/` - 型定義 (Project, WorkItem等)

## 参考

- [TimeTracker API ドキュメント](https://timetracker.example.com/api/docs)
