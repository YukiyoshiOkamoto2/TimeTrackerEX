# Algorithm Module

TimeTracker EXの時間計算アルゴリズムを提供するモジュールです。

## 概要

Pythonの`algorithm.py`を移植したモジュールです。イベントとスケジュールから勤務時間を自動計算し、時間の丸め処理や重複イベントの除去を行います。

## ファイル構成

- `algorithm.ts` - TimeTrackerAlgorithmクラスの実装
- `algorithm.test.ts` - テストファイル (54テスト)
- `index.ts` - エクスポート
- `README.md` - このファイル

## 主要クラス

### TimeTrackerAlgorithm

イベントとスケジュールから1日のタスクを生成するアルゴリズムクラスです。

**コンストラクタ:**
```typescript
constructor(
  project: Project,
  eventInputInfo: EventInputInfo,
  scheduleInputInfo: ScheduleInputInfo
)
```

**主要メソッド:**

- `roundingTime(time, backward)` - 時刻を30分単位で丸める
- `roundingSchedule(schedule, roundingTimeType, events)` - スケジュールを丸める
- `scheduleToEvent(schedule, events, scheduleEvents, date)` - スケジュールをイベントに変換
- `getRecurrenceEvent(event, startDate, endDate)` - 繰り返しイベントを展開
- `cleanDuplicateEvent(events, timeCompareType)` - 重複イベントを除去
- `splitOneDayTask(date, events, schedules)` - 1日のタスクに分割
- `margedScheduleEvents(events, schedules, date)` - イベントとスケジュールをマージ
- `searchNextEvent(events, currentEvent, timeCompareType)` - 次のイベントを検索

## 丸め処理タイプ

### RoundingTimeType

```typescript
type RoundingTimeType = 
  | 'backward'      // 切り捨て（過去方向）
  | 'forward'       // 切り上げ（未来方向）
  | 'round'         // 四捨五入
  | 'half'          // 15分単位で四捨五入
  | 'stretch'       // 引き伸ばし（開始は切り捨て、終了は切り上げ）
  | 'nonduplicate'  // 重複回避（既存イベントと重複しないように調整）
```

## 時間比較タイプ

### TimeCompareType

```typescript
type TimeCompareType = 
  | 'small'  // 小さい範囲で比較（短いイベントを優先）
  | 'large'  // 大きい範囲で比較（長いイベントを優先）
```

## 使用例

### 基本的な使い方

```typescript
import { TimeTrackerAlgorithm } from '@/core/algorithm'
import type { Project, EventInputInfo, ScheduleInputInfo } from '@/types'

// プロジェクト設定
const project: Project = {
  name: 'MyProject',
  workItems: [/* ... */]
}

// イベント入力設定
const eventInputInfo: EventInputInfo = {
  roundingTimeType: 'backward',
  startEndType: 'both',
  workingEventTypes: ['working']
}

// スケジュール入力設定
const scheduleInputInfo: ScheduleInputInfo = {
  startEndTime: 30,
  roundingTimeType: 'forward',
  startEndType: 'both'
}

// アルゴリズムインスタンス作成
const algorithm = new TimeTrackerAlgorithm(
  project,
  eventInputInfo,
  scheduleInputInfo
)
```

### 1日のタスクを生成

```typescript
const date = new Date('2025-10-04')
const events: Event[] = [/* カレンダーイベント */]
const schedules: Schedule[] = [/* 勤務スケジュール */]

const dayTasks = algorithm.splitOneDayTask(date, events, schedules)

dayTasks.forEach(task => {
  console.log(`${task.workItemName}: ${task.start} - ${task.end}`)
})
```

### 時刻の丸め処理

```typescript
const time = new Date('2025-10-04T09:17:00')

// 切り捨て: 09:00
const rounded1 = algorithm.roundingTime(time, false)

// 切り上げ: 09:30
const rounded2 = algorithm.roundingTime(time, true)
```

### スケジュールの丸め処理

```typescript
const schedule: Schedule = {
  start: new Date('2025-10-04T09:15:00'),
  end: new Date('2025-10-04T17:45:00')
}

// 切り捨て
const rounded1 = algorithm.roundingSchedule(schedule, 'backward')
// start: 09:00, end: 17:30

// 切り上げ
const rounded2 = algorithm.roundingSchedule(schedule, 'forward')
// start: 09:30, end: 18:00

// 引き伸ばし
const rounded3 = algorithm.roundingSchedule(schedule, 'stretch')
// start: 09:00, end: 18:00

// 四捨五入
const rounded4 = algorithm.roundingSchedule(schedule, 'round')
// start: 09:30, end: 18:00
```

### 重複イベントの除去

