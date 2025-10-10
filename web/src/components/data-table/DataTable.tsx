/**
 * DataTable Component
 *
 * Fluent UI DataGridをラップした共通テーブルコンポーネント
 * CheckedTable機能も統合
 */
import {
    Checkbox,
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
} from "@fluentui/react-components";
import { useCallback, useMemo } from "react";

export interface DataTableProps<T> {
    items: T[];
    columns: TableColumnDefinition<T>[];
    getRowId: (item: T) => string;
    sortable?: boolean;
    resizableColumns?: boolean;
    onColumnHeaderClick?: (columnId: string) => void;
    className?: string;
    columnSizingOptions?: Record<string, { minWidth?: number; defaultWidth?: number; idealWidth?: number }>;
    // CheckedTable機能
    selectable?: boolean;
    selectedKeys?: Set<string>;
    onSelectionChange?: (selectedKeys: Set<string>) => void;
}

const useStyles = makeStyles({
    tableContainer: {
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1,
    },
    checkboxCell: {
        display: "flex",
        justifyContent: "flex-end",
        paddingRight: tokens.spacingHorizontalM,
    },
    checkboxHeader: {
        display: "flex",
        justifyContent: "flex-end",
        paddingRight: tokens.spacingHorizontalM,
        fontWeight: tokens.fontWeightSemibold,
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
}: DataTableProps<T>) {
    const styles = useStyles();

    // 選択状態の計算
    const selectionState = useMemo(() => {
        const allChecked = items.length > 0 && selectedKeys.size === items.length;
        const someChecked = selectedKeys.size > 0 && selectedKeys.size < items.length;
        return { allChecked, someChecked };
    }, [items.length, selectedKeys.size]);

    // 全選択/全解除ハンドラ
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (!onSelectionChange) return;

            const newSelection = checked ? new Set(items.map(getRowId)) : new Set<string>();
            onSelectionChange(newSelection);
        },
        [items, getRowId, onSelectionChange],
    );

    // selectableの場合、最終列にチェックボックス列を追加
    const effectiveColumns = useMemo(() => {
        if (!selectable) return columns;

        const selectionColumn: TableColumnDefinition<T> = {
            columnId: "__selection__",
            compare: () => 0,
            renderHeaderCell: () => (
                <div className={styles.checkboxHeader}>
                    <Checkbox
                        checked={selectionState.someChecked ? "mixed" : selectionState.allChecked}
                        onChange={(_, data) => handleSelectAll(data.checked === true)}
                        label="全選択"
                    />
                </div>
            ),
            renderCell: () => null,
        };

        return [...columns, selectionColumn];
    }, [columns, selectable, selectionState, handleSelectAll, styles.checkboxHeader]);

    // 列幅設定を構築
    const columnSizingOptions = useMemo(() => {
        if (customColumnSizingOptions) {
            return selectable
                ? {
                      ...customColumnSizingOptions,
                      __selection__: { minWidth: 120, idealWidth: 120 },
                  }
                : customColumnSizingOptions;
        }

        const options: Record<string, { minWidth: number; idealWidth: number }> = {};
        effectiveColumns.forEach((col) => {
            const columnId = col.columnId as string;
            options[columnId] =
                columnId === "__selection__" ? { minWidth: 80, idealWidth: 80 } : { minWidth: 100, idealWidth: 150 };
        });
        return options;
    }, [effectiveColumns, customColumnSizingOptions, selectable]);

    const { columnSizing_unstable, tableRef } = useTableFeatures(
        {
            columns: effectiveColumns,
            items,
        },
        [
            useTableColumnSizing_unstable({
                columnSizingOptions,
            }),
        ],
    );

    // 個別選択ハンドラ
    const handleSelectItem = (key: string, checked: boolean) => {
        if (!onSelectionChange) return;

        const newSelection = new Set(selectedKeys);
        checked ? newSelection.add(key) : newSelection.delete(key);
        onSelectionChange(newSelection);
    };

    return (
        <div className={className || styles.tableContainer}>
            <DataGrid
                items={items}
                columns={effectiveColumns}
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
                                    onColumnHeaderClick && columnId !== "__selection__"
                                        ? () => onColumnHeaderClick(columnId as string)
                                        : undefined
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
                                {({ renderCell, columnId }) => (
                                    <DataGridCell {...columnSizing_unstable.getTableCellProps(columnId)}>
                                        {selectable && columnId === "__selection__" ? (
                                            <div className={styles.checkboxCell}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={(_, data) =>
                                                        handleSelectItem(key, data.checked as boolean)
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            renderCell(item)
                                        )}
                                    </DataGridCell>
                                )}
                            </DataGridRow>
                        );
                    }}
                </DataGridBody>
            </DataGrid>
        </div>
    );
}
