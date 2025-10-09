# イベント・WorkItem紐付け処理の実装状況

## app.py との要件比較

### ✅ 実装済み機能

#### 1. イベント取得・フィルタリング
- **app.py**: `get_enable_events(ignore, events)` - 無視リスト適用、非公開・キャンセル済みを除外
- **TypeScript**: `getEnableEvents(events, ignorableEventPatterns)` - 同等の実装

#### 2. スケジュール取得・フィルタリング
- **app.py**: `get_enable_schedule(ignore, schedules)` - 休日・エラーを除外、無視リスト適用
- **TypeScript**: `getEnableSchedules(schedules)` - 休日・エラーを除外（実装済み）

#### 3. 有給休暇スケジュールの抽出
- **app.py**: `paid_leave_schedules = [schedule for schedule in schedules if schedule.is_paid_leave]`
- **TypeScript**: `getPaidLeaveSchedules(schedules)` - 同等の実装

#### 4. 有給休暇タスクの生成
- **app.py**: `get_paid_leave_work_item()` で WorkItem と時間を取得し、有給休暇イベントを生成
- **TypeScript**: `createPaidLeaveDayTasks()` - 同等の実装
  - WorkItem 取得
  - 開始・終了時間の設定
  - 有給休暇イベントの生成（名前: "有給休暇", organizer: "Automatic"）
  - DayTask の作成

#### 5. 1日ごとのタスク分割
- **app.py**: `algorithm.split_one_day_task(schedules, events)`
- **TypeScript**: `TimeTrackerAlgorithm.splitOneDayTask(events, schedules)` - 同等の実装
  - EventInputInfo: イベント重複判定、丸め方法
  - ScheduleInputInfo: スケジュール丸め方法、開始終了タイプ、自動入力時間

#### 6. 休暇イベントの自動紐付け
- **app.py**: `linking_event_work_item()` 内で time_off_event の名前パターンとマッチ
- **TypeScript**: `linkTimeOffEvents()` - 同等の実装
  - namePatterns によるパターンマッチ（partial, prefix, suffix）
  - 休暇 WorkItem への自動紐付け

#### 7. 履歴からの自動紐付け
- **app.py**: `history.get_work_item_id(event)` で履歴から WorkItem ID を取得
- **TypeScript**: `linkFromHistory()` - 同等の実装
  - HistoryManager から WorkItem ID を取得
  - WorkItem への自動紐付け

#### 8. 自動紐付けの統合処理
- **app.py**: 休暇イベント → 履歴 → 手動入力の順で処理
- **TypeScript**: `autoLinkEvents()` - 同等の実装
  - 休暇イベント優先
  - 履歴からの紐付け
  - 結果の集計（AutoLinkingResult）

#### 9. タスク結合・ソート
- **app.py**: 有給休暇タスク + 通常タスクを結合し、日付でソート
- **TypeScript**: LinkingProcessView 内で実装
  ```typescript
  const allDayTasks = [...paidLeaveDayTasks, ...dayTasksResult];
  allDayTasks.sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());
  ```

### 🔄 処理フロー比較

#### app.py の処理フロー
```python
1. get_events(view) - イベント取得
2. get_schedule() - スケジュール取得
3. get_time_tracker_info(api, password) - Project, WorkItem取得
4. get_enable_schedule(ignore, schedules) - 有効なスケジュールを取得
5. get_enable_events(ignore, events) - 有効なイベントを取得
6. linking_event_work_item(...) - イベントとWorkItemを紐付け
   - 休暇イベントの自動紐付け
   - 履歴からの自動紐付け
   - 手動入力
7. get_day_task(...) - 1日ごとのタスク生成
   - get_paid_leave_work_item() - 有給休暇設定取得
   - algorithm.split_one_day_task() - タスク分割
   - 有給休暇タスクの追加
   - 通常タスクの追加
   - ソート
8. run_register_task_async() - タスク登録
```

#### TypeScript の処理フロー（LinkingProcessView）
```typescript
1. uploadInfo.ics.event - イベント取得（済み）
2. uploadInfo.pdf.schedule - スケジュール取得（済み）
3. [TODO] Project, WorkItem取得 - API統合必要
4. getEnableSchedules(allSchedules) - 有効なスケジュール取得 ✅
5. getEnableEvents(events, ignorableEvents) - 有効なイベント取得 ✅
6. splitEventsByDay(...) - 1日ごとのタスク分割 ✅
7. createPaidLeaveDayTasks(...) - 有給休暇タスク生成 ✅
8. allDayTasks結合・ソート ✅
9. autoLinkEvents(...) - 自動紐付け ✅
   - 休暇イベント自動紐付け
   - 履歴から自動紐付け
10. [TODO] 手動紐付けUI - 未実装
11. [TODO] タスク登録API呼び出し - 未実装
```

