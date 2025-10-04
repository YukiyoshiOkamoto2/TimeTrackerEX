# History Module

イベントと作業項目のマッピング履歴を管理するモジュールです。

## 概要

`HistoryManager`は、過去に選択したイベントと作業項目の組み合わせを記憶し、次回同じイベントが発生した際に自動的に作業項目を提案する機能を提供します。

Python版の`history.py` (`TimeTrackerHistory`クラス)をTypeScriptに移植したものです。

## 主な機能

- **履歴の永続化**: LocalStorageを使用して履歴を保存・復元
- **自動提案**: イベントキーに基づいて作業項目IDを取得
- **サイズ管理**: 最大サイズを超えると古いエントリを自動削除
- **妥当性チェック**: 存在しない作業項目IDを持つエントリを削除

## 使用方法

### 基本的な使い方

```typescript
import { getHistoryManager } from '@/core/history'

// シングルトンインスタンスを取得
const history = getHistoryManager()

// イベントに対応する作業項目IDを取得
const workItemId = history.getWorkItemId(event)

if (workItemId) {
  console.log('以前選択した作業項目:', workItemId)
} else {
  console.log('このイベントは初めてです')
}

// 新しいマッピングを保存
history.setHistory(event, workItem)
history.dump() // LocalStorageに保存
```

### カスタム設定を使用

```typescript
import { HistoryManager } from '@/core/history'

const history = new HistoryManager({
  storageKey: 'my-custom-history',
  maxSize: 500, // デフォルトは300
})

history.load()
```

### 作業項目の妥当性チェック

```typescript
import { getHistoryManager } from '@/core/history'

const history = getHistoryManager()
const workItems: WorkItem[] = await fetchWorkItems()

// 存在しない作業項目IDを持つエントリを削除
history.checkWorkItemId(workItems)
history.dump()
```

## API

### HistoryManager クラス

#### コンストラクタ

```typescript
constructor(config?: Partial<HistoryConfig>)
```

- `config.storageKey`: LocalStorageのキー（デフォルト: `'time-tracker-history'`）
- `config.maxSize`: 履歴の最大サイズ（デフォルト: `300`）

#### メソッド

##### load()

LocalStorageから履歴を読み込みます。

```typescript
history.load()
```

##### dump()

履歴をLocalStorageに保存します。

```typescript
history.dump()
```

##### getWorkItemId(event)

イベントに対応する作業項目IDを取得します。

```typescript
const workItemId = history.getWorkItemId(event)
// => 'work-item-123' | null
```

##### setHistory(event, workItem)

イベントと作業項目のマッピングを追加します。

```typescript
history.setHistory(event, workItem)
```

##### checkWorkItemId(workItems)

作業項目IDの妥当性をチェックし、無効なエントリを削除します。

```typescript
history.checkWorkItemId(workItems)
```

##### clear()

すべての履歴をクリアします。

```typescript
history.clear()
```

##### getSize()

現在の履歴エントリ数を取得します。

```typescript
const size = history.getSize()
// => 42
```

##### getAll()

すべての履歴エントリを取得します（デバッグ用）。

```typescript
const all = history.getAll()
// => Map { 'event-key-1' => 'work-item-123', ... }
```

### ユーティリティ関数

#### getHistoryManager()

デフォルトの履歴マネージャーインスタンスを取得します（シングルトン）。

```typescript
const history = getHistoryManager()
```

#### resetHistoryManager()

履歴マネージャーをリセットします（テスト用）。

```typescript
resetHistoryManager()
```

## データ構造

### ストレージ形式

LocalStorageには以下の形式で保存されます：

```
event-key-1=work-item-id-1
event-key-2=work-item-id-2
event-key-3=work-item-id-3
```

### イベントキー

イベントキーは以下の形式で生成されます：

```
{uuid}|{name}|{organizer}
```

例：
```
abc123|週次ミーティング|user@example.com
```

**注意**: `=` 文字は `%3D` にエンコードされます。

## Python版との対応

| Python | TypeScript |
|--------|-----------|
| `TimeTrackerHistory` | `HistoryManager` |
| `load()` | `load()` |
| `dump()` | `dump()` |
| `check_work_item_id()` | `checkWorkItemId()` |
| `get_work_item_id()` | `getWorkItemId()` |
| `set_history()` | `setHistory()` |
| `_get_key()` | `getEventKey()` (内部関数) |

## ロギング

すべての重要な操作はロガーに記録されます：

- `INFO`: 履歴の読み込み、クリア
- `DEBUG`: 個別のエントリ操作、削除
- `WARN`: 不正なデータのスキップ
- `ERROR`: 読み込み・保存の失敗

```typescript
// ログ出力例
[INFO] 履歴を読み込みました: 42件
[DEBUG] 履歴を追加: abc123|会議|user@example.com -> work-item-456
[DEBUG] 最大サイズに到達。最も古いエントリを削除: old-key=old-value
```

## テスト

テストファイル: `historyManager.test.ts`

```bash
npm test history
```

テストカバレッジ：
- 基本的な読み込み・保存機能
- イベントと作業項目のマッピング
- 最大サイズ管理
- 妥当性チェック
- シングルトンパターン
- エッジケース（不正なデータ、特殊文字など）
