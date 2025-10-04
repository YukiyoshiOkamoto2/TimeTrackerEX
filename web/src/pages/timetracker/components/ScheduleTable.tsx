import {
    Combobox,
    createTableColumn,
    makeStyles,
    Option,
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
    useTableSort,
} from "@fluentui/react-components";
import { useMemo } from "react";

const useStyles = makeStyles({
    tableContainer: {
        overflow: "auto",
        position: "relative",
    },
    tableCell: {
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
    },
    inputWithLabel: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    codeNameLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        whiteSpace: "nowrap",
    },
    comboboxInput: {
        width: "150px",
    },
    readonlyLabel: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightMedium,
    },
});

export type ScheduleItem = {
    date: string;
    time: string;
    name: string;
    organizer: string;
};

export type ItemCodeOption = {
    code: string;
    name: string;
};

export type ItemCodeDisplayMode = "editable" | "readonly";

export type ScheduleTableProps = {
    schedules: ScheduleItem[];
    itemCodes: string[];
    itemCodeOptions: ItemCodeOption[];
    itemCodeMode?: ItemCodeDisplayMode;
    onItemCodeChange?: (rowIndex: number, value: string) => void;
};

type ScheduleItemWithCode = ScheduleItem & { itemCode?: string };

const columns: TableColumnDefinition<ScheduleItemWithCode>[] = [
    createTableColumn<ScheduleItemWithCode>({
        columnId: "date",
        compare: (a, b) => a.date.localeCompare(b.date),
    }),
    createTableColumn<ScheduleItemWithCode>({
        columnId: "time",
        compare: (a, b) => a.time.localeCompare(b.time),
    }),
    createTableColumn<ScheduleItemWithCode>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name),
    }),
    createTableColumn<ScheduleItemWithCode>({
        columnId: "organizer",
        compare: (a, b) => a.organizer.localeCompare(b.organizer),
    }),
    createTableColumn<ScheduleItemWithCode>({
        columnId: "itemCode",
        compare: (a, b) => (a.itemCode || "").localeCompare(b.itemCode || ""),
    }),
];

export function ScheduleTable({
    schedules,
    itemCodes,
    itemCodeOptions,
    itemCodeMode = "editable",
    onItemCodeChange,
}: ScheduleTableProps) {
    const styles = useStyles();

    // Merge schedules with itemCodes for sorting
    const schedulesWithCodes = useMemo<ScheduleItemWithCode[]>(
        () =>
            schedules.map((schedule, index) => ({
                ...schedule,
                itemCode: itemCodes[index] || "",
            })),
        [schedules, itemCodes],
    );

    const columnSizingOptions = useMemo<TableColumnSizingOptions>(
        () => ({
            date: {
                minWidth: 100,
                defaultWidth: 100,
                idealWidth: 100,
            },
            time: {
                minWidth: 140,
                defaultWidth: 140,
                idealWidth: 140,
            },
            name: {
                minWidth: 250,
                defaultWidth: 300,
            },
            organizer: {
                minWidth: 150,
                defaultWidth: 200,
            },
            itemCode: {
                minWidth: 300,
                defaultWidth: 300,
            },
        }),
        [],
    );

    const {
        getRows,
        sort: { getSortDirection, toggleColumnSort, sort },
        columnSizing_unstable,
        tableRef,
    } = useTableFeatures(
        {
            columns,
            items: schedulesWithCodes,
        },
        [
            useTableColumnSizing_unstable({ columnSizingOptions }),
            useTableSort({
                defaultSortState: { sortColumn: "date", sortDirection: "ascending" },
            }),
        ],
    );

    const getCodeName = (code: string) => {
        if (!code) return "";
        const option = itemCodeOptions.find((opt) => opt.code === code);
        return option ? option.name : "";
    };

    const handleItemCodeSelect = (rowIndex: number, value: string) => {
        if (onItemCodeChange) {
            onItemCodeChange(rowIndex, value);
        }
    };

    const handleItemCodeInputChange = (rowIndex: number, value: string) => {
        if (onItemCodeChange) {
            onItemCodeChange(rowIndex, value);
        }
    };

    const rows = sort(getRows());

    const renderItemCodeCell = (index: number) => {
        if (itemCodeMode === "readonly") {
            return (
                <div className={styles.inputWithLabel}>
                    <span className={styles.readonlyLabel}>{itemCodes[index] || "-"}</span>
                    {getCodeName(itemCodes[index]) && (
                        <span className={styles.codeNameLabel}>({getCodeName(itemCodes[index])})</span>
                    )}
                </div>
            );
        }

        return (
            <div className={styles.inputWithLabel}>
                <Combobox
                    placeholder="選択または入力"
                    value={itemCodes[index] || ""}
                    onOptionSelect={(_, data) => handleItemCodeSelect(index, data.optionValue || "")}
                    onChange={(e) => handleItemCodeInputChange(index, e.target.value)}
                    className={styles.comboboxInput}
                >
                    {itemCodeOptions.map((option) => (
                        <Option key={option.code} value={option.code} text={`${option.code} - ${option.name}`}>
                            {option.code} - {option.name}
                        </Option>
                    ))}
                </Combobox>
                {getCodeName(itemCodes[index]) && (
                    <span className={styles.codeNameLabel}>{getCodeName(itemCodes[index])}</span>
                )}
            </div>
        );
    };

    return (
        <div className={styles.tableContainer}>
            <Table sortable aria-label="スケジュール一覧" ref={tableRef} {...columnSizing_unstable.getTableProps()}>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => {
                            const isItemCodeSortable = column.columnId === "itemCode" && itemCodeMode === "readonly";
                            const isSortable = column.columnId !== "itemCode" || isItemCodeSortable;

                            return (
                                <TableHeaderCell
                                    key={column.columnId}
                                    {...columnSizing_unstable.getTableHeaderCellProps(column.columnId)}
                                    sortDirection={isSortable ? getSortDirection(column.columnId) : undefined}
                                    onClick={
                                        isSortable
                                            ? (e: React.MouseEvent) => toggleColumnSort(e, column.columnId)
                                            : undefined
                                    }
                                >
                                    {column.columnId === "date" && "日時"}
                                    {column.columnId === "time" && "スケジュール時間"}
                                    {column.columnId === "name" && "スケジュール名"}
                                    {column.columnId === "organizer" && "開催者"}
                                    {column.columnId === "itemCode" && "Itemコード"}
                                </TableHeaderCell>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ item }, index) => (
                        <TableRow key={index}>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("date")}
                            >
                                <TableCellLayout>{item.date}</TableCellLayout>
                            </TableCell>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("time")}
                            >
                                <TableCellLayout>{item.time}</TableCellLayout>
                            </TableCell>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("name")}
                            >
                                <TableCellLayout>{item.name}</TableCellLayout>
                            </TableCell>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("organizer")}
                            >
                                <TableCellLayout>{item.organizer}</TableCellLayout>
                            </TableCell>
                            <TableCell
                                className={styles.tableCell}
                                {...columnSizing_unstable.getTableCellProps("itemCode")}
                            >
                                {renderItemCodeCell(index)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
