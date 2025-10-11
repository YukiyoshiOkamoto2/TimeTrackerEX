import { getCurrentDate, getLogger } from "@/lib";
import type { Event, RoundingMethod, Schedule } from "@/types";
import { EventUtils, ScheduleUtils } from "@/types/utils";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

const logger = getLogger("TimeTrackerAlgorithmCore");

const debug = false;
const debugLog = (str: string) => {
    if (debug) {
        logger.info(str);
    }
};

export const MAX_TIME = 6 * 60 * 60 * 1000; // 6時間
export const MAX_OLD = 30; // 30日
export const ROUNDING_TIME_UNIT = 30; // 30分

/**
 * 時間を丸める処理
 */
export function roundingTime(time: Date, backward: boolean, roundingTimeUnit: number = ROUNDING_TIME_UNIT): Date {
    const mod = time.getMinutes() % roundingTimeUnit;
    if (mod === 0) {
        return time;
    }

    const result = new Date(time);
    result.setSeconds(0);
    result.setMilliseconds(0);

    if (backward) {
        result.setMinutes(time.getMinutes() + roundingTimeUnit - mod);
    } else {
        result.setMinutes(time.getMinutes() - mod);
    }

    return result;
}

/**
 * スケジュールを指定された丸めタイプに基づいて丸める処理
 */
export function roundingSchedule(
    schedule: Schedule,
    roundingTimeType: RoundingMethod,
    events: Event[] = [],
    roundingTimeUnit: number = ROUNDING_TIME_UNIT,
): Schedule | null {
    if (roundingTimeType === "nonduplicate" && !events) {
        throw new Error("イベントが未設定です。");
    }

    if (!schedule.end) {
        return null;
    }

    const startMinuteMod = schedule.start.getMinutes() % roundingTimeUnit;
    const endMinuteMod = schedule.end.getMinutes() % roundingTimeUnit;
    const isStartRounding = startMinuteMod !== 0;
    const isEndRounding = endMinuteMod !== 0;

    if (!isStartRounding && !isEndRounding) {
        return schedule;
    }

    let start = new Date(schedule.start);
    let end = new Date(schedule.end);

    if (roundingTimeType === "backward") {
        if (isStartRounding) {
            start = roundingTime(start, true, roundingTimeUnit);
        }
        if (isEndRounding) {
            end = roundingTime(end, true, roundingTimeUnit);
        }
    } else if (roundingTimeType === "forward") {
        if (isStartRounding) {
            start = roundingTime(start, false, roundingTimeUnit);
        }
        if (isEndRounding) {
            end = roundingTime(end, false, roundingTimeUnit);
        }
    } else if (roundingTimeType === "round") {
        if (isStartRounding) {
            const toBackward = startMinuteMod >= roundingTimeUnit / 2;
            start = roundingTime(start, toBackward, roundingTimeUnit);
        }
        if (isEndRounding) {
            const toBackward = endMinuteMod >= roundingTimeUnit / 2;
            end = roundingTime(end, toBackward, roundingTimeUnit);
        }
    } else if (roundingTimeType === "stretch") {
        if (isStartRounding) {
            start = roundingTime(start, false, roundingTimeUnit);
        }
        if (isEndRounding) {
            end = roundingTime(end, true, roundingTimeUnit);
        }
    } else if (roundingTimeType === "half") {
        if (isStartRounding) {
            const toBackward = startMinuteMod >= roundingTimeUnit / 2;
            start = roundingTime(start, toBackward, roundingTimeUnit);
        }
        if (isEndRounding) {
            const toBackward = endMinuteMod >= roundingTimeUnit / 2;
            end = roundingTime(end, toBackward, roundingTimeUnit);
        }
    } else if (roundingTimeType === "nonduplicate") {
        if (isStartRounding) {
            const oldStart = new Date(start);
            start = roundingTime(start, false, roundingTimeUnit);
            const testSchedule = { ...schedule, start, end: schedule.end };

            if (TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(testSchedule, events)) {
                start = roundingTime(oldStart, true, roundingTimeUnit);
            }
        }
        if (isEndRounding) {
            const oldEnd = new Date(end);
            // 終了時刻はまずbackward(切り上げ)を試す
            end = roundingTime(end, true, roundingTimeUnit);
            const testSchedule = { ...schedule, start: schedule.start, end };

            // 重複する場合はforward(切り捨て)を試す
            if (TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(testSchedule, events)) {
                end = roundingTime(oldEnd, false, roundingTimeUnit);
            }
        }
    }

    debugLog(`===スケジュールの丸め込み処理 ( Type: ${roundingTimeType}, Event: ${events.length}件 )===`);
    debugLog(`BEFORE: ${ScheduleUtils.getText(schedule)}`);
    debugLog(`AFTER: ${ScheduleUtils.getText({ ...schedule, start, end })}`);
    debugLog(`======================================================`);

    if (
        start.getTime() === end.getTime() ||
        start > end ||
        end.getTime() - start.getTime() < roundingTimeUnit * 60 * 1000
    ) {
        logger.info(`スケジュールが削除されました。${ScheduleUtils.getText(schedule)} -> ${start} - ${end}`);
        return null;
    }

    return {
        ...schedule,
        start,
        end,
    };
}

/**
 * イベントのチェック処理
 */
export function checkEvent(
    events: Event[],
    maxTime: number = MAX_TIME,
    maxOld: number = MAX_OLD,
    roundingTimeUnit: number = ROUNDING_TIME_UNIT,
): Event[] {
    const now = getCurrentDate();
    const old = new Date(now.getTime() - maxOld * 24 * 60 * 60 * 1000);

    const result: Event[] = [];
    const logText = [];

    for (const event of events) {
        const range = ScheduleUtils.getRange(event.schedule);

        // 6時間以上のイベントは削除
        if (range && range > maxTime) {
            logText.push(`6時間以上: ${EventUtils.getText(event)}`);
            continue;
        }

        // 未来のイベントは削除(開始時刻が現在より未来)
        if (event.schedule.start > now) {
            logText.push(`未来のイベント: ${EventUtils.getText(event)}`);
            continue;
        }

        // 30日以上前のイベントは削除
        if (event.schedule.end && event.schedule.end < old) {
            logText.push(`30日以上前のイベント: ${EventUtils.getText(event)}`);
            continue;
        }

        // 開始時間と終了時間が同じ、または丸め単位よりも小さい場合は削除
        if (
            !event.schedule.end ||
            event.schedule.start.getTime() === event.schedule.end.getTime() ||
            (range && range < roundingTimeUnit * 60 * 1000)
        ) {
            logText.push(`開始時間と終了時間が同じ、または丸め単位よりも小さい: ${EventUtils.getText(event)}`);
            continue;
        }

        result.push(event);
    }

    debugLog(`===イベントのチェック処理 ( ${events.length}件 )===`);
    debugLog(`RESULT: ${result.length}件`);
    logText.forEach((t) => debugLog(`---> ${t}`));
    debugLog(`=================================================`);

    return result;
}
