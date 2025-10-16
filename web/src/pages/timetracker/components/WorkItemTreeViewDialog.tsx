/**
 * WorkItem TreeView Dialog Component
 *
 * 作業項目をツリー形式で選択するためのダイアログコンポーネント
 */

import { TreeView } from "@/components/tree/Tree";
import type { TreeItem } from "@/components/tree/TreeItem";
import { treeViewHelper } from "@/components/tree/TreeViewHelper";
import { WorkItemUtils, type Event, type WorkItem } from "@/types";
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    makeStyles,
    tokens,
    TreeItemLayout,
    TreeItemValue,
} from "@fluentui/react-components";
import { Dismiss20Regular, Document20Regular, Folder20Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * WorkItemTreeViewDialogのProps
 */
export interface WorkItemTreeViewDialogProps {
    /** ダイアログの開閉状態 */
    open: boolean;
    /** ダイアログの開閉状態変更ハンドラー */
    onOpenChange: (open: boolean) => void;
    /** 選択中のイベント */
    selectedEvent?: Event;
    /** 作業項目のリスト */
    workItems: WorkItem[];
    /** 履歴表示件数 */
    historyDisplayCount?: number;
    /** 作業項目選択時のコールバック */
    onSelectWorkItem: (workItemId: string) => void;
    /** クリア（未選択）時のコールバック */
    onClear: () => void;
}

const useStyles = makeStyles({
    dialogSurface: {
        minWidth: "800px",
        minHeight: "90vh",
    },
    dialogHeader: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        alignItems: "center",
        marginBottom: tokens.spacingVerticalM,
    },
    dialogTree: {
        overflowY: "auto",
        maxHeight: "70vh",
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

/**
 * TreeItem の value から WorkItem を再帰的に検索
 */
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

/**
 * WorkItem を TreeItem に変換（検索クエリでフィルタリング）
 */
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

/**
 * ツリーの全ての値を再帰的に取得
 */
function getAllTreeValues(items: TreeItem[]): string[] {
    return items.flatMap((item) => [item.value, ...(item.children ? getAllTreeValues(item.children) : [])]);
}

/**
 * 作業項目選択ダイアログコンポーネント
 *
 * 作業項目をツリー形式で表示し、選択を可能にするダイアログ。
 * 検索機能と最近使用した項目の履歴表示機能を提供。
 */
export function WorkItemTreeViewDialog({
    open,
    onOpenChange,
    selectedEvent,
    workItems,
    historyDisplayCount = 5,
    onSelectWorkItem,
    onClear,
}: WorkItemTreeViewDialogProps) {
    const styles = useStyles();
    const [query, setQuery] = useState("");
    const [openItemValues, setOpenItemValues] = useState<TreeItemValue[]>([]);
    const [recentWorkItems, setRecentWorkItems] = useState<WorkItem[]>([]);

    /**
     * ダイアログを閉じる
     */
    const handleClose = useCallback(() => {
        onOpenChange(false);
        setQuery("");
    }, [onOpenChange]);

    /**
     * クリアボタンクリック時の処理
     */
    const handleClear = useCallback(() => {
        onClear();
        handleClose();
    }, [onClear, handleClose]);

    /**
     * ツリーアイテムクリック時の処理
     */
    const handleItemClick = useCallback(
        (value: TreeItemValue) => {
            const workItem = findWorkItem(value, workItems);
            if (workItem) {
                onSelectWorkItem(workItem.id);

                // 履歴に追加（重複を除く）
                const filteredHistory = recentWorkItems.filter((item) => item.id !== workItem.id);
                setRecentWorkItems([workItem, ...filteredHistory.slice(0, historyDisplayCount - 1)]);

                handleClose();
            }
        },
        [workItems, onSelectWorkItem, recentWorkItems, historyDisplayCount, handleClose],
    );

    /**
     * 履歴アイテムクリック時の処理
     */
    const handleHistoryItemClick = useCallback(
        (workItem: WorkItem) => {
            onSelectWorkItem(workItem.id);

            // 履歴の順序を更新（選択したアイテムを先頭に）
            const filteredHistory = recentWorkItems.filter((item) => item.id !== workItem.id);
            setRecentWorkItems([workItem, ...filteredHistory]);

            handleClose();
        },
        [onSelectWorkItem, recentWorkItems, handleClose],
    );

    /**
     * ツリーアイテムの生成
     */
    const treeItems = useMemo(
        () => convertWorkItemsToTree(query, workItems, handleItemClick),
        [workItems, handleItemClick, query],
    );

    // 検索時は全ツリーを展開
    useEffect(() => {
        if (query) {
            setOpenItemValues(getAllTreeValues(treeItems));
        } else {
            setOpenItemValues([]);
        }
    }, [query, treeItems]);

    return (
        <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
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
                                            onClick={() => handleHistoryItemClick(workItem)}
                                        >
                                            <Document20Regular className={styles.historyItemIcon} />
                                            <span className={styles.historyItemText}>
                                                {workItem.id} - {WorkItemUtils.getText(workItem)}
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
    );
}
