/**
 * TimeTracker Logic Service
 *
 * TimeTrackerの全ビジネスロジックを統合したサービス
 * - イベントとWorkItemの自動紐付け
 * - 統計情報の計算
 * - 自動紐付けプロセスの実行
 * - データ検証
 */

import { TimeTrackerAlgorithm } from "@/core/algorithm";
import { HistoryManager } from "@/core/history";
import { IgnoreManager } from "@/core/ignore";
import { getCurrentDate } from "@/lib/dateUtil";
import { getLogger } from "@/lib/logger";
import {
    PaidLeaveInputInfo,
    ScheduleAutoInputInfo,
    ScheduleUtils,
    WorkItemChldren,
    type DayTask,
    type Event,
    type EventInputInfo,
    type IgnorableEventPattern,
    type Project,
    type Schedule,
    type ScheduleInputInfo,
    type TimeOffEventConfig,
    type TimeTrackerSettings,
} from "@/types";
import {
    AutoLinkingInput,
    AutoLinkingResult,
    ExcludedEventInfo,
    LinkingEventWorkItemPair,
    LinkingWorkItem,
} from "../models/linking";
import { LinkingStatistics, TaskStatistics } from "../models/statistics";

const logger = getLogger("TimeTrackerLogic");

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
function getEnableEvents(
    events: Event[],
    ignorableEventPatterns: IgnorableEventPattern[],
): [Event[], ExcludedEventInfo[]] {
    // 除外されたイベントを記録する配列
    const excludedEvents: ExcludedEventInfo[] = [];

    const ignoreManager = new IgnoreManager(ignorableEventPatterns);
    const enableEvents = events.filter((event) => {
        if (event.isPrivate || event.isCancelled) {
            excludedEvents.push({
                event,
                reason: "invalid",
                reasonDetail: event.isPrivate ? "非公開イベント" : "キャンセル済みイベント",
            });
            return false;
        }
        if (ignoreManager.ignoreEvent(event)) {
            excludedEvents.push({
                event,
                reason: "ignored",
                reasonDetail: "無視リストに一致",
            });
            return false;
        }
        return true;
    });

    return [enableEvents, excludedEvents];
}

/**
 * 有効なスケジュール（休日・エラーを除く）を取得
 */
