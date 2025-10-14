import { HistoryManager } from "@/core";
import { getLogger } from "@/lib";
import {
    Event,
    EventUtils,
    ScheduleAutoInputInfo,
    TimeOffEventConfig,
    TimeTrackerSettings,
    WorkItem,
    WorkItemChldren,
} from "@/types";
import { LinkingEventWorkItemPair, LinkingWorkItem } from "../models";
import { getMostNestChildren } from "@/types/utils";

const logger = getLogger("linking");

/**
 * イベント名がパターンにマッチするかチェック
 */
function matchEventName(eventName: string, patterns: Array<{ pattern: string; matchMode: string }>): boolean {
    return patterns.some((p) => {
        switch (p.matchMode) {
            case "partial":
                return eventName.includes(p.pattern);
            case "prefix":
                return eventName.startsWith(p.pattern);
            case "suffix":
                return eventName.endsWith(p.pattern);
            default:
                return false;
        }
    });
}

/**
 * 休暇イベントの自動紐付け
 */
function linkTimeOffEvents(
    events: Event[],
    timeOffConfig: TimeOffEventConfig | undefined,
    workItemsChildren: WorkItemChldren[],
): { linked: LinkingEventWorkItemPair[]; remaining: Event[] } {
    if (!timeOffConfig || !timeOffConfig.namePatterns || timeOffConfig.namePatterns.length === 0) {
        logger.info("休暇イベント設定が未設定です");
        return { linked: [], remaining: events };
    }

    const workItem = workItemsChildren.find((w) => w.id === String(timeOffConfig.workItemId));
    if (!workItem) {
        logger.error(`休暇WorkItem(ID: ${timeOffConfig.workItemId})が見つかりません`);
        return { linked: [], remaining: events };
    }

    const timeOffWorkItem: LinkingWorkItem = {
        type: "auto",
        autoMethod: "timeOff",
        workItem,
    };

    const linked: LinkingEventWorkItemPair[] = [];
    const remaining: Event[] = [];

    for (const event of events) {
        if (matchEventName(event.name, timeOffConfig.namePatterns)) {
            linked.push({ event, linkingWorkItem: timeOffWorkItem });
        } else {
            remaining.push(event);
        }
    }

    return { linked, remaining };
}

/**
 * 履歴からの自動紐付け
 */
function linkFromHistory(
    events: Event[],
    historyManager: HistoryManager,
    workItemsChildren: WorkItemChldren[],
): { linked: LinkingEventWorkItemPair[]; remaining: Event[] } {
    const workItemMap = new Map(workItemsChildren.map((w) => [w.id, w]));
    const linked: LinkingEventWorkItemPair[] = [];
    const remaining: Event[] = [];

    for (const event of events) {
        const workItemId = historyManager.getWorkItemId(event);
        const workItem = workItemId ? workItemMap.get(workItemId) : undefined;

        if (workItem) {
            const historyWorkItem: LinkingWorkItem = {
                type: "auto",
                autoMethod: "history",
                workItem,
            };
            linked.push({ event, linkingWorkItem: historyWorkItem });
        } else {
            remaining.push(event);
        }
    }

    return { linked, remaining };
}

/**
 * 勤務時間からの自動紐付け
 */
function linkFromWorkSchedule(
    events: Event[],
    scheduleAutoInputInfo: ScheduleAutoInputInfo,
    workItemsChildren: WorkItemChldren[],
): { linked: LinkingEventWorkItemPair[]; remaining: Event[] } {

    const workItem = workItemsChildren.find((w) => w.id === String(scheduleAutoInputInfo.workItemId));
    if (!workItem) {
        logger.error(`勤務時間の自動入力設定WorkItem(ID: ${scheduleAutoInputInfo.workItemId})が見つかりません`);
        return { linked: [], remaining: events };
    }

    const workScheduleWorkItem: LinkingWorkItem = {
        type: "auto",
        autoMethod: "workShedule",
        workItem,
    };

    const remaining: Event[] = []
    const linked: LinkingEventWorkItemPair[] = []
    events.forEach(event => {
        if (event.workingEventType) {
            linked.push({
                event,
                linkingWorkItem: workScheduleWorkItem,
            })
        } else {
            remaining.push(event);
        }
    })
    return { linked, remaining }
}

/**
 * イベントとWorkItemの自動紐付けを実行
 *
 * @param events - 紐付け対象のイベント一覧
 * @param workItems - 利用可能なWorkItem一覧
 * @param settings - TimeTracker設定
 * @param historyManager - 履歴マネージャー
 * @returns 自動紐付け結果
 */
export function autoLinkEvents(
    events: Event[],
    workItems: WorkItem[],
    settings: TimeTrackerSettings,
    historyManager: HistoryManager,
) {
    const workItemsChildren = getMostNestChildren(workItems)

    let remainingEvents = events;
    const allLinked: LinkingEventWorkItemPair[] = [];

    // 1. 休暇イベントの自動紐付け
    const timeOffResult = linkTimeOffEvents(remainingEvents, settings.timeOffEvent, workItemsChildren);
    allLinked.push(...timeOffResult.linked);
    remainingEvents = timeOffResult.remaining;

    // 2. 履歴からの自動紐付け（設定で有効な場合）
    if (settings.isHistoryAutoInput) {
        const historyResult = linkFromHistory(remainingEvents, historyManager, workItemsChildren);
        alert(JSON.stringify(historyResult.linked))
        allLinked.push(...historyResult.linked);
        remainingEvents = historyResult.remaining;
    }

    // 3. 勤務時間イベントの紐づけ
    const workScheduleResult = linkFromWorkSchedule(remainingEvents, settings.scheduleAutoInputInfo, workItemsChildren)
    allLinked.push(...workScheduleResult.linked);
    remainingEvents = workScheduleResult.remaining;

    return {
        linked: allLinked,
        unlinked: remainingEvents,
    };
}
