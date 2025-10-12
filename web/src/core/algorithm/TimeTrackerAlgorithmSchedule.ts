import { getLogger } from "@/lib";
import type { Event, EventInputInfo, Schedule, ScheduleAutoInputInfo, WorkingEventType } from "@/types";
import { createEvent, EventUtils, ScheduleUtils } from "@/types/utils";
import { resetTime } from "../../lib/dateUtil";
import { ROUNDING_TIME_UNIT, roundingSchedule } from "./TimeTrackerAlgorithmCore";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

const logger = getLogger("TimeTrackerAlgorithmSchedule");

const debug = false;
const debugLog = (str: string) => {
    if (debug) {
        logger.info(str);
    }
};

export const TimeTrackerAlgorithmSchedule = {
    /**
     * スケジュールをイベントに変換する処理
     */
    scheduleToEvent: (
        schedule: Schedule,
        scheduleInputInfo: ScheduleAutoInputInfo,
        events: Event[],
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): Event[] => {
    if (schedule.isHoliday || !schedule.end || schedule.errorMessage) {
        const errorMsg = "スケジュールが休日またはエラーのためイベントに変換できません。";
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    const getEvent = (name: string, eventSchedule: Schedule, workingType: WorkingEventType): Event => {
        return createEvent(name, eventSchedule, "Automatic", "", false, false, workingType);
    };

    const result: Event[] = [];
    const { startEndType, startEndTime, roundingTimeType } = scheduleInputInfo;

    if (startEndType !== "end") {
        const startSchedule: Schedule = {
            start: schedule.start,
            end: new Date(schedule.start.getTime() + startEndTime * 60 * 1000),
        };
        let roundedStartSchedule = roundingSchedule(startSchedule, roundingTimeType, events, roundingTimeUnit);

        if (roundedStartSchedule) {
            // stretchの場合はstart_end_timeよりも大きい場合はstart_end_timeにする
            const range = roundedStartSchedule.end
                ? roundedStartSchedule.end.getTime() - roundedStartSchedule.start.getTime()
                : 0;
            if (range > startEndTime * 60 * 1000) {
                roundedStartSchedule = {
                    ...roundedStartSchedule,
                    end: new Date(roundedStartSchedule.start.getTime() + startEndTime * 60 * 1000),
                };
            }

            result.push(getEvent("勤務開始", roundedStartSchedule, "start"));
        }
    }

    if (startEndType !== "start") {
        const endSchedule: Schedule = {
            start: new Date(schedule.end.getTime() - startEndTime * 60 * 1000),
            end: schedule.end,
        };
        let roundedEndSchedule = roundingSchedule(endSchedule, roundingTimeType, events, roundingTimeUnit);

        if (roundedEndSchedule) {
            // stretchの場合はstart_end_timeよりも大きい場合はstart_end_timeにする
            const range = roundedEndSchedule.end
                ? roundedEndSchedule.end.getTime() - roundedEndSchedule.start.getTime()
                : 0;
            if (range > startEndTime * 60 * 1000) {
                roundedEndSchedule = {
                    ...roundedEndSchedule,
                    start: new Date(roundedEndSchedule.end!.getTime() - startEndTime * 60 * 1000),
                };
            }

            result.push(getEvent("勤務終了", roundedEndSchedule, "end"));
        }
    }

    if (startEndType === "fill") {
        // fillモード: 勤務開始と勤務終了の間の空き時間を埋める
        const fillSchedules: Schedule[] = [];

        const startSchedule = result.find((e) => e.workingEventType === "start");
        const endSchedule = result.find((e) => e.workingEventType === "end");

        if (startSchedule && endSchedule) {
            const startDate = ScheduleUtils.getBaseDate(startSchedule.schedule);
            const endDate = ScheduleUtils.getBaseDate(endSchedule.schedule);
            const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

            for (let iDay = 0; iDay <= daysDiff; iDay++) {
                const baseDate = new Date(startDate);
                baseDate.setDate(startDate.getDate() + iDay);

                let startTime: Date;
                let endTime: Date;

                if (iDay === 0) {
                    startTime = startSchedule.schedule.end!;
                } else {
                    startTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0);
                }

                const isLastDay = ScheduleUtils.getDateKey(baseDate) === ScheduleUtils.getDateKey(endDate);
                if (isLastDay) {
                    endTime = endSchedule.schedule.start;
                } else {
                    endTime = new Date(
                        baseDate.getFullYear(),
                        baseDate.getMonth(),
                        baseDate.getDate(),
                        23,
                        roundingTimeUnit,
                        0,
                    );
                }

                // 時間を丸め単位で分割
                const timeSlots = Math.floor(
                    (endTime.getTime() - startTime.getTime()) / (roundingTimeUnit * 60 * 1000),
                );

                for (let iTime = 0; iTime < timeSlots; iTime++) {
                    const fillStart = new Date(startTime.getTime() + iTime * roundingTimeUnit * 60 * 1000);
                    const fillEnd = new Date(startTime.getTime() + (iTime + 1) * roundingTimeUnit * 60 * 1000);

                    const fillSchedule: Schedule = {
                        start: fillStart,
                        end: fillEnd,
                    };

                    // 既存イベントと重複していない場合のみ追加
                    if (!TimeTrackerAlgorithmEvent.isDuplicateEventOrSchedule(fillSchedule, events)) {
                        fillSchedules.push(fillSchedule);
                    }
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

                result.push(...mergedSchedules.map((s) => getEvent("勤務中", s, "middle")));
            }
        }
    }

    debugLog(`===スケジュールtoイベント変換 ( Type: ${startEndType}, Event: ${events.length}件 )===`);
    debugLog(`BASE: ${ScheduleUtils.getText(schedule)}`);
    debugLog(`RESULT: ${result.length}件`);
    result.forEach((r) => debugLog(`---> ${EventUtils.getText(r)}`));
    debugLog(`===================================================================================`);

    return result;
    },

    /**
     * イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したイベントマップを作成します
     */
    addStartToEndDate: (
        eventMap: Map<string, Event[]>,
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): Map<string, Event[]> => {
    const resultMap = new Map<string, Event[]>();

    for (const [dateKey, events] of eventMap.entries()) {
        for (const event of events) {
            if (!resultMap.has(dateKey)) {
                resultMap.set(dateKey, []);
            }

            // イベントの終了日を取得(時刻は保持)
            if (!event.schedule.end) {
                resultMap.get(dateKey)!.push(event);
                continue;
            }

            // 終了日の日付部分を取得
            const eventEndDateKey = ScheduleUtils.getDateKey(event.schedule.end);

            if (dateKey === eventEndDateKey) {
                // 終了日が基準日と同じ場合はそのまま追加
                resultMap.get(dateKey)!.push(event);
                continue;
            }

            // 初日のイベントを追加
            const firstDay = new Date(dateKey);
            const firstSchedule: Schedule = {
                start: event.schedule.start,
                // 23:XX:00に設定(XX は rounding_time_unit)
                end: new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 23, roundingTimeUnit, 0),
            };
            resultMap.get(dateKey)!.push(EventUtils.scheduled(event, firstSchedule));

            // 開始日と終了日の日数差を計算
            const startDate = resetTime(event.schedule.start);
            const endDate = resetTime(event.schedule.end);
            const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

            for (let i = 1; i <= daysDiff; i++) {
                const baseDate = new Date(startDate);
                baseDate.setDate(startDate.getDate() + i);
                const baseDateKey = ScheduleUtils.getDateKey(baseDate);

                let endSchedule: Schedule;
                if (baseDateKey === eventEndDateKey) {
                    // 最終日
                    endSchedule = {
                        start: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0),
                        end: event.schedule.end,
                    };
                } else {
                    // 中間日
                    endSchedule = {
                        start: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0),
                        end: new Date(
                            baseDate.getFullYear(),
                            baseDate.getMonth(),
                            baseDate.getDate(),
                            23,
                            roundingTimeUnit,
                            0,
                        ),
                    };
                }

                const endEvent = EventUtils.scheduled(event, endSchedule, true);
                endEvent.recurrence = undefined;

                if (!resultMap.has(baseDateKey)) {
                    resultMap.set(baseDateKey, []);
                }
                resultMap.get(baseDateKey)!.push(endEvent);
            }
        }
    }

    debugLog(`===終了日までの日付毎に分割したイベントマップ (入力: ${eventMap.size}日分)===`);
    debugLog(`RESULT: ${resultMap.size}日分`);
    for (const [dateKey, events] of resultMap.entries()) {
        debugLog(`---> ${dateKey}: ${events.length}件`);
    }
    debugLog(`=================================================`);

    return resultMap;
    },

    /**
     * イベントをクリーンアップして勤務時間イベントと統合する処理
     */
    cleanEvent: (
        events: Event[],
        schedules: Schedule[],
        eventInputInfo: EventInputInfo,
        scheduleInputInfo: ScheduleAutoInputInfo,
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ): { margedEvents: Event[]; excluedMargedEvents: Event[] } => {
    // イベント丸め処理
    const roundedEvents: Event[] = [];
    for (const event of events) {
        const roundedSchedule = roundingSchedule(
            event.schedule,
            eventInputInfo.roundingTimeType,
            events,
            roundingTimeUnit,
        );
        if (roundedSchedule) {
            roundedEvents.push(EventUtils.scheduled(event, roundedSchedule));
        }
    }

    // 勤務時間をイベントに変換
    const schduleEvents = schedules.flatMap((schedule) => {
        try {
            const text = ScheduleUtils.getText(schedule);
            debugLog(`Schedule ${text}の変換開始`);
            const createEvents = TimeTrackerAlgorithmSchedule.scheduleToEvent(
                schedule,
                scheduleInputInfo,
                roundedEvents,
                roundingTimeUnit,
            );
            debugLog(`Schedule ${text}: 生成されたイベント数=${createEvents.length}`);
            return createEvents;
        } catch (error) {
            // スケジュールが休日やエラーの場合はスキップ
            logger.warn("スケジュールをスキップ:", error);
            return [];
        }
    });

    // イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
    const [margedEvents, excluedMargedEvents] = TimeTrackerAlgorithmEvent.margedScheduleEvents(
        schduleEvents,
        roundedEvents,
    );
    return { margedEvents, excluedMargedEvents };
    },
};

