# core/api/ - TimeTracker API通信

TimeTracker APIとの通信。Pythonのapi.py移植。

## 主要クラス: TimeTracker

**コンストラクタ**: `(baseUrl, userName, projectId)`

## メソッド

- `connectAsync(password)`: 認証
- `getProjectsAsync()`: プロジェクト情報取得
- `getWorkItemsAsync()`: 作業項目一覧取得
- `postTaskAsync(task)`: タスク単一登録
- `postTasksAsync(tasks)`: タスク一括登録

## 型

**TimeTrackerTask**: `{ workItemId, startTime, endTime, memo? }`

## バリデーション

**validateTimeTrackerTask(task)**: タスクバリデーション
- 開始 < 終了
- 30分単位チェック

**テスト**: 未実装 (HTTPモック必要)

詳細: [spec/TimeTracker_API_SPEC.md](../../../spec/TimeTracker_API_SPEC.md)
