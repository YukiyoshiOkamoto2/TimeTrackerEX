import { getLogger } from "@/lib";
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
    getAllEventInScheduleRange: (
        events: Event[],
        schedules: Schedule[],
        roundingTimeUnit: number = ROUNDING_TIME_UNIT,
    ) => {
        const ROUNDING_TIME_UNIT_MS = roundingTimeUnit * 60 * 1000;

        // 勤務時間がない場合はそのまま返却する。
        if (schedules.length === 0) {
            logger.warn("スケジュールがありません。");
            return {
                enableEvents: events,
                adjustedEvents: [],
                excluedEvents: [],
            };
        }

        // スケジュールを日付キーでマップ化
        const scheduleMap = new Map<string, Schedule>();
        schedules.forEach((s) => {
            const key = ScheduleUtils.getBaseDateKey(s);
            if (scheduleMap.has(key)) {
                logger.error(
                    `スケジュールが重複しています。: ${ScheduleUtils.getText(scheduleMap.get(key)!)},  ${ScheduleUtils.getText(s)}`,
                );
            } else {
                scheduleMap.set(key, s);
            }
        });

        const enableEvents: Event[] = [];
        const adjustedEvents: ConvertEventInfo[] = [];
        const excluedEvents: ExcludedInfo<Event>[] = [];

        for (const event of events) {
            const eventDateKey = ScheduleUtils.getBaseDateKey(event.schedule);
            const schedule = scheduleMap.get(eventDateKey);

            // 勤務日リストに含まれていない場合は除外
            if (!schedule) {
                excluedEvents.push({
                    target: event,
                    details: [
                        {
                            reason: "outOfSchedule",
                            message: "勤務日外です。",
                        },
                    ],
                });
                continue;
            }

            // その日のスケジュールと照合
            if (!event.schedule.end || !schedule.end) {
                excluedEvents.push({
                    target: event,
                    details: [
                        {
                            reason: "invalid",
                            message: "イベントまたはスケジュールに終了時間がありません。",
                        },
                    ],
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
                    details: [
                        {
                            reason: "outOfSchedule",
                            message: `勤務時間外です。(勤務時間: ${ScheduleUtils.getText(schedule)})`,
                        },
                    ],
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
                    details: [
                        {
                            reason: "invalid",
                            message: `勤務時間との調整後、イベントが${roundingTimeUnit}分以下です。`,
                        },
                    ],
                });
                continue;
            }

            // イベントを調整
            const adjustStart = newStart.getTime() !== eventStart;
            const adjustEnd = newEnd.getTime() !== eventEnd;
            if (adjustStart || adjustEnd) {
                const adjustedEvent = EventUtils.scheduled(event, {
                    start: newStart,
                    end: newEnd,
                });
                adjustedEvents.push({
                    newValue: adjustedEvent,
                    oldSchdule: event.schedule,
                    mesage: adjustStart ? "開始時間, " : "" + adjustEnd ? "終了時間" : "" + "を変更しました。",
                });
            } else {
                enableEvents.push(event);
            }
        }

        debugLog(
            `===イベントを日ごとに分割 (イベント: ${events.length}件, スケジュール: ${schedules?.length ?? 0}日)===`,
        );
        enableEvents.forEach((e) => debugLog(`---> ${EventUtils.getText(e)}`));
        adjustedEvents.forEach((c) => debugLog(`---> 【COVERT】 ${EventUtils.getText(c.newValue)}: ${c.mesage}`));
        excluedEvents.forEach((e) =>
            debugLog(`---> 【DELETE】 ${EventUtils.getText(e.target)}: ${e.details.map((d) => d.message).join(", ")}`),
        );
        debugLog(`=================================================`);
        return {
            enableEvents,
            adjustedEvents,
            excluedEvents,
        };
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
};
