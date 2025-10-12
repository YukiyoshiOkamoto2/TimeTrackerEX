# core/algorithm/ - 時間計算アルゴリズム

イベントとスケジュールから勤務時間を自動計算。Pythonのalgorithm.py移植。

## ファイル構成

### 実装ファイル

- **TimeTrackerAlgorithmCore.ts**: Core機能
  - `roundingTime`: 時刻丸め (30分単位)
  - `roundingSchedule`: スケジュール丸め (6種類の丸めモード)
  - `checkEvent`: イベント検証 (未来、古すぎる、長すぎるイベントを除外)
  - 定数: `MAX_TIME`, `MAX_OLD`, `ROUNDING_TIME_UNIT`

- **TimeTrackerAlgorithmEvent.ts**: Event操作
  - `isDuplicateEventOrSchedule`: イベント/スケジュール重複判定
  - `getRecurrenceEvent`: 繰り返しイベント展開
  - `getAllEventInScheduleRange`: 勤務日フィルタリング
  - `searchNextEvent`: 次イベント検索 (サイズ比較対応)
  - `cleanDuplicateEvent`: 重複イベント除去
  - `margedScheduleEvents`: スケジュールイベントとの統合

- **TimeTrackerAlgorithmSchedule.ts**: Schedule処理
  - `scheduleToEvent`: スケジュール→イベント変換 (start/end/fill モード)
  - `addStartToEndDate`: 複数日イベント分割
  - `cleanEvent`: イベントクリーンアップと統合
  - `splitOneDayTask`: 1日タスク分割 (メイン処理)
  - `getEventDayMap`: (非推奨) イベント日付マップ

- **algorithm.ts**: (将来削除予定)
  - TimeTrackerAlgorithmクラス (後方互換性のため残存)
  - 新規コードでは上記モジュールを直接利用

- **index.ts**: エクスポート統合
  - 各モジュールの関数をエクスポート
  - 後方互換性のための alias 提供

### テストファイル

- **TimeTrackerAlgorithmHelper.test.ts**: ✅ 現行テスト (75 tests)
  - Event, Schedule操作の統合テスト
  - 各メソッドの詳細なテストケース
  - 本ファイルを使用

- **_deprecated.algorithm.test.ts**: ⚠️ 将来削除予定 (12 tests)
  - TimeTrackerAlgorithmクラスの統合テスト
  - cleanDuplicateEvent, splitOneDayTask, margedScheduleEvents
  - 参照のみ、新規テスト追加不可

- **_deprecated.algorithm.method.test.ts**: ⚠️ 将来削除予定 (1792 lines)
  - TimeTrackerAlgorithmクラスのメソッドテスト
  - roundingTime, roundingSchedule など
  - 参照のみ、新規テスト追加不可

## 主要な型

**RoundingMethod**: `backward` | `forward` | `round` | `half` | `stretch` | `nonduplicate`

**TimeCompare**: `small` | `large`

**WorkingEventType**: `start` | `end` | `fill`

## 使用例

```typescript
import { 
    roundingTime, 
    roundingSchedule, 
    checkEvent,
    TimeTrackerAlgorithmEvent,
    splitOneDayTask 
} from "@/core/algorithm";

// 時刻丸め
const rounded = roundingTime(new Date(), false);

// スケジュール丸め
const roundedSchedule = roundingSchedule(schedule, "backward", events);

// イベント重複チェック
const isDuplicate = TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(event, events);

// 1日タスク分割
const dayTasks = splitOneDayTask(events, schedules);
```

## テスト実行

```bash
# 現行テスト
npm test -- TimeTrackerAlgorithmHelper.test.ts --run

# 削除予定テスト (参照用)
npm test -- _deprecated.algorithm.test.ts --run
npm test -- _deprecated.algorithm.method.test.ts --run
```
