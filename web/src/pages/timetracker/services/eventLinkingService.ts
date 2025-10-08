/**
 * Event Linking Service
 *
 * イベントとWorkItemの自動紐付け処理を行うサービス
 */

import { TimeTrackerAlgorithm } from "@/core/algorithm";
import { HistoryManager } from "@/core/history";
import { IgnoreManager } from "@/core/ignore";
import { getLogger } from "@/lib/logger";
import type {
    DayTask,
    Event,
    EventInputInfo,
    EventWorkItemPair,
    IgnorableEventPattern,
    Project,
    Schedule,
    ScheduleInputInfo,
    TimeOffEventConfig,
    TimeTrackerSettings,
    WorkItem,
} from "@/types";
import type { AutoLinkingResult } from "../models";

const logger = getLogger("EventLinkingService");

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
 * 有効なイベント（無視リストに含まれないイベント）を取得
 */
export function getEnableEvents(events: Event[], ignorableEventPatterns: IgnorableEventPattern[]): Event[] {
    const ignoreManager = new IgnoreManager(ignorableEventPatterns);

    return events.filter((event) => !event.isPrivate && !event.isCancelled && !ignoreManager.ignoreEvent(event));
}

/**
 * 有効なスケジュール（休日・エラーを除く）を取得
 */
export function getEnableSchedules(schedules: Schedule[]): Schedule[] {
    return schedules.filter((schedule) => !schedule.isHoliday && !schedule.errorMessage);
}

/**
 * イベントを1日ごとのタスクに分割
 *
 * @param events - イベント一覧
 * @param schedules - スケジュール一覧（有給休暇を除く）
 * @param project - プロジェクト情報
 * @param settings - TimeTracker設定
 * @returns 1日ごとのタスク一覧
 */
export function splitEventsByDay(
    events: Event[],
    schedules: Schedule[],
    project: Project,
    settings: TimeTrackerSettings,
): DayTask[] {
    logger.info(`1日ごとのタスク分割開始: イベント数=${events.length}, スケジュール数=${schedules.length}`);

    // EventInputInfoを作成
    const eventInputInfo: EventInputInfo = {
        eventDuplicateTimeCompare: settings.eventDuplicatePriority.timeCompare,
        roundingTimeType: settings.roundingTimeTypeOfEvent,
    };

    // ScheduleInputInfoを作成
    const roundingType = settings.scheduleAutoInputInfo.roundingTimeTypeOfSchedule;
    if (roundingType === "nonduplicate") {
        throw new Error('scheduleAutoInputInfo.roundingTimeTypeOfScheduleに"nonduplicate"は使用できません');
    }

    const scheduleInputInfo: ScheduleInputInfo = {
        roundingTimeType: roundingType,
        startEndType: settings.scheduleAutoInputInfo.startEndType,
        startEndTime: settings.scheduleAutoInputInfo.startEndTime,
    };

    // TimeTrackerAlgorithmを初期化
    const algorithm = new TimeTrackerAlgorithm(project, eventInputInfo, scheduleInputInfo);

    // 1日ごとのタスクに分割
    const dayTasks = algorithm.splitOneDayTask(events, schedules);

    logger.info(`1日ごとのタスク分割完了: タスク数=${dayTasks.length}`);

    return dayTasks;
}

/**
 * 有給休暇スケジュールを取得
 *
 * @param schedules - 全スケジュール
 * @returns 有給休暇のスケジュールのみ
 */
export function getPaidLeaveSchedules(schedules: Schedule[]): Schedule[] {
    return schedules.filter((schedule) => schedule.isPaidLeave === true);
}

/**
 * 有給休暇の日別タスクを生成
 *
 * @param paidLeaveSchedules - 有給休暇スケジュール一覧
 * @param settings - TimeTracker設定
 * @param project - プロジェクト情報
 * @param workItems - WorkItem一覧
 * @returns 有給休暇の日別タスク一覧
 */
