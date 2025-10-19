import { StatCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import { formatDateTime } from "@/lib/dateUtil";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import {
    Badge,
    Button,
    createTableColumn,
    makeStyles,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    TableCellLayout,
    TableColumnDefinition,
    tokens,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    Tooltip,
} from "@fluentui/react-components";
import {
    Bot20Regular,
    Calendar20Regular,
    CalendarClock20Regular,
    CircleSmall20Filled,
    Delete24Regular,
    Edit20Regular,
    History20Regular,
    Link24Regular,
    MoreVertical24Regular,
    PersonEdit20Regular,
    WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import type { LinkingInfo } from "../hooks/useLinkingManager";
import { LinkingEventWorkItemPair } from "../models";
import { useTableStyles } from "../styles/tableStyles";
import { WorkItemTreeViewDialog } from "./WorkItemTreeViewDialog";

// ==================== 定数 ====================

/** 未紐づけイベントの表示文字列 */
const UNLINKED_TEXT = "未紐づけ" as const;

/** 入力タイプのラベルマップ */
const INPUT_TYPE_LABELS = {
    MANUAL: "手動入力",
    AI: "AI自動",
    HISTORY: "履歴",
    WORK_SCHEDULE: "勤務予定",
    TIME_OFF: "休暇",
    AUTO: "自動",
    NONE: "-",
} as const;

/** 入力タイプバッジのアイコンマップ */
const INPUT_TYPE_BADGE_MAP: Record<string, { icon: ReactNode }> = {
    [INPUT_TYPE_LABELS.MANUAL]: { icon: <PersonEdit20Regular /> },
    [INPUT_TYPE_LABELS.AI]: { icon: <Bot20Regular /> },
    [INPUT_TYPE_LABELS.HISTORY]: { icon: <History20Regular /> },
    [INPUT_TYPE_LABELS.WORK_SCHEDULE]: { icon: <CalendarClock20Regular /> },
    [INPUT_TYPE_LABELS.TIME_OFF]: { icon: <WeatherSunny20Regular /> },
    [INPUT_TYPE_LABELS.AUTO]: { icon: <Bot20Regular /> },
};

/** カラム幅の設定 */
const COLUMN_SIZING_OPTIONS = {
    dateTime: { minWidth: 230, idealWidth: 230 },
    eventName: { minWidth: 300, idealWidth: 400 },
    inputType: { minWidth: 100, idealWidth: 100 },
    workItemId: { minWidth: 100, idealWidth: 100 },
    workItemName: { minWidth: 300, idealWidth: 400 },
} as const;

// ==================== 型定義 ====================

/** ダイアログの表示モード */
type DialogMode = "single" | "bulk";

/** テーブル行の型 */
type TableRow = {
    event: EventWithOption;
    workItemId: string;
    workItemName: string;
    workItemFolderPath: string;
    inputType: string;
};

/** 追加オプション付きイベント型 */
export type EventWithOption = {
    oldSchedule?: Schedule;
    duplicationUUID?: string[];
} & Event;

/** イベントテーブル行の型 */
export type EventTableRow = {
    item: EventWithOption | LinkingEventWorkItemPair;
};

/** イベントテーブルのProps型 */
export type EventTableProps = {
    events: EventTableRow[];
    workItems: WorkItem[];
    onWorkItemChange: (eventId: string, workItemId: string) => void;
    onBulkWorkItemChange?: (linkings: LinkingInfo[]) => void;
    onDeleteEvents: (eventIds: string[]) => void;
    onAddToIgnoreList: (eventIds: string[]) => void;
};

const useStyles = makeStyles({
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
        padding: tokens.spacingVerticalL,
    },
    duplicationListTitle: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
    },
    duplicationList: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: tokens.spacingVerticalS,
    },
});

// ==================== 型ガード ====================

/** LinkingEventWorkItemPair かどうかを判定 */
function isLinkingEventWorkItemPair(obj: EventTableRow["item"]): obj is LinkingEventWorkItemPair {
    return "linkingWorkItem" in obj;
}

// ==================== セルコンポーネント ====================

/** 重複イベントカード */
const DuplicationEventCard = memo(function DuplicationEventCard({
    event,
}: {
    event: { name: string; schedule: Schedule };
}) {
    return (
        <StatCard
            icon={<Calendar20Regular />}
            label={formatDateTime(event.schedule.start, event.schedule.end)}
            value={event.name}
        />
    );
});

/** 入力タイプセル */
const InputTypeCell = memo(function InputTypeCell({
    inputType,
    styles,
    tableStyles,
}: {
    inputType: string;
    styles: ReturnType<typeof useStyles>;
    tableStyles: ReturnType<typeof useTableStyles>;
}) {
    const badgeInfo = useMemo(() => getInputTypeBadgeInfo(inputType, styles), [inputType, styles]);

    return (
        <div className={tableStyles.centeredCell}>
            <span className={`${styles.inputTypeBadge} ${badgeInfo.badgeClass}`}>
                {badgeInfo.icon}
                {inputType}
            </span>
        </div>
    );
});

