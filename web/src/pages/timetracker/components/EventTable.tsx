import { DataTable } from "@/components/data-table";
import { TreeView } from "@/components/tree/Tree";
import type { TreeItem } from "@/components/tree/TreeItem";
import { treeViewHelper } from "@/components/tree/TreeViewHelper";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils } from "@/types/utils";
import {
    Button,
    createTableColumn,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    makeStyles,
    TableCellLayout,
    TableColumnDefinition,
    tokens,
    Tooltip,
    TreeItemLayout,
    TreeItemValue,
} from "@fluentui/react-components";
import {
    Bot20Regular,
    Calendar20Regular,
    CalendarClock20Regular,
    CircleSmall20Filled,
    Dismiss20Regular,
    Document20Regular,
    Edit20Regular,
    Folder20Regular,
    History20Regular,
    PersonEdit20Regular,
    WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { LinkingEventWorkItemPair } from "../models";

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
    dialogSurface: {
        width: "700px",
        maxHeight: "95vh",
    },
    dialogHeader: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        alignItems: "center",
        marginBottom: tokens.spacingVerticalM,
    },
    dialogTree: {
        overflowY: "auto",
        maxHeight: "560px",
        minHeight: "400px",
    },
    historySection: {
        marginBottom: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalS,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    historyTitle: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        marginBottom: tokens.spacingVerticalXS,
    },
    historyList: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
    },
    historyItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        transition: "background-color 0.1s ease",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    historyItemIcon: {
        color: tokens.colorNeutralForeground3,
    },
    historyItemText: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground1,
        flex: 1,
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

// TreeItem の value から WorkItem を再帰的に検索
function findWorkItem(value: TreeItemValue, workItems: WorkItem[]): WorkItem | undefined {
    for (const item of workItems) {
        const itemValue = treeViewHelper.getPath([item.folderPath, item.folderName, item.name]);
        if (itemValue === value) {
            return item;
        }

        // 子アイテムを再帰的に検索
        if (item.subItems) {
            const found = findWorkItem(value, item.subItems);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

// WorkItem を TreeItem に変換（検索クエリでフィルタリング）
function convertWorkItemsToTree(
    query: string,
    items: WorkItem[],
    onItemClick: (itemValue: string) => void,
): TreeItem[] {
    // 検索クエリでフィルタリング
    const filteredItems = query
        ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
        : items;

    return filteredItems.map((item) => {
        const hasChildren = !!item.subItems?.length;
        const itemValue = treeViewHelper.getPath([item.folderPath, item.folderName, item.name]);

        // フォルダーアイテムまたはリーフアイテムのヘッダーを作成
        const header: ReactNode = hasChildren ? (
            <TreeItemLayout iconBefore={<Folder20Regular />}>{item.name}</TreeItemLayout>
        ) : (
            <TreeItemLayout
                iconBefore={<Document20Regular />}
                onClick={() => onItemClick(itemValue)}
                style={{ cursor: "pointer" }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS }}>
                    <span style={{ fontWeight: tokens.fontWeightSemibold, color: tokens.colorBrandForeground1 }}>
                        {item.id}
                    </span>
                    {" - "}
                    <span>{item.name}</span>
                </div>
            </TreeItemLayout>
        );

        return {
            header,
            value: itemValue,
            children: hasChildren ? convertWorkItemsToTree(query, item.subItems!, onItemClick) : undefined,
        };
    });
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
        const folderName = workItem.folderPath.split("/").pop() || "";

        return {
            event: item.event,
            workItemId: workItem.id,
            workItemName: `${workItem.name} ( ${folderName} )`,
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

export function EventTable({ events, workItems, onWorkItemChange }: EventTableProps) {
    const styles = useStyles();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [query, setQuery] = useState("");
    const [openItemValues, setOpenItemValues] = useState<TreeItemValue[]>([]);

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

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setQuery("");
    }, []);

    const handleOpenDialog = useCallback((eventId: string) => {
        setSelectedEventId(eventId);
        setDialogOpen(true);
        setQuery("");
    }, []);

    const handleClear = useCallback(() => {
        onWorkItemChange(selectedEventId, "");
        closeDialog();
    }, [onWorkItemChange, selectedEventId, closeDialog]);

    // TODO: 最近使用したWorkItemの履歴機能（将来実装）
    const recentWorkItems = useMemo(() => [] as WorkItem[], []);

    const handleItemClick = useCallback(
        (value: TreeItemValue) => {
            const workItem = findWorkItem(value, workItems);
            if (workItem) {
                onWorkItemChange(selectedEventId, workItem.id);
                closeDialog();
            }
        },
        [onWorkItemChange, workItems, selectedEventId, closeDialog],
    );

    const treeItems = useMemo(
        () => convertWorkItemsToTree(query, workItems[0]?.subItems ?? [], handleItemClick),
        [workItems, handleItemClick, query],
    );

    // 検索時は全ツリーを展開
    useEffect(() => {
        if (query) {
            // ツリーの全ての値を再帰的に取得
            const getAllTreeValues = (items: TreeItem[]): string[] => {
                return items.flatMap((item) => [item.value, ...(item.children ? getAllTreeValues(item.children) : [])]);
            };
            setOpenItemValues(getAllTreeValues(treeItems));
        } else {
            setOpenItemValues([]);
        }
    }, [query, treeItems]);

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

            <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
                <DialogSurface className={styles.dialogSurface}>
                    <DialogBody>
                        <DialogTitle>作業コード選択{selectedEvent && ": " + selectedEvent.name}</DialogTitle>
                        <DialogContent>
                            <div className={styles.dialogHeader}>
                                <Input
                                    placeholder="検索..."
                                    value={query}
                                    onChange={(_, data) => setQuery(data.value)}
                                    style={{ flex: 1 }}
                                />
                                <Button appearance="outline" icon={<Dismiss20Regular />} onClick={handleClear}>
                                    未選択
                                </Button>
                            </div>

                            {/* 履歴表示（検索していない時のみ） */}
                            {!query && recentWorkItems.length > 0 && (
                                <div className={styles.historySection}>
                                    <div className={styles.historyTitle}>最近使用した項目</div>
                                    <div className={styles.historyList}>
                                        {recentWorkItems.map((workItem) => (
                                            <div
                                                key={workItem.id}
                                                className={styles.historyItem}
                                                onClick={() => onWorkItemChange(selectedEventId, workItem.id)}
                                            >
                                                <Document20Regular className={styles.historyItemIcon} />
                                                <span className={styles.historyItemText}>
                                                    {workItem.id} - {workItem.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <TreeView
                                items={treeItems}
                                openItemValues={openItemValues}
                                onOpenChanged={setOpenItemValues}
                                onSelectItemChanged={handleItemClick}
                                className={styles.dialogTree}
                            />
                        </DialogContent>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
}
