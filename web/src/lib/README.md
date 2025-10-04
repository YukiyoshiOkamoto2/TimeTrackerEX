# Lib Module

ユーティリティとヘルパー関数を提供するライブラリモジュールです。

## 概要

libモジュールは、アプリケーション全体で使用される汎用的な機能を提供します。非同期タスク管理、ロギング、永続ストレージの3つの主要コンポーネントで構成されています。

## モジュール構成

| モジュール | 説明 | テスト |
|-----------|------|-------|
| **asyncQueue** | 非同期タスクのキュー管理 | - |
| **logger** | ログ出力とレベル管理 | 20 |
| **storage** | 永続データストレージ | 33 |

**合計:** 53テスト

## ファイル構成

```
src/lib/
├── index.ts           # エクスポート用エントリーポイント
├── asyncQueue.ts      # 非同期キュー処理の実装
├── logger.ts          # ログ管理の実装
├── logger.test.ts     # ロガーテスト (20)
├── storage.ts         # 永続データストレージの実装
├── storage.test.ts    # ストレージテスト (33)
└── README.md          # このファイル（包括的なドキュメント）
```

## クイックスタート

### AsyncQueue - HTTP通信のキュー管理

非同期タスクをキューで管理し、順次実行します。

```typescript
import { HttpRequestQueue } from '@/lib'

const queue = new HttpRequestQueue()

// GET リクエスト
const response = await queue.enqueueAsync({
  url: 'https://api.example.com/data',
  method: 'GET'
})

// POST リクエスト
await queue.enqueueAsync({
  url: 'https://api.example.com/data',
  method: 'POST',
  data: { key: 'value' }
})
```

**詳細:** [asyncQueue.README.md](./asyncQueue.README.md)

### Logger - ログ管理

ブラウザconsoleをラップし、ログレベル管理を提供します。

```typescript
import { getLogger, LogLevel } from '@/lib'

const logger = getLogger('MyComponent')

logger.debug('デバッグ情報', { data: 123 })
logger.info('処理開始')
logger.warn('警告メッセージ')
logger.error('エラー発生', error)

// ログレベル変更
logger.setLevel(LogLevel.WARN)  // WARN以上のみ出力
```

### Storage - 永続データストレージ

LocalStorageを抽象化し、型安全なデータ保存を提供します。

```typescript
import { getStorage } from '@/lib'

const storage = getStorage()

// 値の保存
storage.setValue('userName', 'John Doe')
storage.setValue('settings', { theme: 'dark', lang: 'ja' })

// 値の取得（型安全）
const name = storage.getValue<string>('userName')
const settings = storage.getValue<{theme: string, lang: string}>('settings')

// 値の削除
storage.removeValue('userName')

// すべてクリア
storage.clear()
```

## 主要な機能

### AsyncQueue

- **抽象クラス**: `AsyncQueue<TData, TResult>`
  - カスタムキュー処理の基底クラス
  - 自動リトライ機能
  - タスク間の待機時間管理

- **HTTP実装**: `HttpRequestQueue`
  - GET/POST/PUT/DELETEサポート
  - デフォルトヘッダー設定
  - エラーハンドリング
  - レート制限対応

**使用例:**
- API呼び出しのレート制限
- バッチ処理
- 順次実行が必要な操作

### Logger

- **ログレベル**: DEBUG < INFO < WARN < ERROR
  - 環境に応じた出力制御
  - 詳細度の調整

- **設定可能**:
  - 最大メッセージ長
  - タイムスタンプ表示
  - ソース名表示

- **シングルトン**: `getLogger(name)`
  - 名前ベースのインスタンス管理
  - グローバル設定共有

**使用例:**
- デバッグ情報の出力
- エラートラッキング
- パフォーマンス監視

### Storage

- **抽象化**: `IStorage`インターフェース
  - LocalStorage実装
  - メモリ実装（フォールバック）
  - カスタム実装可能

- **型安全**: TypeScriptジェネリクス
  - 型推論サポート
  - コンパイル時チェック

- **構造化データ**: 単一ルートキー
  - データの一貫性
  - バージョン管理
  - 名前空間分離

**使用例:**
- ユーザー設定の保存
- アプリケーション状態の永続化
- キャッシュデータの管理

## モジュール間の関係

```
┌─────────────┐     使用      ┌─────────────┐     使用      ┌─────────────┐
│ asyncQueue  │──────────────►│   logger    │◄──────────────│   storage   │
└─────────────┘               └─────────────┘               └─────────────┘
                                     ▲
                                     │
                                     │ すべてのモジュールから使用
                                     │
                                 ┌───┴────┐
                                 │  core  │
                                 └────────┘
```

- **logger**: 他のモジュールに依存しない（すべてから使用される）
- **asyncQueue**: loggerを使用
- **storage**: loggerを使用

## Pythonバージョンからの移行

| Python | TypeScript | 説明 |
|--------|------------|------|
| `async_queue.py` | `asyncQueue.ts` | 非同期キュー管理 |
| `logger.py` | `logger.ts` | ログ管理 |
| `setting.py` | `storage.ts` | 設定・データ保存 |

### 主な変更点

1. **型安全性の向上**
   - TypeScriptのジェネリクスを活用
   - 型推論とコンパイル時チェック

2. **モダンなAPI**
   - async/await構文
   - Promise ベース
   - ブラウザAPIの活用

3. **テストカバレッジ**
   - Vitestによるユニットテスト
   - 53テストで機能を保証

## 開発ガイドライン

### 新しいモジュールの追加

1. **実装ファイル作成**: `lib/newModule.ts`
2. **テスト作成**: `lib/newModule.test.ts`
3. **ドキュメント作成**: `lib/newModule.README.md`
4. **エクスポート追加**: `lib/index.ts` に追加
5. **メインREADME更新**: このファイルに追加

### コーディング規約

- **命名**: camelCase（クラスはPascalCase）
- **エクスポート**: 必要なもののみpublic
- **ドキュメント**: TSDocコメント必須
- **テスト**: 主要機能は100%カバレッジ

### テストの実行

```bash
# すべてのlibテストを実行
npm test -- lib/

# 特定のモジュールのみ
npm test -- lib/logger.test.ts
npm test -- lib/storage.test.ts

# watchモード
npm test -- lib/ --watch
```

## パフォーマンス考慮事項

### AsyncQueue
- タスク追加: O(1)
- タスク処理: O(n) - nはキューサイズ
- メモリ: O(n)

### Logger
- ログ出力: O(1)
- メモリ: 最小限（consoleに委譲）

### Storage
- 読み書き: O(1) - JSON parse/stringifyのコスト
- キー列挙: O(n) - nはキー数
- メモリ: LocalStorageの制限内（5-10MB）

## トラブルシューティング

### AsyncQueueが動作しない

- ネットワークエラーを確認
- リトライ回数を増やす
- ログを確認（logger.debug()）

### Loggerが出力されない

- ログレベルを確認（LogLevel.DEBUG に設定）
- ブラウザconsoleが有効か確認
- フィルタ設定を確認

### Storageが保存されない

- LocalStorageの容量を確認（5-10MB制限）
- プライベートブラウジングモードでないか確認
- MemoryStorageにフォールバックしていないか確認

## 関連リンク

- [Core Module](../core/README.md) - ビジネスロジック
- [UI Components](../ui/README.md) - UIコンポーネント
- [プロジェクト全体](../../../README.md) - プロジェクト概要

## 参考資料

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Web Storage API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Web_Storage_API)
- [Console API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Console)
