## イベント紐付けサービス (Event Linking Service)

### 概要

`eventLinkingService.ts`は、TimeTrackerアプリケーションでイベントとWorkItemを自動的に紐付けるためのサービスです。Python版の`linking_event_work_item`関数の機能をTypeScriptに移植しています。

### 主な機能

#### 1. 有効なイベントの取得 (`getEnableEvents`)

無視リストに基づいて、処理対象のイベントをフィルタリングします。

```typescript
const enableEvents = getEnableEvents(events, ignorableEventPatterns);
```

**除外されるイベント:**
- プライベートイベント (`isPrivate === true`)
- キャンセルされたイベント (`isCancelled === true`)
- 無視リストのパターンにマッチするイベント

#### 2. 自動紐付け (`autoLinkEvents`)

以下の優先順位で自動的にイベントとWorkItemを紐付けます:

1. **休暇イベント紐付け**
   - `timeOffEvent`設定に基づいて、特定のパターンにマッチするイベント名を休暇WorkItemに紐付け
   - パターンマッチモード:
     - `partial`: 部分一致
     - `prefix`: 前方一致
     - `suffix`: 後方一致

2. **履歴から紐付け**
   - `isHistoryAutoInput`が有効な場合
   - 過去の履歴情報から同じイベント名のWorkItemを自動適用

```typescript
const result = autoLinkEvents(
    events,
    workItems,
    settings.timetracker,
    historyManager
);

// 結果
result.linked;        // 紐付け済みのEventWorkItemPair配列
result.unlinked;      // 未紐付けのEvent配列
result.timeOffCount;  // 休暇として紐付けされた数
result.historyCount;  // 履歴から紐付けされた数
```

#### 3. 手動紐付け (`manualLinkEvent`)

ユーザーが手動でイベントとWorkItemを紐付ける際に使用します。

```typescript
const pair = manualLinkEvent(event, workItem, historyManager);
```

オプションでHistoryManagerを渡すことで、紐付け情報を履歴に保存できます。

### 使用例

```typescript
import { autoLinkEvents, getEnableEvents } from "@/pages/timetracker/services";
import { HistoryManager } from "@/core/history";

// 1. 無視リストでフィルタリング
const ignorablePatterns = settings.timetracker.ignorableEvents || [];
const enableEvents = getEnableEvents(allEvents, ignorablePatterns);

// 2. 履歴マネージャーを準備
const historyManager = new HistoryManager();
historyManager.load();

// 3. 自動紐付けを実行
const result = autoLinkEvents(
    enableEvents,
    workItems,
    settings.timetracker,
    historyManager
);

// 4. 結果を処理
console.log(`休暇イベント: ${result.timeOffCount}件`);
console.log(`履歴から: ${result.historyCount}件`);
console.log(`未紐付け: ${result.unlinked.length}件`);

// 未紐付けイベントは手動で紐付け
for (const event of result.unlinked) {
    const workItem = await promptUserForWorkItem(event);
    if (workItem) {
        const pair = manualLinkEvent(event, workItem, historyManager);
        result.linked.push(pair);
    }
}
```

### 設定項目

#### 休暇イベント設定 (`timeOffEvent`)

```typescript
{
    namePatterns: [
        { pattern: "有給", matchMode: "partial" },
        { pattern: "休暇", matchMode: "partial" }
    ],
    workItemId: 12345
}
```

#### 履歴からの自動入力 (`isHistoryAutoInput`)

```typescript
{
    isHistoryAutoInput: true  // 有効にすると履歴から自動紐付け
}
```

### LinkingProcessViewでの統合

`LinkingProcessView`コンポーネントは、画面表示時に自動的に以下の処理を実行します:

1. アップロードされたICSファイルからイベントを取得
2. 無視リストでフィルタリング
3. 休暇イベントの自動紐付け
4. 履歴からの自動紐付け
5. 結果をユーザーに通知

```typescript
useEffect(() => {
    const performAutoLinking = async () => {
        // 自動紐付け実行
        const result = autoLinkEvents(...);
        
        // 状態を更新
        setLinkedPairs(result.linked);
        setUnlinkedEvents(result.unlinked);
        
        // ユーザーに通知
        await showNotification(result);
    };
    
    performAutoLinking();
}, [uploadInfo]);
```

### ログ出力

サービスは詳細なログを出力します:

```
[INFO] 自動紐付け開始: イベント数=50, WorkItem数=100
[DEBUG] 休暇イベントとして紐付け: 有給休暇 -> 有給休暇WorkItem
[DEBUG] 履歴から紐付け: 定例会議 -> プロジェクトA
[INFO] 自動紐付け完了: 休暇=5, 履歴=30, 未紐付け=15
```

### Python版との対応

| Python関数 | TypeScript関数 | 説明 |
|-----------|---------------|------|
| `get_enable_events()` | `getEnableEvents()` | 有効なイベントを取得 |
| `linking_event_work_item()` | `autoLinkEvents()` | 自動紐付けメイン処理 |
| `input_work_item_id()` | `manualLinkEvent()` | 手動紐付け |

### TODO

- [ ] WorkItem一覧の取得（現在はモック）
- [ ] 手動紐付けUIの実装
- [ ] 紐付け結果のテーブル表示
- [ ] 紐付け履歴の表示（Drawer）
- [ ] 紐付け解除機能
