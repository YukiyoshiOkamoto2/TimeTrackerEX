# TimeTracker Settings Definition

TimeTracker機能の設定定義を提供します。

## 概要

このモジュールは、TimeTracker機能に関する詳細な設定定義を提供します。
勤務時間の管理、自動入力、休暇管理などの設定を含みます。

## エクスポート

### TIMETRACKER_SETTINGS_DEFINITION

**型:** `ObjectSettingValueInfo`

**説明:**
TimeTracker設定の定義。以下の主要な設定項目を含みます:

**主要な子要素:**
- **勤務時間設定**
  - `workTimeStart`: 勤務開始時刻
  - `workTimeEnd`: 勤務終了時刻
  - `lunchTimeStart`: 昼休憩開始時刻
  - `lunchTimeEnd`: 昼休憩終了時刻
  - `roundingMethod`: 時刻丸め方法

- **自動入力設定**
  - `scheduleAutoInputInfo`: 予定の自動入力設定
    - `enabled`: 自動入力の有効/無効
    - `compareWith`: 比較対象（開始時刻/終了時刻）
    - `eventDuplicateHandling`: 重複イベントの処理方法

- **休暇管理設定**
  - `paidLeaveInputInfo`: 有給休暇入力設定
    - `enabled`: 有給入力の有効/無効
    - `workingDaysPerWeek`: 週の勤務日数
    - `annualPaidLeaveDays`: 年間有給日数

- **イベント設定**
  - `ignorableEvent`: 無視するイベントパターン
  - `timeOffEvent`: 休暇イベントパターン

**使用例:**

```typescript
import { TIMETRACKER_SETTINGS_DEFINITION } from "@/schema/settings";

// 完全なバリデーション
const result = TIMETRACKER_SETTINGS_DEFINITION.validate(settings);
if (!result.ok) {
    console.error("検証エラー:", result.errors);
}

// 部分バリデーション（UI更新時）
const partialResult = TIMETRACKER_SETTINGS_DEFINITION.validatePartial({
    workTimeStart: "09:00"
});
```

## テスト

`timetrackerDefinition.test.ts`に包括的なテストが含まれています。

## 型定義

TimeTracker設定の型は`@/types/settings`で定義されています:
- `TimeTrackerSettings`
- `ScheduleAutoInputInfo`
- `PaidLeaveInputInfo`
- `EventPattern`
- など

## 依存関係

- `../settingsDefinition` - 基底クラス
  - `ObjectSettingValueInfo`
  - `StringSettingValueInfo`
  - `NumberSettingValueInfo`
  - `BooleanSettingValueInfo`
  - `ArraySettingValueInfo`
