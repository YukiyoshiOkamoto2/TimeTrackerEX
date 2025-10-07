# Core Modules

UI非依存のビジネスロジックモジュール群。純粋関数とクラスで実装、全モジュールテスト完備。

## Overview

TimeTracker EXのコアロジック。Pythonバックエンドから完全移植済み。

機能:
- 時間計算アルゴリズム (丸め、重複除去、1日タスク分割)
- TimeTracker API通信 (認証、プロジェクト/WorkItem取得、タスク登録)
- 履歴管理 (イベント→WorkItemマッピング、最大300件)
- ICSパース (Outlook/Googleカレンダー、繰り返しイベント展開)
- 無視設定管理 (パターンマッチング、完全/部分/前方/後方一致)
- PDFパース (TimeTracker勤怠PDF、勤務時間/休日抽出)

## Directory Structure

```
core/
├── algorithm/       # Time calculation engine
│   ├── algorithm.ts
│   ├── algorithm.test.ts (54 tests)
│   ├── index.ts
│   └── README.md
├── api/             # TimeTracker API client
│   ├── timeTracker.ts
│   ├── index.ts
│   └── README.md
├── history/         # Event→WorkItem mapping history
│   ├── historyManager.ts
│   ├── historyManager.test.ts (32 tests)
│   ├── index.ts
│   └── README.md
├── ics/             # ICS file parser
│   ├── icsParser.ts
│   ├── icsParser.test.ts (13 tests)
│   ├── index.ts
│   └── README.md
├── ignore/          # Event ignore pattern manager
│   ├── ignoreManager.ts
│   ├── ignoreManager.test.ts (32 tests)
│   ├── index.ts
│   └── README.md
└── pdf/             # PDF attendance parser
    ├── pdfParser.ts
    ├── pdfParser.test.ts (3 tests)
    ├── index.ts
    └── README.md
```

## Module Details

### algorithm/
時間計算エンジン。

**機能:**
- roundingTime: 指定単位(5/10/15/30分)で時刻丸め(切り上げ/切り捨て/四捨五入)
- roundingSchedule: スケジュール丸め(backward/forward/round/half/stretch/nonduplicate)
- cleanDuplicateEvent: 重複イベント除去(small/large比較モード)
- splitOneDayTask: 1日タスク分割(勤務開始/終了イベント生成)
- getRecurrenceEvent: 繰り返しイベント展開
- scheduleToEvent: スケジュール→イベント変換(start/end/bothモード)
- margedScheduleEvents: 通常イベント+スケジュールイベント統合
- searchNextEvent: 次イベント検索(重複考慮)

**依存:** types, lib/logger

**テスト:** 54 tests全パス

詳細: [algorithm/README.md](./algorithm/README.md)

### api/
TimeTracker APIクライアント。

**機能:**
- connectAsync: 認証(ユーザー名/パスワード)
- getProjectsAsync: プロジェクト一覧取得
- getWorkItemsAsync: WorkItem一覧取得
- postTaskAsync: タスク単一登録
- postTasksAsync: タスク一括登録
- validateTimeTrackerTask: タスクバリデーション

**依存:** types, lib/asyncQueue

**テスト:** 未実装(HTTPモック必要)

詳細: [api/README.md](./api/README.md)

### history/
イベント→WorkItemマッピング履歴管理。

**機能:**
- set/get: UUID→WorkItemIDマッピング
- getAll: 全履歴取得
- deleteByKey: 履歴削除
- clear: 全削除
- dump: localStorage保存
- load: localStorage読み込み
- 最大300件自動削除(FIFO)

**依存:** lib/storage, lib/logger

**テスト:** 32 tests全パス

**シングルトン:** getHistoryManager()

詳細: [history/README.md](./history/README.md)

### ics/
ICSファイルパーサー。

**機能:**
- parseICS: ICSファイル→Eventリスト変換
- extractRecentEvents: 最近N日イベント抽出
- 繰り返しイベント自動展開(ical.js使用)
- キャンセル/プライベートイベント判定
- 過去イベント自動フィルタ(デフォルト30日以前除外)

**依存:** types, lib/logger, ical.js v2.2.1

**テスト:** 13 tests全パス

詳細: [ics/README.md](./ics/README.md)

### ignore/
イベント無視パターン管理。

