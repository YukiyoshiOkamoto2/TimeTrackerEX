import type { WorkItem } from "@/types";
import {
    Button,
    Input,
    makeStyles,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    tokens,
    Tree,
    TreeItem,
    TreeItemLayout,
    useHeadlessFlatTree_unstable,
} from "@fluentui/react-components";
import {
    Checkmark20Filled,
    ChevronDown20Regular,
    Dismiss20Regular,
    Document20Regular,
    Folder20Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";

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
    selected: { backgroundColor: tokens.colorNeutralBackground1Selected },
    item: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
    id: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorBrandForeground1 },
    icon: { color: tokens.colorPaletteGreenForeground2, marginLeft: "auto" },
});

// WorkItemをフラットなツリー構造に変換
type FlatWorkItem = {
    value: string;
    parentValue?: string;
    workItem: WorkItem;
    isLeaf: boolean;
};

function flattenWorkItems(items: WorkItem[], parentValue = ""): FlatWorkItem[] {
    const result: FlatWorkItem[] = [];

    items.forEach((item) => {
        const value = item.folderPath;
        const hasChildren = !!item.subItems?.length;

        result.push({
            value,
            parentValue: parentValue || undefined,
            workItem: item,
            isLeaf: !hasChildren,
        });

        if (hasChildren) {
            result.push(...flattenWorkItems(item.subItems!, value));
        }
    });

    return result;
}

export function WorkItemCombobox({ workItems, selectedWorkItemId, onWorkItemChange }: WorkItemComboboxProps) {
    const styles = useStyles();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    // フラット化されたツリー構造
    const flatItems = useMemo(() => flattenWorkItems(workItems), [workItems]);

    // 検索フィルタリング
    const filteredItems = useMemo(() => {
        if (!query) return flatItems;
        const lowerQuery = query.toLowerCase();
        return flatItems.filter(
            (item) =>
                item.workItem.id.toLowerCase().includes(lowerQuery) ||
                item.workItem.name.toLowerCase().includes(lowerQuery),
        );
    }, [flatItems, query]);

    const flatTree = useHeadlessFlatTree_unstable(filteredItems, {
        defaultOpenItems: [],
    });

    const selectedItem = useMemo(() => {
        if (!selectedWorkItemId) return undefined;
        const item = flatItems.find((item) => item.workItem.id === selectedWorkItemId);
        return item?.workItem;
    }, [flatItems, selectedWorkItemId]);

    const handleSelect = (item: FlatWorkItem) => {
        if (item.isLeaf) {
            onWorkItemChange(item.workItem.id);
            setOpen(false);
            setQuery("");
        }
    };

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
                <div className={styles.tree}>
                    <Tree {...flatTree.getTreeProps()} aria-label="作業項目">
                        {Array.from(flatTree.items(), (item) => {
                            const flatItem = filteredItems.find((fi) => fi.value === item.value);
                            if (!flatItem) return null;

                            const { workItem, isLeaf } = flatItem;
                            const isSelected = isLeaf && workItem.id === selectedWorkItemId;

                            return (
                                <TreeItem {...(item.getTreeItemProps() as any)} key={item.value}>
                                    <TreeItemLayout
                                        iconBefore={isLeaf ? <Document20Regular /> : <Folder20Regular />}
                                        iconAfter={
                                            isSelected ? <Checkmark20Filled className={styles.icon} /> : undefined
                                        }
                                        onClick={() => handleSelect(flatItem)}
                                        className={isSelected ? styles.selected : undefined}
                                        style={{ cursor: isLeaf ? "pointer" : "default" }}
                                    >
                                        {isLeaf ? (
                                            <div className={styles.item}>
                                                <span className={styles.id}>{workItem.id}</span> -{" "}
                                                <span>{workItem.name}</span>
                                            </div>
                                        ) : (
                                            workItem.name
                                        )}
                                    </TreeItemLayout>
                                </TreeItem>
                            );
                        })}
                    </Tree>
                </div>
            </PopoverSurface>
        </Popover>
    );
}
