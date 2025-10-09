# services/ - TimeTrackerサービス層

TimeTrackerページ固有のビジネスロジック。

## eventLinkingService.ts

イベントとWorkItemの自動紐付け。Python版linking_event_work_item移植。

### 関数

- `getEnableEvents(events, ignorablePatterns)`: 有効イベント取得 (無視リスト除外)
- `autoLinkEvents(events, workItems, settings, historyManager)`: 自動紐付け

### 紐付け優先順位

1. 休暇イベント紐付け (timeOffEvent設定)
2. 履歴から紐付け (isHistoryAutoInput有効時)

### 戻り値

`{ linked, unlinked, timeOffCount, historyCount }`