**機能:**
- addIgnoreItem/removeIgnoreItem: パターン追加/削除
- ignoreEvent: イベント無視判定
- setIgnorableEventPatterns: 新形式パターン設定(完全/部分/前方/後方一致)
- getAllIgnoreItems: 全パターン取得
- clear: 全削除
- dump: localStorage保存
- load: localStorage読み込み

**依存:** lib/storage, lib/logger

**テスト:** 32 tests全パス

**シングルトン:** getIgnoreManager()

**パターン:**
- exact: 完全一致
- partial: 部分一致
- prefix: 前方一致
- suffix: 後方一致

詳細: [ignore/README.md](./ignore/README.md)

### pdf/
TimeTracker勤怠PDFパーサー。

**機能:**
- parsePDF: PDF→Scheduleリスト+打刻時間変換
- 勤務時間抽出(開始/終了時刻)
- 休日判定(土日、祝日文字列検出)
- 有給休暇判定
- 30日分データ抽出

**依存:** types, lib/logger, pdfjs-dist

**テスト:** 3 tests全パス

詳細: [pdf/README.md](./pdf/README.md)

## Design Principles

### 1. UI Independence
React/DOMに依存しない純粋関数/クラス設計。ブラウザAPI使用最小限。

### 2. Testability
全関数単体テスト可能。依存注入対応。モック容易。

### 3. Type Safety
全関数型注釈必須。any型禁止。入力バリデーション必須。

### 4. Singleton Pattern
HistoryManager, IgnoreManagerはシングルトン。getXxxManager()でアクセス。resetXxxManager()でテスト用リセット。

### 5. Storage Abstraction
localStorage直接アクセス禁止。lib/storage経由。テスト時モック可能。

## Test Status

```
Test Files  14 passed
Tests      462 passed
Duration   47.63s
```

core/配下テスト内訳:
- algorithm: 54 tests ✅
- history: 32 tests ✅
- ics: 13 tests ✅
- ignore: 32 tests ✅
- pdf: 3 tests ✅
- **合計: 134 tests** ✅

## Performance

| Module | Complexity | Note |
|--------|------------|------|
| algorithm | O(n log n) | n=events, sort dominant |
| history | O(1) | Map-based lookup |
| ignore | O(m) | m=patterns |
| ics | O(n) | n=events |
| pdf | O(p) | p=pages |

## Dependencies

```
core/algorithm → types/models, lib/logger
core/api → types/models, lib/asyncQueue, lib/logger
core/history → lib/storage, lib/logger
core/ics → types/models, lib/logger, ical.js
core/ignore → types/models, lib/storage, lib/logger
core/pdf → types/models, lib/logger, pdfjs-dist
```

**External Libraries:**
- ical.js v2.2.1 (ics/)
- pdfjs-dist (pdf/)

## Python Migration Status

| Python Module | TypeScript Module | Status | Tests |
|--------------|-------------------|--------|-------|
| algorithm.py | core/algorithm | ✅ Complete | 54 |
| api.py | core/api | ✅ Complete | - |
| history.py | core/history | ✅ Complete | 32 |
| input_ics.py | core/ics | ✅ Complete | 13 |
| ignore.py | core/ignore | ✅ Complete | 32 |
| input_pdf.py | core/pdf | ✅ Complete | 3 |

全モジュール移植完了。API以外テスト完備。

## Development Guidelines

### Adding New Module

1. ディレクトリ作成: `core/new-module/`
2. ファイル作成: `newModule.ts`, `newModule.test.ts`, `index.ts`, `README.md`
3. core/index.tsに追加: `export * from './new-module'`
4. テスト100%カバレッジ必須
5. README記載: 概要、API、依存関係

### Coding Standards

- **命名:** camelCase (クラス=PascalCase)
- **ロギング:** 全主要操作でlogger使用
- **型安全:** any型禁止、厳密な型定義
- **エラー処理:** try-catch適切に使用
- **ドキュメント:** JSDocコメント必須

## Related Modules

- **types/**: 型定義(Event, Schedule, Project, WorkItem)
- **lib/**: ユーティリティ(logger, storage, asyncQueue)
- **store/**: 状態管理(SettingsProvider, ContentProvider)
- **schema/**: バリデーション(settings定義)
