import { getCurrentDate, getLogger } from "@/lib";
import type { Event, RoundingMethod, Schedule } from "@/types";
import { EventUtils, ScheduleUtils } from "@/types/utils";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";
import { ExcludedInfo, ExcludedReasonDetail } from "./models";

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

export const TimeTrackerAlgorithmCore = {
    /**
     * 時間を丸める処理
     */
    roundingTime(time: Date, backward: boolean, roundingTimeUnit: number = ROUNDING_TIME_UNIT): Date {
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
    },

    /**
     * スケジュールを指定された丸めタイプに基づいて丸める処理
     */
    roundingSchedule(
        schedule: Schedule,
        roundingTimeType: RoundingMethod,
        events: Event[] = [],
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): Schedule | null {
        if (roundingTimeType === "nonduplicate" && !events) {
            throw new Error("イベントが未設定です。");
        }

        if (!schedule.end) {
            throw new Error(`終了予定時間がありません。${ScheduleUtils.getText(schedule)}`);
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
                start = TimeTrackerAlgorithmCore.roundingTime(start, true, roundingTimeUnit);
            }
            if (isEndRounding) {
                end = TimeTrackerAlgorithmCore.roundingTime(end, true, roundingTimeUnit);
            }
        } else if (roundingTimeType === "forward") {
            if (isStartRounding) {
                start = TimeTrackerAlgorithmCore.roundingTime(start, false, roundingTimeUnit);
            }
            if (isEndRounding) {
                end = TimeTrackerAlgorithmCore.roundingTime(end, false, roundingTimeUnit);
            }
        } else if (roundingTimeType === "round") {
            if (isStartRounding) {
                const toBackward = startMinuteMod >= roundingTimeUnit / 2;
                start = TimeTrackerAlgorithmCore.roundingTime(start, toBackward, roundingTimeUnit);
            }
            if (isEndRounding) {
                const toBackward = endMinuteMod >= roundingTimeUnit / 2;
                end = TimeTrackerAlgorithmCore.roundingTime(end, toBackward, roundingTimeUnit);
            }
        } else if (roundingTimeType === "stretch") {
            if (isStartRounding) {
                start = TimeTrackerAlgorithmCore.roundingTime(start, false, roundingTimeUnit);
            }
            if (isEndRounding) {
                end = TimeTrackerAlgorithmCore.roundingTime(end, true, roundingTimeUnit);
            }
        } else if (roundingTimeType === "half") {
            if (isStartRounding) {
                const toBackward = startMinuteMod >= roundingTimeUnit / 2;
                start = TimeTrackerAlgorithmCore.roundingTime(start, toBackward, roundingTimeUnit);
            }
            if (isEndRounding) {
                const toBackward = endMinuteMod >= roundingTimeUnit / 2;
                end = TimeTrackerAlgorithmCore.roundingTime(end, toBackward, roundingTimeUnit);
            }
        } else if (roundingTimeType === "nonduplicate") {
            if (isStartRounding) {
                const oldStart = new Date(start);
                start = TimeTrackerAlgorithmCore.roundingTime(start, false, roundingTimeUnit);
                const testSchedule = { ...schedule, start, end: schedule.end };

                if (TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(testSchedule, events)) {
                    start = TimeTrackerAlgorithmCore.roundingTime(oldStart, true, roundingTimeUnit);
                }
            }
            if (isEndRounding) {
                const oldEnd = new Date(end);
                // 終了時刻はまずbackward(切り上げ)を試す
                end = TimeTrackerAlgorithmCore.roundingTime(end, true, roundingTimeUnit);
                const testSchedule = { ...schedule, start: schedule.start, end };

                // 重複する場合はforward(切り捨て)を試す
                if (TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(testSchedule, events)) {
                    end = TimeTrackerAlgorithmCore.roundingTime(oldEnd, false, roundingTimeUnit);
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
            logger.warn(`スケジュールが削除されました。${ScheduleUtils.getText(schedule)} -> ${start} - ${end}`);
            return null;
        }

        return {
            ...schedule,
            start,
            end,
        };
    },

    /**
     * チェック処理
     */
    check<T extends Event | Schedule>(
        eventOrSchedule: T,
        maxTime: number = MAX_TIME,
        maxOld: number = MAX_OLD,
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): ExcludedInfo<T> | null {
        const now = getCurrentDate();
        const old = new Date(now.getTime() - maxOld * 24 * 60 * 60 * 1000);

        const checkSchedule = (schedule: Schedule) => {
            const range = ScheduleUtils.getRange(schedule);
            const details: ExcludedReasonDetail[] = [];

            if (!schedule.end) {
                const text = `終了時間がありません: ${ScheduleUtils.getText(schedule)}`;
                details.push({ reason: "invalid", message: text });
            }

            // 開始時間と終了時間が同じ、または丸め単位よりも小さい場合は削除
            if (
                schedule.end &&
                (schedule.start.getTime() === schedule.end.getTime() || (range && range < roundingTimeUnit * 60 * 1000))
            ) {
                const text = `開始時間と終了時間が同じ、または丸め単位よりも小さい: ${ScheduleUtils.getText(schedule)}`;
                details.push({ reason: "invalid", message: text });
            }

            // 未来のスケジュールは削除(開始時刻が現在より未来)
            if (schedule.start > now) {
                const text = `未来のスケジュール: ${ScheduleUtils.getText(schedule)}`;
                details.push({ reason: "outOfSchedule", message: text });
            }

            // maxOld日以上前のスケジュールは削除
            if (schedule.end && schedule.end < old) {
                const text = `${maxOld}日以上前のスケジュール: ${ScheduleUtils.getText(schedule)}`;
                details.push({ reason: "outOfSchedule", message: text });
            }

            return details;
        };

        const checEvent = (event: Event) => {
            const schedule = event.schedule;
            const range = ScheduleUtils.getRange(schedule);
            const details: ExcludedReasonDetail[] = checkSchedule(schedule);

            // 6時間以上のイベントは削除
            if (range && range > maxTime) {
                const text = `6時間以上: ${ScheduleUtils.getText(schedule)}`;
                details.push({ reason: "outOfSchedule", message: text });
            }

            return details;
        };

        if (ScheduleUtils.isSchedule(eventOrSchedule)) {
            const details = checkSchedule(eventOrSchedule);
            if (details.length > 0) {
                return {
                    target: eventOrSchedule,
                    details: details,
                };
            }
            return null;
        }

        if (EventUtils.isEvent(eventOrSchedule)) {
            const details = checEvent(eventOrSchedule);
            if (details.length > 0) {
                return {
                    target: eventOrSchedule,
                    details: details,
                };
            }
            return null;
        }

        throw new Error(`不正なEvent、Scheduleが渡されました。: ${JSON.stringify(eventOrSchedule)}`);
    },
};