/** 作業アイテム選択ボタンセル */
const WorkItemActionCell = memo(function WorkItemActionCell({
    eventUuid,
    workItemId,
    styles,
    tableStyles,
    onOpenDialog,
}: {
    eventUuid: string;
    workItemId: string;
    styles: ReturnType<typeof useStyles>;
    tableStyles: ReturnType<typeof useTableStyles>;
    onOpenDialog: (eventId: string) => void;
}) {
    const handleClick = useCallback(() => {
        onOpenDialog(eventUuid);
    }, [onOpenDialog, eventUuid]);

    return (
        <TableCellLayout>
            <div className={tableStyles.centeredCell}>
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

/** 作業アイテム名セル */
const WorkItemNameCell = memo(function WorkItemNameCell({
    workItemName,
    workItemFolderPath,
}: {
    workItemName: string;
    workItemFolderPath: string;
}) {
    const isUnlinked = workItemName === UNLINKED_TEXT;

    return (
        <TableCellLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div
                    style={{
                        color: isUnlinked ? tokens.colorNeutralForeground3 : undefined,
                        fontWeight: isUnlinked ? undefined : tokens.fontWeightSemibold,
                    }}
                >
                    {workItemName}
                </div>
                {!isUnlinked && workItemFolderPath && (
                    <div
                        style={{
                            fontSize: tokens.fontSizeBase200,
                            color: tokens.colorNeutralForeground3,
                        }}
                    >
                        {workItemFolderPath}
                    </div>
                )}
            </div>
        </TableCellLayout>
    );
});

/** イベント名セル */
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

/** 日時セル */
const DateTimeCell = memo(function DateTimeCell({
    event,
    styles,
    tableStyles,
    allEvents,
    openDuplicationPopoverId,
    onShowDuplicationPopover,
}: {
    event: EventWithOption;
    styles: ReturnType<typeof useStyles>;
    tableStyles: ReturnType<typeof useTableStyles>;
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
            <div className={tableStyles.dateTimeCell}>
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
                                    <div
                                        style={{
                                            fontSize: tokens.fontSizeBase200,
                                            color: tokens.colorNeutralForeground3,
                                            marginBottom: tokens.spacingVerticalS,
                                        }}
                                    >
                                        ※勤務開始イベントの場合、重複先が紐づけされると自動的に削除されます
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

// ==================== ヘルパー関数 ====================

/** 入力タイプに応じたバッジのアイコンとスタイルを取得 */
function getInputTypeBadgeInfo(
    inputType: string,
    styles: ReturnType<typeof useStyles>,
): { icon: ReactNode; badgeClass: string } {
    const badgeStyleMap: Record<string, string> = {
        [INPUT_TYPE_LABELS.MANUAL]: styles.badgeManual,
        [INPUT_TYPE_LABELS.AI]: styles.badgeAI,
        [INPUT_TYPE_LABELS.HISTORY]: styles.badgeHistory,
        [INPUT_TYPE_LABELS.WORK_SCHEDULE]: styles.badgeWorkSchedule,
        [INPUT_TYPE_LABELS.TIME_OFF]: styles.badgeTimeOff,
        [INPUT_TYPE_LABELS.AUTO]: styles.badgeAuto,
    };

    const icon = INPUT_TYPE_BADGE_MAP[inputType]?.icon || <CircleSmall20Filled />;
    const badgeClass = badgeStyleMap[inputType] || styles.badgeUnlinked;

    return { icon, badgeClass };
}

/** テーブル列定義を生成 */
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    tableStyles: ReturnType<typeof useTableStyles>,
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
                    tableStyles={tableStyles}
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
            renderCell: (item) => (
                <InputTypeCell inputType={item.inputType} styles={styles} tableStyles={tableStyles} />
            ),
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
                    tableStyles={tableStyles}
                    onOpenDialog={onOpenWorkItemDialog}
                />
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "コード名称",
            renderCell: (item) => (
                <WorkItemNameCell workItemName={item.workItemName} workItemFolderPath={item.workItemFolderPath} />
            ),
        }),
    ];
}

/** 紐づけワークアイテムから入力タイプを決定 */
function getInputType(linkingWorkItem: LinkingEventWorkItemPair["linkingWorkItem"]): string {
    if (linkingWorkItem.type === "manual") {
        return INPUT_TYPE_LABELS.MANUAL;
    }

    if (linkingWorkItem.type === "auto") {
        const autoMethodMap: Record<string, string> = {
            ai: INPUT_TYPE_LABELS.AI,
            history: INPUT_TYPE_LABELS.HISTORY,
            workShedule: INPUT_TYPE_LABELS.WORK_SCHEDULE,
            timeOff: INPUT_TYPE_LABELS.TIME_OFF,
        };
        return autoMethodMap[linkingWorkItem.autoMethod || ""] || INPUT_TYPE_LABELS.AUTO;
    }

    return INPUT_TYPE_LABELS.NONE;
}

/** EventTableRowをTableRowに変換 */
function convertToTableRow(row: EventTableRow): TableRow {
    const { item } = row;

    // LinkingEventWorkItemPairの場合（紐づけ済み）
    if (isLinkingEventWorkItemPair(item)) {
        const { workItem } = item.linkingWorkItem;
        const paths = workItem.folderPath.split("/");
        return {
            event: item.event,
            workItemId: workItem.id,
            workItemName: workItem.name,
            workItemFolderPath: paths.length > 1 ? paths.splice(1).join("/") : paths[0],
            inputType: getInputType(item.linkingWorkItem),
        };
    }

    // Eventの場合（未紐づけ）
    return {
        event: item,
        workItemId: "",
        workItemName: UNLINKED_TEXT,
        workItemFolderPath: "",
        inputType: INPUT_TYPE_LABELS.NONE,
    };
}

// ==================== メインコンポーネント ====================

/**
 * イベントテーブルコンポーネント
 *
 * イベントの一覧表示と作業アイテムとの紐づけ管理を行う。
 * 単一イベントの紐づけと、複数イベントの一括操作をサポート。
 */
export const EventTable = memo(function EventTable({
    events,
    workItems: workItemsNotUse,
    onWorkItemChange,
    onBulkWorkItemChange,
    onDeleteEvents,
    onAddToIgnoreList,
}: EventTableProps) {
    const styles = useStyles();
    const tableStyles = useTableStyles();
    const { settings } = useSettings();

    // ==================== 状態管理 ====================
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>("single");
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [openDuplicationPopoverId, setOpenDuplicationPopoverId] = useState<string | null>(null);

    // ==================== 派生データ ====================

    /** WorkItemツリーから実際の作業アイテムを取得（subItemsが1つだけの階層を自動展開） */
    const targetWorkItems = useMemo(() => {
        const rootItems = workItemsNotUse[0]?.subItems ?? [];
        return WorkItemUtils.getTargetWorkItems(rootItems);
    }, [workItemsNotUse]);

    /** 選択中のイベントを取得 */
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

    /** テーブル行データ */
    const tableRows: TableRow[] = useMemo(() => events.map(convertToTableRow), [events]);

    // ==================== イベントハンドラー ====================

    /** ダイアログを開く（単一イベント紐づけ） */
    const handleOpenDialog = useCallback((eventId: string) => {
        setDialogMode("single");
        setSelectedEventId(eventId);
        setDialogOpen(true);
    }, []);

    /** 重複イベントポップオーバーの表示切り替え */
    const handleShowDuplicationPopover = useCallback((eventId: string, open: boolean) => {
        setOpenDuplicationPopoverId(open ? eventId : null);
    }, []);

    /** テーブル列定義 */
    const eventColumns = useMemo(
        () =>
            createEventColumns(
                styles,
                tableStyles,
                handleOpenDialog,
                tableRows,
                handleShowDuplicationPopover,
                openDuplicationPopoverId,
            ),
        [styles, tableStyles, handleOpenDialog, tableRows, handleShowDuplicationPopover, openDuplicationPopoverId],
    );

    /** WorkItemを選択（単一または一括） */
    const handleSelectWorkItem = useCallback(
        (workItemId: string) => {
            if (dialogMode === "bulk") {
                // 一括紐づけモード - 配列で一括処理
                const linkings = Array.from(selectedKeys).map((eventId) => ({
                    eventId,
                    workItemId,
                }));

                if (onBulkWorkItemChange) {
                    onBulkWorkItemChange(linkings);
                } else {
                    // フォールバック: 一括処理関数がない場合は従来通り
                    for (const eventId of selectedKeys) {
                        onWorkItemChange(eventId, workItemId);
                    }
                }

                setSelectedKeys(new Set());
                setDialogOpen(false);
                appMessageDialogRef.showMessageAsync(
                    "一括紐づけ完了",
                    `${selectedKeys.size}件のイベントを紐づけました`,
                    "INFO",
                );
            } else {
                // 単一イベント紐づけモード
                onWorkItemChange(selectedEventId, workItemId);
            }
        },
        [dialogMode, onWorkItemChange, onBulkWorkItemChange, selectedEventId, selectedKeys],
    );

    /** 紐づけをクリア（単一または一括） */
    const handleClear = useCallback(() => {
        if (dialogMode === "bulk") {
            // 一括クリアモード - 配列で一括処理
            const linkings = Array.from(selectedKeys).map((eventId) => ({
                eventId,
                workItemId: "",
            }));

            if (onBulkWorkItemChange) {
                onBulkWorkItemChange(linkings);
            } else {
                // フォールバック: 一括処理関数がない場合は従来通り
                for (const eventId of selectedKeys) {
                    onWorkItemChange(eventId, "");
                }
            }

            setSelectedKeys(new Set());
            setDialogOpen(false);
            appMessageDialogRef.showMessageAsync(
                "一括クリア完了",
                `${selectedKeys.size}件のイベントの紐づけを解除しました`,
                "INFO",
            );
        } else {
            // 単一イベントクリアモード
            onWorkItemChange(selectedEventId, "");
        }
    }, [dialogMode, onWorkItemChange, onBulkWorkItemChange, selectedEventId, selectedKeys]);

    /** 選択されたイベントを削除 */
    const handleDeleteSelected = useCallback(async () => {
        if (selectedKeys.size === 0 || !onDeleteEvents) return;

        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "イベント削除",
            `選択した${selectedKeys.size}件のイベントを削除しますか？\nこの操作は取り消せません。`,
            "WARN",
        );

        if (!confirmed) return;

        onDeleteEvents(Array.from(selectedKeys));
        setSelectedKeys(new Set());
        await appMessageDialogRef.showMessageAsync(
            "削除完了",
            `${selectedKeys.size}件のイベントを削除しました`,
            "INFO",
        );
    }, [selectedKeys, onDeleteEvents]);

    /** 選択されたイベントを無視リストに追加 */
    const handleAddToIgnoreList = useCallback(async () => {
        if (selectedKeys.size === 0 || !onAddToIgnoreList) return;

        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "無視リストへ追加",
            `選択した${selectedKeys.size}件のイベントを無視リストに追加しますか？`,
            "INFO",
        );

        if (!confirmed) return;

        onAddToIgnoreList(Array.from(selectedKeys));
        setSelectedKeys(new Set());
        await appMessageDialogRef.showMessageAsync(
            "追加完了",
            `${selectedKeys.size}件のイベントを無視リストに追加しました`,
            "INFO",
        );
    }, [selectedKeys, onAddToIgnoreList]);

    /** 一括紐づけダイアログを開く */
    const handleOpenBulkLinkDialog = useCallback(() => {
        if (selectedKeys.size === 0) return;
        setDialogMode("bulk");
        setDialogOpen(true);
    }, [selectedKeys.size]);

    // ==================== レンダリング ====================

    return (
        <div className={tableStyles.tableWrapper}>
            {/* ツールバー */}
            {selectedKeys.size > 0 && (
                <Toolbar className={tableStyles.toolbar}>
                    <ToolbarButton
                        appearance="primary"
                        icon={<Link24Regular />}
                        onClick={handleOpenBulkLinkDialog}
                        disabled={selectedKeys.size === 0}
                    >
                        一括紐づけ {selectedKeys.size > 0 && <Badge appearance="filled">{selectedKeys.size}</Badge>}
                    </ToolbarButton>
                    <ToolbarDivider />
                    <ToolbarButton
                        icon={<Delete24Regular />}
                        onClick={handleDeleteSelected}
                        disabled={selectedKeys.size === 0}
                    >
                        選択削除 {selectedKeys.size > 0 && <Badge appearance="filled">{selectedKeys.size}</Badge>}
                    </ToolbarButton>
                    <ToolbarDivider />
                    <Menu>
                        <MenuTrigger disableButtonEnhancement>
                            <ToolbarButton icon={<MoreVertical24Regular />}>その他</ToolbarButton>
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                <MenuItem onClick={handleAddToIgnoreList} disabled={!onAddToIgnoreList}>
                                    無視リストへ追加
                                </MenuItem>
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                </Toolbar>
            )}

            <div className={tableStyles.tableContainer}>
                <DataTable
                    items={tableRows}
                    columns={eventColumns}
                    getRowId={(item) => item.event.uuid}
                    sortable
                    resizableColumns
                    selectable
                    selectedKeys={selectedKeys}
                    onSelectionChange={setSelectedKeys}
                    columnSizingOptions={COLUMN_SIZING_OPTIONS}
                />
            </div>

            {/* WorkItem紐づけダイアログ（単一・一括共通） */}
            <WorkItemTreeViewDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                selectedEvent={dialogMode === "single" ? selectedEvent : undefined}
                workItems={targetWorkItems}
                historyDisplayCount={settings.timetracker?.appearance?.historyDisplayCount}
                onSelectWorkItem={handleSelectWorkItem}
                onClear={handleClear}
            />
        </div>
    );
});
