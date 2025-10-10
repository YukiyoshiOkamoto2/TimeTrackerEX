import {
    FlatTree,
    FlatTreeItem,
    HeadlessFlatTreeOptions,
    makeStyles,
    mergeClasses,
    tokens,
    TreeCheckedChangeData,
    TreeCheckedChangeEvent,
    TreeItemLayout,
    TreeItemValue,
    TreeOpenChangeData,
    TreeOpenChangeEvent,
    useHeadlessFlatTree_unstable,
} from "@fluentui/react-components";
import { isValidElement, useCallback, useEffect, useRef, useState } from "react";
import type { TreeItem } from "./TreeItem";
import { treeViewHelper } from "./TreeViewHelper";

const useStyles = makeStyles({
    root: {},
    selected: {
        background: tokens.colorBrandBackgroundInvertedSelected,
    },
});

export const useFlatTree = ({
    items,
    isMultiSelect,
    openItemValues,
    onOpenChanged,
    onCheckedItemChanged,
}: TreeViewProps) => {
    const onTreeOpenChange = useCallback(
        (_: TreeOpenChangeEvent, data: TreeOpenChangeData) => {
            if (onOpenChanged) {
                const openValues: TreeItemValue[] = Array.from(data.openItems, (value) => value.toString());
                onOpenChanged(openValues);
            }
        },
        [onOpenChanged],
    );

    const onTreeCheckedChange = useCallback(
        (_: TreeCheckedChangeEvent, data: TreeCheckedChangeData) => {
            if (onCheckedItemChanged) {
                const selectedValues: TreeItemValue[] = Array.from(
                    data.checkedItems.entries(),
                    ([value, isChecked]) => isChecked && value.toString(),
                ).filter(Boolean) as TreeItemValue[];
                onCheckedItemChanged(selectedValues);
            }
        },
        [onCheckedItemChanged],
    );

    const options: HeadlessFlatTreeOptions = {
        openItems: openItemValues,
        selectionMode: isMultiSelect ? "multiselect" : undefined,
        onOpenChange: onTreeOpenChange,
        onCheckedChange: onTreeCheckedChange,
    };

    return useHeadlessFlatTree_unstable(treeViewHelper.toCustomFlatItem(items), options);
};

export const useAllSelect = (
    items: TreeItem[],
    checkedItemValues: TreeItemValue[],
    setCheckedItemValues: (values: TreeItemValue[]) => void,
    defaultSelect = false,
) => {
    const isUpdatingRef = useRef(false);
    const [isSelectAll, setIsSelectAll] = useState(defaultSelect);

    const toggleSelectAll = useCallback(() => {
        isUpdatingRef.current = true;
        const newValue = !isSelectAll;

        if (newValue) {
            const allValues = treeViewHelper
                .getChildren(items)
                .flatMap((item) => treeViewHelper.splitPath(item.value, true));
            setCheckedItemValues(allValues);
        } else {
            setCheckedItemValues([]);
        }
        setIsSelectAll(newValue);
        isUpdatingRef.current = false;
    }, [isSelectAll, items, setCheckedItemValues]);

    useEffect(() => {
        if (!isUpdatingRef.current) {
            const allValues = treeViewHelper
                .getChildren(items)
                .flatMap((item) => treeViewHelper.splitPath(item.value, true));
            setIsSelectAll(allValues.length === checkedItemValues.length && allValues.length > 0);
        }
    }, [checkedItemValues, items]);

    return [isSelectAll, toggleSelectAll] as const;
};

export type TreeViewProps = {
    items: TreeItem[];
    className?: string;
    isMultiSelect?: boolean;
    openItemValues?: TreeItemValue[];
    selectItemValue?: TreeItemValue;
    checkedItemValues?: TreeItemValue[];
    onOpenChanged?: (values: TreeItemValue[]) => void;
    onSelectItemChanged?: (value: TreeItemValue) => void;
    onCheckedItemChanged?: (value: TreeItemValue[]) => void;
};

export const TreeView = ({
    items,
    className,
    isMultiSelect,
    openItemValues,
    selectItemValue,
    checkedItemValues,
    onOpenChanged,
    onSelectItemChanged,
    onCheckedItemChanged,
}: TreeViewProps) => {
    const styles = useStyles();
    const flatTree = useFlatTree({
        items,
        isMultiSelect,
        openItemValues,
        checkedItemValues,
        onOpenChanged,
        onCheckedItemChanged,
    });

    return (
        <div className={mergeClasses(styles.root, className)}>
            <FlatTree {...flatTree.getTreeProps()} aria-label="Tree View" checkedItems={checkedItemValues}>
                {Array.from(flatTree.items(), (flatTreeItem) => {
                    const { header, ...treeItemProps } = flatTreeItem.getTreeItemProps();
                    
                    // value が null または undefined の場合はスキップ
                    if (treeItemProps.value == null) {
                        return null;
                    }
                    
                    const treeItemValue = treeItemProps.value.toString();
                    const isLeaf = flatTreeItem.childrenValues.length === 0;
                    const isSelected = treeItemValue === selectItemValue;

                    // header が既に React Element の場合はそのまま使用、そうでない場合は TreeItemLayout でラップ
                    const content = isValidElement(header) ? (
                        header
                    ) : (
                        <TreeItemLayout
                            className={isSelected ? styles.selected : undefined}
                            onClick={() => isLeaf && onSelectItemChanged?.(treeItemValue)}
                        >
                            {header}
                        </TreeItemLayout>
                    );

                    return (
                        <FlatTreeItem {...treeItemProps} key={flatTreeItem.value}>
                            {content}
                        </FlatTreeItem>
                    );
                })}
            </FlatTree>
        </div>
    );
};