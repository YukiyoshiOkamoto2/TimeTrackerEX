# core/history/ - 履歴管理

イベントUUIDWorkItemIDマッピング履歴。localStorage永続化。

## クラス: HistoryManager

**最大件数**: 300件 (FIFO)

## メソッド

- `set(uuid, workItemId)`: マッピング登録
- `get(uuid)`: WorkItemID取得
- `getAll()`: 全履歴取得
- `deleteByKey(uuid)`: 履歴削除
- `clear()`: 全削除
- `dump()`: localStorage保存
- `load()`: localStorage読み込み

**テスト**: 32 tests

**ストレージキー**: `timetracker_history_v1`
