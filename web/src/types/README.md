# types/ - 型定義

アプリケーション全体で使用される型定義。Pythonのmodel.py移植。

## 主な型

- **Schedule**: 勤務時間予定 `{ start, end, isHoliday?, isPaidLeave?, errorMessage? }`
- **Event**: カレンダーイベント `{ uuid, name, organizer, schedule, recurrence?, ... }`
- **Project**: プロジェクト `{ id, name, projectId, projectName, projectCode }`
- **WorkItem**: 作業項目 `{ id, name, folderName, folderPath, subItems? }`
- **DayTask**: 日次タスク `{ baseDate, project, events, scheduleEvents }`
