# core/algorithm/ - 時間計算アルゴリズム

イベントとスケジュールから勤務時間を自動計算。Pythonのalgorithm.py移植。

## 主要クラス: TimeTrackerAlgorithm

**コンストラクタ**: `(project, eventInputInfo, scheduleInputInfo)`

## 主要メソッド

- `roundingTime(time, backward)`: 時刻丸め (30分単位)
- `roundingSchedule(schedule, roundingTimeType, events)`: スケジュール丸め
- `scheduleToEvent(schedule, events, scheduleEvents, date)`: スケジュールイベント変換
- `getRecurrenceEvent(event, startDate, endDate)`: 繰り返しイベント展開
- `cleanDuplicateEvent(events, timeCompareType)`: 重複イベント除去
- `splitOneDayTask(date, events, schedules)`: 1日タスク分割
- `margedScheduleEvents(events, schedules, date)`: イベント+スケジュールマージ
- `searchNextEvent(events, currentEvent, timeCompareType)`: 次イベント検索

## 型

**RoundingTimeType**: `backward` | `forward` | `round` | `half` | `stretch` | `nonduplicate`

**TimeCompareType**: `small` | `large`

**テスト**: 54 tests全パス
