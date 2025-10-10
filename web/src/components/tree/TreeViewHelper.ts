import type { HeadlessFlatTreeItemProps } from "@fluentui/react-components";
import type { ReactNode } from "react";
import type { TreeItem } from "./TreeItem";

const SEP = "/";

const encodePath = (path: string): string => path.replace(SEP, "%2F");
const decodePath = (path: string): string => path.replace("%2F", SEP);

export type CustomFlatTreeViewItem = HeadlessFlatTreeItemProps & { header: ReactNode };

export const treeViewHelper = {
    getPath(args: string[]): string {
        return args.map((a) => encodePath(a)).join(SEP);
    },

    splitPath(path: string, addParent = false): string[] {
        const parts = path.split(SEP);
        if (addParent) {
            return parts.reduce<string[]>((acc, value) => {
                const parent = acc.length > 0 ? [acc[acc.length - 1], value].join(SEP) : value;
                return [...acc, parent];
            }, []);
        }
        return parts.map((p) => decodePath(p));
    },

    getChildren(items: TreeItem[]): TreeItem[] {
        return items.flatMap((item) => (item.children ? this.getChildren(item.children) : [item]));
    },

    toCustomFlatItem(treeItems: TreeItem[], parent?: TreeItem): CustomFlatTreeViewItem[] {
        return treeItems.flatMap((treeItem) => {
            const currentItem: CustomFlatTreeViewItem = {
                value: treeItem.value,
                header: treeItem.header,
                parentValue: parent?.value,
            };
            return treeItem.children
                ? [currentItem, ...this.toCustomFlatItem(treeItem.children, treeItem)]
                : [currentItem];
        });
    },
} as const;
