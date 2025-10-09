# DataTable Component

Fluent UI DataGridをラップした共通テーブルコンポーネント。

## 概要

`DataTable`は、アプリケーション全体で一貫したテーブル表示を提供するための共通コンポーネントです。Fluent UI v9の`DataGrid`をベースに、標準的なテーブルパターンを実装しています。

## 機能

- **型安全性**: TypeScriptジェネリクスによる完全な型サポート
- **ソート**: 列ヘッダークリックによるソート（オプション）
- **リサイズ**: 列幅の変更（オプション）
- **統一されたスタイリング**: Fluent UIトークンによる一貫したデザイン
- **カスタマイズ可能**: カスタムスタイルの適用が可能

## 使用方法

### 基本的な使用例

```tsx
import { DataTable } from "@/components/data-table";
import { createTableColumn, TableCellLayout } from "@fluentui/react-components";

type User = {
    id: string;
    name: string;
    email: string;
};

const columns = [
    createTableColumn<User>({
        columnId: "name",
        renderHeaderCell: () => "名前",
        renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
    }),
    createTableColumn<User>({
        columnId: "email",
        renderHeaderCell: () => "メールアドレス",
        renderCell: (item) => <TableCellLayout>{item.email}</TableCellLayout>,
    }),
];

function UserList({ users }: { users: User[] }) {
    return (
        <DataTable
            items={users}
            columns={columns}
            getRowId={(item) => item.id}
            sortable
        />
    );
}
```

### ソート機能付き

```tsx
const handleColumnHeaderClick = (columnId: string) => {
    // ソート処理を実装
    if (sortField === columnId) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
        setSortField(columnId);
        setSortDirection("desc");
    }
};

<DataTable
    items={sortedData}
    columns={columns}
    getRowId={(item) => item.id}
    sortable
    onColumnHeaderClick={handleColumnHeaderClick}
/>
```

### カスタムスタイル

```tsx
const useStyles = makeStyles({
    customTable: {
        maxHeight: "500px",
        overflow: "auto",
    },
});

const styles = useStyles();

<DataTable
    items={data}
    columns={columns}
    getRowId={(item) => item.id}
    className={styles.customTable}
/>
```

## Props

| Prop | 型 | 必須 | 説明 |
|------|-----|------|------|
| `items` | `T[]` | ✅ | テーブルに表示するデータ配列 |
| `columns` | `TableColumnDefinition<T>[]` | ✅ | Fluent UIの列定義配列 |
| `getRowId` | `(item: T) => string` | ✅ | 各行の一意なIDを返す関数 |
| `sortable` | `boolean` | ❌ | ソート機能の有効化（デフォルト: false） |
| `resizableColumns` | `boolean` | ❌ | 列リサイズの有効化（デフォルト: false） |
| `onColumnHeaderClick` | `(columnId: string) => void` | ❌ | 列ヘッダークリック時のコールバック |
| `className` | `string` | ❌ | カスタムCSSクラス名 |

## 列定義の例

### 基本的な列

```tsx
createTableColumn<T>({
    columnId: "name",
    renderHeaderCell: () => "名前",
    renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
})
```

### ソート対応列

```tsx
createTableColumn<T>({
    columnId: "date",
    compare: (a, b) => a.date.localeCompare(b.date),
    renderHeaderCell: () => (
        <TableCellLayout>
            日付 {sortField === "date" && (sortDirection === "asc" ? " ↑" : " ↓")}
        </TableCellLayout>
    ),
    renderCell: (item) => <TableCellLayout>{item.date}</TableCellLayout>,
})
```

### アイコン付き列

```tsx
import { Link24Regular } from "@fluentui/react-icons";

createTableColumn<T>({
    columnId: "status",
    renderHeaderCell: () => "ステータス",
    renderCell: (item) => (
        <TableCellLayout media={<Link24Regular />}>
            {item.status}
        </TableCellLayout>
    ),
})
```

### チェックボックス列

```tsx
import { Checkbox } from "@fluentui/react-components";

createTableColumn<T>({
    columnId: "checkbox",
    renderHeaderCell: () => (
        <Checkbox
            checked={selectedKeys.size === items.length}
            onChange={handleSelectAll}
        />
    ),
    renderCell: (item) => (
        <Checkbox
            checked={selectedKeys.has(item.id)}
            onChange={() => handleToggle(item.id)}
        />
    ),
})
```

## スタイリング

### デフォルトスタイル

- Border: `colorNeutralStroke2`
- Border Radius: `borderRadiusMedium`
- Background: `colorNeutralBackground1`
- Overflow: `hidden`

### カスタマイズ

`className` propを使用してカスタムスタイルを適用できます：

```tsx
const useStyles = makeStyles({
    compactTable: {
        maxHeight: "400px",
        overflow: "auto",
        "& .fui-DataGridRow": {
            height: "32px",
        },
    },
});
```

## 使用例（実際のコード）

### DetailDialog での使用

```tsx
<DataTable
    items={paidLeaveRows}
    columns={paidLeaveColumns}
    getRowId={(item) => item.id}
    sortable
/>
```

### HistoryDrawer での使用

```tsx
<DataTable
    items={sortedData}
    columns={columns}
    getRowId={(item) => item.key}
    sortable
    onColumnHeaderClick={handleColumnHeaderClick}
/>
```

## デザインガイドライン

1. **一貫性**: すべてのテーブルで同じコンポーネントを使用
2. **シンプル**: 複雑なカスタマイズは避け、標準的なパターンを使用
3. **パフォーマンス**: 大量データの場合は仮想化を検討
4. **アクセシビリティ**: Fluent UIのアクセシビリティ機能を活用

## 関連コンポーネント

- `StatCard`: 統計情報の表示
- Fluent UI `DataGrid`: ベースとなるコンポーネント

## 注意事項

- `getRowId`は必ず一意な値を返す必要があります
- 大量データ（1000件以上）の場合はパフォーマンスに注意
- 列定義は再レンダリングを避けるため、useMemoで最適化することを推奨
