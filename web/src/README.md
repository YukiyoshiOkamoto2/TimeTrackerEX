# TimeTracker EX - Source

React + TypeScript によるTimeTracker入力支援アプリケーションのソースコードです。

## ディレクトリ構造

```
src/
├── pages/          # ページコンポーネント（画面単位、自己完結型）
├── components/     # 共通コンポーネント
├── core/           # ビジネスロジック（algorithm, api, ics, pdf）
├── store/          # 状態管理（React Context）
├── schema/         # バリデーション（Zod）
├── types/          # 型定義
├── lib/            # 共有ライブラリ
├── hooks/          # カスタムフック
└── utils/          # ユーティリティ
```

📖 **詳細**: 各ディレクトリには `README.md` があります。実装前に必ず確認してください。

## 主要モジュール

### core/algorithm
時間計算アルゴリズム - 勤務時間の自動計算、丸め処理、重複除去

### core/api
TimeTracker API クライアント - 認証、プロジェクト取得、タスク登録

### core/ics
ICSファイルパーサー - Outlook/Googleカレンダーのイベント読み込み (ical.js v2.2.1)

### core/pdf
PDFファイルパーサー - TimeTracker勤怠PDFから勤務時間を抽出 (pdfjs-dist)

### store/SettingsProvider
設定管理 - localStorage永続化、バリデーション、Context API

### schema/settings
Zodスキーマ - ランタイムバリデーション

### types
型定義 - Event, Schedule, Project, AppSettings

## 開発コマンド

```bash
npm run dev          # 開発サーバー
npm test             # テスト実行
npm run type-check   # 型チェック
npm run prettier:write  # フォーマット
```

## テスト状況

| モジュール | テスト数 | 状態 |
|-----------|---------|------|
| core/algorithm | 54 | ✅ |
| core/ics | 11 | ✅ |
| core/pdf | 3 | ✅ |
| store/SettingsProvider | 15 | ✅ |
| schema/settings | 26 | ✅ |

**合計: 109 tests (すべて合格)**

## アーキテクチャ

```
Pages (自己完結) → Components → Store → Schema → Core → Types
```

- **Pages**: ページ固有機能はページ内で完結（`pages/*/README.md` 参照）
- **Components**: 3つ以上のページで使う場合のみ共通化
- **Core**: UIから独立したビジネスロジック
- **Store**: グローバル状態管理（Context API）
- **Schema**: ランタイムバリデーション（Zod）

## 関連ドキュメント

- **[AI実装ガイド](../prompt/ai.md)** - AI実装時の必読ドキュメント
- **[コーディングルール](../prompt/coding-rules.md)** - 開発規約
- **各ディレクトリのREADME** - 個別の詳細情報
