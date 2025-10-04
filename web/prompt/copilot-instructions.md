# TimeTracker EX

## 概要
TimeTracker EXは、Microsoft TimeTrackerの入力を効率化するWebアプリケーションです。Outlook/Googleカレンダーのイベントを元に、勤務時間を自動計算し、TimeTrackerに登録します。

### 主な機能

- **カレンダー連携**: Outlook/Googleカレンダーからイベントを取得
- **自動時間計算**: スケジュールとイベントから勤務時間を自動算出
- **丸め処理**: 設定に基づいた時間の丸め（切り上げ・切り捨て・四捨五入等）
- **TimeTracker連携**: 計算結果をTimeTrackerに自動登録
- **設定管理**: ユーザーごとの設定を保存・管理

## 技術スタック

### コア技術

- **React 18** - UIフレームワーク
- **TypeScript 5** - 型安全な開発
- **Vite** - ビルドツール・開発サーバー

### UIライブラリ

- **Fluent UI React Components v9** - Microsoftデザインシステム
  - `@fluentui/react-components` - メインコンポーネント
  - `@fluentui/react-icons` - アイコンセット

### 状態管理・バリデーション

- **React Context API** - グローバル状態管理
- **Zod** - ランタイムバリデーション

### テスト

- **Vitest** - テストフレームワーク
- **@testing-library/react** - Reactコンポーネントテスト

### 開発ツール

- **ESLint** - 静的解析
- **Prettier** - コードフォーマット

## ディレクトリ構成

```
src/
├── pages/               # ページコンポーネント（画面単位）
│   ├── Home/            # ホーム画面
│   ├── Settings/        # 設定画面
│   └── TimeEntry/       # 時刻入力画面
│
├── components/          # Reactコンポーネント
│   ├── common/          # 共通コンポーネント
│   ├── features/        # 機能別コンポーネント
│   └── layout/          # レイアウトコンポーネント
│
├── core/                # コアビジネスロジック
│   ├── algorithm/       # 時間計算アルゴリズム
│   │   ├── algorithm.ts
│   │   ├── algorithm.test.ts
│   │   └── index.ts
│   └── api/             # API通信
│       ├── timeTracker.ts
│       └── index.ts
│
├── store/               # 状態管理 (React Context)
│   ├── SettingsProvider.tsx
│   └── index.ts
│
├── schema/              # バリデーションスキーマ (Zod)
│   ├── settings.ts
│   ├── settings.test.ts
│   └── index.ts
│
├── types/               # TypeScript型定義
│   ├── index.ts         # モデル型
│   ├── settings.ts      # 設定型
│   └── utils.ts         # ユーティリティ型
│
├── lib/                 # 共有ライブラリ
│   ├── asyncQueue.ts
│   └── index.ts
│
├── App.tsx              # アプリケーションルート
├── main.tsx             # エントリーポイント
└── README.md            # ソースコードドキュメント
```

## アーキテクチャ設計方針

### Pages（ページコンポーネント）の独立性

🎯 **重要原則**: `pages/` 配下の各ページは**自己完結型**として設計してください。

```
pages/
└── FeatureName/              # ページディレクトリ
    ├── index.tsx             # ページコンポーネント（エントリーポイント）
    ├── FeatureName.tsx       # メインページコンポーネント
    ├── FeatureName.test.tsx  # ページのテスト
    ├── components/           # ページ固有のコンポーネント
    │   ├── FeatureForm.tsx
    │   ├── FeatureList.tsx
    │   └── *.test.tsx
    ├── hooks/                # ページ固有のカスタムフック
    │   ├── useFeatureLogic.ts
    │   └── *.test.ts
    ├── types.ts              # ページ固有の型定義
    ├── utils.ts              # ページ固有のユーティリティ
    └── README.md             # ページの説明
```

**設計ルール:**

1. **ページ固有機能はページ内で完結**
   - ページ専用のコンポーネント → `pages/FeatureName/components/`
   - ページ専用のフック → `pages/FeatureName/hooks/`
   - ページ専用の型定義 → `pages/FeatureName/types.ts`
   - ページ専用のユーティリティ → `pages/FeatureName/utils.ts`

2. **全体への影響を最小化**
   - グローバルな状態を変更しない（読み取りのみ推奨）
   - 共通コンポーネント（`components/common/`）を汚染しない
   - グローバルスタイルを追加しない
   - 他ページへの依存を作らない

3. **再利用可能なものだけを外に出す**
   - 3つ以上のページで使う → `components/common/` に移動
   - 複数ページで使う型 → `types/` に移動
   - 複数ページで使うロジック → `core/` に移動

### ファイル配置ルール

