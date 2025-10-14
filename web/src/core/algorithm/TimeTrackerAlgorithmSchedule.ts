import { formatDateKey, getLogger, resetTime } from "@/lib";
import type { Event, Schedule, ScheduleAutoInputInfo, WorkingEventType } from "@/types";
import { createEvent, createSchedule, EventUtils, ScheduleUtils } from "@/types/utils";
import { ROUNDING_TIME_UNIT, TimeTrackerAlgorithmCore } from "./TimeTrackerAlgorithmCore";

const logger = getLogger("TimeTrackerAlgorithmSchedule");

const debug = false;
const debugLog = (str: string) => {
    if (debug) {
        logger.info(str);
    }
};

export const TimeTrackerAlgorithmSchedule = {
    /**
     * イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したイベント配列を返します
     */
    addStartToEndDate: (schedule: Schedule): Schedule[] => {
        if (!schedule.end) {
            throw new Error("event.schedule.end is undefined.");
        }

        // 同じ日の場合はそのまま返す
        if (formatDateKey(schedule.start) === formatDateKey(schedule.end)) {
            return [schedule];
        }

        const result: Schedule[] = [];
        const startDate = resetTime(schedule.start);
        const endDate = resetTime(schedule.end);
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

        for (let i = 0; i <= daysDiff; i++) {
            const baseDate = new Date(startDate);
            baseDate.setDate(startDate.getDate() + i);

            let daySchedule: Schedule;
            if (i === 0) {
                // 初日: 元の開始時間から23:30:00まで
                daySchedule = createSchedule(
                    schedule.start,
                    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 30, 0),
                    schedule.isHoliday,
                    schedule.isPaidLeave,
                );
            } else if (formatDateKey(baseDate) === formatDateKey(schedule.end)) {
                // 最終日: 00:00:00から元の終了時間まで
                daySchedule = createSchedule(
                    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0),
                    schedule.end,
                    schedule.isHoliday,
                    schedule.isPaidLeave,
                );
            } else {
                // 中間日: 00:00:00から23:30:00まで
                daySchedule = createSchedule(
                    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0),
                    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 30, 0),
                    schedule.isHoliday,
                    schedule.isPaidLeave,
                );
            }
            result.push(daySchedule);
        }

        debugLog(`===イベントを日ごとに分割 ( ${daysDiff + 1}日分 )===`);
        debugLog(`BASE: ${ScheduleUtils.getText(schedule)}`);
        debugLog(`RESULT: ${result.length}件`);
        result.forEach((r) => debugLog(`---> ${ScheduleUtils.getText(r)}`));
        debugLog(`=================================================`);

        return result;
    },

    /**
     * スケジュールをイベントに変換する処理
     */
    scheduleToEvent: (
        schedule: Schedule,
        scheduleInputInfo: ScheduleAutoInputInfo,
        events: Event[],
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): Event[] => {
        // スケジュールの整合性を確認する
        const checked = TimeTrackerAlgorithmCore.check(schedule);
        if (checked) {
            const invalid = checked.details.filter((d) => d.reason === "invalid");
            if (invalid.length > 0) {
                const errorMsg = "スケジュールが不正です。\n" + invalid.map((i) => i.message).join("\n");
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        // 日をまたぐ場合は1日ごとに分割して処理
        if (formatDateKey(schedule.start) !== formatDateKey(schedule.end!)) {
            return TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule).flatMap((s) =>
                TimeTrackerAlgorithmSchedule.scheduleToEvent(s, scheduleInputInfo, events, roundingTimeUnit),
            );
        }

        const getEvent = (name: string, eventSchedule: Schedule, workingType: WorkingEventType): Event => {
            return createEvent(name, eventSchedule, "Automatic", "", false, false, workingType);
        };

        const rounding = (type: "start" | "end", schedule: Schedule) => {
            let newSchedule: Schedule;
            if (type == "start") {
                newSchedule = createSchedule(
                    schedule.start,
                    new Date(schedule.start.getTime() + scheduleInputInfo.startEndTime * 60 * 1000),
                    schedule.isHoliday,
                    schedule.isPaidLeave,
                );
            } else {
                newSchedule = createSchedule(
                    new Date(schedule.end!.getTime() - scheduleInputInfo.startEndTime * 60 * 1000),
                    schedule.end,
                    schedule.isHoliday,
                    schedule.isPaidLeave,
                );
            }

            let roundedSchedule = TimeTrackerAlgorithmCore.roundingSchedule(
                newSchedule,
                scheduleInputInfo.roundingTimeType,
                events,
                roundingTimeUnit,
            );

            if (roundedSchedule) {
                // stretchの場合はstart_end_timeよりも大きい場合はstart_end_timeにする
                const range = roundedSchedule.end!.getTime() - roundedSchedule.start.getTime();
                if (range > scheduleInputInfo.startEndTime * 60 * 1000) {
                    if (type == "start") {
                        roundedSchedule.end = new Date(
                            roundedSchedule.start.getTime() + scheduleInputInfo.startEndTime * 60 * 1000,
                        );
                    } else {
                        roundedSchedule.start = new Date(
                            roundedSchedule.end!.getTime() - scheduleInputInfo.startEndTime * 60 * 1000,
                        );
                    }
                }
                return getEvent(type === "start" ? "勤務開始" : "勤務終了", roundedSchedule, type);
            }

            return null;
        };

        const resultEvents: Event[] = [];
        if (scheduleInputInfo.startEndType !== "end") {
            const event = rounding("start", schedule);
            if (event) {
                resultEvents.push(event);
            }
        }

        if (scheduleInputInfo.startEndType !== "start") {
            const event = rounding("end", schedule);
            if (event) {
                resultEvents.push(event);
            }
        }

        if (scheduleInputInfo.startEndType === "fill") {
            // fillモード: 勤務開始と勤務終了の間の空き時間を埋める
            const fillSchedules: Schedule[] = [];

            const start = resultEvents.find((e) => e.workingEventType === "start");
            const end = resultEvents.find((e) => e.workingEventType === "end");

            if (start && end) {
                const startDate = start.schedule.end!;
                const endDate = end.schedule.start;

                // 時間を丸め単位で分割
                const timeSlots = Math.floor(
                    (endDate!.getTime() - startDate.getTime()) / (roundingTimeUnit * 60 * 1000),
                );

                for (let iTime = 0; iTime < timeSlots; iTime++) {
                    const fillStart = new Date(startDate.getTime() + iTime * roundingTimeUnit * 60 * 1000);
                    const fillEnd = new Date(startDate.getTime() + (iTime + 1) * roundingTimeUnit * 60 * 1000);

                    const fillSchedule = createSchedule(fillStart, fillEnd, schedule.isHoliday, schedule.isPaidLeave);

                    // 既存イベントと重複していない場合のみ追加
                    if (!TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule(fillSchedule, events)) {
                        fillSchedules.push(fillSchedule);
                    }
                }

                // 連続している時間スロットを結合
                if (fillSchedules.length > 0) {
                    const mergedSchedules: Schedule[] = [];
                    for (const fillSchedule of fillSchedules) {
                        if (mergedSchedules.length === 0) {
                            mergedSchedules.push(fillSchedule);
                        } else {
                            const lastSchedule = mergedSchedules[mergedSchedules.length - 1];
                            if (lastSchedule.end!.getTime() === fillSchedule.start.getTime()) {
                                lastSchedule.end = fillSchedule.end;
                            } else {
                                mergedSchedules.push(fillSchedule);
                            }
                        }
                    }

                    resultEvents.push(...mergedSchedules.map((s) => getEvent("勤務中", s, "middle")));
                }
            }
        }

        debugLog(
            `===スケジュールtoイベント変換 ( Type: ${scheduleInputInfo.startEndType}, Event: ${events.length}件 )===`,
        );
        debugLog(`BASE: ${ScheduleUtils.getText(schedule)}`);
        debugLog(`RESULT: ${resultEvents.length}件`);
        resultEvents.forEach((r) => debugLog(`---> ${EventUtils.getText(r)}`));
        debugLog(`===================================================================================`);

        return resultEvents;
    },

    /**
     * 勤務時間イベントと通常イベントを統合する処理
     */
    margedScheduleEvents: (scheduleEvents: Event[], normalEvents: Event[]): Event[] => {
        const scheduleMap = new Map<string, Event[]>();
        scheduleEvents.forEach((e) => {
            const key = ScheduleUtils.getBaseDateKey(e.schedule);
            if (!scheduleMap.has(key)) {
                scheduleMap.set(key, []);
            }
            scheduleMap.get(key)?.push(e);
        });

        const eventMap = new Map<string, Event[]>();
        normalEvents.forEach((e) => {
            const key = ScheduleUtils.getBaseDateKey(e.schedule);
            if (!eventMap.has(key)) {
                eventMap.set(key, []);
            }
            eventMap.get(key)?.push(e);
        });

        const log = [];
        const resultScheduleEvents: Event[] = [];
        for (const [eventDate, schduleEvents] of scheduleMap.entries()) {
            if (schduleEvents.length < 2) {
                logger.warn(
                    `勤務時間イベントが2つ未満です。${eventDate} (生成されたイベント数: ${schduleEvents.length})`,
                );
            }

            const dayEvents = eventMap.get(eventDate);
            if (!dayEvents || dayEvents.length === 0) {
                // イベントがない場合は勤務日イベントを設定する
                resultScheduleEvents.push(...schduleEvents);
                continue;
            }

            for (const schduleEvent of schduleEvents) {
                if (TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule(schduleEvent, dayEvents)) {
                    log.push(`削除: ${EventUtils.getText(schduleEvent)}`);
                } else {
                    resultScheduleEvents.push(schduleEvent);
                }
            }
        }

        debugLog(`===勤務時間イベントと通常イベントを統合===`);
        debugLog(`--->統合前:  ${scheduleEvents.length}件`);
        debugLog(`--->統合後:  ${resultScheduleEvents.length}件`);
        log.forEach((l) => debugLog(l));
        debugLog(`=================================================`);

        return resultScheduleEvents;
    },
};