// /**
//  * 1日のタスクを分割する処理
//  */
// export function splitOneDayTask(
//     events: Event[],
//     schedules: Schedule[],
//     eventInputInfo: EventInputInfo,
//     scheduleInputInfo: ScheduleAutoInputInfo,
//     roundingTimeUnit: number = ROUNDING_TIME_UNIT,
//     maxTime: number = MAX_TIME,
//     maxOld: number = MAX_OLD,
// ): DayTask[] {
//     logger.info(`★1日タスク分割開始: イベント数=${events?.length || 0}, スケジュール数=${schedules?.length || 0}`);

//     if (!events || events.length === 0) {
//         logger.warn("イベントが存在しません。");
//     }

//     if (!schedules || schedules.length === 0) {
//         logger.warn("勤務時間が存在しません。");
//     }

//     events.sort((a, b) => {
//         const aDate = ScheduleUtils.getBaseDate(a.schedule);
//         const bDate = ScheduleUtils.getBaseDate(b.schedule);
//         return aDate.getTime() - bDate.getTime();
//     });

//     // イベントを日ごとに分割(勤務日外のイベントは削除)
//     let dayMap = getEventDayMap(events, schedules);

//     // イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したものを追加
//     dayMap = addStartToEndDate(dayMap, roundingTimeUnit);

