/**
 * History Drawer Component
 *
 * イベントと作業項目の紐づけ履歴を管理するDrawerコンポーネント
 */

import { appMessageDialogRef } from "@/components/message-dialog";
import type { HistoryEntry } from "@/core/history";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import type { WorkItem } from "@/types";
import {
    Button,
    Checkbox,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    Dropdown,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Option,
    TableCellLayout,
    TableColumnDefinition,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    createTableColumn,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    ArrowClockwise24Regular,
    ArrowDownload24Regular,
    ArrowUpload24Regular,
    CheckboxChecked24Regular,
    CheckboxUnchecked24Regular,
    Delete24Regular,
    Dismiss24Regular,
    MoreVertical24Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";

const logger = getLogger("HistoryDrawer");

const useStyles = makeStyles({
    drawer: {
        width: "800px",
        maxWidth: "90vw",
    },
    toolbar: {
        marginBottom: tokens.spacingVerticalM,
        display: "flex",
        gap: tokens.spacingHorizontalS,
    },
    tableContainer: {
        height: "calc(100vh - 200px)",
        overflowY: "auto",
    },
    emptyState: {
        padding: tokens.spacingVerticalXXL,
        textAlign: "center",
        color: tokens.colorNeutralForeground3,
    },
    stats: {
        padding: tokens.spacingVerticalM,
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
    },
});

export type HistoryDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workItems: WorkItem[];
};

type HistoryRow = HistoryEntry & { key: string };

type SortField = "useCount" | "lastUsedDate" | "eventName" | "itemName";
type SortDirection = "asc" | "desc";