```typescript
const events: Event[] = [
  // 重複するイベント
]

// 小さい範囲で比較（短いイベントを優先）
const cleaned1 = algorithm.cleanDuplicateEvent(events, 'small')

// 大きい範囲で比較（長いイベントを優先）
const cleaned2 = algorithm.cleanDuplicateEvent(events, 'large')
```

## アルゴリズムの流れ

### splitOneDayTask

1. **イベントの展開**
   - 繰り返しイベントを指定期間内に展開
   - 複数日にまたがるイベントを日ごとに分割

2. **イベントとスケジュールのマージ**
   - スケジュールをイベントに変換
   - イベントとマージして統一リストを作成

3. **フィルタリング**
   - 無効なイベントを除外
   - キャンセルされたイベントを除外
   - プライベートイベントを除外

4. **重複の除去**
   - 設定に応じた比較方法で重複を除去

5. **タスクの生成**
   - 勤務時間イベント(開始/終了)のペアを見つける
   - 開始と終了の間にある作業イベントを抽出
   - DayTaskオブジェクトを生成

## 設定項目

### EventInputInfo

```typescript
interface EventInputInfo {
  roundingTimeType: RoundingTimeType  // 丸め処理タイプ
  startEndType: 'start' | 'end' | 'both'  // 開始/終了の扱い
  workingEventTypes: WorkingEventType[]  // 勤務時間イベントタイプ
  eventCompareType: TimeCompareType  // イベント比較タイプ
}
```

### ScheduleInputInfo

```typescript
interface ScheduleInputInfo {
  startEndTime: number  // 開始/終了時間（分単位、30の倍数）
  roundingTimeType: RoundingTimeType  // 丸め処理タイプ
  startEndType: 'start' | 'end' | 'both'  // 開始/終了の扱い
  scheduleInputMode: 'fill' | 'startend'  // スケジュール入力モード
  scheduleAutoInput: boolean  // 自動入力の有無
}
```

## ログ出力

アルゴリズムは以下のログを出力します:

- **INFO**: 初期化、タスク分割の開始/完了
- **DEBUG**: 設定内容の詳細
- **WARN**: 勤務時間イベント不足などの警告
- **ERROR**: 設定エラー、バリデーションエラー

```typescript
// ログの例
[INFO] アルゴリズム初期化: プロジェクト=MyProject
[INFO] 1日タスク分割開始: イベント数=10, スケジュール数=2
[INFO] 1日タスク分割完了: 生成されたタスク数=5
[WARN] 勤務時間イベントが2つ未満のため、処理をスキップします。2025-10-04
```

## エラーハンドリング

### 設定エラー

```typescript
// スケジュール設定が未設定
// Error: 勤務時間設定が未設定です。

// 開始終了時間が30の倍数でない
// Error: 勤務開始終了時間は30の倍数で設定してください。45
```

### バリデーションエラー

```typescript
// nonduplicateモードでeventsが未設定
// Error: イベントが未設定です。

// 無効なスケジュール（終了時刻が未設定）
// return null
```

## Pythonバージョンとの対応

| Python | TypeScript |
|--------|------------|
| `TimeTrackerAlgorithm` | `TimeTrackerAlgorithm` |
| `rounding_time()` | `roundingTime()` |
| `rounding_schedule()` | `roundingSchedule()` |
| `schedule_to_event()` | `scheduleToEvent()` |
| `get_recurrence_event()` | `getRecurrenceEvent()` |
| `clean_duplicate_event()` | `cleanDuplicateEvent()` |
| `split_one_day_task()` | `splitOneDayTask()` |
| `marged_schedule_events()` | `margedScheduleEvents()` |
| `search_next_event()` | `searchNextEvent()` |

## テスト

```bash
npm test -- algorithm
```

**テストカバレッジ:** 54テスト、100%

- roundingTime: 6テスト
- roundingSchedule: 15テスト
- scheduleToEvent: 7テスト
- getRecurrenceEvent: 1テスト
- cleanDuplicateEvent: 2テスト
- splitOneDayTask: 6テスト
- addStartToEndDate: 1テスト
- margedScheduleEvents: 4テスト
- scheduleToEvent (fillモード): 2テスト
- searchNextEvent: 10テスト

## パフォーマンス

- **時間計算**: O(1)
- **重複除去**: O(n²) (n = イベント数)
- **タスク分割**: O(n log n) (ソート + 線形走査)

大量のイベント（1000件以上）を処理する場合は、事前にフィルタリングすることを推奨します。

## 関連

- `types/` - 型定義 (Event, Schedule, DayTask等)
- `types/utils/` - イベント/スケジュールのユーティリティ
- `lib/logger` - ロギング機能
