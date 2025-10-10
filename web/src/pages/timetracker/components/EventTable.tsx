import { DataTable } from "@/components/data-table";
import { getMostNestChildren } from "@/types/utils";
import type { Event, WorkItem } from "@/types";
import {
    makeStyles,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    tokens,
    Combobox,
    Option,
} from "@fluentui/react-components";
import {
    Calendar20Regular,
    CircleSmall20Filled,
    Checkmark20Filled,
    Bot20Regular,
    PersonEdit20Regular,
} from "@fluentui/react-icons";

// イベントテーブル用の型定義
export type EventTableRow = {
    id: string;
    event: Event;
    workItemId: string;
    workItemName: string;
    inputType: string;
};

export type EventTableProps = {
    events: EventTableRow[];
    workItems: WorkItem[];
    onWorkItemChange: (eventId: string, workItemId: string) => void;
};

const useStyles = makeStyles({
    // テーブル
    tableWrapper: {
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 520px)",
        minHeight: "300px",
    },
    tableContainer: {
        flex: 1,
        overflow: "auto",
        backgroundColor: tokens.colorNeutralBackground1,
    },
    // テーブルセル（共通スタイル）
    cellWithIcon: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    dateTimeCell: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        fontSize: tokens.fontSizeBase200,
    },
    eventNameCell: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    // バッジ（共通スタイル）
    inputTypeBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: tokens.borderRadiusSmall,
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
    },
    badgeAuto: {
        backgroundColor: tokens.colorPaletteBlueBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeManual: {
        backgroundColor: tokens.colorPaletteGreenBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeUnlinked: {
        backgroundColor: tokens.colorNeutralBackground5,
        color: tokens.colorNeutralForeground3,
    },
    // アイコン
    linkedIcon: {
        color: tokens.colorPaletteGreenForeground2,
        fontSize: "16px",
    },
});

const columnSizingOptions = {
    dateTime: { minWidth: 150, idealWidth: 200 },
    eventName: { minWidth: 200, idealWidth: 300 },
    inputType: { minWidth: 120, idealWidth: 120 },
    workItemId: { minWidth: 250, idealWidth: 250 },
    workItemName: { minWidth: 250, idealWidth: 300 },
}

// テーブル列定義を生成
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    workItems: WorkItem[],
    onWorkItemChange: (eventId: string, workItemId: string) => void,
): TableColumnDefinition<EventTableRow>[] {
    // 最下層のWorkItemを取得
    const workItemOptions = workItems.flatMap((w) => getMostNestChildren(w));

    return [
        createTableColumn<EventTableRow>({
            columnId: "dateTime",
            compare: (a, b) => a.event.schedule.start.getTime() - b.event.schedule.start.getTime(),
            renderHeaderCell: () => "日時",
            renderCell: (item) => (
                <TableCellLayout>
                    <div className={styles.dateTimeCell}>
                        <Calendar20Regular />
                        <div>
                            {item.event.schedule.start.toLocaleDateString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                                weekday: "short",
                            })}{" "}
                            {item.event.schedule.start.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            ~
                            {item.event.schedule.end?.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </TableCellLayout>
            ),
        }),
        createTableColumn<EventTableRow>({
            columnId: "eventName",
            compare: (a, b) => a.event.name.localeCompare(b.event.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => (
                <TableCellLayout>
                    <div className={styles.eventNameCell}>{item.event.name}</div>
                </TableCellLayout>
            ),
        }),
        createTableColumn<EventTableRow>({
            columnId: "inputType",
            compare: (a, b) => a.inputType.localeCompare(b.inputType),
            renderHeaderCell: () => "入力依存",
            renderCell: (item) => {
                const isAuto = item.inputType !== "手動入力" && item.inputType !== "-";
                const isManual = item.inputType === "手動入力";
                const badgeClass = isAuto
                    ? styles.badgeAuto
                    : isManual
                        ? styles.badgeManual
                        : styles.badgeUnlinked;

                return (
                    <TableCellLayout>
                        <span className={`${styles.inputTypeBadge} ${badgeClass}`}>
                            {isAuto ? <Bot20Regular /> : isManual ? <PersonEdit20Regular /> : <CircleSmall20Filled />}
                            {item.inputType}
                        </span>
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<EventTableRow>({
            columnId: "workItemId",
            compare: (a, b) => a.workItemId.localeCompare(b.workItemId),
            renderHeaderCell: () => "WorkItemId",
            renderCell: (item) => {
                const selectedOption = workItemOptions.find((w) => w.id === item.workItemId);

                return (
                    <TableCellLayout>
                        <Combobox
                            placeholder="WorkItemを選択"
                            value={selectedOption ? `${selectedOption.id} - ${selectedOption.name}` : ""}
                            selectedOptions={item.workItemId ? [item.workItemId] : []}
                            onOptionSelect={(_, data) => {
                                if (data.optionValue) {
                                    onWorkItemChange(item.id, data.optionValue);
                                }
                            }}
                            style={{ minWidth: "200px" }}
                        >
                            {workItemOptions.map((workItem) => (
                                <Option key={workItem.id} value={workItem.id} text={`${workItem.id} - ${workItem.name}`}>
                                    <div className={styles.cellWithIcon}>
                                        <Checkmark20Filled className={styles.linkedIcon} />
                                        {workItem.id} - {workItem.name}
                                    </div>
                                </Option>
                            ))}
                        </Combobox>
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<EventTableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "WorkItem名",
            renderCell: (item) => (
                <TableCellLayout>
                    <div
                        style={{
                            color: item.workItemName === "未紐づけ" ? tokens.colorNeutralForeground3 : undefined,
                            fontWeight: item.workItemName === "未紐づけ" ? undefined : tokens.fontWeightSemibold,
                        }}
                    >
                        {item.workItemName}
                    </div>
                </TableCellLayout>
            ),
        }),
    ];
}

export function EventTable({ events, workItems, onWorkItemChange }: EventTableProps) {
    const styles = useStyles();

    const eventColumns = createEventColumns(styles, workItems, onWorkItemChange);

    return (
        <div className={styles.tableWrapper}>
            <div className={styles.tableContainer}>
                <DataTable
                    items={events}
                    columns={eventColumns}
                    getRowId={(item) => item.id}
                    sortable
                    resizableColumns
                    columnSizingOptions={columnSizingOptions}
                />
            </div>
        </div>
    );
}
