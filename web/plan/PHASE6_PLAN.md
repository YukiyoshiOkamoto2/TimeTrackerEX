# Phase 6 実装計画: CompletionView統合

**作成日**: 2025年10月9日  
**予定期間**: 1-2日  
**前提条件**: Phase 1-5完了

---

## 📋 目次

1. [概要](#概要)
2. [実装タスク](#実装タスク)
3. [データフロー](#データフロー)
4. [実装詳細](#実装詳細)
5. [完了基準](#完了基準)

---

## 概要

### 目的

LinkingProcessViewで生成されたDayTaskデータをCompletionViewで表示し、TimeTracker APIへの登録を可能にする。

### 主要課題

1. **データ変換**: `DayTask[]` → `ScheduleItem[]`
2. **CompletionView更新**: 新しいデータ構造への対応
3. **TimeTrackerPage統合**: データフローの接続
4. **エラーハンドリング**: API呼び出しエラーの適切な処理

---

## 実装タスク

### Task 1: DayTask → ScheduleItem 変換関数の実装

**目的**: DayTaskをCompletionViewが期待するScheduleItem形式に変換

**実装内容**:
- `src/pages/timetracker/services/dataTransform.ts` 新規作成
- `convertDayTasksToScheduleItems` 関数実装
- 日付・時刻のフォーマット変換
- WorkItem情報の埋め込み

**入力**: 
```typescript
DayTask {
  baseDate: Date;
  project: Project;
  events: Event[];
  scheduleEvents: Event[];
}
```

**出力**:
```typescript
ScheduleItem {
  date: string;      // "2024/01/15"
  time: string;      // "09:00-10:30"
  name: string;      // Event.name
  organizer: string; // Event.organizer
  itemCode?: string; // WorkItem.id
}
```

**テストケース**:
- 通常イベントの変換
- 複数イベントが同じ日にある場合
- 有給休暇イベントの変換
- scheduleEventsの処理

---

### Task 2: CompletionViewProps の更新

**目的**: CompletionViewが新しいデータ構造を受け取れるようにする

**現在のProps**:
```typescript
export type CompletionViewProps = {
    schedules: ScheduleItem[];
    itemCodes: string[];
    itemCodeOptions: ItemCodeOption[];
    onBack: () => void;
    onBackToLinking: () => void;
};
```

**変更点**:
- `schedules` は変換後のデータを受け取る（変更なし）
- `itemCodeOptions` の生成ロジックを確認
- 必要に応じてpropsを追加

**実装内容**:
- CompletionView.tsxのprops定義確認
- itemCodeOptionsの生成ロジック確認
- 必要に応じて型定義を更新

---

### Task 3: TimeTrackerPage データフロー統合

**目的**: LinkingProcessView → CompletionView のデータフローを確立

**実装内容**:

1. **state管理の追加**:
```typescript
const [dayTasks, setDayTasks] = useState<DayTask[]>([]);
const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
```

2. **LinkingProcessViewのonSubmit更新**:
```typescript
<LinkingProcessView
  uploadInfo={uploadInfo}
  onBack={() => setView("upload")}
  onSubmit={(tasks) => {
    setDayTasks(tasks);
    const items = convertDayTasksToScheduleItems(tasks);
    setScheduleItems(items);
    setView("completion");
  }}
  setIsLoading={setIsLoading}
/>
```

3. **CompletionViewへのデータ渡し**:
```typescript
<CompletionView
  schedules={scheduleItems}
  itemCodeOptions={generateItemCodeOptions(uploadInfo?.workItems || [])}
  onBack={() => setView("upload")}
  onBackToLinking={() => setView("linking")}
/>
```

**修正箇所**:
- `src/pages/timetracker/TimeTrackerPage.tsx`

---

### Task 4: ItemCodeOptions 生成ロジック

**目的**: WorkItemからItemCodeOption配列を生成

**実装内容**:
- `src/pages/timetracker/services/dataTransform.ts` に追加
- `generateItemCodeOptions` 関数実装

**関数シグネチャ**:
```typescript
export function generateItemCodeOptions(workItems: WorkItem[]): ItemCodeOption[] {
  return workItems.map(item => ({
    code: item.id,
    name: item.name,
  }));
}
```

---

### Task 5: エラーハンドリングとログ

**目的**: データ変換エラーや異常データの適切な処理

**実装内容**:
1. データ変換時のnullチェック
2. ログ出力の追加
3. エラーメッセージの表示
4. フォールバック処理

**実装例**:
```typescript
try {
  const items = convertDayTasksToScheduleItems(tasks);
  if (items.length === 0) {
    logger.warn("変換後のScheduleItemsが空です");
    appMessageDialogRef.showMessageAsync(
      "データエラー",
      "スケジュールデータの変換に失敗しました",
      "ERROR"
    );
    return;
  }
  setScheduleItems(items);
  setView("completion");
} catch (error) {
  logger.error("データ変換エラー:", error);
  appMessageDialogRef.showMessageAsync(
    "変換エラー",
    "スケジュールデータの変換中にエラーが発生しました",
    "ERROR"
  );
}
```

---

## データフロー

```
FileUploadView
    ↓ (PDF + ICS + Project + WorkItems)
    ↓
LinkingProcessView
    ↓ (autoLinkEvents実行)
    ↓
    ├─ 統計表示
    ├─ 紐付け済みテーブル
    ├─ 未紐付けテーブル (手動紐付け)
    └─ 送信ボタン
        ↓ (DayTask[])
        ↓
    [Task 1: convertDayTasksToScheduleItems]
        ↓ (ScheduleItem[])
        ↓
CompletionView
    ├─ スケジュール確認
    ├─ 項目コード編集
    └─ TimeTracker API登録
        ↓
    完了画面
```

---

## 実装詳細

### Task 1: convertDayTasksToScheduleItems 実装

**ファイル**: `src/pages/timetracker/services/dataTransform.ts`

```typescript
import type { DayTask, Event } from "@/types";
import type { ScheduleItem } from "../components";
import { getLogger } from "@/lib/logger";

const logger = getLogger("dataTransform");

/**
 * DayTaskをScheduleItemに変換
 * 
 * @param dayTasks - 日ごとのタスクリスト
 * @returns ScheduleItemの配列
 */
export function convertDayTasksToScheduleItems(dayTasks: DayTask[]): ScheduleItem[] {
  const scheduleItems: ScheduleItem[] = [];

  for (const dayTask of dayTasks) {
    const dateStr = formatDate(dayTask.baseDate);

    // 通常イベントを変換
    for (const event of dayTask.events) {
      const item = convertEventToScheduleItem(event, dateStr);
      if (item) {
        scheduleItems.push(item);
      }
    }

    // スケジュールイベント（勤務時間）を変換
    for (const scheduleEvent of dayTask.scheduleEvents) {
      const item = convertEventToScheduleItem(scheduleEvent, dateStr);
      if (item) {
        scheduleItems.push(item);
      }
    }
  }

  logger.info(`DayTask変換完了: ${dayTasks.length}日分 → ${scheduleItems.length}件のScheduleItem`);
  return scheduleItems;
}

/**
 * EventをScheduleItemに変換
 */
function convertEventToScheduleItem(event: Event, dateStr: string): ScheduleItem | null {
  try {
    const startTime = event.schedule.start;
    const endTime = event.schedule.end;

    if (!startTime) {
      logger.warn(`イベント "${event.name}" の開始時刻が不明です`);
      return null;
    }

    const timeStr = formatTimeRange(startTime, endTime);

    return {
      date: dateStr,
      time: timeStr,
      name: event.name || "無題",
      organizer: event.organizer || "",
      itemCode: undefined, // CompletionViewで編集可能
    };
  } catch (error) {
    logger.error(`イベント変換エラー: ${event.name}`, error);
    return null;
  }
}

/**
 * 日付をフォーマット
 * @param date - Date
 * @returns "2024/01/15" 形式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * 時刻範囲をフォーマット
 * @param start - 開始時刻
 * @param end - 終了時刻
 * @returns "09:00-10:30" 形式
 */
function formatTimeRange(start: Date, end?: Date): string {
  const startStr = formatTime(start);
  
  if (!end) {
    return startStr;
  }
  
  const endStr = formatTime(end);
  return `${startStr}-${endStr}`;
}

/**
 * 時刻をフォーマット
 * @param date - Date
 * @returns "09:00" 形式
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * WorkItemからItemCodeOptionを生成
 */
export function generateItemCodeOptions(workItems: WorkItem[]): ItemCodeOption[] {
  return workItems.map(item => ({
    code: item.id,
    name: item.name,
  }));
}
```

---

## 完了基準

### Task 1: データ変換関数
- ✅ convertDayTasksToScheduleItems 実装完了
- ✅ generateItemCodeOptions 実装完了
- ✅ 日付・時刻フォーマット関数実装完了
- ✅ エラーハンドリング実装完了
- ✅ ログ出力実装完了

### Task 2: CompletionView更新
- ✅ Props定義確認・更新完了
- ✅ 新しいデータ構造での動作確認完了

### Task 3: TimeTrackerPage統合
- ✅ state管理追加完了
- ✅ LinkingProcessViewのonSubmit更新完了
- ✅ CompletionViewへのデータ渡し完了
- ✅ データフロー動作確認完了

### Task 4: ItemCodeOptions生成
- ✅ generateItemCodeOptions 実装完了
- ✅ WorkItem → ItemCodeOption 変換動作確認

### Task 5: エラーハンドリング
- ✅ try-catch実装完了
- ✅ エラーメッセージ表示実装完了
- ✅ ログ出力実装完了
- ✅ フォールバック処理実装完了

### 全体
- ✅ TypeScriptコンパイルエラー: 0件
- ✅ Lint警告: 0件
- ✅ FileUpload → Linking → Completion のフロー動作確認
- ✅ ScheduleTableでのデータ表示確認
- ✅ ItemCode編集機能動作確認

---

## リスク・注意事項

### データ整合性
- EventとWorkItemの紐付けが正しく保持されているか確認
- 有給休暇イベントの特別処理が必要か確認

### パフォーマンス
- 大量のDayTask（100日分以上）の変換パフォーマンス
- useMemoでの最適化を検討

### UI/UX
- CompletionViewでのデータ表示が適切か
- ScheduleTableのitemCode編集が正常に動作するか

---

## 次のステップ（Phase 7）

Phase 6完了後:
1. 統合テスト実施
2. E2Eテスト作成
3. バグ修正
4. パフォーマンス最適化
5. ドキュメント最終更新
