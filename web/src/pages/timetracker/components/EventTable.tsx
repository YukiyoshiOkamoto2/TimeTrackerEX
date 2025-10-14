import { DataTable } from "@/components/data-table";
import { formatDateTime } from "@/lib/dateUtil";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import {
    Button,
    createTableColumn,
    makeStyles,
    TableCellLayout,
    TableColumnDefinition,
    tokens,
    Tooltip,
} from "@fluentui/react-components";
import {
    Bot20Regular,
    Calendar20Regular,
    CalendarClock20Regular,
    CircleSmall20Filled,
    Edit20Regular,
    History20Regular,
    PersonEdit20Regular,
    WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { LinkingEventWorkItemPair } from "../models";
import { WorkItemTreeViewDialog } from "./WorkItemTreeViewDialog";

// イベントテーブル用の型定義
type TableRow = {
    event: EventWithOption;
    workItemId: string;
    workItemName: string;
    inputType: string;
};

export type EventWithOption = {
    oldSchedule?: Schedule;
} & Event;

export type EventTableRow = {
    item: EventWithOption | LinkingEventWorkItemPair;
};

export type EventTableProps = {
    events: EventTableRow[];
    workItems: WorkItem[];
    onWorkItemChange: (eventId: string, workItemId: string) => void;
};

const useStyles = makeStyles({
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
    inputTypeBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: tokens.borderRadiusSmall,
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
    },
    badgeManual: {
        backgroundColor: tokens.colorPaletteGreenBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeAI: {
        backgroundColor: tokens.colorPaletteBlueBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeHistory: {
        backgroundColor: tokens.colorPalettePurpleBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeWorkSchedule: {
        backgroundColor: tokens.colorPaletteTealBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeTimeOff: {
        backgroundColor: tokens.colorPaletteDarkOrangeBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeAuto: {
        backgroundColor: tokens.colorPaletteLightGreenBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeUnlinked: {
        backgroundColor: tokens.colorNeutralBackground5,
        color: tokens.colorNeutralForeground3,
    },
    workItemButton: {
        minWidth: "120px",
        padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalS}`,
        fontSize: tokens.fontSizeBase300,
    },
});

const columnSizingOptions = {
    dateTime: { minWidth: 150, idealWidth: 200 },
    eventName: { minWidth: 250, idealWidth: 400 },
    inputType: { minWidth: 120, idealWidth: 120 },
    workItemId: { minWidth: 140, idealWidth: 160 },
    workItemName: { minWidth: 250, idealWidth: 400 },
};

// 型ガード: LinkingEventWorkItemPair かどうかを判定
function isLinkingEventWorkItemPair(obj: EventTableRow["item"]): obj is LinkingEventWorkItemPair {
    return "linkingWorkItem" in obj;
}

// 入力タイプに応じたバッジのアイコンとスタイルを取得
function getInputTypeBadgeInfo(
    inputType: string,
    styles: ReturnType<typeof useStyles>,
): { icon: ReactNode; badgeClass: string } {
    const badgeMap: Record<string, { icon: ReactNode; badgeClass: string }> = {
        手動入力: { icon: <PersonEdit20Regular />, badgeClass: styles.badgeManual },
        AI自動: { icon: <Bot20Regular />, badgeClass: styles.badgeAI },
        履歴: { icon: <History20Regular />, badgeClass: styles.badgeHistory },
        勤務予定: { icon: <CalendarClock20Regular />, badgeClass: styles.badgeWorkSchedule },
        休暇: { icon: <WeatherSunny20Regular />, badgeClass: styles.badgeTimeOff },
        自動: { icon: <Bot20Regular />, badgeClass: styles.badgeAuto },
    };

    return badgeMap[inputType] || { icon: <CircleSmall20Filled />, badgeClass: styles.badgeUnlinked };
}

// テーブル列定義を生成
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    onOpenWorkItemDialog: (eventId: string) => void,
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div>{formatDateTime(item.event.schedule.start, item.event.schedule.end)}</div>
                            {item.event.oldSchedule && (
                                <div
                                    style={{
                                        fontSize: tokens.fontSizeBase200,
                                        color: tokens.colorPaletteRedForeground1,
                                    }}
                                >
                                    変更前：
                                    {item.event.oldSchedule.start.toLocaleTimeString("ja-JP", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                    ~
                                    {item.event.oldSchedule.end?.toLocaleTimeString("ja-JP", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            )}
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
                const { icon, badgeClass } = getInputTypeBadgeInfo(item.inputType, styles);

                return (
                    <div className={styles.centeredCell}>
                        <span className={`${styles.inputTypeBadge} ${badgeClass}`}>
                            {icon}
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
                            <Button
                                appearance="subtle"
                                icon={<Edit20Regular />}
                                iconPosition="after"
                                className={styles.workItemButton}
                                onClick={() => onOpenWorkItemDialog(item.event.uuid)}
                            >
                                {item.workItemId || "未選択"}
                            </Button>
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

// inputTypeを決定するヘルパー関数
function getInputType(linkingWorkItem: LinkingEventWorkItemPair["linkingWorkItem"]): string {
    if (linkingWorkItem.type === "manual") {
        return "手動入力";
    }

    if (linkingWorkItem.type === "auto") {
        const autoMethodMap: Record<string, string> = {
            ai: "AI自動",
            history: "履歴",
            workShedule: "勤務予定",
            timeOff: "休暇",
        };
        return autoMethodMap[linkingWorkItem.autoMethod || ""] || "自動";
    }

    return "-";
}

// EventTableRowをTableRowに変換するヘルパー関数
function convertToTableRow(row: EventTableRow): TableRow {
    const { item } = row;

    // LinkingEventWorkItemPairの場合（紐づけ済み）
    if (isLinkingEventWorkItemPair(item)) {
        const { workItem } = item.linkingWorkItem;
        return {
            event: item.event,
            workItemId: workItem.id,
            workItemName: WorkItemUtils.getText(workItem),
            inputType: getInputType(item.linkingWorkItem),
        };
    }

    // Eventの場合（未紐づけ）
    return {
        event: item,
        workItemId: "",
        workItemName: "未紐づけ",
        inputType: "-",
    };
}

export function EventTable({ events, workItems: workItemsNotUse, onWorkItemChange }: EventTableProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("");

    // WorkItemツリーから実際の作業アイテムを取得（subItemsが1つだけの階層を自動展開）
    const targetWorkItems = useMemo(() => {
        const rootItems = workItemsNotUse[0]?.subItems ?? [];
        return WorkItemUtils.getTargetWorkItems(rootItems);
    }, [workItemsNotUse]);

    // 選択中のイベントを取得
    const selectedEvent = useMemo((): Event | undefined => {
        const row = events.find((e) => {
            const event = isLinkingEventWorkItemPair(e.item) ? e.item.event : e.item;
            return event.uuid === selectedEventId;
        });

        if (!row) {
            return undefined;
        }

        return isLinkingEventWorkItemPair(row.item) ? row.item.event : row.item;
    }, [events, selectedEventId]);

    const handleOpenDialog = useCallback((eventId: string) => {
        setSelectedEventId(eventId);
        setDialogOpen(true);
    }, []);

    const handleSelectWorkItem = useCallback(
        (workItemId: string) => {
            onWorkItemChange(selectedEventId, workItemId);
        },
        [onWorkItemChange, selectedEventId],
    );

    const handleClear = useCallback(() => {
        onWorkItemChange(selectedEventId, "");
    }, [onWorkItemChange, selectedEventId]);

    // テーブルデータと列定義を生成
    const tableRows: TableRow[] = useMemo(() => events.map(convertToTableRow), [events]);
    const eventColumns = useMemo(() => createEventColumns(styles, handleOpenDialog), [styles, handleOpenDialog]);

    return (
        <div className={styles.tableWrapper}>
            <div className={styles.tableContainer}>
                <DataTable
                    items={tableRows}
                    columns={eventColumns}
                    getRowId={(item) => item.event.uuid}
                    sortable
                    resizableColumns
                    columnSizingOptions={columnSizingOptions}
                />
            </div>

            <WorkItemTreeViewDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                selectedEvent={selectedEvent}
                workItems={targetWorkItems}
                historyDisplayCount={settings.timetracker?.appearance?.historyDisplayCount}
                onSelectWorkItem={handleSelectWorkItem}
                onClear={handleClear}
            />
        </div>
    );
}
