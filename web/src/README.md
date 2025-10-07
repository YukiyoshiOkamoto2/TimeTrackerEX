# TimeTracker EX - Source Directory

React + TypeScript によるTimeTracker入力支援Webアプリケーションのソースコード。

## Directory Structure

```
src/
├── pages/          # Page components (self-contained per screen)
├── components/     # Shared UI components
├── core/           # Business logic (algorithm, api, ics, pdf, history, ignore)
├── store/          # State management (React Context)
├── schema/         # Validation definitions (custom validation, not Zod)
├── types/          # Type definitions
└── lib/            # Utility libraries (logger, storage, asyncQueue)
```

## Core Modules

### core/algorithm
時間計算エンジン。勤務時間の丸め処理、イベント重複除去、1日タスク分割、繰り返しイベント展開。

### core/api
TimeTracker APIクライアント。認証、プロジェクト/WorkItem取得、タスク登録(単一/一括)。

### core/ics
ICSファイルパーサー。Outlook/Googleカレンダーイベント読み込み。ical.js v2.2.1使用。

### core/pdf
PDFパーサー。TimeTracker勤怠PDFから勤務時間抽出。pdfjs-dist使用。

### core/history
イベント→WorkItemマッピング履歴管理。localStorage永続化、最大300件。

### core/ignore
無視イベント管理。完全一致/部分一致/前方一致/後方一致パターン対応。

### store/SettingsProvider
アプリ設定のグローバル状態管理。localStorage自動同期、バリデーション統合。

### store/ContentProvider
コンテンツデータ(ICS/PDFパース結果)のグローバル状態管理。

### store/NavigationProvider
画面遷移状態管理。現在のページ、ナビゲーション履歴。

### schema/settings
設定スキーマ定義とバリデーション。カスタム実装(Zod不使用)。再帰的ObjectSchema対応。

### types
共通型定義。Event, Schedule, Project, WorkItem, AppSettings等。

## Architecture

```
┌─────────────────────────────────────────┐
│ Pages (self-contained)                  │
│ - HomePage                              │
│ - TimeTrackerPage                       │
│ - SettingPage                           │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Components (shared, 3+ pages)           │
│ - Card, InteractiveCard                 │
│ - ValidatedInput, Editor                │
│ - CheckedTable, MessageDialog           │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Store (global state, React Context)     │
│ - SettingsProvider                      │
│ - ContentProvider                       │
│ - NavigationProvider                    │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Schema (validation logic)               │
│ - settingsDefinition                    │
│ - Base/String/Number/Boolean/Array/     │
│   ObjectSettingValueInfo                │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Core (pure business logic)              │
│ - algorithm, api, ics, pdf              │
│ - history, ignore                       │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Types (type definitions)                │
│ - models.ts, settings.ts, utils.ts      │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│ Lib (utilities)                         │
│ - logger, storage, asyncQueue           │
└─────────────────────────────────────────┘
```

## Design Principles

### 1. Self-Contained Pages
ページ固有機能はページ内で完結。3つ以上のページで使う場合のみ共通化。

### 2. UI-Independent Core
core/配下はUIフレームワーク非依存。純粋関数とクラスで実装。単体テスト必須。

### 3. Global State via Context
グローバル状態はContext API管理。Redux不使用。Provider単位で分割。

### 4. Custom Validation
Zodを使わずカスタムバリデーション実装。ObjectSchema再帰対応、部分バリデーション対応。

### 5. Storage Abstraction
localStorage直接アクセス禁止。lib/storage経由でアクセス。テスト時はモック可能。

### 6. Comprehensive Testing
core/配下は全関数テスト必須。462 tests全てパス。

## Test Status

```
Test Files  14 passed (14)
Tests      462 passed (462)
```

主要テストカバレッジ:
- core/algorithm: 54 tests
- core/ics: 13 tests  
- core/pdf: 3 tests
- core/history: 32 tests
- core/ignore: 32 tests
- schema/settings: 132 tests
- schema/settings/timetracker: 42 tests
- schema/settings/appearance: 23 tests
- store/SettingsProvider: 13 tests
- store/ContentProvider: 10 tests
- store/NavigationProvider: 5 tests
- lib/storage: 33 tests
- lib/logger: 20 tests

## Module Dependencies

### External Libraries
- **React 18.3.1**: UIフレームワーク
- **Fluent UI v9**: デザインシステム
- **ical.js 2.2.1**: ICS解析
- **pdfjs-dist**: PDF解析
- **monaco-editor**: JSONエディタ
- **vite**: ビルドツール
- **vitest**: テストフレームワーク

### No Usage
- **Zod**: カスタムバリデーション実装のため不使用
- **Redux**: Context APIで十分のため不使用
- **React Router**: 単一ページアプリのため不使用(内部でタブナビゲーション)

## Key Features

### 1. ICS/PDF Import
OutlookカレンダーICS、TimeTracker勤怠PDFからイベント/勤務時間を自動抽出。

### 2. Smart Time Rounding
5分/10分/15分/30分単位丸め。切り上げ/切り捨て/四捨五入/伸縮/重複回避の6モード。

### 3. Auto Work Item Suggestion
過去のイベント→WorkItemマッピング履歴から自動提案。300件履歴保持。

### 4. Duplicate Event Handling
重複イベント自動除去。small/large比較モードで精度調整可能。

### 5. Flexible Ignore Patterns
イベント無視パターン。完全一致/部分一致/前方一致/後方一致の4モード。

### 6. Persistent Settings
全設定localStorage自動永続化。JSON直接編集も可能(Monaco Editor使用)。

## Development Commands

```bash
npm run dev              # Dev server (localhost:5173)
npm test                 # Run all tests
npm run type-check       # TypeScript check
npm run lint             # ESLint
npm run prettier:write   # Format code
npm run build            # Production build
```

## Entry Points

- **src/main.tsx**: アプリケーションエントリーポイント
- **src/App.tsx**: ルートコンポーネント、Provider構成
- **src/pages/home/HomePage.tsx**: ホーム画面
- **src/pages/timetracker/TimeTrackerPage.tsx**: メイン業務画面
- **src/pages/setting/SettingPage.tsx**: 設定画面

## Additional Documentation

各ディレクトリにREADME.mdあり。実装前に必読:
- pages/README.md - ページ構成
- components/README.md - 共通コンポーネント
- core/README.md - ビジネスロジック
- schema/settings/README.md - バリデーションスキーマ
- pages/setting/README.md - 設定画面アーキテクチャ
- types/README.md - 型定義
- lib/README.md - ユーティリティ
