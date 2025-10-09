/**
 * Linking Process Models
 *
 * イベントとWorkItemの紐付け処理で使用するモデル定義
 */

import type { Event, EventWorkItemPair, WorkItem } from "@/types";

/**
 * 紐付け状態
 * - auto: 自動紐付け済み
 * - manual: 手動紐付け済み
 * - unlinked: 未紐付け
 */
export type LinkingStatus = "auto" | "manual" | "unlinked";

/**
 * 紐付け方法
 * - timeOff: 休暇イベントとして自動紐付け
 * - history: 履歴から自動紐付け
 * - manual: ユーザーが手動で紐付け
 */
export type LinkingMethod = "timeOff" | "history" | "manual";

/**
 * イベントとWorkItemの紐付け情報
 */
export interface EventLinking {
    /** イベント */
    event: Event;
    /** 紐付けられたWorkItem（未紐付けの場合はundefined） */
    workItem?: WorkItem;
    /** 紐付け状態 */
    status: LinkingStatus;
    /** 紐付け方法（紐付け済みの場合のみ） */
    method?: LinkingMethod;
}

/**
 * 除外されたイベントの情報
 */
export interface ExcludedEventInfo {
    /** 除外されたイベント */
    event: Event;
    /** 除外理由 */
    reason: "ignored" | "outOfSchedule" | "invalid";
    /** 除外理由の詳細説明 */
    reasonDetail?: string;
}

/**
 * 自動紐付け結果
 */
export interface AutoLinkingResult {
    /** 紐付け済みイベント */
    linked: EventWorkItemPair[];
    /** 未紐付けイベント */
    unlinked: Event[];
    /** 休暇イベントとして紐付けされた数 */
    timeOffCount: number;
    /** 履歴から紐付けされた数 */
    historyCount: number;
    /** 除外されたイベント（無視、勤務時間外、不正） */
    excluded: ExcludedEventInfo[];
}

/**
 * 有給休暇テーブルの行
 */
export interface PaidLeaveRow {
    id: string;
    date: string;
    dayOfWeek: string;
}

/**
 * 対象イベントテーブルの行
 */
export interface TargetEventRow {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    status: string;
}

/**
 * 紐付け済みイベントテーブルの行
 */
export interface LinkedEventRow {
    id: string;
    eventName: string;
    startTime: string;
    endTime: string;
    workItemName: string;
    source: string;
}

/**
 * 未紐付けイベントテーブルの行
 */
export interface UnlinkedEventRow {
    id: string;
    eventName: string;
    startTime: string;
    endTime: string;
    selectedWorkItemId?: string;
}

/**
 * 除外されたイベントテーブルの行
 */
export interface ExcludedEventRow {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    reason: string;
    reasonDetail: string;
}

/**
 * 除外イベントの統計
 */
export interface ExcludedStats {
    ignored: number;
    outOfSchedule: number;
    invalid: number;
}
