/**
 * LinkingProcessView用のビジネスロジック
 *
 * UIコンポーネントから分離された業務ロジックを定義
 */

import { HistoryManager } from "@/core/history";
import type { Event, WorkItem } from "@/types";

/**
 * WorkItem選択時の手動紐付け処理
 *
 * @param eventId - 紐付け対象のイベントID
 * @param workItemId - 選択されたWorkItemのID
 * @param unlinkedEvents - 未紐付けイベントリスト
 * @param workItems - 利用可能なWorkItemリスト
 * @returns 紐付け結果 (成功時: { success: true, event, workItem }, 失敗時: { success: false, error })
 */
export function processWorkItemSelect(
    eventId: string,
    workItemId: string,
    unlinkedEvents: Event[],
    workItems: WorkItem[],
): { success: true; event: Event; workItem: WorkItem } | { success: false; error: string } {
    // イベントを検索
    const event = unlinkedEvents.find((e) => e.uuid === eventId);
    if (!event) {
        return { success: false, error: "対象のイベントが見つかりません" };
    }

    // WorkItemを検索
    const workItem = workItems.find((w) => w.id === workItemId);
    if (!workItem) {
        return { success: false, error: "選択されたWorkItemが見つかりません" };
    }

    return { success: true, event, workItem };
}

/**
 * 手動紐付けを履歴に保存
 *
 * @param event - 紐付けたイベント
 * @param workItem - 紐付けたWorkItem
 * @throws 履歴保存に失敗した場合
 */
export function saveManualLinkingToHistory(event: Event, workItem: WorkItem): void {
    const historyManager = new HistoryManager();
    historyManager.setHistory(event, workItem);
    historyManager.dump();
}

/**
 * 紐付け結果の検証
 *
 * @param hasEvents - イベントが存在するか
 * @param hasSchedules - スケジュールが存在するか
 * @param hasSettings - TimeTracker設定が存在するか
 * @returns 検証結果
 */
export function validateLinkingData(
    hasEvents: boolean,
    hasSchedules: boolean,
    hasSettings: boolean,
): { valid: true } | { valid: false; reason: "noData" | "noSettings" } {
    if (!hasEvents && !hasSchedules) {
        return { valid: false, reason: "noData" };
    }

    if (!hasSettings) {
        return { valid: false, reason: "noSettings" };
    }

    return { valid: true };
}