export function createPaidLeaveDayTasks(
    paidLeaveSchedules: Schedule[],
    settings: TimeTrackerSettings,
    project: Project,
    workItems: WorkItem[],
): DayTask[] {
    const paidLeaveConfig = settings.paidLeaveInputInfo;

    if (!paidLeaveConfig) {
        logger.debug("有給休暇設定が未設定です");
        return [];
    }

    // WorkItemを取得
    const paidLeaveWorkItem = workItems.find((w) => w.id === String(paidLeaveConfig.workItemId));
    if (!paidLeaveWorkItem) {
        logger.warn(`有給休暇WorkItem(ID: ${paidLeaveConfig.workItemId})が見つかりません`);
        return [];
    }

    // 時間をパース
    const [startHour, startMinute] = paidLeaveConfig.startTime.split(":").map(Number);
    const [endHour, endMinute] = paidLeaveConfig.endTime.split(":").map(Number);

    const dayTasks: DayTask[] = [];

    for (const schedule of paidLeaveSchedules) {
        // 有給休暇の時間を設定
        const start = new Date(schedule.start);
        start.setHours(startHour, startMinute, 0, 0);

        const end = new Date(schedule.start);
        end.setHours(endHour, endMinute, 0, 0);

        // 有給休暇イベントを作成
        const paidLeaveEvent: Event = {
            uuid: `paid-leave-${schedule.start.toISOString()}`,
            name: "有給休暇",
            organizer: "Automatic",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: {
                start,
                end,
                isHoliday: schedule.isHoliday,
                isPaidLeave: true,
            },
        };

        // DayTaskを作成
        dayTasks.push({
            baseDate: new Date(schedule.start.getFullYear(), schedule.start.getMonth(), schedule.start.getDate()),
            project,
            events: [paidLeaveEvent],
            scheduleEvents: [],
        });

        logger.debug(`有給休暇タスク作成: ${schedule.start.toISOString()}`);
    }

    return dayTasks;
}

/**
 * 休暇イベントの自動紐付け
 */
function linkTimeOffEvents(
    events: Event[],
    timeOffConfig: TimeOffEventConfig | undefined,
    workItems: WorkItem[],
): { linked: EventWorkItemPair[]; remaining: Event[] } {
    if (!timeOffConfig || !timeOffConfig.namePatterns || timeOffConfig.namePatterns.length === 0) {
        logger.debug("休暇イベント設定が未設定です");
        return { linked: [], remaining: events };
    }

    const timeOffWorkItem = workItems.find((w) => w.id === String(timeOffConfig.workItemId));
    if (!timeOffWorkItem) {
        logger.warn(`休暇WorkItem(ID: ${timeOffConfig.workItemId})が見つかりません`);
        return { linked: [], remaining: events };
    }

    const linked: EventWorkItemPair[] = [];
    const remaining: Event[] = [];

    for (const event of events) {
        if (matchEventName(event.name, timeOffConfig.namePatterns)) {
            linked.push({ event, workItem: timeOffWorkItem });
            logger.debug(`休暇イベントとして紐付け: ${event.name} -> ${timeOffWorkItem.name}`);
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
    workItems: WorkItem[],
): { linked: EventWorkItemPair[]; remaining: Event[] } {
    const workItemMap = new Map(workItems.map((w) => [w.id, w]));
    const linked: EventWorkItemPair[] = [];
    const remaining: Event[] = [];

    for (const event of events) {
        const workItemId = historyManager.getWorkItemId(event);
        const workItem = workItemId ? workItemMap.get(workItemId) : undefined;

        if (workItem) {
            linked.push({ event, workItem });
            logger.debug(`履歴から紐付け: ${event.name} -> ${workItem.name}`);
        } else {
            remaining.push(event);
        }
    }

    return { linked, remaining };
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
): AutoLinkingResult {
    logger.info(`自動紐付け開始: イベント数=${events.length}, WorkItem数=${workItems.length}`);

    let remainingEvents = events;
    const allLinked: EventWorkItemPair[] = [];

    // 1. 休暇イベントの自動紐付け
    const timeOffResult = linkTimeOffEvents(remainingEvents, settings.timeOffEvent, workItems);
    allLinked.push(...timeOffResult.linked);
    remainingEvents = timeOffResult.remaining;

    // 2. 履歴からの自動紐付け（設定で有効な場合）
    let historyCount = 0;
    if (settings.isHistoryAutoInput) {
        const historyResult = linkFromHistory(remainingEvents, historyManager, workItems);
        allLinked.push(...historyResult.linked);
        remainingEvents = historyResult.remaining;
        historyCount = historyResult.linked.length;
    } else {
        logger.debug("履歴からの自動入力が無効です");
    }

    logger.info(
        `自動紐付け完了: 休暇=${timeOffResult.linked.length}, 履歴=${historyCount}, 未紐付け=${remainingEvents.length}`,
    );

    return {
        linked: allLinked,
        unlinked: remainingEvents,
        timeOffCount: timeOffResult.linked.length,
        historyCount,
    };
}

/**
 * 手動でイベントとWorkItemを紐付け
 *
 * @param event - 紐付け対象のイベント
 * @param workItem - 紐付けるWorkItem
 * @param historyManager - 履歴マネージャー（履歴に保存する場合）
 */
export function manualLinkEvent(
    event: Event,
    workItem: WorkItem,
    historyManager?: HistoryManager,
): EventWorkItemPair {
    if (historyManager) {
        historyManager.setHistory(event, workItem);
        logger.debug(`履歴に保存: ${event.name} -> ${workItem.name}`);
    }

    return { event, workItem };
}
