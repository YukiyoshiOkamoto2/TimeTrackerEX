# TimeTrackerEX Web Application

勤怠PDF + スケジュールICS  TimeTrackerへタスク一括登録

---

##  クイックスタート

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # ビルド
npm test         # テスト実行
```

---

##  ドキュメント

### 主要ドキュメント
- **計画**: [TimeTracker全体計画](./plan/TimeTracker_PLAN.md)
- **仕様**: [TimeTracker機能仕様](./spec/TimeTracker_SPEC.md)
- **API**: [バックエンドAPI仕様](./spec/TimeTracker_API_SPEC.md)
- **コード**: [srcディレクトリ説明](./src/README.md)

### 外部リソース
- **[TimeTracker公式 Web API](https://www.timetracker.jp/support/help/web-api/webAPIList.html)** - 公式API仕様書

### ナビゲーション
- [ドキュメントマップ](./DOCUMENT_MAP.md) - 全体構造
- [実行計画進捗](./plan/README.md) - Phase別計画
- [仕様書](./spec/README.md) - 機能仕様設計書

---

##  プロジェクト構造

```
web/
 plan/           # 実行計画進捗
 spec/           # 仕様書設計書
 src/            # ソースコード
    pages/      # ページコンポーネント
    components/ # 共通UIコンポーネント
    core/       # ビジネスロジック
    store/      # 状態管理
    schema/     # バリデーション
    types/      # 型定義
    lib/        # ユーティリティ
 public/         # 静的ファイル
 tests/          # テスト
```

---

##  主要機能

1. **FileUpload**: PDF/ICS ファイルアップロード解析
2. **Linking**: イベント  WorkItem 紐付け
3. **Completion**: 確認TimeTrackerへ一括登録

---

##  技術スタック

- **React 18** + **TypeScript**
- **Fluent UI v9**
- **Vite**
- **Vitest**

---

##  開発状況

- **Phase 1-4**:  完了 (134 tests)
- **Phase 5-6**:  完了
- **Phase 7**:  部分完了 (API統合完了、E2Eテスト未実装)

---

##  開発コマンド

```bash
npm run dev          # 開発サーバー (localhost:5173)
npm run build        # 本番ビルド
npm run preview      # ビルド結果プレビュー
npm test             # テスト実行
npm run test:ui      # テストUI表示
npm run lint         # リント実行
npm run typecheck    # 型チェック
```

### テスト実行オプション (環境変数)

重い実ファイル依存テストや詳細ログ出力はデフォルトでは抑制しています。必要に応じて以下の環境変数を設定してください。

| 変数 | 値 | 効果 |
|------|----|------|
| `ENABLE_HEAVY_TESTS` | `1` | 実ファイル (大きなICS / PDF) を用いる重いテストを有効化します。未設定時は skip されます。 |
| `PRINT_PARSED` | `1` | ICS / PDF パーサーテストで生成される詳細イベント/スケジュール出力を表示します。 |

PowerShell 例:
```powershell
$env:ENABLE_HEAVY_TESTS=1; $env:PRINT_PARSED=1; npm test -- src/core/ics/icsParser.test.ts
```

一時的に設定した環境変数をクリアするには、同じセッションで `$env:ENABLE_HEAVY_TESTS=""` のように空文字を代入してください。
