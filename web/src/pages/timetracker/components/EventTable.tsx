import { DataTable } from "@/components/data-table";
import { TreeView } from "@/components/tree/Tree";
import type { TreeItem } from "@/components/tree/TreeItem";
import { treeViewHelper } from "@/components/tree/TreeViewHelper";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils, getMostNestChildren } from "@/types/utils";
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
    Checkmark20Filled,
    CircleSmall20Filled,
    Dismiss20Regular,
    Document20Regular,
    Edit20Regular,
    Folder20Regular,
    PersonEdit20Regular,
} from "@fluentui/react-icons";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { LinkingEventWorkItemPair } from "../models";

// イベントテーブル用の型定義
type TableRow = {
    id: string;
    event: EventWithOption;
    workItemId: string;
    workItemName: string;
    inputType: string;
};

export type EventWithOption = {
    oldSchedule?: Schedule;
} & Event;

export type EventTableRow = {
    id: string;
    item: EventWithOption | LinkingEventWorkItemPair;
};

export type EventTableProps = {
    events: EventTableRow[];
    workItems: WorkItem[];
    onWorkItemChange: (eventId: string, workItemId: string) => void;
    recentWorkItemIds?: string[]; // 最近使用したWorkItemのID (最大3件)
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
    // WorkItem選択ボタン
    workItemButton: {
        minWidth: "120px",
        padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalS}`,
        fontSize: tokens.fontSizeBase300,
    },
    // Dialog
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
    // 履歴表示
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

// WorkItem を TreeItem に変換
function convertWorkItemsToTree(
    items: WorkItem[],
    selectedId: string,
    onSelect: (itemValue: string) => void,
): TreeItem[] {
    return items.map((item) => {
        const isSelected = item.id === selectedId;
        const hasChildren = !!item.subItems?.length;
        const itemValue = treeViewHelper.getPath([item.folderPath, item.folderName, item.name]);

        const header: ReactNode = hasChildren ? (
            <TreeItemLayout iconBefore={<Folder20Regular />}>{item.name}</TreeItemLayout>
        ) : (
            <TreeItemLayout
                iconBefore={<Document20Regular />}
                iconAfter={
                    isSelected ? (
                        <Checkmark20Filled style={{ color: tokens.colorPaletteGreenForeground2, marginLeft: "auto" }} />
                    ) : undefined
                }
                className={isSelected ? "selected-item" : undefined}
                onClick={() => onSelect(itemValue)}
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
            children: hasChildren ? convertWorkItemsToTree(item.subItems!, selectedId, onSelect) : undefined,
        };
    });
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
                            <Button
                                appearance="subtle"
                                icon={<Edit20Regular />}
                                iconPosition="after"
                                className={styles.workItemButton}
                                onClick={() => onOpenWorkItemDialog(item.id)}
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
    const event = item as EventWithOption;
    return {
        id,
        event,
        workItemId: "",
        workItemName: "未紐づけ",
        inputType: "-",
    };
}

export function EventTable({ events, workItems, onWorkItemChange, recentWorkItemIds = [] }: EventTableProps) {
    const styles = useStyles();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [query, setQuery] = useState("");
    const [openItemValues, setOpenItemValues] = useState<TreeItemValue[]>([]);

    // EventTableRowをTableRowに変換
    const tableRows: TableRow[] = events.map(convertToTableRow);

    // 選択中のイベントの現在のWorkItem
    const selectedWorkItemId = useMemo(() => {
        const row = tableRows.find((r) => r.id === selectedEventId);
        return row?.workItemId || "";
    }, [tableRows, selectedEventId]);

    // 履歴表示用のWorkItem情報を取得（最大3件）
    const recentWorkItems = useMemo(() => {
        const allWorkItems = getMostNestChildren(workItems);
        return recentWorkItemIds
            .slice(0, 3)
            .map((id) => allWorkItems.find((wi) => wi.id === id))
            .filter((wi): wi is WorkItem => wi !== undefined);
    }, [recentWorkItemIds, workItems]);

    // ダイアログを開く
    const handleOpenDialog = useCallback((eventId: string) => {
        setSelectedEventId(eventId);
        setDialogOpen(true);
        setQuery("");
    }, []);

    // TreeItem の value から WorkItem を取得
    const getWorkItemFromValue = useCallback(
        (value: TreeItemValue): WorkItem | undefined => {
            const findWorkItem = (items: WorkItem[]): WorkItem | undefined => {
                for (const item of items) {
                    const itemValue = treeViewHelper.getPath([item.folderPath, item.folderName, item.name]);
                    if (itemValue === value) return item;
                    if (item.subItems) {
                        const found = findWorkItem(item.subItems);
                        if (found) return found;
                    }
                }
                return undefined;
            };
            return findWorkItem(workItems);
        },
        [workItems],
    );

    // WorkItem選択処理
    const handleSelect = useCallback(
        (value: TreeItemValue) => {
            const workItem = getWorkItemFromValue(value);
            if (workItem) {
                onWorkItemChange(selectedEventId, workItem.id);
                setDialogOpen(false);
                setQuery("");
            }
        },
        [getWorkItemFromValue, onWorkItemChange, selectedEventId],
    );

    // 履歴からWorkItem選択
    const handleSelectFromHistory = useCallback(
        (workItemId: string) => {
            onWorkItemChange(selectedEventId, workItemId);
            setDialogOpen(false);
            setQuery("");
        },
        [onWorkItemChange, selectedEventId],
    );

    // WorkItem を TreeItem に変換
    const treeItems = useMemo(
        () => convertWorkItemsToTree(workItems[0]?.subItems ?? [], selectedWorkItemId, handleSelect),
        [workItems, selectedWorkItemId, handleSelect],
    );

    // 検索フィルタリング用の関数
    const filterTreeItems = useCallback(
        (items: TreeItem[], lowerQuery: string): TreeItem[] => {
            const filtered: TreeItem[] = [];

            for (const item of items) {
                if (!item.value) continue;

                const value = item.value as string;
                const hasChildren = !!item.children?.length;

                // 子要素を再帰的にフィルタリング
                const filteredChildren = hasChildren ? filterTreeItems(item.children!, lowerQuery) : undefined;

                // 自身が検索にマッチするか、子要素にマッチがある場合は含める
                const matchesSelf =
                    !hasChildren &&
                    workItems.some((wi) => {
                        const itemValue = treeViewHelper.getPath([wi.folderPath, wi.folderName, wi.name]);
                        const matchesPath = itemValue === value;
                        if (!matchesPath) return false;
                        return wi.id.toLowerCase().includes(lowerQuery) || wi.name.toLowerCase().includes(lowerQuery);
                    });

                const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

                if (matchesSelf || hasMatchingChildren) {
                    filtered.push({
                        ...item,
                        children: hasMatchingChildren ? filteredChildren : undefined,
                    });
                }
            }

            return filtered;
        },
        [workItems],
    );

    const filteredTreeItems = useMemo(() => {
        if (!query) return treeItems;
        const lowerQuery = query.toLowerCase();
        return filterTreeItems(treeItems, lowerQuery);
    }, [treeItems, query, filterTreeItems]);

    // 検索時は全て展開
    const getAllValues = useCallback((items: TreeItem[]): TreeItemValue[] => {
        return items.flatMap((item) => {
            const values: TreeItemValue[] = [item.value];
            if (item.children) {
                values.push(...getAllValues(item.children));
            }
            return values;
        });
    }, []);

    useMemo(() => {
        if (query) {
            setOpenItemValues(getAllValues(filteredTreeItems));
        } else {
            setOpenItemValues([]);
        }
    }, [query, filteredTreeItems, getAllValues]);

    // 未選択処理
    const handleClear = useCallback(() => {
        onWorkItemChange(selectedEventId, "");
        setDialogOpen(false);
        setQuery("");
    }, [onWorkItemChange, selectedEventId]);

    const eventColumns = createEventColumns(styles, handleOpenDialog);

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

            <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
                <DialogSurface className={styles.dialogSurface}>
                    <DialogBody>
                        <DialogTitle>作業コード選択</DialogTitle>
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
                                                onClick={() => handleSelectFromHistory(workItem.id)}
                                            >
                                                <Document20Regular className={styles.historyItemIcon} />
                                                <span className={styles.historyItemText}>
                                                    {workItem.id} - {workItem.name}
                                                </span>
                                                {selectedWorkItemId === workItem.id && (
                                                    <Checkmark20Filled
                                                        style={{ color: tokens.colorBrandForeground1 }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <TreeView
                                items={filteredTreeItems}
                                openItemValues={openItemValues}
                                onOpenChanged={setOpenItemValues}
                                selectItemValue={selectedWorkItemId || undefined}
                                onSelectItemChanged={handleSelect}
                                className={styles.dialogTree}
                            />
                        </DialogContent>
                        {/* <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">閉じる</Button>
                            </DialogTrigger>
                        </DialogActions> */}
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
}