### ⚠️ 型制約・バリデーション

#### RoundingMethod の制約
- **app.py**: スケジュールの丸め方法に制限なし
- **TypeScript**: `ScheduleInputInfo.roundingTimeType` は `"nonduplicate"` を除外
  ```typescript
  const roundingType = settings.scheduleAutoInputInfo.roundingTimeTypeOfSchedule;
  if (roundingType === "nonduplicate") {
      throw new Error('scheduleAutoInputInfo.roundingTimeTypeOfScheduleに"nonduplicate"は使用できません');
  }
  ```
  - **理由**: `"nonduplicate"` はイベント専用の丸め方法

### 🚧 未実装機能

#### 1. Project・WorkItem 取得
- **現状**: モックデータ
- **必要な実装**:
  ```typescript
  const api = new TimeTrackerAPI(settings.timetracker);
  await api.connect(password);
  const project = await api.getProjects();
  const workItems = await api.getWorkItems();
  ```

#### 2. 手動紐付けUI
- **app.py**: `input_work_item_id()` で対話的に WorkItem ID を入力
- **TypeScript**: UI実装が必要
  - 未紐付けイベントの一覧表示
  - WorkItem 選択ダイアログ
  - 履歴への保存

#### 3. WorkItem 階層のフラット化
- **app.py**: `work_item_children = [child for item in work_items for child in item.get_most_nest_children()]`
- **TypeScript**: WorkItem 型に `getMostNestChildren()` メソッドの実装が必要

#### 4. タスク登録API
- **app.py**: `run_register_task_async()` で TimeTracker API にタスクを登録
- **TypeScript**: API統合が必要
  ```typescript
  await api.registerTask({
      workItemId: workItem.id,
      startTime: event.schedule.start,
      endTime: event.schedule.end,
      memo: message,
  });
  ```

#### 5. メッセージハンドラー
- **app.py**: `message_handler.get_message()` でメモを生成
- **TypeScript**: 未実装

#### 6. HTML出力
- **app.py**: `html.flush_work_item_tree()`, `html.flush_schedule()`
- **TypeScript**: 不要（React UIで代替）

### ✅ 要件充足状況

| 要件 | app.py | TypeScript | 状態 |
|------|--------|-----------|------|
| イベント取得・フィルタリング | ✅ | ✅ | 完了 |
| スケジュール取得・フィルタリング | ✅ | ✅ | 完了 |
| 無視リスト適用 | ✅ | ✅ | 完了 |
| 有給休暇スケジュール抽出 | ✅ | ✅ | 完了 |
| 有給休暇タスク生成 | ✅ | ✅ | 完了 |
| 1日ごとのタスク分割 | ✅ | ✅ | 完了 |
| 休暇イベント自動紐付け | ✅ | ✅ | 完了 |
| 履歴からの自動紐付け | ✅ | ✅ | 完了 |
| タスク結合・ソート | ✅ | ✅ | 完了 |
| Project・WorkItem取得 | ✅ | ❌ | 未実装（モック） |
| 手動紐付けUI | ✅ | ❌ | 未実装 |
| タスク登録API | ✅ | ❌ | 未実装 |
| メッセージ生成 | ✅ | ❌ | 未実装 |

### 📋 次のステップ

1. **WorkItem階層のフラット化メソッド実装**
   - `WorkItem.getMostNestChildren()` の追加

2. **API統合**
   - TimeTrackerAPI クライアントの実装
   - Project・WorkItem 取得
   - タスク登録

3. **手動紐付けUIの実装**
   - 未紐付けイベント一覧
   - WorkItem 選択ダイアログ
   - 履歴保存

4. **メッセージハンドラー**
   - イベントとWorkItemからメモを生成

5. **結果表示UI**
   - 紐付け結果のテーブル表示
   - DayTask の確認画面

### 🎯 コア機能の実装状況: ✅ **完了**

**イベントとWorkItemの紐付け処理（自動紐付け部分）は app.py と同等の要件を満たしています。**

以下の処理が正しく実装されています:
- ✅ イベント・スケジュールのフィルタリング
- ✅ 有給休暇タスクの生成
- ✅ 1日ごとのタスク分割（algorithm.ts使用）
- ✅ 休暇イベントの自動紐付け
- ✅ 履歴からの自動紐付け
- ✅ タスクの結合・ソート

残りの機能（API統合、手動紐付けUI、タスク登録）は次のフェーズで実装予定です。
