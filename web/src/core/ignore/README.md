# Ignore Module

イベントやスケジュールの無視設定を管理するモジュールです。

## 概要

Pythonの`ignore.py`を移植したモジュールです。特定の名前パターンにマッチするイベントやスケジュールを無視する機能を提供します。

## ファイル構成

- `ignoreManager.ts` - 無視マネージャーの実装
- `ignoreManager.test.ts` - テストファイル
- `index.ts` - エクスポート
- `README.md` - このファイル

## 主要クラス

### IgnoreManager

イベントやスケジュールの無視設定を管理するクラスです。

**主要メソッド:**

- `load()` - Storageから設定を読み込む
- `dump()` - Storageに設定を保存する
- `ignoreEvent(event)` - イベントが無視対象かチェック
- `ignoreSchedule(schedule)` - スケジュールが無視対象かチェック
- `addIgnoreItem(item)` - 無視設定を追加
- `removeIgnoreItem(index)` - 無視設定を削除
- `getAllIgnoreItems()` - すべての無視設定を取得
- `clear()` - すべての無視設定をクリア
- `getSize()` - 無視設定の件数を取得

## データ構造

### IgnoreInfo

```typescript
interface IgnoreInfo {
  /** 無視対象の種類 */
  type: 'event' | 'schedule'
  /** マッチング対象の名前 */
  name: string
  /** マッチングタイプ (デフォルト: "exact") */
  matchType?: 'contains' | 'exact'
}
```

## マッチングタイプ

- `exact` - 完全一致。名前が完全に一致する場合のみマッチ
- `contains` - 部分一致。名前に指定文字列が含まれる場合マッチ

## 使用例

### 基本的な使い方

```typescript
import { getIgnoreManager } from '@/core/ignore'

// シングルトンインスタンスを取得
const ignoreManager = getIgnoreManager()

// イベントをチェック
if (ignoreManager.ignoreEvent(event)) {
  console.log('このイベントは無視されます')
}

// スケジュールをチェック
if (ignoreManager.ignoreSchedule(schedule)) {
  console.log('このスケジュールは無視されます')
}
```

### 無視設定の追加

```typescript
import { IgnoreManager } from '@/core/ignore'

const ignoreManager = new IgnoreManager()
ignoreManager.load()

// 完全一致で無視
ignoreManager.addIgnoreItem({
  type: 'event',
  name: '休憩時間',
  matchType: 'exact'
})

// 部分一致で無視
ignoreManager.addIgnoreItem({
  type: 'event',
  name: '休憩',
  matchType: 'contains'
})

// 保存
ignoreManager.dump()
```

### 無視設定の管理

```typescript
const ignoreManager = getIgnoreManager()

// すべての設定を取得
const items = ignoreManager.getAllIgnoreItems()
console.log(`無視設定: ${items.length}件`)

// 設定を削除
ignoreManager.removeIgnoreItem(0)
ignoreManager.dump()

// すべてクリア
ignoreManager.clear()
```

### カスタム設定

```typescript
import { IgnoreManager } from '@/core/ignore'

// カスタムストレージキーを使用
const ignoreManager = new IgnoreManager({
  storageKey: 'my-ignore-items'
})

ignoreManager.load()
```

## Storageとの連携

無視設定は、Storageシステムを使用して永続化されます。

**ストレージキー:** `ignore-items`

**データ構造:**
```json
[
  {
    "type": "event",
    "name": "休憩",
    "matchType": "contains"
  },
  {
    "type": "schedule",
    "name": "定例会議",
    "matchType": "exact"
  }
]
```

## Pythonバージョンとの対応

| Python | TypeScript |
|--------|------------|
| `Ignore` | `IgnoreManager` |
| `load()` | `load()` |
| `dump()` | `dump()` |
| `ignore_event()` | `ignoreEvent()` |
| `ignore_schdule()` | `ignoreSchedule()` |
| `_match()` | `match()` (private) |
| ファイルパス | Storageキー |

## 特徴

- **Storage統合**: 構造化データとして保存
- **型安全**: TypeScriptの型システムを活用
- **シングルトン**: `getIgnoreManager()`で簡単にアクセス
- **テスト**: 包括的なテストカバレッジ
- **ロギング**: すべての操作をログ出力

## テスト

```bash
npm test ignore
```

**テストカバレッジ:**
- load/dump操作
- イベント/スケジュールの無視判定
- 完全一致/部分一致
- 設定の追加/削除
- シングルトンパターン
- データ検証
