# TimeTrackerEX Web Application

**TimeTrackerEX** は、勤怠情報（PDF）とスケジュール（ICS）を自動で紐づけ、TimeTrackerシステムへタスクを一括登録するWebアプリケーションです。

---

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- npm または yarn

### インストール
```bash
npm install
```

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### テスト実行
```bash
npm test
```

---

## 📖 ドキュメント

### プロジェクトドキュメント
- **[ドキュメントマップ](./DOCUMENT_MAP.md)** - 全体のドキュメント構造とネーミングルール
- **[実行計画・進捗](./plan/README.md)** - Phase別の計画と進捗管理
- **[仕様書](./spec/README.md)** - 機能仕様と設計書

### 主要ドキュメント
- **計画**: [TimeTracker全体計画](./plan/TimeTracker_PLAN.md)
- **仕様**: [TimeTracker機能仕様](./spec/TimeTracker_SPEC.md)
- **コード**: [srcディレクトリ説明](./src/README.md)

---

## 🏗️ プロジェクト構造

```
web/
├── plan/                   # 実行計画・進捗管理
├── spec/                   # 仕様書・設計書
├── prompt/                 # AI指示書（コーディング規約など）
├── public/                 # 静的ファイル
├── src/                    # ソースコード
│   ├── components/         # 共通UIコンポーネント
│   ├── core/               # コアライブラリ（PDF/ICS解析など）
│   ├── lib/                # ユーティリティ
│   ├── pages/              # ページコンポーネント
│   ├── schema/             # データスキーマ
│   ├── store/              # 状態管理
│   └── types/              # TypeScript型定義
├── package.json
├── vite.config.ts
└── vitest.setup.ts
```

詳細は [DOCUMENT_MAP.md](./DOCUMENT_MAP.md) を参照してください。

---

## 🎯 主要機能

### 1. ファイルアップロード（FileUploadView）
- PDFファイル（勤怠実績）のアップロード
- ICSファイル（スケジュール）のアップロード
- TimeTracker認証

### 2. 自動紐づけ（LinkingProcessView）
- PDFの勤務時間とICSイベントの自動マッチング
- 紐づけ結果の表示（統計情報、テーブル）
- 手動紐づけ機能

### 3. タスク登録（CompletionView）
- 紐づけ結果の確認
- 作業項目コードの選択
- TimeTrackerへの一括登録

---

## 🛠️ 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Fluent UI v9** - Microsoft製UIコンポーネント
- **Vite** - ビルドツール

### 状態管理・データ処理
- React Context API - グローバル状態管理
- pdfjs-dist - PDF解析
- ical.js - ICS解析
- Zod - スキーマバリデーション

### テスト
- **Vitest** - ユニットテスト
- **@testing-library/react** - コンポーネントテスト
- **134/134 tests passing** ✅

### 開発ツール
- ESLint - コード品質
- Prettier - コードフォーマット
- TypeScript - 型チェック

---

## 📊 開発状況

### Phase 1-4: コアサービス実装 ✅
- PDF解析、ICS解析
- 自動紐づけアルゴリズム
- 履歴管理、無視リスト管理
- **134/134 tests passing**

### Phase 5: LinkingProcessView改善 ✅
- 統計表示実装
- 紐づけ済み/未紐づけテーブル
- 手動紐づけ機能

### Phase 6: CompletionView統合 ✅
- データ変換サービス
- スケジュール確認画面
- ItemCodeOptions生成

### Phase 7: API統合 ⏳ (部分完了)
- ✅ Task 5: `/api/register-task` API統合
- ⏳ E2Eテスト実装（未完了）

詳細は [TimeTracker_PLAN.md](./plan/TimeTracker_PLAN.md) を参照してください。

---

## 🧪 テスト

### テスト実行
```bash
# 全テスト実行
npm test

# 特定ファイルのテスト
npm test algorithm.test.ts

# ウォッチモード
npm test -- --watch

# UIモード
npm run test:ui
```

### テスト結果
- **総テスト数**: 134
- **成功率**: 100%
- **カバレッジ**: コアモジュール全体

---

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 高速ビルド（型チェックスキップ）
npm run build-fast

# プレビュー
npm run preview

# 型チェック
npm run typecheck

# Lint
npm run lint

# フォーマット
npm run prettier:write

# テスト
npm test
npm run test:ui
```

---

## 📝 コーディング規約

プロジェクトのコーディング規約は以下を参照してください:
- [coding-rules.md](./prompt/coding-rules.md)
- [copilot-instructions.md](./prompt/copilot-instructions.md)

---

## 🤝 コントリビューション

### ブランチ戦略
- `main` - 本番リリース可能な状態
- `develop` - 開発中の最新コード
- `feature/*` - 新機能開発
- `fix/*` - バグ修正

### プルリクエスト
1. 機能ブランチを作成
2. コードを実装し、テストを追加
3. `npm test` で全テスト成功を確認
4. `npm run lint` でLintエラーがないことを確認
5. プルリクエストを作成

---

## 📄 ライセンス

(ライセンス情報を追加してください)

---

## 👥 チーム・連絡先

(プロジェクトメンバー・連絡先を追加してください)

---

## 📚 参考資料

### 外部ドキュメント
- [Fluent UI v9](https://react.fluentui.dev/)
- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)

### 内部ドキュメント
- [プロジェクト計画](./plan/README.md)
- [機能仕様](./spec/README.md)
- [ソースコード説明](./src/README.md)

---

**最終更新**: 2025年10月9日
