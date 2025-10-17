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
import { memo, useCallback, useMemo } from "react";

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
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1,
        // フェードインアニメーション
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(12px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDelay: "0.3s",
        animationDuration: tokens.durationUltraSlow,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    checkboxCell: {
        display: "flex",
        justifyContent: "flex-end",
        paddingRight: tokens.spacingHorizontalM,
        // ホバーアニメーション
        transition: `background-color ${tokens.durationFast} ${tokens.curveEasyEase}`,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    checkboxHeader: {
        display: "flex",
        fontSize: tokens.fontSizeBase200,
    },
    row: {
        // 行のホバーアニメーション
        transition: `background-color ${tokens.durationFast} ${tokens.curveEasyEase}, transform ${tokens.durationFast} ${tokens.curveEasyEase}`,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            transform: "scale(1.001)",
        },
    },
    cell: {
        // セルのアニメーション
        transition: `background-color ${tokens.durationFaster} ${tokens.curveEasyEase}`,
    },
    headerCell: {
        // ヘッダーセルのホバーアニメーション
        transition: `background-color ${tokens.durationFast} ${tokens.curveEasyEase}, color ${tokens.durationFast} ${tokens.curveEasyEase}`,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorBrandForeground1,
        },
        cursor: "pointer",
    },
});

const selectedColumn = { minWidth: 64, idealWidth: 64 };

/**
 * 汎用DataTableコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - 選択状態の計算をuseMemoで最適化
 * - ハンドラーをuseCallbackでメモ化
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
export const DataTable = memo(function DataTable<T>({
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

    // 選択状態の計算（メモ化）
    const selectionState = useMemo(() => {
        if (!selectable || items.length === 0) {
            return { allChecked: false, someChecked: false };
        }

        const allChecked = selectedKeys.size === items.length;
        const someChecked = selectedKeys.size > 0 && !allChecked;
        return { allChecked, someChecked };
    }, [selectable, items.length, selectedKeys.size]);

    // 全選択/全解除ハンドラ（メモ化）
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (!onSelectionChange) return;

            if (checked) {
                // 全選択：既存のSetを再利用可能な場合は再利用
                const newSelection = new Set(items.map(getRowId));
                onSelectionChange(newSelection);
            } else {
                // 全解除：空のSetを作成
                onSelectionChange(new Set<string>());
            }
        },
        [items, getRowId, onSelectionChange],
    );

    // ヘッダーチェックボックスのレンダリング関数（メモ化）
    const renderHeaderCheckbox = useCallback(
        () => (
            <div className={styles.checkboxHeader}>
                <Checkbox
                    checked={selectionState.someChecked ? "mixed" : selectionState.allChecked}
                    onChange={(_, data) => handleSelectAll(data.checked === true)}
                    // label="全選択"
                />
            </div>
        ),
        [styles.checkboxHeader, selectionState, handleSelectAll],
    );

    // selectableの場合、最終列にチェックボックス列を追加（メモ化）
    const effectiveColumns = useMemo(() => {
        if (!selectable) return columns;

        const selectionColumn: TableColumnDefinition<T> = {
            columnId: "__selection__",
            compare: () => 0,
            renderHeaderCell: renderHeaderCheckbox,
            renderCell: () => null,
        };

        return [...columns, selectionColumn];
    }, [columns, selectable, renderHeaderCheckbox]);

    // 列幅設定を構築（メモ化・最適化）
    const columnSizingOptions = useMemo(() => {
        // カスタム設定がある場合
        if (customColumnSizingOptions) {
            if (!selectable) {
                return customColumnSizingOptions;
            }
            // 選択列を追加
            return {
                ...customColumnSizingOptions,
                __selection__: selectedColumn,
            };
        }

        // デフォルト設定を構築
        const options: Record<string, { minWidth: number; idealWidth: number }> = {};
        for (const col of effectiveColumns) {
            const columnId = col.columnId as string;
            options[columnId] = columnId === "__selection__" ? selectedColumn : { minWidth: 350, idealWidth: 450 };
        }
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

    // 個別選択ハンドラ（メモ化）
    const handleSelectItem = useCallback(
        (key: string, checked: boolean) => {
            if (!onSelectionChange) return;

            const newSelection = new Set(selectedKeys);
            if (checked) {
                newSelection.add(key);
            } else {
                newSelection.delete(key);
            }
            onSelectionChange(newSelection);
        },
        [selectedKeys, onSelectionChange],
    );

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
                        {({ renderHeaderCell, columnId }) => {
                            // クリックハンドラーの最適化
                            const handleClick =
                                onColumnHeaderClick && columnId !== "__selection__"
                                    ? () => onColumnHeaderClick(columnId as string)
                                    : undefined;

                            return (
                                <DataGridHeaderCell
                                    onClick={handleClick}
                                    className={columnId !== "__selection__" ? styles.headerCell : undefined}
                                    {...columnSizing_unstable.getTableHeaderCellProps(columnId)}
                                >
                                    {renderHeaderCell()}
                                </DataGridHeaderCell>
                            );
                        }}
                    </DataGridRow>
                </DataGridHeader>
                <DataGridBody<T>>
                    {({ item, rowId }) => {
                        const key = getRowId(item);
                        const isSelected = selectable ? selectedKeys.has(key) : false;

                        return (
                            <DataGridRow<T> key={rowId} className={styles.row}>
                                {({ renderCell, columnId }) => {
                                    // セル内容の判定を最適化
                                    const isSelectionCell = selectable && columnId === "__selection__";

                                    return (
                                        <DataGridCell
                                            className={styles.cell}
                                            {...columnSizing_unstable.getTableCellProps(columnId)}
                                        >
                                            {isSelectionCell ? (
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
                                    );
                                }}
                            </DataGridRow>
                        );
                    }}
                </DataGridBody>
            </DataGrid>
        </div>
    );
}) as <T>(props: DataTableProps<T>) => JSX.Element;