export function HistoryDrawer({ open, onOpenChange, workItems }: HistoryDrawerProps) {
    const styles = useStyles();
    const [historyManager] = useState(() => new HistoryManager());
    const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>("useCount");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [editingKey, setEditingKey] = useState<string | null>(null);

    // 履歴データを読み込む
    const loadHistory = () => {
        historyManager.load();
        const entries = historyManager.getAllEntries();
        setHistoryData(entries);
        setSelectedKeys(new Set());
        logger.info(`履歴を読み込み: ${entries.length}件`);
    };

    // 初回読み込み
    useEffect(() => {
        if (open) {
            loadHistory();
        }
    }, [open]);

    // ソート済みデータ
    const sortedData = useMemo(() => {
        const sorted = [...historyData];
        sorted.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "useCount":
                    comparison = b.useCount - a.useCount;
                    break;
                case "lastUsedDate":
                    comparison = b.lastUsedDate.getTime() - a.lastUsedDate.getTime();
                    break;
                case "eventName":
                    comparison = a.eventName.localeCompare(b.eventName);
                    break;
                case "itemName":
                    comparison = a.itemName.localeCompare(b.itemName);
                    break;
            }
            return sortDirection === "asc" ? -comparison : comparison;
        });
        return sorted;
    }, [historyData, sortField, sortDirection]);

    // 全選択/解除
    const handleSelectAll = () => {
        if (selectedKeys.size === historyData.length) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(historyData.map((item) => item.key)));
        }
    };

    // 選択削除
    const handleDeleteSelected = async () => {
        if (selectedKeys.size === 0) return;

        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "履歴削除",
            `選択した${selectedKeys.size}件の履歴を削除しますか？\nこの操作は取り消せません。`,
            "WARN",
        );

        if (!confirmed) return;

        const deletedCount = historyManager.deleteByKeys(Array.from(selectedKeys));
        await appMessageDialogRef.showMessageAsync("削除完了", `${deletedCount}件の履歴を削除しました`, "INFO");
        loadHistory();
    };

    // 全クリア
    const handleClearAll = async () => {
        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "履歴全削除",
            "すべての履歴を削除しますか？\nこの操作は取り消せません。",
            "ERROR",
        );

        if (!confirmed) return;

        historyManager.clear();
        await appMessageDialogRef.showMessageAsync("削除完了", "すべての履歴を削除しました", "INFO");
        loadHistory();
    };

    // エクスポート
    const handleExport = () => {
        try {
            const jsonData = historyManager.exportToJSON();
            const blob = new Blob([jsonData], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `timetracker-history-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            logger.info("履歴をエクスポートしました");
        } catch (error) {
            logger.error("エクスポートエラー:", error);
            appMessageDialogRef.showMessageAsync(
                "エクスポートエラー",
                error instanceof Error ? error.message : "エクスポートに失敗しました",
                "ERROR",
            );
        }
    };

    // インポート
    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importedCount = historyManager.importFromJSON(text, false);
                await appMessageDialogRef.showMessageAsync(
                    "インポート完了",
                    `${importedCount}件の履歴をインポートしました`,
                    "INFO",
                );
                loadHistory();
            } catch (error) {
                logger.error("インポートエラー:", error);
                await appMessageDialogRef.showMessageAsync(
                    "インポートエラー",
                    error instanceof Error ? error.message : "インポートに失敗しました",
                    "ERROR",
                );
            }
        };
        input.click();
    };

    // WorkItem変更
    const handleWorkItemChange = async (key: string, newItemId: string) => {
        const workItem = workItems.find((w) => w.id === newItemId);
        if (!workItem) return;

        historyManager.updateWorkItemId(key, newItemId, workItem.name);
        await appMessageDialogRef.showMessageAsync("更新完了", `作業項目を「${workItem.name}」に変更しました`, "INFO");
        loadHistory();
        setEditingKey(null);
    };

    // テーブル列定義
    const columns: TableColumnDefinition<HistoryRow>[] = [
        createTableColumn<HistoryRow>({
            columnId: "checkbox",
            renderHeaderCell: () => (
                <Checkbox
                    checked={selectedKeys.size === historyData.length && historyData.length > 0}
                    onChange={handleSelectAll}
                />
            ),
            renderCell: (item) => (
                <Checkbox
                    checked={selectedKeys.has(item.key)}
                    onChange={() => {
                        const newSelected = new Set(selectedKeys);
                        if (newSelected.has(item.key)) {
                            newSelected.delete(item.key);
                        } else {
                            newSelected.add(item.key);
                        }
                        setSelectedKeys(newSelected);
                    }}
                />
            ),
        }),
        createTableColumn<HistoryRow>({
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => (
                <TableCellLayout>
                    イベント名
                    {sortField === "eventName" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableCellLayout>
            ),
            renderCell: (item) => <TableCellLayout>{item.eventName || "無題"}</TableCellLayout>,
        }),
        createTableColumn<HistoryRow>({
            columnId: "itemName",
            compare: (a, b) => a.itemName.localeCompare(b.itemName),
            renderHeaderCell: () => (
                <TableCellLayout>
                    作業項目
                    {sortField === "itemName" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableCellLayout>
            ),
            renderCell: (item) => {
                const isEditing = editingKey === item.key;
                return (
                    <TableCellLayout>
                        {isEditing ? (
                            <Dropdown
                                placeholder="作業項目を選択..."
                                value={item.itemName}
                                defaultSelectedOptions={[item.itemId]}
                                onOptionSelect={(_, data) => {
                                    if (data.optionValue) {
                                        handleWorkItemChange(item.key, data.optionValue);
                                    }
                                }}
                                onBlur={() => setEditingKey(null)}
                            >
                                {workItems.map((w) => (
                                    <Option key={w.id} value={w.id}>
                                        {w.name}
                                    </Option>
                                ))}
                            </Dropdown>
                        ) : (
                            <span onClick={() => setEditingKey(item.key)} style={{ cursor: "pointer" }}>
                                {item.itemName}
                            </span>
                        )}
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<HistoryRow>({
            columnId: "useCount",
            compare: (a, b) => b.useCount - a.useCount,
            renderHeaderCell: () => (
                <TableCellLayout>
                    使用回数
                    {sortField === "useCount" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableCellLayout>
            ),
            renderCell: (item) => <TableCellLayout>{item.useCount}回</TableCellLayout>,
        }),
        createTableColumn<HistoryRow>({
            columnId: "lastUsedDate",
            compare: (a, b) => b.lastUsedDate.getTime() - a.lastUsedDate.getTime(),
            renderHeaderCell: () => (
                <TableCellLayout>
                    最終使用日時
                    {sortField === "lastUsedDate" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableCellLayout>
            ),
            renderCell: (item) => <TableCellLayout>{item.lastUsedDate.toLocaleString("ja-JP")}</TableCellLayout>,
        }),
    ];

    const handleColumnHeaderClick = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    return (
        <Drawer
            type="overlay"
            position="end"
            open={open}
            onOpenChange={(_, { open }) => onOpenChange(open)}
            className={styles.drawer}
        >
            <DrawerHeader>
                <DrawerHeaderTitle
                    action={
                        <Button
                            appearance="subtle"
                            aria-label="閉じる"
                            icon={<Dismiss24Regular />}
                            onClick={() => onOpenChange(false)}
                        />
                    }
                >
                    紐付け履歴管理
                </DrawerHeaderTitle>
            </DrawerHeader>

            <DrawerBody>
                {/* 統計情報 */}
                <div className={styles.stats}>
                    <div>総件数: {historyData.length}件</div>
                    <div>選択中: {selectedKeys.size}件</div>
                </div>

                {/* ツールバー */}
                <Toolbar className={styles.toolbar}>
                    <ToolbarButton
                        icon={
                            selectedKeys.size === historyData.length ? (
                                <CheckboxUnchecked24Regular />
                            ) : (
                                <CheckboxChecked24Regular />
                            )
                        }
                        onClick={handleSelectAll}
                    >
                        {selectedKeys.size === historyData.length ? "全解除" : "全選択"}
                    </ToolbarButton>
                    <ToolbarButton
                        icon={<Delete24Regular />}
                        onClick={handleDeleteSelected}
                        disabled={selectedKeys.size === 0}
                    >
                        選択削除
                    </ToolbarButton>
                    <ToolbarDivider />
                    <ToolbarButton icon={<ArrowClockwise24Regular />} onClick={loadHistory}>
                        再読み込み
                    </ToolbarButton>
                    <ToolbarButton
                        icon={<ArrowDownload24Regular />}
                        onClick={handleExport}
                        disabled={historyData.length === 0}
                    >
                        エクスポート
                    </ToolbarButton>
                    <ToolbarButton icon={<ArrowUpload24Regular />} onClick={handleImport}>
                        インポート
                    </ToolbarButton>
                    <ToolbarDivider />
                    <Menu>
                        <MenuTrigger disableButtonEnhancement>
                            <ToolbarButton icon={<MoreVertical24Regular />}>その他</ToolbarButton>
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                <MenuItem icon={<Delete24Regular />} onClick={handleClearAll}>
                                    全削除
                                </MenuItem>
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                </Toolbar>

                {/* データテーブル */}
                {historyData.length === 0 ? (
                    <div className={styles.emptyState}>履歴データがありません</div>
                ) : (
                    <div className={styles.tableContainer}>
                        <DataGrid items={sortedData} columns={columns} sortable getRowId={(item) => item.key}>
                            <DataGridHeader>
                                <DataGridRow>
                                    {({ renderHeaderCell, columnId }) => (
                                        <DataGridHeaderCell
                                            onClick={() => {
                                                if (columnId !== "checkbox") {
                                                    handleColumnHeaderClick(columnId as SortField);
                                                }
                                            }}
                                        >
                                            {renderHeaderCell()}
                                        </DataGridHeaderCell>
                                    )}
                                </DataGridRow>
                            </DataGridHeader>
                            <DataGridBody<HistoryRow>>
                                {({ item, rowId }) => (
                                    <DataGridRow<HistoryRow> key={rowId}>
                                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                    </DataGridRow>
                                )}
                            </DataGridBody>
                        </DataGrid>
                    </div>
                )}
            </DrawerBody>
        </Drawer>
    );
}
