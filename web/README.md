# TimeTracker EX - Web Version

TypeScript + Vite + React + Fluent UI Reactで構築されたTimeTracker EXのWebバージョンです。

## 技術スタック

- **React 18**: UIフレームワーク
- **TypeScript**: 型安全な開発
- **Vite**: 高速なビルドツール
- **Fluent UI React**: Microsoftのデザインシステム
- **date-fns**: 日時操作ライブラリ
- **Vitest**: テストフレームワーク

## セットアップ

### 依存関係のインストール

```bash
cd web
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

### ビルド

```bash
npm run build
```

静的ファイルが `dist` ディレクトリに生成されます。

### プレビュー

```bash
npm run preview
```

ビルドした静的サイトをローカルでプレビューします。

### テスト

```bash
npm run test
```

UIモード付きのテスト:

```bash
npm run test:ui
```

## プロジェクト構造

```
web/
├── src/
│   ├── main.tsx          # エントリーポイント
│   ├── App.tsx           # メインアプリケーション
│   ├── index.css         # グローバルスタイル
│   ├── components/       # Reactコンポーネント
│   ├── pages/            # ページ単位のコンポーネント
│   ├── store/            # 状態管理
│   ├── core/             # コア機能
│   ├── lib/              # 汎用ユーティリティ
│   └── types/            # TypeScript型定義
├── public/               # 静的アセット
├── index.html            # HTMLテンプレート
├── package.json          # 依存関係
├── tsconfig.json         # TypeScript設定
└── vite.config.ts        # Vite設定
```

## 次のステップ

1. PythonのアルゴリズムをTypeScriptに移行
2. テストケースの実装
3. UIコンポーネントの追加
4. 状態管理の実装（必要に応じて）