function getEnableSchedules(schedules: Schedule[]): Schedule[] {
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
function splitEventsByDay(
    events: Event[],
    schedules: Schedule[],
    project: Project,
    settings: TimeTrackerSettings,
): DayTask[] {
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

    return dayTasks;
}

/**
 * 有給休暇の日別タスクを生成
 *
 * @param paidLeaveSchedules - スケジュール一覧
 * @param settings - TimeTracker設定
 * @param project - プロジェクト情報
 * @param workItems - WorkItem一覧
 * @returns 有給休暇の日別タスク一覧
 */
function createPaidLeaveDayTasks(
    schedules: Schedule[],
    paidLeaveConfig: PaidLeaveInputInfo | undefined,
    project: Project,
    workItems: WorkItemChldren[],
): DayTask[] {
    if (!paidLeaveConfig) {
        return [];
    }

    const paidLeaveSchedules = schedules.filter((schedule) => schedule.isPaidLeave === true);

    // WorkItemを取得
    const paidLeaveWorkItem = workItems.find((w) => w.id === String(paidLeaveConfig.workItemId));
    if (!paidLeaveWorkItem) {
        logger.error("有給休暇のWorkItemが存在しません：" + String(paidLeaveConfig.workItemId));
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
                ...schedule,
                start,
                end,
            },
        };

        // DayTaskを作成
        dayTasks.push({
            baseDate: ScheduleUtils.getBaseDate(paidLeaveEvent.schedule),
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
    workItems: WorkItemChldren[],
): { linked: LinkingEventWorkItemPair[]; remaining: Event[] } {
    if (!timeOffConfig || !timeOffConfig.namePatterns || timeOffConfig.namePatterns.length === 0) {
        logger.info("休暇イベント設定が未設定です");
        return { linked: [], remaining: events };
    }

    const workItem = workItems.find((w) => w.id === String(timeOffConfig.workItemId));
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
    workItems: WorkItemChldren[],
): { linked: LinkingEventWorkItemPair[]; remaining: Event[] } {
    const workItemMap = new Map(workItems.map((w) => [w.id, w]));
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
    workItems: WorkItemChldren[],
): LinkingEventWorkItemPair[] {
    const workItem = workItems.find((w) => w.id === String(scheduleAutoInputInfo.workItemId));
    if (!workItem) {
        logger.error(`勤務時間の自動入力設定WorkItem(ID: ${scheduleAutoInputInfo.workItemId})が見つかりません`);
        return [];
    }

    const workScheduleWorkItem: LinkingWorkItem = {
        type: "auto",
        autoMethod: "workShedule",
        workItem,
    };

    return events.map((event) => {
        return {
            event,
            linkingWorkItem: workScheduleWorkItem,
        };
    });
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
function autoLinkEvents(
    events: Event[],
    scheduleEvents: Event[],
    workItems: WorkItemChldren[],
    settings: TimeTrackerSettings,
    historyManager: HistoryManager,
): AutoLinkingResult {
    let remainingEvents = events;
    const allLinked: LinkingEventWorkItemPair[] = [];

    // 1. 休暇イベントの自動紐付け
    const timeOffResult = linkTimeOffEvents(remainingEvents, settings.timeOffEvent, workItems);
    allLinked.push(...timeOffResult.linked);
    remainingEvents = timeOffResult.remaining;

    // 2. 履歴からの自動紐付け（設定で有効な場合）
    if (settings.isHistoryAutoInput) {
        const historyResult = linkFromHistory(remainingEvents, historyManager, workItems);
        allLinked.push(...historyResult.linked);
        remainingEvents = historyResult.remaining;
    }

    // 3. 勤務時間イベントの紐づけ
    allLinked.push(...linkFromWorkSchedule(scheduleEvents, settings.scheduleAutoInputInfo, workItems));

    return {
        linked: allLinked,
        unlinked: remainingEvents,
        excluded: [], // performAutoLinkingで設定される
    };
}

function filterSheduleRangeEvent(
    dayTasksResult: DayTask[],
    enableSchedules: Schedule[],
): [DayTask[], ExcludedEventInfo[]] {
    const excludedEvents: ExcludedEventInfo[] = [];

    let filteredDayTasks: DayTask[];
    if (enableSchedules.length === 0) {
        logger.info("スケジュール情報なし（ICSのみ）: すべてのイベントを処理対象とします");
        filteredDayTasks = dayTasksResult;
    } else {
        // ScheduleUtils.getBaseDateKeyを使用してYYYY-MM-DD形式の日付キーを取得
        const scheduleDates = new Set(enableSchedules.map((s) => ScheduleUtils.getBaseDateKey({ start: s.start, end: s.end })));

        // フィルタリング前のイベントを記録
        const allEventsInTasks = dayTasksResult.flatMap((task) => task.events);
        const filteredEventsInTasks = new Set<string>();

        filteredDayTasks = dayTasksResult.filter((task) => {
            // ScheduleUtils.getDateKeyを使用してタイムゾーンに依存しない日付比較を実行
            const taskDate = ScheduleUtils.getDateKey(task.baseDate);
            const isInRange = scheduleDates.has(taskDate);
            if (isInRange) {
                task.events.forEach((e) => filteredEventsInTasks.add(e.uuid));
            }
            return isInRange;
        });

        // スケジュール範囲外のイベントを記録
        allEventsInTasks.forEach((event) => {
            if (!filteredEventsInTasks.has(event.uuid)) {
                excludedEvents.push({
                    event,
                    reason: "outOfSchedule",
                    reasonDetail: "勤務日範囲外",
                });
            }
        });

        logger.info(`スケジュール範囲フィルタリング後: ${filteredDayTasks.length}日分のタスク`);
    }

    return [filteredDayTasks, excludedEvents];
}

/**
 * WorkItemとProjectの存在を検証し、無効な設定をクリアした新しい設定を返す
 *
 * @param settings - 検証対象のTimeTracker設定
 * @param workItems - 有効なWorkItemのリスト
 * @param projects - 有効なProjectのリスト（オプション）
 * @returns 更新された設定とクリアされた項目数
 */
export function validateAndCleanupSettings(
    settings: TimeTrackerSettings,
    workItems: WorkItemChldren[],
    projects?: Project[],
): { settings: TimeTrackerSettings; cleanedCount: number } {
    let cleanedCount = 0;
    const updates: Partial<TimeTrackerSettings> = {};

    // WorkItemIDのセット（高速検索用）
    const validWorkItemIds = new Set(workItems.map((wi) => Number(wi.id)));

    // 1. baseProjectId の検証
    if (settings.baseProjectId !== null) {
        // プロジェクトリストが提供されている場合のみ検証
        if (projects && projects.length > 0) {
            const projectExists = projects.some((p) => Number(p.projectId) === settings.baseProjectId);
            if (!projectExists) {
                logger.warn(`baseProjectId (${settings.baseProjectId}) が存在しないため、nullに設定します`);
                updates.baseProjectId = null;
                cleanedCount++;
            }
        }
    }

    // 2. timeOffEvent.workItemId の検証
    if (settings.timeOffEvent?.workItemId) {
        if (!validWorkItemIds.has(settings.timeOffEvent.workItemId)) {
            logger.warn(`timeOffEvent.workItemId (${settings.timeOffEvent.workItemId}) が存在しないため、削除します`);
            updates.timeOffEvent = undefined;
            cleanedCount++;
        }
    }

    // 3. scheduleAutoInputInfo.workItemId の検証
    if (settings.scheduleAutoInputInfo?.workItemId) {
        if (!validWorkItemIds.has(settings.scheduleAutoInputInfo.workItemId)) {
            logger.warn(
                `scheduleAutoInputInfo.workItemId (${settings.scheduleAutoInputInfo.workItemId}) が存在しないため、workItemIdを0に設定します`,
            );
            updates.scheduleAutoInputInfo = {
                ...settings.scheduleAutoInputInfo,
                workItemId: 0,
            };
            cleanedCount++;
        }
    }

    // 4. paidLeaveInputInfo.workItemId の検証
    if (settings.paidLeaveInputInfo?.workItemId) {
        if (!validWorkItemIds.has(settings.paidLeaveInputInfo.workItemId)) {
            logger.warn(
                `paidLeaveInputInfo.workItemId (${settings.paidLeaveInputInfo.workItemId}) が存在しないため、削除します`,
            );
            updates.paidLeaveInputInfo = undefined;
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        logger.info(`${cleanedCount}件の無効な設定をクリアしました`);
    }

    return {
        settings: {
            ...settings,
            ...updates,
        },
        cleanedCount,
    };
}

/**
 * 自動紐付け処理を実行する
 *
 * @param input - 自動紐付け処理の入力データ
 * @returns 自動紐付け処理の結果
 */
export async function performAutoLinking(input: AutoLinkingInput): Promise<AutoLinkingResult> {
    const { events, schedules, project, workItemChirdren: workItems, timetracker: settings } = input;

    logger.info("自動紐付け開始");

    // 1. 有効なイベント、除外されたイベントを取得
    const ignorableEvents = settings.ignorableEvents || [];
    const [enableEvents, excludedEvents] = getEnableEvents(events, ignorableEvents);

    // 2. 有効なスケジュール（休日・エラーを除く）を取得
    const enableSchedules = getEnableSchedules(schedules);

    // 3. 1日ごとのタスク分割を実行
    const dayTasksResult = splitEventsByDay(enableEvents, enableSchedules, project, settings);

    // 4. スケジュールの日付範囲でフィルタリング（勤怠情報がある日のみ）
    // ※ スケジュールが空の場合（ICSのみ）は、すべてのイベントを処理対象とする
    const [filteredDayTasks, excludedScheduleEvents] = filterSheduleRangeEvent(dayTasksResult, enableSchedules);

    // 5. 有給休暇の日別タスクを生成
    const paidLeaveDayTasks = createPaidLeaveDayTasks(schedules, settings.paidLeaveInputInfo, project, workItems);
    logger.info(`有給休暇タスク: ${paidLeaveDayTasks.length}日分`);

    // 6. 通常のタスクと有給休暇タスクを結合
    const allDayTasks = [...paidLeaveDayTasks, ...filteredDayTasks];
    allDayTasks.sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());

    // 7. 分割後のイベントを抽出（有給休暇を含む）
    const processedEvents = allDayTasks.flatMap((dayTask) => dayTask.events);
    const processedScheduleEvents = allDayTasks.flatMap((dayTask) => dayTask.scheduleEvents);
    logger.info(`分割後のイベント数（有給休暇含む）: ${processedEvents.length}`);
    logger.info(`分割後の勤務イベント数: ${processedScheduleEvents.length}`);

    // 8. HistoryManagerのインスタンスを作成
    const historyManager = new HistoryManager();
    historyManager.load();

    // 9. 自動紐付けを実行
    const linkingResult = autoLinkEvents(processedEvents, processedScheduleEvents, workItems, settings, historyManager);

    logger.info(
        `自動紐付け完了: 紐付け済み=${linkingResult.linked.length}, 未紐付け=${linkingResult.unlinked.length}, 除外=${excludedEvents.length + excludedScheduleEvents.length}`,
    );

    return {
        ...linkingResult,
        excluded: [...excludedEvents, ...excludedScheduleEvents],
    };
}

/**
 * 紐づけ処理の統計データを計算する
 *
 * @returns 統計データ
 */
export function calculateLinkingStatistics(
    unlinked: Event[],
    linkedItem: LinkingEventWorkItemPair[],
    excludedEvent: ExcludedEventInfo[],
): TaskStatistics {
    const allEvents = [...linkedItem.map((l) => l.event), ...unlinked].sort(
        (a, b) => ScheduleUtils.getBaseDate(a.schedule).getTime() - ScheduleUtils.getBaseDate(b.schedule).getTime(),
    );

    // 日付ごとに重複を排除して日数をカウントする（有給/通常を区別）
    const normalDaySet = new Set<string>();
    const paidLeaveDaysSet = new Set<string>();
    for (const e of allEvents) {
        const key = ScheduleUtils.getBaseDateKey(e.schedule);
        if (e.schedule.isPaidLeave) {
            paidLeaveDaysSet.add(key);
        } else {
            normalDaySet.add(key);
        }
    }

    const from = allEvents.length > 0 ? ScheduleUtils.getBaseDate(allEvents[0].schedule) : getCurrentDate();
    const end = allEvents.length > 0 ? ScheduleUtils.getBaseDate(allEvents[allEvents.length - 1].schedule) : getCurrentDate();
    const day = {
        normalDays: normalDaySet.size,
        paidLeaveDays: paidLeaveDaysSet.size,
        from,
        end,
    };

    const linked: LinkingStatistics = {
        manualCount: linkedItem.filter((i) => i.linkingWorkItem.type === "manual").length,
        aiLinked: linkedItem.filter((i) => i.linkingWorkItem.autoMethod === "ai").length,
        historyCount: linkedItem.filter((i) => i.linkingWorkItem.autoMethod === "history").length,
        timeOffCount: linkedItem.filter((i) => i.linkingWorkItem.autoMethod === "timeOff").length,
        workSheduleCount: linkedItem.filter((i) => i.linkingWorkItem.autoMethod === "workShedule").length,
        unlinkedCount: unlinked.length,
    };

    const excluded = excludedEvent.reduce(
        (acc, info) => {
            if (info.reason === "ignored") acc.ignored++;
            else if (info.reason === "outOfSchedule") acc.outOfSchedule++;
            else if (info.reason === "invalid") acc.invalid++;
            return acc;
        },
        { ignored: 0, outOfSchedule: 0, invalid: 0 },
    );

    logger.info("＝＝＝統計データ＝＝＝");
    logger.info(JSON.stringify(linked, null, 2));
    logger.info(JSON.stringify(day, null, 2));
    logger.info(JSON.stringify(excluded, null, 2));

    return {
        day,
        linked,
        excluded,
    };
}
