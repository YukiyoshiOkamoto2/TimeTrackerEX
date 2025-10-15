import { StatCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { formatDateTime } from "@/lib/dateUtil";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import {
    Badge,
    Button,
    createTableColumn,
    makeStyles,
    Popover,
    PopoverSurface,
    PopoverTrigger,
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
import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
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
    duplicationUUID?: string[];
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
    // 重複バッジ（数値のみ）
    duplicationBadge: {
        marginLeft: tokens.spacingHorizontalS,
        cursor: "pointer",
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase200,
        minWidth: "24px",
        height: "20px",
        paddingLeft: tokens.spacingHorizontalXS,
        paddingRight: tokens.spacingHorizontalXS,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transitionDuration: tokens.durationNormal,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "transform, box-shadow",
        ":hover": {
            transform: "scale(1.15)",
            boxShadow: tokens.shadow4,
        },
    },
    // 重複リストポップアップ
    duplicationPopover: {
        width: "520px",
        padding: tokens.spacingVerticalXXL,
    },
    duplicationListTitle: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        marginBottom: tokens.spacingVerticalM,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
    },
    duplicationList: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: tokens.spacingVerticalS,
    },
});

const columnSizingOptions = {
    dateTime: { minWidth: 250, idealWidth: 250 },
    eventName: { minWidth: 300, idealWidth: 400 },
    inputType: { minWidth: 120, idealWidth: 120 },
    workItemId: { minWidth: 140, idealWidth: 160 },
    workItemName: { minWidth: 250, idealWidth: 400 },
};

// 型ガード: LinkingEventWorkItemPair かどうかを判定
function isLinkingEventWorkItemPair(obj: EventTableRow["item"]): obj is LinkingEventWorkItemPair {
    return "linkingWorkItem" in obj;
}

// 重複イベントカードをレンダリング（メモ化用コンポーネント）
const DuplicationEventCard = memo(function DuplicationEventCard({ 
    event 
}: { 
    event: { name: string; schedule: Schedule } 
}) {
    return (
        <StatCard
            icon={<Calendar20Regular />}
            label={formatDateTime(event.schedule.start, event.schedule.end)}
            value={event.name}
        />
    );
});

// 入力タイプセルをレンダリング（メモ化用コンポーネント）
const InputTypeCell = memo(function InputTypeCell({
    inputType,
    styles,
}: {
    inputType: string;
    styles: ReturnType<typeof useStyles>;
}) {
    const badgeInfo = useMemo(() => getInputTypeBadgeInfo(inputType, styles), [inputType, styles]);

    return (
        <div className={styles.centeredCell}>
            <span className={`${styles.inputTypeBadge} ${badgeInfo.badgeClass}`}>
                {badgeInfo.icon}
                {inputType}
            </span>
        </div>
    );
});

// 作業アイテム選択ボタンセルをレンダリング（メモ化用コンポーネント）
const WorkItemActionCell = memo(function WorkItemActionCell({
    eventUuid,
    workItemId,
    styles,
    onOpenDialog,
}: {
    eventUuid: string;
    workItemId: string;
    styles: ReturnType<typeof useStyles>;
    onOpenDialog: (eventId: string) => void;
}) {
    const handleClick = useCallback(() => {
        onOpenDialog(eventUuid);
    }, [onOpenDialog, eventUuid]);

    return (
        <TableCellLayout>
            <div className={styles.centeredCell}>
                <Button
                    appearance="subtle"
                    icon={<Edit20Regular />}
                    iconPosition="after"
                    className={styles.workItemButton}
                    onClick={handleClick}
                >
                    {workItemId || "未選択"}
                </Button>
            </div>
        </TableCellLayout>
    );
});

// 作業アイテム名セルをレンダリング（メモ化用コンポーネント）
const WorkItemNameCell = memo(function WorkItemNameCell({ workItemName }: { workItemName: string }) {
    const cellStyle = useMemo(() => ({
        color: workItemName === "未紐づけ" ? tokens.colorNeutralForeground3 : undefined,
        fontWeight: workItemName === "未紐づけ" ? undefined : tokens.fontWeightSemibold,
    }), [workItemName]);

    return (
        <TableCellLayout>
            <div style={cellStyle}>{workItemName}</div>
        </TableCellLayout>
    );
});

// イベント名セルをレンダリング（メモ化用コンポーネント）
const EventNameCell = memo(function EventNameCell({
    event,
    styles,
}: {
    event: Event;
    styles: ReturnType<typeof useStyles>;
}) {
    const tooltipContent = useMemo(() => EventUtils.getText(event), [event]);

    return (
        <TableCellLayout>
            <Tooltip content={tooltipContent} relationship="description">
                <div className={styles.eventNameCell}>{event.name}</div>
            </Tooltip>
        </TableCellLayout>
    );
});

