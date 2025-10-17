/**
 * History Drawer Component
 *
 * イベントと作業項目の紐づけ履歴を管理するDrawerコンポーネント
 */

import { StatCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import type { HistoryEntry } from "@/core/history";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { WorkItemUtils, type WorkItem } from "@/types";
import {
    Badge,
    Button,
    Divider,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    TableCellLayout,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    createTableColumn,
    makeStyles,
    tokens,
    type TableColumnDefinition,
} from "@fluentui/react-components";
import {
    ArrowDownload24Regular,
    ArrowUpload24Regular,
    Calendar24Regular,
    CheckmarkCircle24Regular,
    Delete24Regular,
    Dismiss24Regular,
    Edit20Regular,
    History24Regular,
    MoreVertical24Regular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTableStyles } from "../styles/tableStyles";
import { WorkItemTreeViewDialog } from "./WorkItemTreeViewDialog";

const logger = getLogger("HistoryDrawer");

/** DrawerのProps */
export interface HistoryDrawerProps {
    /** Drawerの開閉状態 */
    open: boolean;
    /** Drawerの開閉状態変更ハンドラー */
    onOpenChange: (open: boolean) => void;
    /** 作業項目のリスト */
    workItems: WorkItem[];
}

/** 履歴テーブルの行データ */
type HistoryRow = HistoryEntry & { key: string };

const useStyles = makeStyles({
    // Drawer
    drawer: {
        width: "900px",
        maxWidth: "95vw",
    },

    // ヘッダー
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

    // 統計情報
    statsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: tokens.spacingVerticalL,
        paddingTop: tokens.spacingVerticalM,
    },
    // 空状態
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

    // その他
    divider: {
        marginTop: tokens.spacingVerticalM,
        marginBottom: tokens.spacingVerticalM,
    },
});

/** テーブル列の幅設定 */
const columnSizingOptions = {
    eventName: { minWidth: 250, idealWidth: 300 },
    itemName: { minWidth: 250, idealWidth: 400 },
    useCount: { minWidth: 80, idealWidth: 90 },
    lastUsedDate: { minWidth: 140, idealWidth: 170 },
};

/**
 * 最終更新日時をフォーマット
 * @param historyData 履歴データ配列
 * @returns フォーマットされた日時文字列
 */
