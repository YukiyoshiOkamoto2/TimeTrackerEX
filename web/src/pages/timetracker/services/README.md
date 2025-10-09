# services/ - TimeTrackerサービス層

TimeTrackerページ固有のビジネスロジック。

## timeTrackerService.ts

**統合サービス**: イベントとWorkItemの自動紐付け、統計情報計算、自動紐付けプロセスの実行を統合したサービス。

> **Note**: `eventLinkingService.ts`、`statisticsService.ts`、`linkingProcessService.ts` を統合しました。

### イベントフィルタリング関数

- `getEnableEvents(events, ignorablePatterns)`: 有効イベント取得（無視リスト除外）
- `getEnableSchedules(schedules)`: 有効スケジュール取得（休日・エラー除外）

### タスク分割関数

- `splitEventsByDay(events, schedules, project, settings)`: 1日ごとのタスク分割
- `getPaidLeaveSchedules(schedules)`: 有給休暇スケジュール取得
- `createPaidLeaveDayTasks(schedules, settings, project, workItems)`: 有給休暇タスク生成

### 自動紐付け関数

- `autoLinkEvents(events, workItems, settings, historyManager)`: イベントとWorkItemの自動紐付け
- `manualLinkEvent(event, workItem, historyManager?)`: 手動紐付け

#### 紐付け優先順位

1. 休暇イベント紐付け（timeOffEvent設定）
2. 履歴から紐付け（isHistoryAutoInput有効時）

#### 戻り値

```typescript
{
  linked: EventWorkItemPair[];
  unlinked: Event[];
  timeOffCount: number;
  historyCount: number;
}
```

### 自動紐付けプロセス関数

- `performAutoLinking(input: AutoLinkingInput)`: 完全な自動紐付けプロセスを実行
- `createAutoLinkingResultMessage(result)`: 自動紐付け結果のメッセージ生成

#### 入力

```typescript
{
  events: Event[];
  schedules: Schedule[];
  project: Project;
  workItems: WorkItem[];
  settings: TimeTrackerSettings;
}
```

#### 戻り値

```typescript
{
  linkingResult: AutoLinkingResult;
  dayTasks: DayTask[];
}
```

### 統計情報関数

- `calculateLinkingStatistics(linkingResult, manuallyLinkedPairs, schedules, dayTasks)`: 統計データを計算

#### 入力

- `linkingResult`: 自動紐付け結果（`AutoLinkingResult | null`）
- `manuallyLinkedPairs`: 手動紐付けペアの配列（`EventWorkItemPair[]`）
- `schedules`: 勤怠情報のスケジュール配列（`Schedule[]`）
- `dayTasks`: 日別タスク配列（`DayTask[]`）- **通常タスク日数の正確な計算に使用**

#### 戻り値

`LinkingStatistics` オブジェクト:

```typescript
{
  linkedCount: number;        // 紐づけ済みイベント数
  timeOffCount: number;       // 休暇イベント数
  historyCount: number;       // 履歴から紐づけされたイベント数
  unlinkedCount: number;      // 未紐づけイベント数
  manualCount: number;        // 手動紐づけイベント数
  totalLinked: number;        // 総紐づけイベント数（自動 + 手動）
  paidLeaveDays: number;      // 有給休暇の日数
  normalTaskDays: number;     // 通常勤務の日数
  totalDays: number;          // 総日数
}
```

### 統計計算ロジック

- **有給休暇の日数**: `isPaidLeave === true` のスケジュールをカウント
- **通常勤務の日数**: 休日でもエラーでも有給でもないスケジュールをカウント
- **総日数**: すべてのスケジュールをカウント

### 使用例

```typescript
const stats = calculateLinkingStatistics(
  linkingResult,
  manuallyLinkedPairs,
  uploadInfo?.pdf?.schedule || []
);

console.log(`通常勤務: ${stats.normalTaskDays}日分`);
console.log(`有給休暇: ${stats.paidLeaveDays}日分`);
console.log(`紐づけ済み: ${stats.totalLinked}件`);
```

### テスト

- ✅ すべての統計が0の場合
- ✅ 自動紐づけのみの場合
- ✅ 手動紐づけが含まれる場合
- ✅ 未紐づけイベントがある場合
- ✅ 有給休暇が含まれる場合
- ✅ 休日とエラーが含まれる場合
- ✅ 休暇イベント（timeOffCount）が含まれる場合
- ✅ 複雑な混合ケース
