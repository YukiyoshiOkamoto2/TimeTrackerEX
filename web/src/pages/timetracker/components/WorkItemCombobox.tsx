import { TreeView } from "@/components/tree/Tree";
import type { TreeItem } from "@/components/tree/TreeItem";
import { treeViewHelper } from "@/components/tree/TreeViewHelper";
import { getLogger } from "@/lib/logger";
import { type WorkItem } from "@/types";
import {
    Button,
    Input,
    makeStyles,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    tokens,
    TreeItemLayout,
    TreeItemValue,
} from "@fluentui/react-components";
import {
    Checkmark20Filled,
    ChevronDown20Regular,
    Dismiss20Regular,
    Document20Regular,
    Folder20Regular,
} from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

const logger = getLogger("WorkItemCombobox");

export type WorkItemComboboxProps = {
    workItems: WorkItem[];
    selectedWorkItemId: string;
    onWorkItemChange: (workItemId: string) => void;
};

const useStyles = makeStyles({
    trigger: {
        width: "100%",
        minWidth: "120px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalS}`,
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        fontSize: tokens.fontSizeBase300,
        ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
    },
    content: {
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: tokens.colorNeutralForeground1,
    },
    placeholder: { color: tokens.colorNeutralForeground4 },
    surface: {
        width: "700px",
        maxHeight: "460px",
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        padding: tokens.spacingVerticalM,
    },
    header: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center" },
    tree: { overflowY: "auto", maxHeight: "520px" },
});

// WorkItem を TreeItem に変換
function convertWorkItemsToTree(
    items: WorkItem[],
    selectedId: string,
    onSelect: (folderPath: string) => void,
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

export function WorkItemCombobox({ workItems, selectedWorkItemId, onWorkItemChange }: WorkItemComboboxProps) {
    const styles = useStyles();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [openItemValues, setOpenItemValues] = useState<TreeItemValue[]>([]);

    // TreeItem の value から WorkItem を取得
    const getWorkItemFromValue = useCallback(
        (value: TreeItemValue): WorkItem | undefined => {
            const findWorkItem = (items: WorkItem[]): WorkItem | undefined => {
                for (const item of items) {
                    // folderPath または id で一致するかチェック
                    const itemValue = item.folderPath ?? item.id;
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

    const handleSelect = useCallback(
        (value: TreeItemValue) => {
            const workItem = getWorkItemFromValue(value);
            if (workItem) {
                onWorkItemChange(workItem.id);
                setOpen(false);
                setQuery("");
            }
        },
        [getWorkItemFromValue, onWorkItemChange],
    );

    // WorkItem を TreeItem に変換
    const treeItems = useMemo(
        () => convertWorkItemsToTree(workItems[0].subItems ?? [], selectedWorkItemId, handleSelect),
        [workItems, selectedWorkItemId, handleSelect],
    );

    // 検索フィルタリング用の関数
    const filterTreeItems = (items: TreeItem[], lowerQuery: string): TreeItem[] => {
        const filtered: TreeItem[] = [];

        for (const item of items) {
            // value が null または undefined の場合はスキップ
            if (!item.value) {
                logger.error("TreeItemの値がNULLです。");
                continue;
            }

            const value = item.value as string;
            const hasChildren = !!item.children?.length;

            // 子要素を再帰的にフィルタリング
            const filteredChildren = hasChildren ? filterTreeItems(item.children!, lowerQuery) : undefined;

            // 自身が検索にマッチするか、子要素にマッチがある場合は含める
            const matchesSelf =
                !hasChildren &&
                workItems.some((wi) => {
                    // folderPath または id で一致するかチェック
                    const itemValue = wi.folderPath ?? wi.id;
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
    };

    const filteredTreeItems = useMemo(() => {
        if (!query) return treeItems;
        const lowerQuery = query.toLowerCase();
        return filterTreeItems(treeItems, lowerQuery);
    }, [treeItems, query]);

    // 検索時は全て展開
    const getAllValues = (items: TreeItem[]): TreeItemValue[] => {
        return items.flatMap((item) => {
            const values: TreeItemValue[] = [item.value];
            if (item.children) {
                values.push(...getAllValues(item.children));
            }
            return values;
        });
    };

    useMemo(() => {
        if (query) {
            setOpenItemValues(getAllValues(filteredTreeItems));
        } else {
            setOpenItemValues([]);
        }
    }, [query, filteredTreeItems]);

    // 選択された WorkItem を取得
    const selectedItem = useMemo(() => {
        if (!selectedWorkItemId) return undefined;
        const findWorkItem = (items: WorkItem[]): WorkItem | undefined => {
            for (const item of items) {
                if (item.id === selectedWorkItemId) return item;
                if (item.subItems) {
                    const found = findWorkItem(item.subItems);
                    if (found) return found;
                }
            }
            return undefined;
        };
        return findWorkItem(workItems);
    }, [workItems, selectedWorkItemId]);

    const handleClear = () => {
        onWorkItemChange("");
        setOpen(false);
        setQuery("");
    };

    return (
        <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-start">
            <PopoverTrigger disableButtonEnhancement>
                <div className={styles.trigger} onClick={() => setOpen(!open)}>
                    <span className={selectedItem ? styles.content : `${styles.content} ${styles.placeholder}`}>
                        {selectedItem ? `${selectedItem.id}` : "未選択"}
                    </span>
                    <ChevronDown20Regular />
                </div>
            </PopoverTrigger>
            <PopoverSurface className={styles.surface}>
                <div className={styles.header}>
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
                <TreeView
                    items={filteredTreeItems}
                    openItemValues={openItemValues}
                    onOpenChanged={setOpenItemValues}
                    selectItemValue={selectedItem ? (selectedItem.folderPath ?? selectedItem.id) : undefined}
                    onSelectItemChanged={handleSelect}
                    className={styles.tree}
                />
            </PopoverSurface>
        </Popover>
    );
}
