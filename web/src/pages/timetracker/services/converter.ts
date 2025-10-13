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
    createEvent,
    EventUtils,
    PaidLeaveInputInfo,
    ScheduleUtils,
    type Event,
    type IgnorableEventPattern,
    type Schedule,
    type TimeTrackerSettings,
} from "@/types";
import { AdjustedEventInfo, ExcludedEventInfo, ExcludedEventReasonDetail, ExcludedScheduleInfo, ExcludedScheduleReasonDetail } from "../models/";
import { TimeTrackerAlgorithmCore } from '../../../core/algorithm/TimeTrackerAlgorithmCore';

/**
 * 有効なイベント（無視リストに含まれないイベント）を取得
 */
function getEnableEvents(
    events: Event[],
    ignorableEventPatterns: IgnorableEventPattern[],
): [Event[], ExcludedEventInfo[]] {
    const enableEvents: Event[] = [];
    const excludedEvents: ExcludedEventInfo[] = [];
    const ignoreManager = new IgnoreManager(ignorableEventPatterns);

    events.forEach((event) => {
        const details: ExcludedEventReasonDetail[] = [];

        let isError = false;
        if (event.isPrivate || event.isCancelled) {
            details.push({
                reason: "invalid",
                message: event.isPrivate ? "非公開イベント" : "キャンセル済みイベント",
            });
            isError = true;
        }

        if (ignoreManager.ignoreEvent(event)) {
            details.push({
                reason: "ignored",
                message: "無視リストに一致",
            });
            isError = true;
        }

        const checed = TimeTrackerAlgorithmCore.check(event)
        if (checed) {
            checed.details.forEach(d => {
                details.push(d)
            })
            isError = true;
        }

        if (!isError) {
            enableEvents.push(event)
        }
    });

    return [enableEvents, excludedEvents];
}

/**
 * 有効なスケジュール（休日・エラーを除く）を取得
 */
function getEnableSchedules(schedules: Schedule[]): [Schedule[], ExcludedScheduleInfo[]] {
    const enableSchedules: Schedule[] = []
    const excludedSchedules: ExcludedScheduleInfo[] = [];

    schedules.forEach((schedule) => {
        const details: ExcludedScheduleReasonDetail[] = [];

        let isError = false;
        if (schedule.isHoliday) {
            details.push({
                reason: "holiday",
                message: schedule.isPaidLeave ? "有給" : "休日",
            });
            isError = true;
        }

        if (schedule.errorMessage) {
            details.push({
                reason: "invalid",
                message: schedule.errorMessage,
            });
            isError = true;
        }

        const checed = TimeTrackerAlgorithmCore.check(schedule)
        if (checed) {
            checed.details.forEach(d => {
                details.push(d)
            })
        }

        if (details.length > 0) {
            excludedSchedules.push({
                schedule,
                details,
            });
            isError = true;
        }

        const duplicateDaysIndex = enableSchedules.findIndex(s => ScheduleUtils.getBaseDateKey(s) === ScheduleUtils.getBaseDateKey(schedule))
        if (duplicateDaysIndex > -1) {
            details.push({
                reason: "invalid",
                message: `日付が重複しています。: ${ScheduleUtils.getText(enableSchedules[duplicateDaysIndex])}, ${ScheduleUtils.getText(schedule)}`,
            });
            isError = true;
        }

        if (!isError) {
            enableSchedules.push(schedule)
        }
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
        return createEvent("有給休暇", {
            ...schedule,
            start,
            end,
        }, "Automatic")

    });
}

type AllEvents = {
    // 有効なスケジュール（休日・エラーを除く） 
    enableSchedules: Schedule[]
    // 有効なイベント
    enableEvents: Event[],
    // 勤務日イベント
    scheduleEvents: Event[],
    // 時間調整されたイベント
    adjustedEvents: AdjustedEventInfo[],
    // 有給休暇の日別イベント
    paidLeaveDayEvents: Event[],
    // 除外されたスケジュール
    excludedSchedules: ExcludedScheduleInfo[],
    // 除外されたイベント
    excludedEvents: ExcludedEventInfo[],
}

export function getAllEvents(timetracker: TimeTrackerSettings, schedules: Schedule[], events: Event[]): AllEvents {
    // 有効なスケジュール（休日・エラーを除く）を取得
    const [enableSchedules, excludedSchedules] = getEnableSchedules(schedules);

    // 有効なイベント、除外されたイベントを取得
    const [enableEvents, excludedEvents] = getEnableEvents(events, timetracker.ignorableEvents || []);

    // 有給休暇の日別イベントを生成
    const paidLeaveDayEvents = createPaidLeaveDayEvent(schedules, timetracker.paidLeaveInputInfo);

    // 繰り返しイベントを作成
    const recurrenceEvents = enableEvents.flatMap((event) => TimeTrackerAlgorithmEvent.getRecurrenceEvent(event));
    // イベント丸め処理
    const allEvents = [...enableEvents, ...recurrenceEvents];
    const roundedEvents: Event[] = [];
    allEvents.forEach(event => {
        const roundedSchedule = TimeTrackerAlgorithmCore.roundingSchedule(
            event.schedule,
            timetracker.roundingTimeTypeOfEvent,
            allEvents,
        );
        if (roundedSchedule) {
            roundedEvents.push(EventUtils.scheduled(event, roundedSchedule));
        } else {
            excludedEvents.push({
                event,
                details: [
                    {
                        reason: "invalid",
                        message: "丸め処理により削除されました。"
                    }
                ]
            })
        }
    })

    // 勤務日外のイベントは削除    
    const filterdEventResult = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(roundedEvents, enableSchedules);
    const filterdEvents = filterdEventResult.enableEvents;
    const adjustedEvents = filterdEventResult.adjustedEvents.map(e => {
        return {
            ...e,
            event: e.newValue
        }
    });
    filterdEventResult.excluedEvents.forEach(e => {
        excludedEvents.push({
            event: e.target,
            details: e.details,
        })
    })

    // 勤務日イベントを作成
    const scheduleEvents = enableSchedules.flatMap((s) =>
        TimeTrackerAlgorithmSchedule.scheduleToEvent(s, timetracker.scheduleAutoInputInfo, [...adjustedEvents.map(a => a.event), ...filterdEvents]),
    );

    alert(excludedEvents.map(e => EventUtils.getText(e.event) + e.details.map(d => d.message).join()).join(""))
    return {
        enableSchedules,
        enableEvents: filterdEvents,
        scheduleEvents,
        adjustedEvents,
        paidLeaveDayEvents,
        excludedSchedules,
        excludedEvents,
    };
}
