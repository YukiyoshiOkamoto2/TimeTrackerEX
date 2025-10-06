import {
    Checkbox,
    createTableColumn,
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableCellLayout,
    TableColumnDefinition,
    TableColumnSizingOptions,
    TableHeader,
    TableHeaderCell,
    TableRow,
    tokens,
    useTableColumnSizing_unstable,
    useTableFeatures,
} from "@fluentui/react-components";
import { useMemo } from "react";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        height: "90%",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    selectionCount: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    tableContainer: {
        overflow: "auto",
        position: "relative",
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
    },
    checkboxCell: {
        display: "flex",
        justifyContent: "center",
    },
});

export type CheckedTableItem = {
    key: string;
    content: string;
    checked: boolean;
};

export type CheckedTableProps = {
    items: CheckedTableItem[];
    onItemUpdate: (items: CheckedTableItem[]) => void;
};

const columns: TableColumnDefinition<CheckedTableItem>[] = [
    createTableColumn<CheckedTableItem>({
        columnId: "content",
    }),
    createTableColumn<CheckedTableItem>({
        columnId: "checked",
    }),
];

export function CheckedTable({ items, onItemUpdate }: CheckedTableProps) {
    const styles = useStyles();

    // 選択状態の計算
    const checkedCount = items.filter((item) => item.checked).length;
    const totalCount = items.length;
    const allChecked = totalCount > 0 && checkedCount === totalCount;
    const someChecked = checkedCount > 0 && checkedCount < totalCount;

    const columnSizingOptions = useMemo<TableColumnSizingOptions>(
        () => ({
            content: {
                minWidth: 300,
                defaultWidth: 500,
            },
            checked: {
                minWidth: 64,
                defaultWidth: 64,
                idealWidth: 64,
            },
        }),
        [],
    );

    const { columnSizing_unstable, tableRef } = useTableFeatures(
        {
            columns,
            items,
        },
        [useTableColumnSizing_unstable({ columnSizingOptions })],
    );

    const handleCheckChange = (key: string, checked: boolean) => {
        const newItems = items.map((item) => (item.key === key ? { ...item, checked } : item));
        onItemUpdate(newItems);
    };

    // 全選択/全解除のハンドラ
    const handleSelectAll = (checked: boolean) => {
        const updatedItems = items.map((item) => ({ ...item, checked }));
        onItemUpdate(updatedItems);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.selectionCount}>
                        選択中: {checkedCount}/{totalCount}件
                    </span>
                </div>
                <Checkbox
                    checked={someChecked ? "mixed" : allChecked}
                    onChange={(_, data) => handleSelectAll(data.checked === true)}
                    label="全選択"
                />
            </div>
            <div className={styles.tableContainer}>
                <Table ref={tableRef} {...columnSizing_unstable.getTableProps()}>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell {...columnSizing_unstable.getTableHeaderCellProps("content")}>
                                日付情報
                            </TableHeaderCell>
                            <TableHeaderCell
                                {...columnSizing_unstable.getTableHeaderCellProps("checked")}
                                style={{ textAlign: "center" }}
                            >
                                処理対象
                            </TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell {...columnSizing_unstable.getTableCellProps("content")}>
                                    <TableCellLayout>{item.content}</TableCellLayout>
                                </TableCell>
                                <TableCell {...columnSizing_unstable.getTableCellProps("checked")}>
                                    <TableCellLayout className={styles.checkboxCell}>
                                        <Checkbox
                                            checked={item.checked}
                                            onChange={(_, data) => handleCheckChange(item.key, data.checked as boolean)}
                                        />
                                    </TableCellLayout>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
