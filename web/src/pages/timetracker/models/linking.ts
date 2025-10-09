import { Event, Project, Schedule, TimeTrackerSettings, WorkItem, WorkItemChldren } from "@/types";

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

export type ExcludedEventReason = "ignored" | "outOfSchedule" | "invalid";

/**
 * 除外されたイベントの情報
 */
export interface ExcludedEventInfo {
    /** 除外されたイベント */
    event: Event;
    /** 除外理由 */
    reason: ExcludedEventReason;
    /** 除外理由の詳細説明 */
    reasonDetail?: string;
}

/**
 * 自動紐付け処理の入力データ
 */
export interface AutoLinkingInput {
    /** ICSイベント */
    events: Event[];
    /** PDFスケジュール */
    schedules: Schedule[];
    /** プロジェクト情報 */
    project: Project;
    /** 作業項目リスト */
    workItemChirdren: WorkItemChldren[];
    /** TimeTracker設定 */
    timetracker: TimeTrackerSettings;
}

/**
 * 自動紐付け結果
 */
export interface AutoLinkingResult {
    /** 紐付け済みイベント */
    linked: LinkingEventWorkItemPair[];
    /** 未紐付けイベント */
    unlinked: Event[];
    /** 除外されたイベント（無視、勤務時間外、不正） */
    excluded: ExcludedEventInfo[];
}
