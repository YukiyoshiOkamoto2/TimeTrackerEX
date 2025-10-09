# core/ignore/ - 無視イベント管理

イベント名パターンマッチングによる無視設定。

## クラス: IgnoreManager

**パターンタイプ**: `完全一致` | `部分一致` | `前方一致` | `後方一致`

## メソッド

- `add(pattern, matchType)`: パターン追加
- `remove(uuid)`: パターン削除
- `isIgnored(eventName)`: 無視判定
- `getAll()`: 全パターン取得
- `clear()`: 全削除
- `dump()`: localStorage保存
- `load()`: localStorage読み込み

**テスト**: 32 tests

**ストレージキー**: `timetracker_ignore_v1`
