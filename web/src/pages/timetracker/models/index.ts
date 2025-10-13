import { Event, Project, Schedule, WorkItem } from "@/types";

export type FileData = {
    name: string;
    size: number;
    type: string;
};

export type PDF = {
    schedule: Schedule[];
} & FileData;

export type ICS = {
    event: Event[];
} & FileData;

export type UploadInfo = {
    pdf?: PDF;
    ics?: ICS;
    project?: Project;
    workItems?: WorkItem[];
};

export type ExcludedEventReasonDetail = {
    reason: "ignored" | "outOfSchedule" | "invalid";
    /** 除外理由の詳細説明 */
    message: string;
};

/**
 * 除外されたイベントの情報
 */
export interface ExcludedEventInfo {
    /** 除外されたイベント */
    event: Event;
    /** 除外理由 */
    details: ExcludedEventReasonDetail[];
}

export type ExcludedScheduleReasonDetail = {
    reason: "ignored" | "holiday" | "outOfSchedule" | "invalid";
    /** 除外理由の詳細説明 */
    message: string;
};
/**
 * 除外されたスケジュールの情報
 */
export interface ExcludedScheduleInfo {
    /** 除外されたイベント */
    schedule: Schedule;
    /** 除外理由 */
    details: ExcludedScheduleReasonDetail[];
}

/**
 * 時調整されたスケジュールの情報
 */
export interface AdjustedEventInfo {
    /* 調整イベント */
    event: Event;
    /* 調整前のスケジュール */
    oldSchdule: Schedule;
    mesage: string;
}

/**
 * 紐付け状態
 * - ai: 自動紐付け済み
 * - history:
 * - workShedule:
 * - manual: 手動紐付け済み
 */
export type LinkingType = "auto" | "manual";

export type AutoMethod = "ai" | "timeOff" | "history" | "workShedule" | "none";

export interface LinkingWorkItem {
    type: LinkingType;
    autoMethod: AutoMethod;
    workItem: WorkItem;
}

/**
 * 紐付け
 */
export interface LinkingEventWorkItemPair {
    /** 未紐付けイベント */
    event: Event;
    /** 作業項目情報 */
    linkingWorkItem: LinkingWorkItem;
}

// テーブル行の型をエクスポート
export type { LinkedEventRow, TargetEventRow, UnlinkedEventRow } from "./table";