//     // イベント丸め処理
//     const roundedEventMap = new Map<string, Event[]>();
//     for (const [dateKey, eventsForDate] of dayMap.entries()) {
//         const roundedEvents: Event[] = [];
//         for (const event of eventsForDate) {
//             const allEvents = Array.from(dayMap.values()).flat();
//             const roundedSchedule = roundingSchedule(
//                 event.schedule,
//                 eventInputInfo.roundingTimeType,
//                 allEvents,
//                 roundingTimeUnit,
//             );
//             if (roundedSchedule) {
//                 roundedEvents.push(EventUtils.scheduled(event, roundedSchedule));
//             }
//         }
//         roundedEventMap.set(dateKey, roundedEvents);
//     }

//     // 勤務時間をイベントに変換
//     const scheduleEventMap = new Map<string, Event[]>();
//     const allRoundedEvents = Array.from(roundedEventMap.values()).flat();

//     debugLog(
//         `スケジュールからイベント変換開始: スケジュール数=${schedules.length}, 既存イベント数=${allRoundedEvents.length}`,
//     );
//     for (const schedule of schedules) {
//         try {
//             const scheduleDateKey = ScheduleUtils.getBaseDateKey(schedule);
//             logger.info(`Schedule ${scheduleDateKey}の変換開始`);

