import type { Event, Schedule, TimeCompare } from "@/types";

export type ExcludedReason = "invalid" | "outOfSchedule"

export type ExcludedReasonDetail = {
    reason: ExcludedReason;
    /** 除外理由の詳細説明 */
    message: string;
}

export type ExcludedInfo<T> = {
    /** 除外されたイベント */
    target: T;
    /** 除外理由 */
    details: ExcludedReasonDetail[];
}

export type ConvertEventInfo = {
    newValue: Event; 
    oldSchdule: Schedule;
    mesage: string;
}