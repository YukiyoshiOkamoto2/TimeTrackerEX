# History Module

イベントと作業項目のマッピング履歴を管理するモジュールです。

## 概要

`HistoryManager`は、過去に選択したイベントと作業項目の組み合わせを記憶し、次回同じイベントが発生した際に自動的に作業項目を提案する機能を提供します。

Python版の`history.py` (`TimeTrackerHistory`クラス)をTypeScriptに移植したものです。

## 主な機能

- **履歴の永続化**: CSV形式でLocalStorageに保存・復元
- **自動提案**: イベントキーに基づいて作業項目IDを取得
- **使用頻度トラッキング**: 同じイベントを複数回マッピングすると使用回数が増加
- **最終使用日時の記録**: 各エントリの最終使用日時を分単位で記録
- **頻度ベースのソート**: 使用回数が多い順に履歴をソート
- **サイズ管理**: 最大サイズを超えると古いエントリを自動削除
- **妥当性チェック**: 存在しない作業項目IDを持つエントリを削除

## データ形式

### CSV形式
履歴は以下のCSV形式でLocalStorageに保存されます:

```csv
key,eventName,WorkItemId,itemName,useCount,lastUsedDate
uuid-123|会議|user@example.com,定例会議,work-item-123,プロジェクトA,5,2025-10-08 14:30
uuid-456|レビュー|user@example.com,コードレビュー,work-item-456,タスクB\,サブタスク,3,2025-10-08 15:45
```

**カラム構成:**
- **key**: イベントの一意識別子 (`uuid|eventName|organizer`形式、`=`は`%3D`にエンコード)
- **eventName**: イベント名(カンマは`\,`でエスケープ)
- **WorkItemId**: 作業項目ID
- **itemName**: 作業項目名(カンマは`\,`でエスケープ)
- **useCount**: 使用回数
- **lastUsedDate**: 最終使用日時(ISO 8601形式、分まで)

## 使用方法

### 基本的な使い方

```typescript
import { getHistoryManager } from "@/core/history";

// シングルトンインスタンスを取得
const history = getHistoryManager();

// イベントに対応する作業項目IDを取得
const workItemId = history.getWorkItemId(event);

if (workItemId) {
    console.log("以前選択した作業項目:", workItemId);
} else {
    console.log("このイベントは初めてです");
}

// 新しいマッピングを保存
history.setHistory(event, workItem);
history.dump(); // LocalStorageに保存
```

### カスタム設定を使用

```typescript
import { HistoryManager } from "@/core/history";

const history = new HistoryManager({
    storageKey: "my-custom-history",
    maxSize: 500, // デフォルトは300
});

history.load();
```

### 作業項目の妥当性チェック

```typescript
import { getHistoryManager } from "@/core/history";

const history = getHistoryManager();
const workItems: WorkItem[] = await fetchWorkItems();

// 存在しない作業項目IDを持つエントリを削除
history.checkWorkItemId(workItems);
history.dump();
```

### すべての履歴エントリを取得・削除

```typescript
import { getHistoryManager } from "@/core/history";

const history = getHistoryManager();

// すべてのエントリを取得（デコード済みのキー）
const entries = history.getAllEntries();
console.log("履歴エントリ数:", entries.length);

// 各エントリを表示
entries.forEach(({ key, itemId }) => {
    console.log(`${key} -> ${itemId}`);
});

// 特定のキーを指定して削除
const deleted = history.deleteByKey("abc123|会議|user@example.com");
if (deleted) {
    console.log("削除成功");
} else {
    console.log("指定されたキーは存在しません");
}

// getAllEntriesで取得したキーをそのまま使用して削除
if (entries.length > 0) {
    history.deleteByKey(entries[0].key);
}
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
history.load();
```

##### dump()

履歴をLocalStorageに保存します。

```typescript
history.dump();
```

##### getWorkItemId(event)

イベントに対応する作業項目IDを取得します。

```typescript
const workItemId = history.getWorkItemId(event);
// => 'work-item-123' | null
```

##### setHistory(event, workItem)

イベントと作業項目のマッピングを追加します。

```typescript
history.setHistory(event, workItem);
```

##### checkWorkItemId(workItems)

作業項目IDの妥当性をチェックし、無効なエントリを削除します。

```typescript
history.checkWorkItemId(workItems);
```

##### clear()

すべての履歴をクリアします。

```typescript
history.clear();
```

##### getSize()

現在の履歴エントリ数を取得します。

```typescript
const size = history.getSize();
// => 42
```

##### getAll()

すべての履歴エントリを取得します（デバッグ用）。

```typescript
const all = history.getAll();
// => Map { 'event-key-1' => 'work-item-123', ... }
```

##### getAllEntries()

すべての履歴エントリをキー（デコード済み）とItemIdの配列で取得します。

```typescript
const entries = history.getAllEntries();
// => [
//      { key: 'abc123|会議|user@example.com', itemId: 'work-item-123' },
//      { key: 'def456|イベント=テスト|user@example.com', itemId: 'work-item-456' }
//    ]
```

**注意**: `getAll()`と異なり、キーの`%3D`が`=`にデコードされて返却されます。

##### deleteByKey(decodedKey)

キー（デコード済み）を指定して履歴を削除します。

```typescript
const deleted = history.deleteByKey("abc123|会議|user@example.com");
// => true (削除成功) または false (キーが存在しない)
```

**注意**:

- 引数にはデコード済みのキー（`=`を含む）を渡してください
- 削除後、自動的にLocalStorageに保存されます
- `getAllEntries()`で取得したキーをそのまま使用できます

### ユーティリティ関数

#### getHistoryManager()

デフォルトの履歴マネージャーインスタンスを取得します（シングルトン）。

```typescript
const history = getHistoryManager();
```

#### resetHistoryManager()

履歴マネージャーをリセットします（テスト用）。

```typescript
resetHistoryManager();
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

| Python                 | TypeScript                 |
| ---------------------- | -------------------------- |
| `TimeTrackerHistory`   | `HistoryManager`           |
| `load()`               | `load()`                   |
| `dump()`               | `dump()`                   |
| `check_work_item_id()` | `checkWorkItemId()`        |
| `get_work_item_id()`   | `getWorkItemId()`          |
| `set_history()`        | `setHistory()`             |
| `_get_key()`           | `getEventKey()` (内部関数) |

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
- `getAllEntries()`によるキーとItemIdの配列取得
- `deleteByKey()`によるキー指定での削除
- `getAllEntries()`と`deleteByKey()`の統合動作
