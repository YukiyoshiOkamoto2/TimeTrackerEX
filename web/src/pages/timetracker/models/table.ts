export interface TableRow {
    id: string;
}

/**
 * 対象イベントテーブルの行
 */
export interface TargetEventRow extends TableRow {
    name: string;
    startTime: string;
    endTime: string;
    status: string;
}

/**
 * 紐付け済みイベントテーブルの行
 */
export interface LinkedEventRow extends TableRow {
    eventName: string;
    startTime: string;
    endTime: string;
    workItemName: string;
    source: string;
}

/**
 * 未紐付けイベントテーブルの行
 */
export interface UnlinkedEventRow extends TableRow {
    eventName: string;
    startTime: string;
    endTime: string;
    selectedWorkItemId?: string;
}
