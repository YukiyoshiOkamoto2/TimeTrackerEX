import type { ReactNode } from "react";

export type TreeItemValue = string;

/**
 * ツリーアイテムの定義
 * @property header - 表示されるコンテンツ
 * @property value - 一意の識別子
 * @property children - 子アイテムの配列（階層構造の場合）
 */
export interface TreeItem {
    header: ReactNode;
    value: TreeItemValue;
    children?: TreeItem[];
}