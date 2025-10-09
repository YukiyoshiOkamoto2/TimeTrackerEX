/**
 * TimeTracker Service
 *
 * TimeTrackerの主要なビジネスロジックを統合したサービス
 * - イベントとWorkItemの自動紐付け
 * - 統計情報の計算
 * - 自動紐付けプロセスの実行
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

const logger = getLogger("TimeTrackerService");

// ==================== 型定義 ====================

/**
 * 統計データの型定義
 */
export interface LinkingStatistics {
    /** 紐づけ済みイベント数 */
    linkedCount: number;
    /** 休暇イベント数 */
    timeOffCount: number;
    /** 履歴から紐づけされたイベント数 */
    historyCount: number;
    /** 未紐づけイベント数 */
    unlinkedCount: number;
    /** 手動紐づけイベント数 */
    manualCount: number;
    /** 総紐づけイベント数（自動 + 手動） */
    totalLinked: number;
    /** 有給休暇の日数 */
    paidLeaveDays: number;
    /** 通常勤務の日数 */
    normalTaskDays: number;
    /** 総日数 */
    totalDays: number;
    /** 通常イベント数（分割されていないイベント） */
    normalEventCount: number;
    /** 勤務時間変換イベント数（分割されたイベント） */
    convertedEventCount: number;
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
    workItems: WorkItem[];
    /** TimeTracker設定 */
    settings: TimeTrackerSettings;
}

/**
 * 自動紐付け処理の結果
 */
export interface AutoLinkingProcessResult {
    /** 紐付け結果 */
    linkingResult: AutoLinkingResult;
    /** 日別タスク */
    dayTasks: DayTask[];
}

// ==================== イベントフィルタリング ====================

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

// ==================== タスク分割 ====================

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
        return [];
    }

    // WorkItemを取得
    const paidLeaveWorkItem = workItems.find((w) => w.id === String(paidLeaveConfig.workItemId));
    if (!paidLeaveWorkItem) {
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

// ==================== 自動紐付け ====================

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
    }

    return {
        linked: allLinked,
        unlinked: remainingEvents,
        timeOffCount: timeOffResult.linked.length,
        historyCount,
        excluded: [], // performAutoLinkingで設定される
    };
}

/**
 * 手動でイベントとWorkItemを紐付け
 *
 * @param event - 紐付け対象のイベント
 * @param workItem - 紐付けるWorkItem
 * @param historyManager - 履歴マネージャー（履歴に保存する場合）
 */
export function manualLinkEvent(event: Event, workItem: WorkItem, historyManager?: HistoryManager): EventWorkItemPair {
    if (historyManager) {
        historyManager.setHistory(event, workItem);
        logger.debug(`履歴に保存: ${event.name} -> ${workItem.name}`);
    }

    return { event, workItem };
}

// ==================== 自動紐付けプロセス ====================

/**
 * 自動紐付け処理を実行する
 *
 * @param input - 自動紐付け処理の入力データ
 * @returns 自動紐付け処理の結果
 */
