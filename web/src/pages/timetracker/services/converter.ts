/**
 * TimeTracker Logic Service
 *
 * TimeTrackerの全ビジネスロジックを統合したサービス
 * - イベントとWorkItemの自動紐付け
 * - 統計情報の計算
 * - 自動紐付けプロセスの実行
 * - データ検証
 */

import { TimeTrackerAlgorithmEvent, TimeTrackerAlgorithmSchedule } from "@/core/algorithm";
import { IgnoreManager } from "@/core/ignore";
import {
    PaidLeaveInputInfo,
    type Event,
    type IgnorableEventPattern,
    type Schedule,
    type TimeTrackerSettings,
} from "@/types";
import { ExcludedEventInfo, ExcludedScheduleInfo } from "../models/linking";

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
function getEnableSchedules(schedules: Schedule[]): [Schedule[], ExcludedScheduleInfo[]] {
    const excludedSchedules: ExcludedScheduleInfo[] = [];
    const enableSchedules = schedules.filter((schedule) => {
        if (schedule.isHoliday) {
            excludedSchedules.push({
                schedule,
                reason: "holiday",
                reasonDetail: schedule.isPaidLeave ? "有給" : "休日",
            });
            return false;
        }

        if (schedule.errorMessage) {
            excludedSchedules.push({
                schedule,
                reason: "invalid",
                reasonDetail: schedule.errorMessage,
            });
            return false;
        }

        return true;
    });

    return [enableSchedules, excludedSchedules];
}

/**
 * 有給休暇のEventを生成
 *
 * @param paidLeaveSchedules - スケジュール一覧
 * @param settings - TimeTracker設定
 * @param project - プロジェクト情報
 * @returns 有給休暇のEvent
 */
function createPaidLeaveDayEvent(schedules: Schedule[], paidLeaveConfig?: PaidLeaveInputInfo): Event[] {
    if (!paidLeaveConfig) {
        return [];
    }

    const paidLeaveSchedules = schedules.filter((schedule) => schedule.isPaidLeave === true);
    if (paidLeaveSchedules.length === 0) {
        return [];
    }

    // 時間をパース
    const [startHour, startMinute] = paidLeaveConfig.startTime.split(":").map(Number);
    const [endHour, endMinute] = paidLeaveConfig.endTime.split(":").map(Number);

    return paidLeaveSchedules.map((schedule) => {
        // 有給休暇の時間を設定
        const start = new Date(schedule.start);
        start.setHours(startHour, startMinute, 0, 0);

        const end = new Date(schedule.start);
        end.setHours(endHour, endMinute, 0, 0);

        // 有給休暇イベントを作成
        return {
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
    });
}

export function getAllEvents(timetracker: TimeTrackerSettings, schedules: Schedule[], events: Event[]) {
    // 有効なスケジュール（休日・エラーを除く）を取得
    const [enableSchedules, excludedSchedules] = getEnableSchedules(schedules);

    // 有効なイベント、除外されたイベントを取得
    const [enableEvents, excludedEvents] = getEnableEvents(events, timetracker.ignorableEvents || []);

    // 有給休暇の日別タスクを生成
    const paidLeaveDayEvents = createPaidLeaveDayEvent(schedules, timetracker.paidLeaveInputInfo);

    // 繰り返しイベントを作成
    const recurrenceEvents = enableEvents.flatMap((event) => TimeTrackerAlgorithmEvent.getRecurrenceEvent(event));

    // 勤務日外のイベントは削除
    const allEvents = [...enableEvents, ...recurrenceEvents];
    const filterdEvents = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(allEvents, enableSchedules);

    // 勤務日外のイベントを取得
    const enbleUUID = filterdEvents.map((e) => e.uuid);
    excludedEvents.push(
        ...allEvents
            .filter((event) => !enbleUUID.includes(event.uuid))
            .map<ExcludedEventInfo>((event) => {
                return {
                    event,
                    reason: "outOfSchedule",
                    reasonDetail: "勤務時間外です。",
                };
            }),
    );

    // 勤務日イベントを作成
    const scheduleEvents = enableSchedules.flatMap((s) =>
        TimeTrackerAlgorithmSchedule.scheduleToEvent(s, timetracker.scheduleAutoInputInfo, filterdEvents),
    );

    return {
        schedules: enableSchedules,
        events: filterdEvents,
        scheduleEvents,
        paidLeaveDayEvents,
        excludedSchedules,
        excludedEvents,
    };
}
