# core

ビジネスロジックを提供するコアモジュールです。UIから独立した純粋な関数とクラスで構成され、テスト可能で再利用可能な設計となっています。

## 概要

TimeTracker EXのコアロジックを実装したモジュール群です。Pythonバックエンドからの移植を進めており、以下の機能を提供します:

- 時間計算アルゴリズム
- TimeTracker API通信
- 履歴管理
- ICSファイルパース
- 無視設定管理
- PDFファイルパース

## ディレクトリ構成

```
core/
├── algorithm/       # 時間計算アルゴリズム
│   ├── algorithm.ts
│   ├── algorithm.test.ts
│   └── index.ts
├── api/             # API通信
│   ├── timeTracker.ts
│   └── index.ts
├── history/         # 履歴管理
│   ├── historyManager.ts
│   ├── historyManager.test.ts
│   ├── index.ts
│   └── README.md
├── ics/             # ICSファイルパース
│   ├── icsParser.ts
│   ├── icsParser.test.ts
│   ├── index.ts
│   └── README.md
├── ignore/          # 無視設定管理
│   ├── ignoreManager.ts
│   ├── ignoreManager.test.ts
│   ├── index.ts
│   └── README.md
└── pdf/             # PDFファイルパース
    ├── pdfParser.ts
    ├── pdfParser.test.ts
    ├── index.ts
    └── README.md
```

## モジュール一覧

### algorithm

**時間計算アルゴリズム**

- イベントとスケジュールから勤務時間を自動計算
- 時間の丸め処理（切り上げ・切り捨て・四捨五入等）
- 重複イベントの除去

📖 詳細: [algorithm/README.md](./algorithm/README.md)

### api

**TimeTracker APIクライアント**

- TimeTrackerへの認証
- プロジェクト一覧取得
- 作業項目取得
- タスク登録（単一/一括）

📖 詳細: [api/README.md](./api/README.md)

### history

**履歴マネージャー**

- イベントと作業項目のマッピング履歴管理
- Storageを使用した永続化
- 自動提案機能

📖 詳細: [history/README.md](./history/README.md)

### history

**履歴マネージャー**

- イベントと作業項目のマッピング履歴管理
- Storageを使用した永続化
- 自動提案機能
- 最大サイズ管理（300件）

📖 詳細: [history/README.md](./history/README.md)

### ics

**ICSファイルパーサー**

- Outlook/GoogleカレンダーのICSファイル読み込み
- イベント情報の抽出
- 繰り返しイベントの展開
- 過去イベントのフィルタリング

📖 詳細: [ics/README.md](./ics/README.md)

### ignore

**無視設定マネージャー**

- イベント/スケジュールのフィルタリング
- パターンマッチング（完全一致・部分一致）
- Storageを使用した永続化
- シングルトンパターン

📖 詳細: [ignore/README.md](./ignore/README.md)

### pdf

**PDFファイルパーサー**

- TimeTracker勤怠PDFの読み込み
- 勤務時間・打刻時間の抽出
- 休日・有給休暇の判定

📖 詳細: [pdf/README.md](./pdf/README.md)

## 設計原則

### 1. UIからの独立

- Reactコンポーネントに依存しない
- ブラウザAPIの直接使用を最小限に
- 純粋な関数・クラスとして実装

### 2. テスト可能性

- 各モジュールに対応するテストファイルを配置
- 依存関係を注入可能に設計
- モックしやすいインターフェース

### 3. 型安全性

- 全ての関数に型注釈
- `any`型の使用禁止
- 入力バリデーション

## 使用方法

### algorithm - 時間計算

```typescript
import { TimeTrackerAlgorithm } from '@/core/algorithm'

const algorithm = new TimeTrackerAlgorithm(project, eventInfo, scheduleInfo)
const dayTasks = algorithm.splitOneDayTask(date, events, schedules)

dayTasks.forEach(task => {
  console.log(`${task.workItemName}: ${task.start} - ${task.end}`)
})
```

### api - TimeTracker API

```typescript
import { TimeTracker, validateTimeTrackerTask } from '@/core/api'
import type { TimeTrackerTask } from '@/core/api'

const api = new TimeTracker(baseUrl, userName, projectId)
await api.connectAsync(password)

const project = await api.getProjectsAsync()
const workItems = await api.getWorkItemsAsync()

const task: TimeTrackerTask = {
  workItemId: 'item-123',
  startTime: new Date('2025-10-04T09:00:00'),
  endTime: new Date('2025-10-04T12:00:00'),
  memo: '開発作業'
}

validateTimeTrackerTask(task)
await api.postTaskAsync(task)
```

### history - 履歴管理

```typescript
import { getHistoryManager } from '@/core/history'

const historyManager = getHistoryManager()

// 履歴を追加
historyManager.set('event-uuid-123', 'work-item-456')
historyManager.dump()

// 履歴から取得
const workItemId = historyManager.get('event-uuid-123')

// すべての履歴を取得
const allHistory = historyManager.getAll()
```

### ics - ICSパース