export async function performAutoLinking(input: AutoLinkingInput): Promise<AutoLinkingProcessResult> {
    const { events, schedules, project, workItems, settings } = input;

    logger.info("自動紐付け開始");

    // 除外されたイベントを記録する配列
    const excludedEvents: Array<{
        event: Event;
        reason: "ignored" | "outOfSchedule" | "invalid";
        reasonDetail?: string;
    }> = [];

    // 1. 無視リストを適用（除外されたイベントを記録）
    const ignorableEvents = settings.ignorableEvents || [];
    const ignoreManager = new IgnoreManager(ignorableEvents);
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

    // 2. 有効なスケジュール（休日・エラーを除く）を取得
    const enableSchedules = getEnableSchedules(schedules);

    // 3. 1日ごとのタスク分割を実行
    const dayTasksResult = splitEventsByDay(enableEvents, enableSchedules, project, settings);

    // 4. スケジュールの日付範囲でフィルタリング（勤怠情報がある日のみ）
    // ※ スケジュールが空の場合（ICSのみ）は、すべてのイベントを処理対象とする
    let filteredDayTasks: DayTask[];
    if (enableSchedules.length === 0) {
        logger.info("スケジュール情報なし（ICSのみ）: すべてのイベントを処理対象とします");
        filteredDayTasks = dayTasksResult;
    } else {
        const scheduleDates = new Set(enableSchedules.map((s) => s.start.toISOString().split("T")[0]));

        // フィルタリング前のイベントを記録
        const allEventsInTasks = dayTasksResult.flatMap((task) => task.events);
        const filteredEventsInTasks = new Set<string>();

        filteredDayTasks = dayTasksResult.filter((task) => {
            const taskDate = task.baseDate.toISOString().split("T")[0];
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

    // 5. 有給休暇の日別タスクを生成
    const paidLeaveSchedules = getPaidLeaveSchedules(schedules);
    const paidLeaveDayTasks = createPaidLeaveDayTasks(paidLeaveSchedules, settings, project, workItems);
    logger.info(`有給休暇タスク: ${paidLeaveDayTasks.length}日分`);

    // 6. 通常のタスクと有給休暇タスクを結合
    const allDayTasks = [...paidLeaveDayTasks, ...filteredDayTasks];
    allDayTasks.sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());

    // 7. 分割後のイベントを抽出（有給休暇を含む）
    const processedEvents = allDayTasks.flatMap((dayTask) => dayTask.events);
    logger.debug(`分割後のイベント数（有給休暇含む）: ${processedEvents.length}`);

    // 8. HistoryManagerのインスタンスを作成
    const historyManager = new HistoryManager();
    historyManager.load();

    // 9. 自動紐付けを実行
    const linkingResult = autoLinkEvents(processedEvents, workItems, settings, historyManager);

    logger.info(
        `自動紐付け完了: 紐付け済み=${linkingResult.linked.length}, 未紐付け=${linkingResult.unlinked.length}, 除外=${excludedEvents.length}`,
    );

    return {
        linkingResult: {
            ...linkingResult,
            excluded: excludedEvents,
        },
        dayTasks: allDayTasks,
    };
}

/**
 * 自動紐付け結果のメッセージを生成
 *
 * @param result - 自動紐付け結果
 * @returns メッセージオブジェクト
 */
export function createAutoLinkingResultMessage(result: AutoLinkingResult): {
    title: string;
    message: string;
    type: "INFO" | "WARN";
} {
    const hasUnlinked = result.unlinked.length > 0;

    return {
        title: "自動紐付け完了",
        message:
            `紐づけ処理が完了しました:\n\n` +
            `✅ 紐づけ済み: ${result.linked.length}件\n` +
            `   • 休暇イベント: ${result.timeOffCount}件\n` +
            `   • 履歴から: ${result.historyCount}件\n\n` +
            `${hasUnlinked ? `❌ 未紐づけ: ${result.unlinked.length}件\n（手動で紐づけしてください）` : ""}`,
        type: hasUnlinked ? "WARN" : "INFO",
    };
}

// ==================== 統計情報 ====================

/**
 * 紐づけ処理の統計データを計算する
 *
 * @param linkingResult - 自動紐づけ結果
 * @param manuallyLinkedPairs - 手動紐づけペアのリスト
 * @param schedules - 勤怠情報のスケジュールリスト
 * @param dayTasks - 日別タスク（通常タスク日数計算用）
 * @returns 統計データ
 */
export function calculateLinkingStatistics(
    linkingResult: AutoLinkingResult | null,
    manuallyLinkedPairs: EventWorkItemPair[],
    schedules: Schedule[],
    dayTasks: DayTask[],
): LinkingStatistics {
    const linkedCount = linkingResult?.linked.length || 0;
    const timeOffCount = linkingResult?.timeOffCount || 0;
    const historyCount = linkingResult?.historyCount || 0;
    const unlinkedCount = linkingResult?.unlinked.length || 0;
    const manualCount = manuallyLinkedPairs.length;

    // 有給休暇の日数（isPaidLeave = true）
    const paidLeaveDays = schedules.filter((s) => s.isPaidLeave === true).length;

    // 通常勤務の日数を修正：
    // - dayTasksから有給休暇以外のタスクをカウント
    // - 有給休暇タスクはeventsの最初のイベントがisPaidLeave=trueになっている
    const normalTaskDays = dayTasks.filter((task) => {
        // タスクにイベントがない、または最初のイベントが有給休暇でない場合は通常タスク
        return task.events.length === 0 || !task.events[0].schedule.isPaidLeave;
    }).length;

    // 総日数の計算：
    // - スケジュールがある場合（PDF有）: スケジュールの日数
    // - スケジュールがない場合（ICSのみ）: dayTasksの日数
    const totalDays = schedules.length > 0 ? schedules.length : dayTasks.length;

    // 通常イベントと勤務時間変換イベントの計算
    // 各dayTaskのイベント（events + scheduleEvents）について、元のイベントUUIDをカウント
    const originalEventUuids = new Set<string>();
    let totalProcessedEvents = 0;
    let totalScheduleEvents = 0;

    dayTasks.forEach((task) => {
        // 通常イベント（カレンダーイベント）
        task.events.forEach((event) => {
            // 有給休暇イベントは除外
            if (!event.schedule.isPaidLeave) {
                // 元のイベントUUIDを記録（originalUuidがある場合はそれを使用、なければuuidを使用）
                const originalUuid = (event as any).originalUuid || event.uuid;
                originalEventUuids.add(originalUuid);
                totalProcessedEvents++;
            }
        });
        
        // 勤務時間変換イベント（scheduleから生成されたイベント）
        totalScheduleEvents += task.scheduleEvents.length;
    });

    // 通常イベント数 = 元のイベント数（分割前）
    const normalEventCount = originalEventUuids.size;

    // 勤務時間変換イベント数 = scheduleEventsの合計
    const convertedEventCount = totalScheduleEvents;
    
    logger.debug(`統計計算: 総日数=${totalDays}, 通常イベント=${normalEventCount}, 勤務時間変換イベント=${convertedEventCount}, dayTasks=${dayTasks.length}`);

    return {
        linkedCount,
        timeOffCount,
        historyCount,
        unlinkedCount,
        manualCount,
        totalLinked: linkedCount + manualCount,
        paidLeaveDays,
        normalTaskDays,
        totalDays,
        normalEventCount,
        convertedEventCount,
    };
}
