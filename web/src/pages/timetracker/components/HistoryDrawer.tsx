/**
 * History Drawer Component
 *
 * イベントと作業項目の紐づけ履歴を管理するDrawerコンポーネント
 */

import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import { StatCard } from "@/components/stat-card";
import type { HistoryEntry } from "@/core/history";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import type { WorkItem } from "@/types";
import {
    Badge,
    Button,
    Divider,
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
    ArrowDownload24Regular,
    ArrowUpload24Regular,
    Calendar24Regular,
    CheckmarkCircle24Regular,
    Delete24Regular,
    Dismiss24Regular,
    History24Regular,
    MoreVertical24Regular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";

const logger = getLogger("HistoryDrawer");

const useStyles = makeStyles({
    drawer: {
        width: "900px",
        maxWidth: "95vw",
    },
    drawerHeader: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        paddingBottom: tokens.spacingVerticalM,
    },
    headerIcon: {
        fontSize: "32px",
        color: tokens.colorBrandForeground1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "48px",
        height: "48px",
        borderRadius: tokens.borderRadiusCircular,
        backgroundColor: tokens.colorBrandBackground2,
    },
    headerTitle: {
        flex: 1,
        fontSize: "20px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    statsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: tokens.spacingVerticalL,
        paddingTop: tokens.spacingVerticalM,
    },
    toolbar: {
        marginBottom: tokens.spacingVerticalM,
        padding: "12px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        display: "flex",
        gap: tokens.spacingHorizontalS,
        flexWrap: "wrap",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    tableContainer: {
        height: "calc(100vh - 450px)",
        overflowY: "auto",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "64px 24px",
        textAlign: "center",
        color: tokens.colorNeutralForeground3,
        minHeight: "300px",
    },
    emptyIcon: {
        fontSize: "64px",
        opacity: 0.5,
        color: tokens.colorNeutralForeground4,
    },
    emptyTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground2,
    },
    emptyDescription: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground3,
        maxWidth: "400px",
    },
    divider: {
        marginTop: tokens.spacingVerticalM,
        marginBottom: tokens.spacingVerticalM,
    },
    editableCell: {
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: tokens.borderRadiusSmall,
        transition: "all 0.15s ease",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorBrandForeground1,
        },
    },
});

export type HistoryDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workItems: WorkItem[];
};

type HistoryRow = HistoryEntry & { key: string };

export function HistoryDrawer({ open, onOpenChange, workItems }: HistoryDrawerProps) {
    const styles = useStyles();
    const [historyManager] = useState(() => new HistoryManager());
    const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
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
            historyManager.load();
            const entries = historyManager.getAllEntries();
            setHistoryData(entries);
            setSelectedKeys(new Set());
            logger.info(`履歴を読み込み: ${entries.length}件`);
        }
    }, [open]);

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
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => <TableCellLayout>イベント名</TableCellLayout>,
            renderCell: (item) => <TableCellLayout>{item.eventName || "無題"}</TableCellLayout>,
        }),
        createTableColumn<HistoryRow>({
            columnId: "itemName",
            compare: (a, b) => a.itemName.localeCompare(b.itemName),
            renderHeaderCell: () => <TableCellLayout>作業項目</TableCellLayout>,
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
                            <span onClick={() => setEditingKey(item.key)} className={styles.editableCell}>
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
            renderHeaderCell: () => <TableCellLayout>使用回数</TableCellLayout>,
            renderCell: (item) => <TableCellLayout>{item.useCount}回</TableCellLayout>,
        }),
        createTableColumn<HistoryRow>({
            columnId: "lastUsedDate",
            compare: (a, b) => b.lastUsedDate.getTime() - a.lastUsedDate.getTime(),
            renderHeaderCell: () => <TableCellLayout>最終使用日時</TableCellLayout>,
            renderCell: (item) => <TableCellLayout>{item.lastUsedDate.toLocaleString("ja-JP")}</TableCellLayout>,
        }),
    ];

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
                    <div className={styles.drawerHeader}>
                        <div className={styles.headerIcon}>
                            <History24Regular />
                        </div>
                        <div className={styles.headerTitle}>紐付け履歴管理</div>
                    </div>
                </DrawerHeaderTitle>
            </DrawerHeader>

            <DrawerBody>
                {/* 統計情報カード */}
                <div className={styles.statsContainer}>
                    <StatCard icon={<History24Regular />} label="総件数" value={historyData.length} unit="件" />
                    <StatCard icon={<CheckmarkCircle24Regular />} label="選択中" value={selectedKeys.size} unit="件" />
                    <StatCard
                        icon={<Calendar24Regular />}
                        label="最終更新"
                        value={
                            historyData.length > 0
                                ? new Date(
                                    Math.max(...historyData.map((h) => h.lastUsedDate.getTime())),
                                ).toLocaleString("ja-JP", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "-"
                        }
                    />
                </div>

                <Divider className={styles.divider} />

                {/* ツールバー */}
                <Toolbar className={styles.toolbar}>
                    <ToolbarButton
                        appearance="primary"
                        icon={<Delete24Regular />}
                        onClick={handleDeleteSelected}
                        disabled={selectedKeys.size === 0}
                    >
                        選択削除 {selectedKeys.size > 0 && <Badge appearance="filled">{selectedKeys.size}</Badge>}
                    </ToolbarButton>
                    <ToolbarDivider />
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
                    <div className={styles.emptyState}>
                        <History24Regular className={styles.emptyIcon} />
                        <div className={styles.emptyTitle}>履歴データがありません</div>
                        <div className={styles.emptyDescription}>
                            イベントと作業項目を紐づけると、ここに履歴が表示されます。
                            <br />
                            履歴を活用することで、次回から自動的に同じ紐づけが適用されます。
                        </div>
                    </div>
                ) : (
                    <DataTable
                        items={historyData}
                        columns={columns}
                        getRowId={(item) => item.key}
                        sortable
                        selectable
                        selectedKeys={selectedKeys}
                        onSelectionChange={setSelectedKeys}
                        className={styles.tableContainer}
                    />
                )}
            </DrawerBody>
        </Drawer>
    );
}
