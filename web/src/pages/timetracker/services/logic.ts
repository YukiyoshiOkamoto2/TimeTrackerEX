/**
 * TimeTracker Logic Service
 *
 * TimeTrackerの全ビジネスロジックを統合したサービス
 * - イベントとWorkItemの自動紐付け
 * - 統計情報の計算
 * - 自動紐付けプロセスの実行
 * - データ検証
 */

import { getLogger } from "@/lib/logger";
import { ScheduleUtils, type DayTask, type Schedule } from "@/types";
import { ExcludedEventInfo } from "../models/linking";

const logger = getLogger("TimeTrackerLogic");

/**
 * イベントを1日ごとのタスクに分割
 *
 * @param events - イベント一覧
 * @param schedules - スケジュール一覧（有給休暇を除く）
 * @param project - プロジェクト情報
 * @param settings - TimeTracker設定
 * @returns 1日ごとのタスク一覧
 */
// function splitEventsByDay(events: Event[], schedules: Schedule[], settings: TimeTrackerSettings): DayTask[] {
//     // EventInputInfoを作成
//     const eventInputInfo: EventInputInfo = {
//         eventDuplicateTimeCompare: settings.eventDuplicatePriority.timeCompare,
//         roundingTimeType: settings.roundingTimeTypeOfEvent,
//     };

//     // TimeTrackerAlgorithmを初期化
//     const algorithm = new TimeTrackerAlgorithm(eventInputInfo, settings.scheduleAutoInputInfo);

//     // 1日ごとのタスクに分割
//     const dayTasks = algorithm.splitOneDayTask(events, schedules);

//     return dayTasks;
// }

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
        const scheduleDates = new Set(
            enableSchedules.map((s) => ScheduleUtils.getBaseDateKey({ start: s.start, end: s.end })),
        );

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

// /**
//  * 自動紐付け処理を実行する
//  *
//  * @param input - 自動紐付け処理の入力データ
//  * @returns 自動紐付け処理の結果
//  */
// export async function performAutoLinking(input: AutoLinkingInput): Promise<AutoLinkingResult> {
//     const { events, schedules, workItemChirdren: workItems, timetracker: settings } = input;

//     logger.info("自動紐付け開始");

//     // 1. 有効なイベント、除外されたイベントを取得
//     const ignorableEvents = settings.ignorableEvents || [];
//     const [enableEvents, excludedEvents] = getEnableEvents(events, ignorableEvents);

//     // 2. 有効なスケジュール（休日・エラーを除く）を取得
//     const enableSchedules = getEnableSchedules(schedules);

//     // 3. 1日ごとのタスク分割を実行
//     const dayTasksResult = splitEventsByDay(enableEvents, enableSchedules, settings);

//     // 4. スケジュールの日付範囲でフィルタリング（勤怠情報がある日のみ）
//     // ※ スケジュールが空の場合（ICSのみ）は、すべてのイベントを処理対象とする
//     const [filteredDayTasks, excludedScheduleEvents] = filterSheduleRangeEvent(dayTasksResult, enableSchedules);

//     // 5. 有給休暇の日別タスクを生成
//     const paidLeaveDayTasks = createPaidLeaveDayTasks(schedules, settings.paidLeaveInputInfo, workItems);
//     logger.info(`有給休暇タスク: ${paidLeaveDayTasks.length}日分`);

//     // 6. 通常のタスクと有給休暇タスクを結合
//     const allDayTasks = [...paidLeaveDayTasks, ...filteredDayTasks];
//     allDayTasks.sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());

//     // 7. 分割後のイベントを抽出（有給休暇を含む）
//     const processedEvents = allDayTasks.flatMap((dayTask) => dayTask.events);
//     const processedScheduleEvents = allDayTasks.flatMap((dayTask) => dayTask.scheduleEvents);
//     logger.info(`分割後のイベント数（有給休暇含む）: ${processedEvents.length}`);
//     logger.info(`分割後の勤務イベント数: ${processedScheduleEvents.length}`);

//     // 8. HistoryManagerのインスタンスを作成
//     const historyManager = new HistoryManager();
//     historyManager.load();

//     // 9. 自動紐付けを実行
//     const linkingResult = autoLinkEvents(processedEvents, processedScheduleEvents, workItems, settings, historyManager);

//     logger.info(
//         `自動紐付け完了: 紐付け済み=${linkingResult.linked.length}, 未紐付け=${linkingResult.unlinked.length}, 除外=${excludedEvents.length + excludedScheduleEvents.length}`,
//     );

//     return {
//         ...linkingResult,
//         excluded: [...excludedEvents, ...excludedScheduleEvents],
//     };
// }
