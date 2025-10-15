import { Schedule, Event } from "@/types";
import { EventWithOption } from "../components/EventTable";
import { AdjustedEventInfo, ExcludedScheduleInfo, ExcludedEventInfo } from "../models";
import { TimeTrackerAlgorithmCore } from "@/core/algorithm/TimeTrackerAlgorithmCore";

export type EventState = {
    // 有効なスケジュール（休日・エラーを除く）
    enableSchedules: Schedule[];
    // 有効なイベント
    enableEvents: Event[];
    // 勤務日イベント
    scheduleEvents: Event[];
    // 時間調整されたイベント
    adjustedEvents: AdjustedEventInfo[];
    // 有給休暇の日別イベント
    paidLeaveDayEvents: Event[];
    // 除外されたスケジュール
    excludedSchedules: ExcludedScheduleInfo[];
    // 除外されたイベント
    excludedEvents: ExcludedEventInfo[];
};

export const pickEvents = (state: EventState): EventWithOption[] => {
    const allEvents: EventWithOption[] = [];

    if (state.enableEvents) {
        allEvents.push(...state.enableEvents);
    }

    if (state.adjustedEvents) {
        const adjustedEvents = state.adjustedEvents.map((a) => ({
            ...a.event,
            oldSchedule: a.oldSchdule,
        }));
        allEvents.push(...adjustedEvents);
    }

    if (state.paidLeaveDayEvents) {
        allEvents.push(...state.paidLeaveDayEvents);
    }

    if (state.scheduleEvents) {
        allEvents.push(...state.scheduleEvents);
    }

    // 各イベントに対して重複をチェックし、重複しているイベントのUUIDを収集
    return allEvents.map((event) => {
        // 自分自身以外で重複しているイベントを検索
        const duplicatedEvents = allEvents.filter((otherEvent) => TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule(event, [otherEvent]));
        // 重複がある場合、すべての重複UUIDを付与
        if (duplicatedEvents.length > 0) {
            const duplicationUUID = duplicatedEvents.map((e) => e.uuid);
            return {
                ...event,
                duplicationUUID,
            };
        }
        return event;
    });
}