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

## 主要機能

### イベントパターンマッチング

無視可能イベントと休暇イベントは、柔軟なパターンマッチング機能を提供します。

**共通機能:**
- **部分一致 (partial)**: イベント名に指定した文字列が含まれている場合にマッチ
- **前方一致 (prefix)**: イベント名が指定した文字列で始まる場合にマッチ
- **後方一致 (suffix)**: イベント名が指定した文字列で終わる場合にマッチ

**実装:**
- `EventPatternEditor`: 共通のパターン編集UIコンポーネント
- `EventPattern`: パターンとマッチモードを持つ基底型
- `IgnorableEventPattern`, `TimeOffEventPattern`: 各機能固有の型

### 設定画面

設定は専用の画面で管理され、メイン設定画面から各設定へナビゲーションできます。

**画面構成:**
- **TimeTrackerSettings**: メイン設定画面
- **IgnorableEventsSettings**: 無視可能イベント設定
- **TimeOffEventsSettings**: 休暇イベント設定

各設定画面は登録数をバッジで表示し、直感的な操作が可能です。

## データ構造の移行ガイド

### 休暇イベント設定の変更 (v2.0)

休暇イベント設定のデータ構造が変更されました。

**旧データ構造:**
```typescript
{
  timeOffEvent: {
    nameOfEvent: ["有給", "休暇"],
    workItemId: 12345
  }
}
```

**新データ構造:**
```typescript
{
  timeOffEvent: {
    namePatterns: [
      { pattern: "有給", matchMode: "partial" },
      { pattern: "休暇", matchMode: "prefix" }
    ],
    workItemId: 12345
  }
}
```

この変更により、無視可能イベントと同様の柔軟なパターンマッチングが可能になりました。

## コンポーネント設計

### 共通UIコンポーネント

- **EventPatternEditor** (`src/pages/setting/components/ui/EventPatternEditor.tsx`)
  - イベントパターンの追加・編集・削除を行う共通コンポーネント
  - 無視可能イベントと休暇イベントの両方で使用
  - プレースホルダーとボタンテキストをカスタマイズ可能

### ディレクトリ構造

設定画面のコンポーネントは3層構造で整理されています:

- **layout**: レイアウトコンポーネント (`SettingItem`, `SettingNavigationItem` 等)
- **ui**: 再利用可能なUI部品 (`EventPatternEditor`, `IgnorableEventsEditor` 等)
- **view**: 設定画面ビュー (`TimeTrackerSettings`, `IgnorableEventsSettings`, `TimeOffEventsSettings` 等)

## テスト

```bash
# 全てのテストを実行
npm run test

# UIモード付きのテスト
npm run test:ui
```

現在、223個のテストケースが実装されています。