const formatLastUpdated = (historyData: HistoryRow[]): string => {
    if (historyData.length === 0) return "-";

    const lastUsedTimestamp = Math.max(...historyData.map((h) => h.lastUsedDate.getTime()));
    return new Date(lastUsedTimestamp).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/**
 * エクスポート用のファイル名を生成
 * @returns ファイル名文字列
 */
const generateExportFileName = (): string => {
    const dateStr = new Date().toISOString().slice(0, 10);
    return `timetracker-history-${dateStr}.json`;
};

export function HistoryDrawer({ open, onOpenChange, workItems }: HistoryDrawerProps) {
    const styles = useStyles();
    const tableStyles = useTableStyles();
    const [historyManager] = useState(() => new HistoryManager());
    const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // WorkItemツリーから実際の作業アイテムを取得（subItemsが1つだけの階層を自動展開）
    const targetWorkItems = useMemo(() => {
        const rootItems = workItems[0]?.subItems ?? [];
        return WorkItemUtils.getTargetWorkItems(rootItems);
    }, [workItems]);

    /**
     * 履歴データを読み込む
     */
    const loadHistory = useCallback(() => {
        historyManager.load();
        const entries = historyManager.getAllEntries();
        setHistoryData(entries);
        setSelectedKeys(new Set());
        logger.info(`履歴を読み込み: ${entries.length}件`);
    }, [historyManager]);

    // 初回読み込み
    useEffect(() => {
        if (open) {
            loadHistory();
        }
    }, [open, loadHistory]);

    // 最終更新日時を計算
    const lastUpdatedText = useMemo(() => formatLastUpdated(historyData), [historyData]);

    /**
     * 選択された履歴を削除
     */
    const handleDeleteSelected = useCallback(async () => {
        if (selectedKeys.size === 0) return;

        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "履歴削除",
            `選択した${selectedKeys.size}件の履歴を削除しますか？\nこの操作は取り消せません。`,
            "WARN",
        );

        if (!confirmed) return;

        const deletedCount = historyManager.deleteByKeys(Array.from(selectedKeys));
        historyManager.dump();
        await appMessageDialogRef.showMessageAsync("削除完了", `${deletedCount}件の履歴を削除しました`, "INFO");

        loadHistory();
    }, [selectedKeys, historyManager, loadHistory]);

    /**
     * すべての履歴をクリア
     */
    const handleClearAll = useCallback(async () => {
        const confirmed = await appMessageDialogRef.showConfirmAsync(
            "履歴全削除",
            "すべての履歴を削除しますか？\nこの操作は取り消せません。",
            "ERROR",
        );

        if (!confirmed) return;

        historyManager.clear();
        await appMessageDialogRef.showMessageAsync("削除完了", "すべての履歴を削除しました", "INFO");
        loadHistory();
    }, [historyManager, loadHistory]);

    /**
     * 履歴をJSONファイルとしてエクスポート
     */
    const handleExport = useCallback(() => {
        try {
            const jsonData = historyManager.exportToJSON();
            const blob = new Blob([jsonData], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = generateExportFileName();
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
    }, [historyManager]);

    /**
     * JSONファイルから履歴をインポート
     */
    const handleImport = useCallback(() => {
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
    }, [historyManager, loadHistory]);

    /**
     * WorkItemを再帰的に検索
     */
    const findWorkItemById = useCallback((workItemId: string, items: WorkItem[]): WorkItem | undefined => {
        for (const item of items) {
            if (item.id === workItemId) {
                return item;
            }
            if (item.subItems) {
                const found = findWorkItemById(workItemId, item.subItems);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }, []);

    /**
     * 作業項目選択ダイアログを開く
     */
    const handleOpenDialog = useCallback((key: string) => {
        setEditingKey(key);
        setDialogOpen(true);
    }, []);

    /**
     * 作業項目を変更
     */
    const handleSelectWorkItem = useCallback(
        async (workItemId: string) => {
            if (!editingKey) return;

            // 空文字の場合は履歴削除の確認
            if (!workItemId) {
                const confirmed = await appMessageDialogRef.showConfirmAsync(
                    "履歴削除",
                    "この履歴を削除しますか？\nこの操作は取り消せません。",
                    "WARN",
                );

                if (!confirmed) {
                    setDialogOpen(false);
                    setEditingKey(null);
                    return;
                }

                // 履歴を削除
                const deletedCount = historyManager.deleteByKeys([editingKey]);
                historyManager.dump();
                await appMessageDialogRef.showMessageAsync("削除完了", `${deletedCount}件の履歴を削除しました`, "INFO");
                loadHistory();
                setEditingKey(null);
                setDialogOpen(false);
                return;
            }

            const workItem = findWorkItemById(workItemId, workItems);
            if (!workItem) return;

            historyManager.updateWorkItemId(editingKey, workItemId, workItem.name);
            await appMessageDialogRef.showMessageAsync(
                "更新完了",
                `作業項目を「${workItem.name}」に変更しました`,
                "INFO",
            );
            loadHistory();
            setEditingKey(null);
        },
        [editingKey, workItems, historyManager, loadHistory, findWorkItemById],
    );

    /**
     * クリア（未選択）時の処理
     */
    const handleClear = useCallback(() => {
        // 空文字を渡して削除確認へ
        handleSelectWorkItem("");
    }, [handleSelectWorkItem]);

    /**
     * Drawerを閉じる
     */
    const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

    const columns: TableColumnDefinition<HistoryRow>[] = useMemo(
        () => [
            createTableColumn<HistoryRow>({
                columnId: "eventName",
                compare: (a, b) => a.eventName.localeCompare(b.eventName),
                renderHeaderCell: () => <TableCellLayout>イベント名</TableCellLayout>,
                renderCell: (item) => <TableCellLayout>{item.eventName || "無題"}</TableCellLayout>,
            }),
            createTableColumn<HistoryRow>({
                columnId: "itemName",
                compare: (a, b) => a.itemName.localeCompare(b.itemName),
                renderHeaderCell: () => <TableCellLayout>コード名称</TableCellLayout>,
                renderCell: (item) => (
                    <TableCellLayout>
                        <Button
                            appearance="subtle"
                            icon={<Edit20Regular />}
                            iconPosition="after"
                            onClick={() => handleOpenDialog(item.key)}
                            style={{ minWidth: "120px" }}
                        >
                            {item.itemName}
                        </Button>
                    </TableCellLayout>
                ),
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
        ],
        [handleOpenDialog],
    );

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
                            onClick={handleClose}
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
                    <StatCard icon={<Calendar24Regular />} label="最終更新" value={lastUpdatedText} />
                </div>

                <Divider className={styles.divider} />

                {/* ツールバー */}
                <Toolbar className={tableStyles.toolbar}>
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
                    <div className={tableStyles.tableContainer} style={{ maxHeight: "calc(100vh - 350px)" }}>
                        <DataTable
                            items={historyData}
                            columns={columns}
                            getRowId={(item) => item.key}
                            sortable
                            resizableColumns
                            selectable
                            selectedKeys={selectedKeys}
                            onSelectionChange={setSelectedKeys}
                            columnSizingOptions={columnSizingOptions}
                        />
                    </div>
                )}
            </DrawerBody>

            <WorkItemTreeViewDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                workItems={targetWorkItems}
                onSelectWorkItem={handleSelectWorkItem}
                onClear={handleClear}
            />
        </Drawer>
    );
}
