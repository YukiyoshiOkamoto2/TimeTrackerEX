import { getLogger, resetTime } from "@/lib";
import type { Event, Schedule, TimeCompare } from "@/types";
import { EventUtils, ScheduleUtils } from "@/types/utils";
import { ConvertEventInfo, ExcludedInfo } from "./models";
import { ROUNDING_TIME_UNIT } from "./TimeTrackerAlgorithmCore";

const logger = getLogger("TimeTrackerAlgorithmEvent");

const debug = false;
const debugLog = (str: string) => {
    if (debug) {
        logger.info(str);
    }
};

export const TimeTrackerAlgorithmEvent = {
    /**
     * イベントまたはスケジュールが重複しているかを判定
     */
    isDuplicateEventOrSchedule: (eventOrSchedule: Event | Schedule, events: Event[]): boolean => {
        const isTypeEvent = EventUtils.isEvent(eventOrSchedule);
        const targetSchedule = isTypeEvent ? eventOrSchedule.schedule : eventOrSchedule;

        return events.some((event) => {
            if (isTypeEvent && event.uuid === eventOrSchedule.uuid) {
                return false;
            }
            return ScheduleUtils.isOverlap(event.schedule, targetSchedule);
        });
    },

    /**
     * 繰り返しイベントを取得する処理
     */
    getRecurrenceEvent: (event: Event): Event[] => {
        if (!event.recurrence) {
            return [];
        }

        const result: Event[] = [];
        const baseDate = ScheduleUtils.getBaseDate(event.schedule);

        for (const recurrence of event.recurrence) {
            const recurrenceDate = new Date(recurrence.getFullYear(), recurrence.getMonth(), recurrence.getDate());

            if (baseDate.getTime() === recurrenceDate.getTime()) {
                continue;
            }

            const newSchedule: Schedule = {
                start: new Date(
                    recurrence.getFullYear(),
                    recurrence.getMonth(),
                    recurrence.getDate(),
                    event.schedule.start.getHours(),
                    event.schedule.start.getMinutes(),
                    event.schedule.start.getSeconds(),
                ),
                end: event.schedule.end
                    ? new Date(
                        recurrence.getFullYear(),
                        recurrence.getMonth(),
                        recurrence.getDate(),
                        event.schedule.end.getHours(),
                        event.schedule.end.getMinutes(),
                        event.schedule.end.getSeconds(),
                    )
                    : undefined,
            };

            const newEvent = EventUtils.scheduled(event, newSchedule, true);
            newEvent.recurrence = undefined;
            result.push(newEvent);
        }

        debugLog(`===繰り返しイベントを取得 ( ${EventUtils.getText(event)} )===`);
        debugLog(`RESULT: ${result.length}件`);
        result.forEach((r) => debugLog(`---> ${EventUtils.getText(r)}`));
        debugLog(`============================================================`);

        return result;
    },

    /**
     * イベントを勤務日でフィルタリングします。（開始・終了時間に重複するイベントは調整します。）
     */
    getAllEventInScheduleRange: (events: Event[], schedules: Schedule[], roundingTimeUnit: number = ROUNDING_TIME_UNIT) => {

        const ROUNDING_TIME_UNIT_MS = roundingTimeUnit * 60 * 1000;

        // 勤務時間がない場合はそのまま返却する。
        if (schedules.length === 0) {
            logger.warn("スケジュールがありません。")
            return {
                enableEvents: events,
                adjustedEvents: [],
                excluedEvents: [],
            }
        }

        // スケジュールを日付キーでマップ化
        const scheduleMap = new Map<string, Schedule>();
        schedules.forEach((s) => {
            const key = ScheduleUtils.getBaseDateKey(s)
            if (scheduleMap.has(key)) {
                logger.error(`スケジュールが重複しています。: ${ScheduleUtils.getText(scheduleMap.get(key)!)},  ${ScheduleUtils.getText(s)}`)
            } else {
                scheduleMap.set(key, s);
            }
        });

        const enableEvents: Event[] = [];
        const adjustedEvents: ConvertEventInfo[] = []
        const excluedEvents: ExcludedInfo<Event>[] = [];

        for (const event of events) {
            const eventDateKey = ScheduleUtils.getBaseDateKey(event.schedule);
            const schedule = scheduleMap.get(eventDateKey);

            // 勤務日リストに含まれていない場合は除外
            if (!schedule) {
                excluedEvents.push({
                    target: event,
                    details: [{
                        reason: "outOfSchedule",
                        message: "勤務日外です。"
                    }]
                });
                continue;
            }

            // その日のスケジュールと照合
            if (!event.schedule.end || !schedule.end) {
                excluedEvents.push({
                    target: event,
                    details: [{
                        reason: "invalid",
                        message: "イベントまたはスケジュールに終了時間がありません。"
                    }]
                });
                continue;
            }

            const eventStart = event.schedule.start.getTime();
            const eventEnd = event.schedule.end.getTime();
            const scheduleStart = schedule.start.getTime();
            const scheduleEnd = schedule.end.getTime();

            // スケジュールの時間範囲外の場合は除外
            if (eventEnd <= scheduleStart || eventStart >= scheduleEnd) {
                excluedEvents.push({
                    target: event,
                    details: [{
                        reason: "outOfSchedule",
                        message: `勤務時間外です。(勤務時間: ${ScheduleUtils.getText(schedule)})`
                    }]
                });
                continue;
            }

            let newStart = event.schedule.start;
            let newEnd = event.schedule.end;

            // 開始時間がスケジュールの開始時間より前の場合、スケジュールの開始時間に合わせる
            if (eventStart < scheduleStart) {
                newStart = schedule.start;
            }

            // 終了時間がスケジュールの終了時間より後の場合、スケジュールの終了時間に合わせる
            if (eventEnd > scheduleEnd) {
                newEnd = schedule.end;
            }

            // 調整後の時間がROUNDING_TIME_UNIT以下の場合は除外
            const adjustedRange = newEnd.getTime() - newStart.getTime();
            if (adjustedRange < ROUNDING_TIME_UNIT_MS) {
                excluedEvents.push({
                    target: event,
                    details: [{
                        reason: "invalid",
                        message: `勤務時間との調整後、イベントが${roundingTimeUnit}分以下です。`
                    }]
                });
                continue;
            }

            // イベントを調整
            const adjustStart = newStart.getTime() !== eventStart;
            const adjustEnd = newEnd.getTime() !== eventEnd
            if (adjustStart || adjustEnd) {
                const adjustedEvent = EventUtils.scheduled(event, {
                    start: newStart,
                    end: newEnd
                });
                adjustedEvents.push({
                    newValue: adjustedEvent,
                    oldSchdule: event.schedule,
                    mesage: adjustStart ? "開始時間, " : "" + adjustEnd ? "終了時間" : "" + "を変更しました。"
                });
            } else {
                enableEvents.push(event);
            }
        }

        debugLog(
            `===イベントを日ごとに分割 (イベント: ${events.length}件, スケジュール: ${schedules?.length ?? 0}日)===`,
        );
        enableEvents.forEach(e => debugLog(`---> ${EventUtils.getText(e)}`))
        adjustedEvents.forEach((c) =>
            debugLog(`---> 【COVERT】 ${EventUtils.getText(c.newValue)}: ${c.mesage}`),
        );
        excluedEvents.forEach((e) =>
            debugLog(`---> 【DELETE】 ${EventUtils.getText(e.target)}: ${e.details.map(d => d.message).join(", ")}`),
        );
        debugLog(`=================================================`);
        return {
            enableEvents,
            adjustedEvents,
            excluedEvents,
        }
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
                    end: new Date(
                        firstDay.getFullYear(),
                        firstDay.getMonth(),
                        firstDay.getDate(),
                        23,
                        roundingTimeUnit,
                        0,
                    ),
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
     * 次のイベントを検索する処理
     */
    searchNextEvent: (currentItem: Event | null, events: Event[], timeCompare: TimeCompare): Event | undefined => {
        if (!events || events.length === 0) {
            return undefined;
        }

        let nextEvents: Event[];

        if (!currentItem) {
            nextEvents = [...events];
            if (timeCompare === "small") {
                nextEvents.sort(
                    (a, b) =>
                        a.schedule.start.getTime() - b.schedule.start.getTime() ||
                        (ScheduleUtils.getRange(a.schedule) || 0) - (ScheduleUtils.getRange(b.schedule) || 0),
                );
            } else {
                nextEvents.sort(
                    (a, b) =>
                        a.schedule.start.getTime() - b.schedule.start.getTime() ||
                        (ScheduleUtils.getRange(b.schedule) || 0) - (ScheduleUtils.getRange(a.schedule) || 0),
                );
            }
        } else {
            nextEvents = events.filter(
                (event) =>
                    event.schedule.end && currentItem.schedule.end && event.schedule.end > currentItem.schedule.end,
            );
        }

        if (nextEvents.length === 0) {
            return undefined;
        }

        let nextTargetEvents: Event[] = [];

        if (currentItem) {
            // 重複している場合、終了時間を開始時間に合わせる
            for (const event of nextEvents) {
                if (ScheduleUtils.isOverlap(event.schedule, currentItem.schedule)) {
                    const newSchedule: Schedule = {
                        start: currentItem.schedule.end!,
                        end: event.schedule.end,
                    };
                    if (newSchedule.start.getTime() !== newSchedule.end!.getTime()) {
                        nextTargetEvents.push(EventUtils.scheduled(event, newSchedule));
                    }
                } else {
                    nextTargetEvents.push(event);
                }
            }
        } else {
            nextTargetEvents = nextEvents;
        }

        if (nextTargetEvents.length === 0) {
            return undefined;
        }

        // ソート
        if (timeCompare === "small") {
            nextTargetEvents.sort(
                (a, b) =>
                    a.schedule.start.getTime() - b.schedule.start.getTime() ||
                    (ScheduleUtils.getRange(a.schedule) || 0) - (ScheduleUtils.getRange(b.schedule) || 0),
            );
        } else {
            nextTargetEvents.sort(
                (a, b) =>
                    a.schedule.start.getTime() - b.schedule.start.getTime() ||
                    (ScheduleUtils.getRange(b.schedule) || 0) - (ScheduleUtils.getRange(a.schedule) || 0),
            );
        }

        const nextTarget = nextTargetEvents[0];

        // 重複するイベントを検索
        const overlapEvents = nextTargetEvents.filter((event) =>
            ScheduleUtils.isOverlap(event.schedule, nextTarget.schedule),
        );

        if (overlapEvents.length === 0) {
            return nextTarget;
        }

        // 重複するイベントをソート
        if (timeCompare === "small") {
            overlapEvents.sort(
                (a, b) => (ScheduleUtils.getRange(a.schedule) || 0) - (ScheduleUtils.getRange(b.schedule) || 0),
            );
        } else {
            overlapEvents.sort(
                (a, b) => (ScheduleUtils.getRange(b.schedule) || 0) - (ScheduleUtils.getRange(a.schedule) || 0),
            );
        }

        const compareEvent = overlapEvents[0];
        const nextTargetRange = ScheduleUtils.getRange(nextTarget.schedule) || 0;
        const compareEventRange = ScheduleUtils.getRange(compareEvent.schedule) || 0;

        if (nextTargetRange <= compareEventRange) {
            return nextTarget;
        }

        // 新しいスケジュールを作成
        const newSchedule: Schedule = {
            start: nextTarget.schedule.start,
            end: compareEvent.schedule.start,
        };

        return EventUtils.scheduled(nextTarget, newSchedule);
    },

    /**
     * イベントの重複を解消する処理
     */
    cleanDuplicateEvent: (events: Event[], timeCompare: TimeCompare): [Event[], Event[]] => {
        const eventMap = new Map<string, Event[]>();
        events.forEach((e) => {
            const key = ScheduleUtils.getBaseDateKey(e.schedule);
            if (!eventMap.has(key)) {
                eventMap.set(key, []);
            }
            eventMap.get(key)?.push(e);
        });

        const logText = [];
        const enableEvent: Event[] = [];
        const excluded: Event[] = [];
        for (const [eventDate, events] of eventMap.entries()) {
            if (timeCompare === "small") {
                events.sort(
                    (a, b) => (ScheduleUtils.getRange(a.schedule) || 0) - (ScheduleUtils.getRange(b.schedule) || 0),
                );
            } else {
                events.sort(
                    (a, b) => (ScheduleUtils.getRange(b.schedule) || 0) - (ScheduleUtils.getRange(a.schedule) || 0),
                );
            }

            let currentItem: Event | null = null;
            const resultList: Event[] = [];

            // 無限ループ: nextEvent が尽きるまで探索する意図的な定常条件
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const nextEvent = TimeTrackerAlgorithmEvent.searchNextEvent(currentItem, events, timeCompare);
                if (!nextEvent) {
                    break;
                }
                resultList.push(nextEvent);
                currentItem = nextEvent;
            }
            enableEvent.push(...resultList);
            excluded.push(...events.filter((e) => !resultList.find((r) => r.uuid === e.uuid)));
            logText.push(
                `${eventDate}: ${resultList.length}件, 除外: ${excluded.length} ( ${excluded.map((e) => EventUtils.getText(e)).join(", ")} )`,
            );
        }

        debugLog(`===イベントの重複解消処理 ( ${eventMap.size}日 )===`);
        debugLog(`RESULT: ${enableEvent.length}件`);
        logText.forEach((t) => debugLog(`---> ${t}`));
        debugLog(`=================================================`);

        return [enableEvent, excluded];
    },

    /**
     * 勤務時間イベントと通常イベントを統合する処理
     */
    margedScheduleEvents: (scheduleEvents: Event[], normalEvents: Event[]): [Event[], Event[]] => {

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

        const resultEvents: Event[] = [];
        const resultScheduleEvents: Event[] = [];

        for (const [eventDate, schedEvents] of scheduleMap.entries()) {
            if (schedEvents.length < 2) {
                logger.warn(
                    `勤務時間イベントが2つ未満です。${eventDate} (生成されたイベント数: ${schedEvents.length})`,
                );
                continue;
            }

            // 勤務時間イベントをソート
            const sortedScheduleEvents = [...schedEvents].sort(
                (a, b) => a.schedule.start.getTime() - b.schedule.start.getTime(),
            );
            const startItem = sortedScheduleEvents[0];
            const endItem = sortedScheduleEvents[sortedScheduleEvents.length - 1];

            const middleItems = sortedScheduleEvents.length > 2 ? sortedScheduleEvents.slice(1, -1) : [];
            const dayEvents = eventMap.get(eventDate);

            if (dayEvents) {
                let isStartScheduleOverlap = false;
                let isEndScheduleOverlap = false;

                for (let event of dayEvents) {
                    // 勤務時間外のイベントは削除
                    if (
                        !startItem.schedule.end ||
                        !endItem.schedule.end ||
                        !event.schedule.end ||
                        startItem.schedule.start >= event.schedule.end ||
                        endItem.schedule.end <= event.schedule.start
                    ) {
                        continue;
                    }

                    // 開始イベントと重複している場合
                    if (ScheduleUtils.isOverlap(startItem.schedule, event.schedule)) {
                        isStartScheduleOverlap = true;
                        event = EventUtils.scheduled(event, {
                            start: startItem.schedule.start,
                            end: event.schedule.end,
                        });
                    }

                    // 終了イベントと重複している場合
                    if (ScheduleUtils.isOverlap(endItem.schedule, event.schedule)) {
                        isEndScheduleOverlap = true;
                        event = EventUtils.scheduled(event, {
                            start: event.schedule.start,
                            end: endItem.schedule.end,
                        });
                    }

                    resultEvents.push(event);
                }

                // 重複していない場合は勤務開始・終了イベントを追加
                if (!isStartScheduleOverlap) {
                    resultScheduleEvents.push(startItem);
                }
                if (!isEndScheduleOverlap) {
                    resultScheduleEvents.push(endItem);
                }

                resultScheduleEvents.push(...middleItems);
                resultScheduleEvents.sort((a, b) => a.schedule.start.getTime() - b.schedule.start.getTime());
            } else {
                // イベントがない場合は勤務時間イベントのみ
                resultScheduleEvents.push(startItem, ...middleItems, endItem);
            }
        }

        debugLog(`===勤務時間イベントと通常イベントを統合===`);
        debugLog(`--->通常イベント:  ${resultEvents.length}件`);
        debugLog(`--->勤務時間イベント:  ${resultScheduleEvents.length}件`);
        debugLog(`=================================================`);

        return [resultEvents, resultScheduleEvents];
    },
};
