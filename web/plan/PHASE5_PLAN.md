# Phase 5: LinkingProcessView UI改善 - 実装計画

**開始日**: 2025年10月9日  
**ステータス**: 🔄 進行中

---

## 📋 目標

LinkingProcessViewに以下の機能を追加し、ユーザーが紐づけ結果を確認・編集できるようにする:

1. **自動紐づけ結果の表示**: 統計情報（紐づけ済み/未紐づけ件数）
2. **紐づけ済みイベント一覧**: 自動紐づけされたイベントの確認
3. **未紐づけイベント一覧**: 手動紐づけが必要なイベント
4. **手動紐づけ機能**: ドロップダウンでWorkItemを選択
5. **紐づけ結果の確認**: CompletionViewへデータを渡す

---

## 🎯 実装タスク

### Task 1: 自動紐づけ結果の統計表示

**実装内容**:
- 紐づけ済み件数（休暇イベント/履歴から）
- 未紐づけ件数
- 有給休暇タスク件数
- 通常タスク日数

**UI**:
- `InteractiveCard`を使用
- アイコン付きの統計表示

### Task 2: 紐づけ済みイベント一覧テーブル

**実装内容**:
- `DataGrid`コンポーネントを使用
- 列: イベント名、開始時刻、終了時刻、WorkItem名、紐づけ元

**機能**:
- ソート機能
- フィルタリング（休暇/履歴）

### Task 3: 未紐づけイベント一覧テーブル

**実装内容**:
- `DataGrid`コンポーネントを使用
- 列: イベント名、開始時刻、終了時刻、WorkItem選択（Dropdown）

**機能**:
- WorkItem選択（必須）
- 選択後に自動的に紐づけ済みに移動

### Task 4: 手動紐づけ機能

**実装内容**:
- `Dropdown`コンポーネントでWorkItem選択
- 選択後に`EventWorkItemPair`を生成
- HistoryManagerに保存

**状態管理**:
```typescript
const [manuallyLinkedPairs, setManuallyLinkedPairs] = useState<EventWorkItemPair[]>([]);
const [selectedWorkItems, setSelectedWorkItems] = useState<Map<string, WorkItem>>(new Map());
```

### Task 5: 次へボタンの有効化制御

**実装内容**:
- 全イベントが紐づけられている場合のみ有効
- 未紐づけがある場合は警告メッセージ

---

## 📊 データフロー

```
自動紐づけ実行 (useEffect)
  ↓
linkingResult: {
  linked: EventWorkItemPair[],  // 紐づけ済み
  unlinked: Event[],             // 未紐づけ
  timeOffCount: number,
  historyCount: number
}
  ↓
ユーザー操作: 未紐づけイベントにWorkItemを選択
  ↓
manuallyLinkedPairs に追加
  ↓
allLinkedPairs = [...linkingResult.linked, ...manuallyLinkedPairs]
  ↓
CompletionView へ渡す
```

---

## 🎨 UI設計

### 1. 統計カード
```
┌─────────────────────────────────────┐
│ 📊 自動紐づけ結果                     │
│                                     │
│ ✅ 紐づけ済み: 42件                  │
│   • 休暇イベント: 5件                │
│   • 履歴から: 37件                   │
│                                     │
│ ❌ 未紐づけ: 8件                     │
│                                     │
│ 📅 有給休暇タスク: 3日分             │
│ 📅 通常タスク: 20日分                │
└─────────────────────────────────────┘
```

### 2. 紐づけ済みイベント一覧
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ 紐づけ済みイベント (42件)                                  │
├──────────┬──────────┬──────────┬──────────────┬───────────┤
│ イベント名 │ 開始時刻 │ 終了時刻 │ WorkItem     │ 紐づけ元   │
├──────────┼──────────┼──────────┼──────────────┼───────────┤
│ 有給休暇   │ 09:00    │ 18:00    │ 有給休暇     │ 休暇イベント│
│ 会議       │ 10:00    │ 11:00    │ 会議・打合せ │ 履歴       │
│ ...        │ ...      │ ...      │ ...          │ ...       │
└──────────┴──────────┴──────────┴──────────────┴───────────┘
```

### 3. 未紐づけイベント一覧
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ 未紐づけイベント (8件) - WorkItemを選択してください        │
├──────────┬──────────┬──────────┬──────────────────────────┤
│ イベント名 │ 開始時刻 │ 終了時刻 │ WorkItem選択             │
├──────────┼──────────┼──────────┼──────────────────────────┤
│ 新規会議   │ 14:00    │ 15:00    │ [WorkItem選択▼]          │
│ レビュー   │ 16:00    │ 17:00    │ [WorkItem選択▼]          │
│ ...        │ ...      │ ...      │ ...                      │
└──────────┴──────────┴──────────┴──────────────────────────┘
```

---

## ✅ 完了条件

- [ ] Task 1: 統計表示実装完了
- [ ] Task 2: 紐づけ済みイベント一覧実装完了
- [ ] Task 3: 未紐づけイベント一覧実装完了
- [ ] Task 4: 手動紐づけ機能実装完了
- [ ] Task 5: 次へボタン制御実装完了
- [ ] 全UIコンポーネントが正しく表示される
- [ ] 手動紐づけが正常に動作する
- [ ] CompletionViewへの遷移が正常に動作する

---

## 📝 実装メモ

### 使用コンポーネント
- `DataGrid` (Fluent UI): イベント一覧表示
- `Dropdown`: WorkItem選択
- `InteractiveCard`: 統計情報表示
- `Card`: 情報カード

### 状態管理
```typescript
// 自動紐づけ結果
const [linkingResult, setLinkingResult] = useState<AutoLinkingResult | null>(null);

// 手動紐づけ結果
const [manuallyLinkedPairs, setManuallyLinkedPairs] = useState<EventWorkItemPair[]>([]);

// 全紐づけ結果
const allLinkedPairs = useMemo(() => {
    return [...(linkingResult?.linked || []), ...manuallyLinkedPairs];
}, [linkingResult, manuallyLinkedPairs]);

// 残りの未紐づけイベント
const remainingUnlinkedEvents = useMemo(() => {
    const manuallyLinkedEventIds = new Set(manuallyLinkedPairs.map(p => p.event.uuid || p.event.name));
    return (linkingResult?.unlinked || []).filter(
        e => !manuallyLinkedEventIds.has(e.uuid || e.name)
    );
}, [linkingResult, manuallyLinkedPairs]);
```

---

**次のステップ**: Task 1から順番に実装していく