- **ページ**: `pages/` 配下にページ単位でディレクトリ作成（自己完結型）
- **共通コンポーネント**: `components/` 配下に機能別に分類
- **ビジネスロジック**: `core/` 配下（UIから独立）
- **型定義**: `types/` 配下に集約（ページ固有の型は各ページ内）
- **テスト**: ソースファイルと同じディレクトリに `*.test.ts(x)` として配置

### README必読・更新ルール

⚠️ **重要**: `src/*` 配下の各ディレクトリには、そのディレクトリの説明をする `README.md` が配置されています。

- **実装前**: 該当ディレクトリの `README.md` を**必ず読んで**、構造や規約を理解してから実装する
- **実装後**: 新しいファイルや機能を追加した場合は、`README.md` を**適宜更新**する
  - 新しいモジュールの説明を追加
  - 使用例を更新
  - アーキテクチャ図が必要な場合は追加

例:
- `core/` に新しいAPIクライアントを追加 → `core/README.md` を更新
- `store/` に新しいProviderを追加 → `store/README.md` を更新
- `schema/` に新しいスキーマを追加 → `schema/README.md` を更新

## コーディング・デザインルール

詳細なコーディング規約とデザインガイドラインは別ドキュメントを参照してください：

📘 **[コーディング・デザインルール](./coding-rules.md)**


## AI実装依頼時の注意点

### 1. 既存コードの確認

実装前に以下を**必ず確認**してください：

1. **該当ディレクトリのREADME**: 実装するディレクトリの `README.md` を熟読
   - `pages/README.md` - ページ設計の原則と自己完結型アーキテクチャ
   - `core/README.md` - ビジネスロジックの構造と規約
   - `store/README.md` - 状態管理のパターンと使用方法
   - `schema/README.md` - バリデーションスキーマの定義方法
   - `types/README.md` - 型定義の規約（存在する場合）
   - `components/README.md` - コンポーネント設計指針（存在する場合）

⚠️ README を読まずに実装すると、既存の設計パターンと不整合が生じる可能性があります。

**⚠️ ページ実装時の特別な注意:**
- 新しいページを作成する場合、**ページ内で完結**させる設計を優先
- 他ページへの影響を最小化するため、グローバル状態の変更は慎重に
- ページ固有のコンポーネント・フック・型は必ずページディレクトリ内に配置

### 2. 型安全性の確保

以下を厳守してください：
- `any`型は使用禁止
- 全ての関数に型注釈を付ける
- Zodスキーマでランタイムバリデーション
- 型定義は`types/`ディレクトリに集約

### 3. テストの作成

実装と同時にテストを作成してください：
- 単体テスト（`*.test.ts`）をソースファイルと同じディレクトリに配置
- カバレッジ80%以上を目標
- テストは`describe`と`it`で構造化
- 実行: `npm test`

### 4. Fluent UIの使用

UIコンポーネント実装時：
- Fluent UIコンポーネントを最優先
- カスタムスタイルは`makeStyles`で実装
- デザイントークン（`tokens`）を使用
- アクセシビリティを考慮（`aria-*`属性）

### 5. ドキュメント

以下を含めてください：
- **JSDocコメント**: 全ての関数・型・インターフェースに記述
- **使用例**: コードスニペットで具体的な使い方を示す
- **説明コメント**: 複雑なロジックには日本語で説明を追加
- **README更新**: 新機能追加時は該当ディレクトリの `README.md` を必ず更新
  - 新しいモジュールの概要と使用方法を追加
  - 既存の説明が古くなっている場合は修正
  - サンプルコードを更新

📝 **README更新チェックリスト**:
- [ ] 新しいファイル/機能の説明を追加
- [ ] 使用例・サンプルコードを追加/更新
- [ ] 型定義や主要な関数のドキュメントを追加
- [ ] 関連するセクションのリンクを更新

## プロジェクト固有の情報

### 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm test

# テスト（watch mode）
npm test -- --watch

# 型チェック
npm run type-check

# フォーマット
npm run prettier:write

# ビルド
npm run build
```

## 参考リンク

### プロジェクトドキュメント

- **[コーディング・デザインルール](./coding-rules.md)** - 必読の開発規約
- **[プロジェクトREADME](../src/README.md)** - ソースコード全体構造

### 公式ドキュメント

- [Fluent UI公式](https://react.fluentui.dev/)
- [React公式](https://react.dev/)
- [TypeScript公式](https://www.typescriptlang.org/)
- [Zod公式](https://zod.dev/)
- [Vitest公式](https://vitest.dev/)

---

**バージョン**: 1.0  
**最終更新**: 2025年10月4日