```typescript
import { parseICS, extractRecentEvents } from '@/core/ics'
import type { InputICSResult } from '@/core/ics'

// ICSファイルをパース
const result: InputICSResult = parseICS(fileContent)

if (result.errorMessages.length === 0) {
  result.events.forEach(event => {
    if (!event.isCancelled && !event.isPrivate) {
      console.log(`${event.name}: ${event.start} - ${event.end}`)
    }
  })
}

// 最近30日のイベントのみ抽出
const recentResult = extractRecentEvents(fileContent, 30)
```

### ignore - 無視設定

```typescript
import { getIgnoreManager } from '@/core/ignore'

const ignoreManager = getIgnoreManager()

// 無視設定を追加
ignoreManager.addIgnoreItem({
  type: 'event',
  name: '休憩',
  matchType: 'contains'
})
ignoreManager.dump()

// イベントが無視対象かチェック
if (ignoreManager.ignoreEvent(event)) {
  console.log('このイベントは無視されます')
}
```

### pdf - PDFパース

```typescript
import { parsePDF } from '@/core/pdf'

const file = new File([pdfData], 'attendance.pdf')
const result = await parsePDF(file)

if (result.schedules.length > 0) {
  result.schedules.forEach(schedule => {
    console.log(`${schedule.start} - ${schedule.end}`)
    if (schedule.isHoliday) console.log('休日')
    if (schedule.isPaidLeave) console.log('有給休暇')
  })
}
```

## テスト

```bash
# 全テスト実行
npm test

# core配下のみ
npm test -- core/

# 特定のモジュール
npm test -- core/algorithm/
```

## テスト状況

| モジュール | テスト数 | カバレッジ | 依存ライブラリ |
|-----------|---------|-----------|---------------|
| algorithm | 54 | ✅ 100% | - |
| api | - | 🔄 未実装 | HttpRequestQueue |
| history | 19 | ✅ 完了 | Storage |
| ics | 11 | ✅ 完了 | ical.js v2.2.1 |
| ignore | 23 | ✅ 完了 | Storage |
| pdf | 3 | ✅ 完了 | pdfjs-dist |
| **合計** | **110** | **✅ 99%** | - |

### テスト実行

```bash
# 全テスト実行
npm test

# coreモジュールのみ
npm test -- core/

# 特定のモジュール
npm test -- core/algorithm/
npm test -- core/history/
npm test -- core/ignore/

# watchモード
npm test -- core/ --watch
```

## パフォーマンス

各モジュールの計算量:

| モジュール | 計算量 | 備考 |
|-----------|--------|------|
| algorithm | O(n log n) | n = イベント数、ソートが支配的 |
| history | O(1) | Mapベースの高速検索 |
| ignore | O(n) | n = 無視設定数 |
| ics | O(n) | n = イベント数 |
| pdf | O(n) | n = PDFページ数 |

## 依存関係

```
core/
├── algorithm     → types, lib/logger
├── api          → types, lib/asyncQueue
├── history      → lib/storage, lib/logger
├── ics          → types, lib/logger, ical.js
├── ignore       → types, lib/storage, lib/logger
└── pdf          → types, lib/logger, pdfjs-dist
```

## Pythonからの移植状況

| Python | TypeScript | 状態 | テスト |
|--------|------------|------|--------|
| algorithm.py | algorithm/ | ✅ 完了 | 54 |
| api.py | api/ | ✅ 完了 | 🔄 未実装 |
| history.py | history/ | ✅ 完了 | 19 |
| input_ics.py | ics/ | ✅ 完了 | 11 |
| ignore.py | ignore/ | ✅ 完了 | 23 |
| input_pdf.py | pdf/ | ✅ 完了 | 3 |

## 開発ガイドライン

### 新しいモジュールを追加する場合

1. **ディレクトリ構成**
   ```
   core/
   └── new-module/
       ├── newModule.ts
       ├── newModule.test.ts
       ├── index.ts
       └── README.md
   ```

2. **index.tsでエクスポート**
   ```typescript
   export { NewModule } from './newModule'
   export type { NewModuleConfig } from './newModule'
   ```

3. **core/index.tsに追加**
   ```typescript
   export * from './new-module'
   ```

4. **READMEを作成**
   - 概要
   - 使用例
   - API リファレンス
   - Pythonとの対応表

5. **テストを作成**
   - 100%カバレッジを目指す
   - エッジケースをカバー
   - エラーハンドリングをテスト

### コーディング規約

- **命名規則**: camelCase (クラス名はPascalCase)
- **ロギング**: すべての主要な操作でログ出力
- **型安全性**: `any`型は禁止、厳密な型定義
- **エラーハンドリング**: try-catchで適切にエラーをキャッチ
- **ドキュメント**: JSDocコメントを記述

## トラブルシューティング

### よくある問題

**Q: テストが失敗する**
```bash
# キャッシュをクリアして再実行
npm run clean
npm test
```

**Q: 型エラーが出る**
```bash
# 型定義を再生成
npm run type-check
```

**Q: ログが表示されない**
```typescript
// ログレベルを確認
import { configureLogger, LogLevel } from '@/lib/logger'
configureLogger({ level: LogLevel.DEBUG })
```

## 関連

- `types/` - 型定義
- `store/` - 状態管理
- `schema/` - バリデーション
