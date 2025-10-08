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
}
