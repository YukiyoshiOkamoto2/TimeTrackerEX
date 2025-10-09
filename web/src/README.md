# src/ - ソースディレクトリ

React + TypeScript によるTimeTracker入力支援Webアプリケーション。

## ディレクトリ構造

```
src/
 pages/          # ページコンポーネント (画面単位、自己完結型)
 components/     # 共通UIコンポーネント
 core/           # ビジネスロジック (algorithm, api, ics, pdf, history, ignore)
 store/          # 状態管理 (React Context)
 schema/         # バリデーション定義 (カスタム実装)
 types/          # 型定義
 lib/            # ユーティリティ (logger, storage, asyncQueue)
```

## 主要モジュール

### core/
- **algorithm**: 時間計算、丸め処理、重複除去、1日タスク分割
- **api**: TimeTracker API通信 (認証、プロジェクト/WorkItem取得、タスク登録)
- **ics**: ICSファイルパース (Outlook/Googleカレンダー)
- **pdf**: PDFパース (TimeTracker勤怠PDF)
- **history**: イベントWorkItemマッピング履歴 (localStorage、最大300件)
- **ignore**: 無視イベント管理 (パターンマッチ)

### store/
- **SettingsProvider**: アプリ設定のグローバル状態 (localStorage同期)
- **ContentProvider**: コンテンツデータ (ICS/PDFパース結果)
- **NavigationProvider**: 画面遷移状態

### schema/
設定スキーマ定義とバリデーション。Zod不使用、カスタム実装。

### types/
共通型定義: Event, Schedule, Project, WorkItem, AppSettings等

### lib/
- **logger**: ログ管理
- **storage**: localStorage抽象化
- **asyncQueue**: 非同期キュー (HTTP通信)

## アーキテクチャ階層

```
Pages  Components  Store  Schema  Core  Types  Lib
```

各層は下位層のみに依存。上位層への依存は禁止。
