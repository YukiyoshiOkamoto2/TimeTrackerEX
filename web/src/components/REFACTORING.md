# Components Refactoring Summary

## リファクタリング内容

### 1. ✅ DataTableとCheckedTableの統合

**変更内容:**
- `CheckedTable`の機能を`DataTable`に統合
- `DataTable`に選択機能を追加（`selectable`プロパティ）
- `checked-table`ディレクトリを削除

**DataTableの新機能:**
```typescript
export interface DataTableProps<T> {
    // 既存のプロパティ
    items: T[];
    columns: TableColumnDefinition<T>[];
    getRowId: (item: T) => string;
    sortable?: boolean;
    resizableColumns?: boolean;
    
    // 新規追加: 選択機能
    selectable?: boolean;
    selectedKeys?: Set<string>;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
    selectionHeader?: string;
}
```

**使用例:**
```typescript
<DataTable
    items={items}
    columns={columns}
    getRowId={(item) => item.key}
    selectable
    selectedKeys={selectedKeys}
    onSelectionChange={setSelectedKeys}
    selectionHeader="選択中"
/>
```

**移行完了:**
- ✅ `FileUploadView.tsx`で`CheckedTable`から`DataTable`に移行
- ✅ 選択状態の管理を`checked`プロパティから`selectedKeys` Setに変更
- ✅ デフォルトで全選択状態で初期化
- ✅ `checked-table`ディレクトリ削除

### 2. ✅ StatCardの保持

**理由:**
- `HistoryDrawer`コンポーネントで使用されており、独自の価値がある
- 統計情報を表示する専用コンポーネントとして機能

**使用箇所:**
```typescript
// HistoryDrawer.tsx
<StatCard icon={<History24Regular />} label="総件数" value={historyData.length} unit="件" />
<StatCard icon={<CheckmarkCircle24Regular />} label="選択中" value={selectedKeys.size} unit="件" />
```

## 成果

### コード削減
- `CheckedTable`コンポーネント: 167行削除
- 重複機能の統合により保守性向上

### 機能向上
- `DataTable`が選択機能を持つことで、より汎用的に使用可能
- 単一コンポーネントで選択あり/なしの両方に対応

### 保守性向上
- テーブルコンポーネントが1つに統合され、変更が容易に
- 型安全性の向上（`Set<string>`による選択管理）

## アーキテクチャ

```
src/components/
├── card/              - 汎用カードコンポーネント
├── data-table/        - 統合テーブルコンポーネント（選択機能付き）★
├── editor/            - エディターコンポーネント
├── interactive-card/  - インタラクティブカード
├── message-dialog/    - メッセージダイアログ
├── page/              - ページコンテナ
├── stat-card/         - 統計カードコンポーネント★
└── validated-input/   - バリデーション付き入力
```

★ = 今回のリファクタリング対象

## 今後の展開

### DataTableの機能拡張候補
- ソート機能の強化
- フィルター機能の追加
- ページネーション対応
- 行の複数選択モード（Shift+クリックなど）

### StatCardの拡張候補
- グラフ表示機能
- トレンド表示（前回比など）
- クリックアクション対応
