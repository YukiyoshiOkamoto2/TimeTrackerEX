# core/ - コアモジュール

UI非依存のビジネスロジック。純粋関数とクラスで実装、全モジュールテスト完備。

## モジュール一覧

| モジュール | 説明 | テスト |
|-----------|------|-------|
| **algorithm** | 時間計算エンジン | 54 |
| **api** | TimeTracker API通信 | - |
| **history** | イベントWorkItemマッピング履歴 | 32 |
| **ics** | ICSファイルパーサー | 13 |
| **ignore** | 無視イベント管理 | 32 |
| **pdf** | PDFパーサー | 3 |

## 詳細

### algorithm/
時間丸め、スケジュール変換、重複除去、1日タスク分割、繰り返しイベント展開。

### api/
認証、プロジェクト/WorkItem取得、タスク登録(単一/一括)。

### history/
UUIDWorkItemIDマッピング。localStorage永続化、最大300件、FIFO。

### ics/
Outlook/GoogleカレンダーICSファイル読み込み。ical.js使用。

### ignore/
完全一致/部分一致/前方一致/後方一致パターンマッチング。

### pdf/
TimeTracker勤怠PDF解析。勤務時間/休日抽出。pdfjs-dist使用。