// 日時セルをレンダリング（メモ化用コンポーネント）
const DateTimeCell = memo(function DateTimeCell({
    event,
    styles,
    allEvents,
    openDuplicationPopoverId,
    onShowDuplicationPopover,
}: {
    event: EventWithOption;
    styles: ReturnType<typeof useStyles>;
    allEvents: TableRow[];
    openDuplicationPopoverId: string | null;
    onShowDuplicationPopover: (eventId: string, open: boolean) => void;
}) {
    const hasDuplication = event.duplicationUUID && event.duplicationUUID.length > 0;
    const duplicationCount = hasDuplication ? event.duplicationUUID!.length : 0;

    const duplicateCards = useMemo(() => {
        if (!hasDuplication) return null;
        return event.duplicationUUID!.map((uuid) => {
            const duplicatedEvent = allEvents.find((e) => e.event.uuid === uuid);
            if (!duplicatedEvent) return null;
            return <DuplicationEventCard key={uuid} event={duplicatedEvent.event} />;
        });
    }, [hasDuplication, event.duplicationUUID, allEvents]);

    return (
        <TableCellLayout>
            <div className={styles.dateTimeCell}>
                <Calendar20Regular />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {formatDateTime(event.schedule.start, event.schedule.end)}
                        {hasDuplication && (
                            <Popover
                                open={openDuplicationPopoverId === event.uuid}
                                onOpenChange={(_, data) => onShowDuplicationPopover(event.uuid, data.open)}
                            >
                                <PopoverTrigger disableButtonEnhancement>
                                    <Badge appearance="filled" color="danger" className={styles.duplicationBadge}>
                                        {duplicationCount}
                                    </Badge>
                                </PopoverTrigger>
                                <PopoverSurface className={styles.duplicationPopover}>
                                    <div className={styles.duplicationListTitle}>
                                        重複しているイベント ({duplicationCount}件)
                                    </div>
                                    <div className={styles.duplicationList}>{duplicateCards}</div>
                                </PopoverSurface>
                            </Popover>
                        )}
                    </div>
                    {event.oldSchedule && (
                        <div
                            style={{
                                fontSize: tokens.fontSizeBase200,
                                color: tokens.colorPaletteRedForeground1,
                            }}
                        >
                            変更前：
                            {event.oldSchedule.start.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            ~
                            {event.oldSchedule.end?.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    )}
                </div>
            </div>
        </TableCellLayout>
    );
});

// 入力タイプバッジのマッピング（定数として定義）
const INPUT_TYPE_BADGE_MAP: Record<string, { icon: ReactNode }> = {
    手動入力: { icon: <PersonEdit20Regular /> },
    AI自動: { icon: <Bot20Regular /> },
    履歴: { icon: <History20Regular /> },
    勤務予定: { icon: <CalendarClock20Regular /> },
    休暇: { icon: <WeatherSunny20Regular /> },
    自動: { icon: <Bot20Regular /> },
};

// 入力タイプに応じたバッジのアイコンとスタイルを取得
function getInputTypeBadgeInfo(
    inputType: string,
    styles: ReturnType<typeof useStyles>,
): { icon: ReactNode; badgeClass: string } {
    const badgeStyleMap: Record<string, string> = {
        手動入力: styles.badgeManual,
        AI自動: styles.badgeAI,
        履歴: styles.badgeHistory,
        勤務予定: styles.badgeWorkSchedule,
        休暇: styles.badgeTimeOff,
        自動: styles.badgeAuto,
    };

    const icon = INPUT_TYPE_BADGE_MAP[inputType]?.icon || <CircleSmall20Filled />;
    const badgeClass = badgeStyleMap[inputType] || styles.badgeUnlinked;

    return { icon, badgeClass };
}

// テーブル列定義を生成
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    onOpenWorkItemDialog: (eventId: string) => void,
    allEvents: TableRow[],
    onShowDuplicationPopover: (eventId: string, open: boolean) => void,
    openDuplicationPopoverId: string | null,
): TableColumnDefinition<TableRow>[] {
    return [
        createTableColumn<TableRow>({
            columnId: "dateTime",
            compare: (a, b) => a.event.schedule.start.getTime() - b.event.schedule.start.getTime(),
            renderHeaderCell: () => "日時",
            renderCell: (item) => (
                <DateTimeCell
                    event={item.event}
                    styles={styles}
                    allEvents={allEvents}
                    openDuplicationPopoverId={openDuplicationPopoverId}
                    onShowDuplicationPopover={onShowDuplicationPopover}
                />
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "eventName",
            compare: (a, b) => a.event.name.localeCompare(b.event.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <EventNameCell event={item.event} styles={styles} />,
        }),
        createTableColumn<TableRow>({
            columnId: "inputType",
            compare: (a, b) => a.inputType.localeCompare(b.inputType),
            renderHeaderCell: () => "入力状況",
            renderCell: (item) => <InputTypeCell inputType={item.inputType} styles={styles} />,
        }),
        createTableColumn<TableRow>({
            columnId: "workItemId",
            compare: (a, b) => a.workItemId.localeCompare(b.workItemId),
            renderHeaderCell: () => "コード",
            renderCell: (item) => (
                <WorkItemActionCell
                    eventUuid={item.event.uuid}
                    workItemId={item.workItemId}
                    styles={styles}
                    onOpenDialog={onOpenWorkItemDialog}
                />
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "コード名称",
            renderCell: (item) => <WorkItemNameCell workItemName={item.workItemName} />,
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

/**
 * イベントテーブルコンポーネント
 * 
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - すべてのハンドラーをuseCallbackで最適化
 * - テーブルデータと列定義をuseMemoで最適化
 */
export const EventTable = memo(function EventTable({ events, workItems: workItemsNotUse, onWorkItemChange }: EventTableProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [openDuplicationPopoverId, setOpenDuplicationPopoverId] = useState<string | null>(null);

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

    const handleShowDuplicationPopover = useCallback((eventId: string, open: boolean) => {
        setOpenDuplicationPopoverId(open ? eventId : null);
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
    const eventColumns = useMemo(
        () =>
            createEventColumns(
                styles,
                handleOpenDialog,
                tableRows,
                handleShowDuplicationPopover,
                openDuplicationPopoverId,
            ),
        [styles, handleOpenDialog, tableRows, handleShowDuplicationPopover, openDuplicationPopoverId],
    );

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
});