//             const scheduleEvents = scheduleToEvent(schedule, scheduleInputInfo, allRoundedEvents, roundingTimeUnit);

//             logger.info(`Schedule ${scheduleDateKey}: 生成されたイベント数=${scheduleEvents.length}`);

//             for (const event of scheduleEvents) {
//                 const dateKey = ScheduleUtils.getBaseDateKey(event.schedule);

//                 if (!scheduleEventMap.has(dateKey)) {
//                     scheduleEventMap.set(dateKey, []);
//                 }
//                 scheduleEventMap.get(dateKey)!.push(event);
//             }
//         } catch (error) {
//             // スケジュールが休日やエラーの場合はスキップ
//             logger.warn("スケジュールをスキップ:", error);
//         }
//     }
//     debugLog(`スケジュールからイベント変換完了: 生成された日数=${scheduleEventMap.size}`);

//     // イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
//     const mergedEventMap = new Map<string, Event[]>();
//     for (const [dateKey, schedEvents] of scheduleEventMap.entries()) {
//         const dayEvents = roundedEventMap.get(dateKey) || [];
//         const [normalEvents, scheduleEventsResult] = TimeTrackerAlgorithmEvent.margedScheduleEvents(
//             schedEvents,
//             dayEvents,
//         );
//         mergedEventMap.set(dateKey, [...normalEvents, ...scheduleEventsResult]);
//     }

//     // 重複を解消
//     const cleanedEventMap = new Map<string, Event[]>();
//     for (const [dateKey, eventsForDate] of mergedEventMap.entries()) {
//         const [cleanedEvents] = TimeTrackerAlgorithmEvent.cleanDuplicateEvent(
//             eventsForDate,
//             eventInputInfo.eventDuplicateTimeCompare,
//         );
//         cleanedEventMap.set(dateKey, cleanedEvents);
//     }

//     const result: DayTask[] = [];
//     for (const [dateKey, eventsForDate] of cleanedEventMap.entries()) {
//         const checkedEvents = checkEvent(eventsForDate, maxTime, maxOld, roundingTimeUnit);
//         const baseDate = new Date(dateKey);
//         result.push({
//             baseDate,
//             events: checkedEvents.filter((e) => !e.workingEventType),
//             scheduleEvents: checkedEvents.filter((e) => e.workingEventType),
//         });
//     }

//     logger.info(`★1日タスク分割完了: 生成された日数=${result.length}`);
//     logger.info(
//         result
//             .map(
//                 (r) =>
//                     `${formatDateKey(r.baseDate)} -> Event: ${r.events.length}件, Schdule: ${r.scheduleEvents.length}件`,
//             )
//             .join("\n"),
//     );
//     return result;
// }
