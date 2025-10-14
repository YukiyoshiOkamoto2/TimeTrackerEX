import { getLogger } from "@/lib";
import { TimeTrackerSettings, WorkItem } from "@/types";
import { WorkItemUtils } from "@/types/utils";

const logger = getLogger("validate");

/**
 *
 */
type ValidateItem = "timeOffEvent" | "scheduleAutoInput" | "paidLeaveInput";

/**
 * WorkItemとProjectの存在を検証し、無効な設定をクリアした新しい設定を返す
 *
 * @param settings - 検証対象のTimeTracker設定
 * @param workItems - 有効なWorkItemのリスト
 * @returns 更新された設定とクリアされた項目数
 */
export function validateAndCleanupSettings(
    settings: TimeTrackerSettings,
    workItems: WorkItem[],
): { settings: TimeTrackerSettings; items: ValidateItem[] } {
    const items: ValidateItem[] = [];
    const updates: Partial<TimeTrackerSettings> = {};
    const validWorkItemIds = new Set(WorkItemUtils.getMostNestChildren(workItems).map((w) => w.id));

    // 1. timeOffEvent.workItemId の検証
    if (settings.timeOffEvent?.workItemId) {
        if (!validWorkItemIds.has(String(settings.timeOffEvent.workItemId))) {
            logger.warn(`timeOffEvent.workItemId (${settings.timeOffEvent.workItemId}) が存在しないため、削除します`);
            updates.timeOffEvent = undefined;
            items.push("timeOffEvent");
        }
    }

    // 2. scheduleAutoInputInfo.workItemId の検証
    if (settings.scheduleAutoInputInfo?.workItemId) {
        if (!validWorkItemIds.has(String(settings.scheduleAutoInputInfo.workItemId))) {
            logger.warn(
                `scheduleAutoInputInfo.workItemId (${settings.scheduleAutoInputInfo.workItemId}) が存在しないため、workItemIdを0に設定します`,
            );
            updates.scheduleAutoInputInfo = {
                ...settings.scheduleAutoInputInfo,
                workItemId: -1,
            };
            items.push("scheduleAutoInput");
        }
    }

    // 3. paidLeaveInputInfo.workItemId の検証
    if (settings.paidLeaveInputInfo?.workItemId) {
        if (!validWorkItemIds.has(String(settings.paidLeaveInputInfo.workItemId))) {
            logger.warn(
                `paidLeaveInputInfo.workItemId (${settings.paidLeaveInputInfo.workItemId}) が存在しないため、削除します`,
            );
            updates.paidLeaveInputInfo = undefined;
            items.push("paidLeaveInput");
        }
    }

    if (items.length > 0) {
        logger.warn(`${items.length}件の無効な設定をクリアしました`);
    }

    return {
        items,
        settings: {
            ...settings,
            ...updates,
        },
    };
}
