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
    tableContainer: {
        overflow: "auto",
        position: "relative",
    },
    tableCell: {
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalM,
    },
    checkboxCell: {
        display: "flex",
        justifyContent: "center",
    },
});

export type CheckedTableItem = {
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

    const columnSizingOptions = useMemo<TableColumnSizingOptions>(
        () => ({
            content: {
                minWidth: 300,
                defaultWidth: 500,
            },
            checked: {
                minWidth: 100,
                defaultWidth: 100,
                idealWidth: 100,
            },
        }),
        []
    );

    const { getRows, columnSizing_unstable, tableRef } = useTableFeatures(
        {
            columns,
            items,
        },
        [useTableColumnSizing_unstable({ columnSizingOptions })]
    );

    const handleCheckChange = (index: number, checked: boolean) => {
        const newItems = items.map((item, i) =>
            i === index ? { ...item, checked } : item
        );
        onItemUpdate(newItems);
    };

    const rows = getRows();

    return (
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
                    {rows.map(({ item }, index) => (
                        <TableRow key={index}>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("content")}
                            >
                                <TableCellLayout>{item.content}</TableCellLayout>
                            </TableCell>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("checked")}
                            >
                                <TableCellLayout className={styles.checkboxCell}>
                                    <Checkbox
                                        checked={item.checked}
                                        onChange={(_, data) =>
                                            handleCheckChange(index, data.checked as boolean)
                                        }
                                    />
                                </TableCellLayout>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
