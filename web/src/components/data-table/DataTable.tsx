/**
 * DataTable Component
 *
 * Fluent UI DataGridをラップした共通テーブルコンポーネント
 * CheckedTable機能も統合
 */
import {
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    TableColumnDefinition,
    makeStyles,
    tokens,
    useTableColumnSizing_unstable,
    useTableFeatures,
    Checkbox,
} from "@fluentui/react-components";
import { useMemo } from "react";

export interface DataTableProps<T> {
    items: T[];
    columns: TableColumnDefinition<T>[];
    getRowId: (item: T) => string;
    sortable?: boolean;
    resizableColumns?: boolean;
    onColumnHeaderClick?: (columnId: string) => void;
    className?: string;
    columnSizingOptions?: Record<string, { minWidth: number; defaultWidth?: number; idealWidth?: number }>;
    // CheckedTable機能
    selectable?: boolean;
    selectedKeys?: Set<string>;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
    selectionHeader?: string;
}

const useStyles = makeStyles({
    tableContainer: {
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1,
    },
    selectableContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
    selectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: tokens.spacingVerticalS,
    },
    selectionCount: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    checkboxCell: {
        display: "flex",
        justifyContent: "center",
    },
});

/**
 * 汎用DataTableコンポーネント
 *
 * @example
 * ```tsx
 * <DataTable
 *   items={data}
 *   columns={columns}
 *   getRowId={(item) => item.id}
 *   sortable
 * />
 * ```
 */
export function DataTable<T>({
    items,
    columns,
    getRowId,
    sortable = false,
    resizableColumns = false,
    onColumnHeaderClick,
    className,
    columnSizingOptions: customColumnSizingOptions,
    selectable = false,
    selectedKeys = new Set<string>(),
    onSelectionChange,
    selectionHeader,
}: DataTableProps<T>) {
    const styles = useStyles();

    // 列のデフォルト幅設定
    const columnSizingOptions = useMemo(() => {
        if (customColumnSizingOptions) {
            return customColumnSizingOptions;
        }
        
        const options: Record<string, { minWidth: number; defaultWidth?: number; idealWidth?: number }> = {};
        columns.forEach((col) => {
            const columnId = col.columnId as string;
            options[columnId] = {
                minWidth: 100,
                idealWidth: 150,
            };
        });
        return options;
    }, [columns, customColumnSizingOptions]);

    const { columnSizing_unstable, tableRef } = useTableFeatures(
        {
            columns,
            items,
        },
        [
            useTableColumnSizing_unstable({
                columnSizingOptions,
            }),
        ],
    );

    // 選択機能用のハンドラ
    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            const allKeys = new Set(items.map((item) => getRowId(item)));
            onSelectionChange(allKeys);
        } else {
            onSelectionChange(new Set());
        }
    };

    const handleSelectItem = (key: string, checked: boolean) => {
        if (!onSelectionChange) return;
        const newSelection = new Set(selectedKeys);
        if (checked) {
            newSelection.add(key);
        } else {
            newSelection.delete(key);
        }
        onSelectionChange(newSelection);
    };

    const allChecked = items.length > 0 && selectedKeys.size === items.length;
    const someChecked = selectedKeys.size > 0 && selectedKeys.size < items.length;

    const containerClass = selectable ? styles.selectableContainer : (className || styles.tableContainer);

    return (
        <div className={containerClass}>
            {selectable && (
                <div className={styles.selectionHeader}>
                    <span className={styles.selectionCount}>
                        {selectionHeader || "選択中"}: {selectedKeys.size}/{items.length}件
                    </span>
                    <Checkbox
                        checked={someChecked ? "mixed" : allChecked}
                        onChange={(_, data) => handleSelectAll(data.checked === true)}
                        label="全選択"
                    />
                </div>
            )}
            <div className={className || styles.tableContainer}>
                <DataGrid
                    items={items}
                    columns={columns}
                    sortable={sortable}
                    resizableColumns={resizableColumns}
                    getRowId={getRowId}
                    {...columnSizing_unstable.getTableProps()}
                    ref={tableRef}
                >
                    <DataGridHeader>
                        <DataGridRow>
                            {({ renderHeaderCell, columnId }) => (
                                <DataGridHeaderCell
                                    onClick={
                                        onColumnHeaderClick ? () => onColumnHeaderClick(columnId as string) : undefined
                                    }
                                    {...columnSizing_unstable.getTableHeaderCellProps(columnId)}
                                >
                                    {renderHeaderCell()}
                                </DataGridHeaderCell>
                            )}
                        </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<T>>
                        {({ item, rowId }) => {
                            const key = getRowId(item);
                            const isSelected = selectedKeys.has(key);
                            
                            return (
                                <DataGridRow<T> key={rowId}>
                                    {({ renderCell, columnId }) => {
                                        // 選択用のチェックボックス列
                                        if (selectable && columnId === "__selection__") {
                                            return (
                                                <DataGridCell {...columnSizing_unstable.getTableCellProps(columnId)}>
                                                    <div className={styles.checkboxCell}>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onChange={(_, data) => handleSelectItem(key, data.checked as boolean)}
                                                        />
                                                    </div>
                                                </DataGridCell>
                                            );
                                        }
                                        
                                        return (
                                            <DataGridCell {...columnSizing_unstable.getTableCellProps(columnId)}>
                                                {renderCell(item)}
                                            </DataGridCell>
                                        );
                                    }}
                                </DataGridRow>
                            );
                        }}
                    </DataGridBody>
                </DataGrid>
            </div>
        </div>
    );
}
