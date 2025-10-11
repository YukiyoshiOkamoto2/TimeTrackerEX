import { DataTable } from "@/components/data-table";
import type { Event, WorkItem } from "@/types";
import { EventUtils } from "@/types/utils";
import {
    createTableColumn,
    makeStyles,
    TableCellLayout,
    TableColumnDefinition,
    tokens,
    Tooltip,
} from "@fluentui/react-components";
import { Bot20Regular, Calendar20Regular, CircleSmall20Filled, PersonEdit20Regular } from "@fluentui/react-icons";
import { LinkingEventWorkItemPair } from "../models/linking";
import { WorkItemCombobox } from "./WorkItemCombobox";

// イベントテーブル用の型定義
type TableRow = {
    id: string;
    event: Event;
    workItemId: string;
    workItemName: string;
    inputType: string;
};

export type EventTableRow = {
    id: string;
    item: Event | LinkingEventWorkItemPair;
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
        height: "calc(100vh - 540px)",
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
    centeredCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        overflow: "hidden",
    },
    dateTimeCell: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        fontSize: tokens.fontSizeBase300,
    },
    eventNameCell: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        cursor: "help",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textDecorationColor: tokens.colorNeutralForeground3,
        textUnderlineOffset: "2px",
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
});

const columnSizingOptions = {
    dateTime: { minWidth: 150, idealWidth: 200 },
    eventName: { minWidth: 250, idealWidth: 400 },
    inputType: { minWidth: 120, idealWidth: 120 },
    workItemId: { minWidth: 140, idealWidth: 160 },
    workItemName: { minWidth: 250, idealWidth: 400 },
};

// テーブル列定義を生成
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    workItems: WorkItem[],
    onWorkItemChange: (eventId: string, workItemId: string) => void,
): TableColumnDefinition<TableRow>[] {
    return [
        createTableColumn<TableRow>({
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
        createTableColumn<TableRow>({
            columnId: "eventName",
            compare: (a, b) => a.event.name.localeCompare(b.event.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => (
                <TableCellLayout>
                    <Tooltip content={EventUtils.getText(item.event)} relationship="description">
                        <div className={styles.eventNameCell}>{item.event.name}</div>
                    </Tooltip>
                </TableCellLayout>
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "inputType",
            compare: (a, b) => a.inputType.localeCompare(b.inputType),
            renderHeaderCell: () => "入力状況",
            renderCell: (item) => {
                const isAuto = item.inputType !== "手動入力" && item.inputType !== "-";
                const isManual = item.inputType === "手動入力";
                const badgeClass = isAuto ? styles.badgeAuto : isManual ? styles.badgeManual : styles.badgeUnlinked;

                return (
                    <div className={styles.centeredCell}>
                        <span className={`${styles.inputTypeBadge} ${badgeClass}`}>
                            {isAuto ? <Bot20Regular /> : isManual ? <PersonEdit20Regular /> : <CircleSmall20Filled />}
                            {item.inputType}
                        </span>
                    </div>
                );
            },
        }),
        createTableColumn<TableRow>({
            columnId: "workItemId",
            compare: (a, b) => a.workItemId.localeCompare(b.workItemId),
            renderHeaderCell: () => "コード",
            renderCell: (item) => {
                return (
                    <TableCellLayout>
                        <div className={styles.centeredCell}>
                            <WorkItemCombobox
                                workItems={workItems}
                                selectedWorkItemId={item.workItemId}
                                onWorkItemChange={(workItemId) => onWorkItemChange(item.id, workItemId)}
                            />
                        </div>
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<TableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "コード名称",
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

// EventTableRowをTableRowに変換するヘルパー関数
function convertToTableRow(row: EventTableRow): TableRow {
    const { id, item } = row;

    // LinkingEventWorkItemPairの場合
    if ("linkingWorkItem" in item) {
        const pair = item as LinkingEventWorkItemPair;
        const workItem = pair.linkingWorkItem.workItem;

        // inputTypeの決定
        let inputType: string;
        if (pair.linkingWorkItem.type === "manual") {
            inputType = "手動入力";
        } else if (pair.linkingWorkItem.type === "auto") {
            switch (pair.linkingWorkItem.autoMethod) {
                case "ai":
                    inputType = "AI自動";
                    break;
                case "history":
                    inputType = "履歴";
                    break;
                case "workShedule":
                    inputType = "勤務予定";
                    break;
                case "timeOff":
                    inputType = "休暇";
                    break;
                default:
                    inputType = "自動";
            }
        } else {
            inputType = "-";
        }

        const workItemName = workItem.name + " ( " + workItem.folderPath.split("/").pop() + " ) ";
        return {
            id,
            event: pair.event,
            workItemId: workItem.id,
            workItemName,
            inputType,
        };
    }

    // Eventの場合（未紐づけ）
    const event = item as Event;
    return {
        id,
        event,
        workItemId: "",
        workItemName: "未紐づけ",
        inputType: "-",
    };
}

export function EventTable({ events, workItems, onWorkItemChange }: EventTableProps) {
    const styles = useStyles();

    const eventColumns = createEventColumns(styles, workItems, onWorkItemChange);

    // EventTableRowをTableRowに変換
    const tableRows: TableRow[] = events.map(convertToTableRow);

    return (
        <div className={styles.tableWrapper}>
            <div className={styles.tableContainer}>
                <DataTable
                    items={tableRows}
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
