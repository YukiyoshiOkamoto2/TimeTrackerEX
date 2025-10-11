import { getLogger } from "@/lib";
import type { Event, Schedule, TimeCompare } from "@/types";
import { EventUtils, ScheduleUtils } from "@/types/utils";

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
        const isTypeEvent = "uuid" in eventOrSchedule;
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
     * イベントを勤務日の範囲でフィルタリング
     */
    getAllEventInScheduleRange: (events: Event[], schedules?: Schedule[]): Event[] => {
        let filterdEvents = events;
        const deleteUUID: string[] = [];

        let scheduleDateKeys: Set<string> = new Set();
        // schedules外のイベントは削除
        if (schedules && schedules.length > 0) {
            // スケジュールの日付をセットに変換(高速検索用)
            scheduleDateKeys = new Set(schedules.map((s) => ScheduleUtils.getBaseDateKey(s)));
            filterdEvents = events.filter((event) => {
                const eventDateKey = ScheduleUtils.getBaseDateKey(event.schedule);
                // 勤務日リストに含まれているかチェック
                if (!scheduleDateKeys.has(eventDateKey)) {
                    deleteUUID.push(event.uuid);
                    return false;
                } else {
                    return true;
                }
            });
        }

        debugLog(
            `===イベントを日ごとに分割 (イベント: ${events.length}件, スケジュール: ${schedules?.length ?? 0}日)===`,
        );
        debugLog(`RESULT: ${filterdEvents.length}件`);
        scheduleDateKeys.forEach((date) => debugLog(date));
        filterdEvents.forEach((e) =>
            debugLog(`---> ${deleteUUID.includes(e.uuid) ? "【DELETE】" : ""} ${EventUtils.getText(e)}`),
        );
        debugLog(`=================================================`);
        return filterdEvents;
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
        const eventMap = new Map<string, Event[]>();
        const scheduleMap = new Map<string, Event[]>();

        normalEvents.forEach((e) => {
            const key = ScheduleUtils.getBaseDateKey(e.schedule);
            if (!eventMap.has(key)) {
                eventMap.set(key, []);
            }
            eventMap.get(key)?.push(e);
        });

        scheduleEvents.forEach((e) => {
            const key = ScheduleUtils.getBaseDateKey(e.schedule);
            if (!scheduleMap.has(key)) {
                scheduleMap.set(key, []);
            }
            scheduleMap.get(key)?.push(e);
        });

        const resultEvents: Event[] = [];
        const resultScheduleEvents: Event[] = [];

        for (const [eventDate, schedEvents] of scheduleMap.entries()) {
            if (schedEvents.length < 2) {
                logger.warn(
                    `勤務時間イベントが2つ未満のため、処理をスキップします。${eventDate} (生成されたイベント数: ${schedEvents.length})`,
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
