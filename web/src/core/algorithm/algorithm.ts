import { formatDateKey, getCurrentDate, getLogger } from "@/lib";
import type {
    DayTask,
    Event,
    EventInputInfo,
    RoundingMethod,
    Schedule,
    ScheduleAutoInputInfo,
    TimeCompare,
    WorkingEventType,
} from "@/types";
import { createEvent, EventUtils, ScheduleUtils } from "@/types/utils";
import { resetTime } from "../../lib/dateUtil";
import { TimeTrackerAlgorithmEvent as TimeTrackerAlgorithmHelper } from "./TimeTrackerAlgorithmEvent";

const logger = getLogger("TimeTrackerAlgorithm");

const debug = false;
const debugLog = (str: string) => {
    if (debug) {
        logger.info(str);
    }
};

/**
 * TimeTracker アルゴリズム
 */
export class TimeTrackerAlgorithm {
    private readonly maxTime = 6 * 60 * 60 * 1000; // 6時間
    private readonly maxOld = 30; // 30日
    private readonly roundingTimeUnit = 30;
    private readonly eventInputInfo: EventInputInfo;
    private readonly scheduleInputInfo: ScheduleAutoInputInfo;

    constructor(eventInputInfo: EventInputInfo, scheduleInputInfo: ScheduleAutoInputInfo) {
        logger.info(
            `アルゴリズム初期化 設定: 丸め単位=${this.roundingTimeUnit}分, 開始終了時間=${scheduleInputInfo.startEndTime}分`,
        );

        this.eventInputInfo = eventInputInfo;
        this.scheduleInputInfo = scheduleInputInfo;

        if (!scheduleInputInfo) {
            logger.error("勤務時間設定が未設定です");
            throw new Error("勤務時間設定が未設定です。");
        }

        if (scheduleInputInfo.startEndTime % this.roundingTimeUnit !== 0) {
            const errorMsg = `勤務開始終了時間は${this.roundingTimeUnit}の倍数で設定してください。${scheduleInputInfo.startEndTime}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * 時間を丸める処理
     */
    public roundingTime(time: Date, backward: boolean): Date {
        const mod = time.getMinutes() % this.roundingTimeUnit;
        if (mod === 0) {
            return time;
        }

        const result = new Date(time);
        result.setSeconds(0);
        result.setMilliseconds(0);

        if (backward) {
            result.setMinutes(time.getMinutes() + this.roundingTimeUnit - mod);
        } else {
            result.setMinutes(time.getMinutes() - mod);
        }

        return result;
    }

    /**
     * スケジュールを指定された丸めタイプに基づいて丸める処理
     */
    public roundingSchedule(
        schedule: Schedule,
        roundingTimeType: RoundingMethod,
        events: Event[] = [],
    ): Schedule | null {
        if (roundingTimeType === "nonduplicate" && !events) {
            throw new Error("イベントが未設定です。");
        }

        if (!schedule.end) {
            return null;
        }

        const startMinuteMod = schedule.start.getMinutes() % this.roundingTimeUnit;
        const endMinuteMod = schedule.end.getMinutes() % this.roundingTimeUnit;
        const isStartRounding = startMinuteMod !== 0;
        const isEndRounding = endMinuteMod !== 0;

        if (!isStartRounding && !isEndRounding) {
            return schedule;
        }

        let start = new Date(schedule.start);
        let end = new Date(schedule.end);

        if (roundingTimeType === "backward") {
            if (isStartRounding) {
                start = this.roundingTime(start, true);
            }
            if (isEndRounding) {
                end = this.roundingTime(end, true);
            }
        } else if (roundingTimeType === "forward") {
            if (isStartRounding) {
                start = this.roundingTime(start, false);
            }
            if (isEndRounding) {
                end = this.roundingTime(end, false);
            }
        } else if (roundingTimeType === "round") {
            if (isStartRounding) {
                const toBackward = startMinuteMod >= this.roundingTimeUnit / 2;
                start = this.roundingTime(start, toBackward);
            }
            if (isEndRounding) {
                const toBackward = endMinuteMod >= this.roundingTimeUnit / 2;
                end = this.roundingTime(end, toBackward);
            }
        } else if (roundingTimeType === "stretch") {
            if (isStartRounding) {
                start = this.roundingTime(start, false);
            }
            if (isEndRounding) {
                end = this.roundingTime(end, true);
            }
        } else if (roundingTimeType === "half") {
            if (isStartRounding) {
                const toBackward = startMinuteMod >= this.roundingTimeUnit / 2;
                start = this.roundingTime(start, toBackward);
            }
            if (isEndRounding) {
                const toBackward = endMinuteMod >= this.roundingTimeUnit / 2;
                end = this.roundingTime(end, toBackward);
            }
        } else if (roundingTimeType === "nonduplicate") {
            if (isStartRounding) {
                const oldStart = new Date(start);
                start = this.roundingTime(start, false);
                const testSchedule = { ...schedule, start, end: schedule.end };

                if (TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(testSchedule, events)) {
                    start = this.roundingTime(oldStart, true);
                }
            }
            if (isEndRounding) {
                const oldEnd = new Date(end);
                // 終了時刻はまずbackward（切り上げ）を試す
                end = this.roundingTime(end, true);
                const testSchedule = { ...schedule, start: schedule.start, end };

                // 重複する場合はforward（切り捨て）を試す
                if (TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(testSchedule, events)) {
                    end = this.roundingTime(oldEnd, false);
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
            end.getTime() - start.getTime() < this.roundingTimeUnit * 60 * 1000
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
     * スケジュールをイベントに変換する処理
     */
    public scheduleToEvent(schedule: Schedule, scheduleInputInfo: ScheduleAutoInputInfo, events: Event[]): Event[] {
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
            let roundedStartSchedule = this.roundingSchedule(startSchedule, roundingTimeType, events);

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
            let roundedEndSchedule = this.roundingSchedule(endSchedule, roundingTimeType, events);

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
                            this.roundingTimeUnit,
                            0,
                        );
                    }

                    // 時間を丸め単位で分割
                    const timeSlots = Math.floor(
                        (endTime.getTime() - startTime.getTime()) / (this.roundingTimeUnit * 60 * 1000),
                    );

                    for (let iTime = 0; iTime < timeSlots; iTime++) {
                        const fillStart = new Date(startTime.getTime() + iTime * this.roundingTimeUnit * 60 * 1000);
                        const fillEnd = new Date(startTime.getTime() + (iTime + 1) * this.roundingTimeUnit * 60 * 1000);

                        const fillSchedule: Schedule = {
                            start: fillStart,
                            end: fillEnd,
                        };

                        // 既存イベントと重複していない場合のみ追加
                        if (!TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(fillSchedule, events)) {
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
    }

    /**
     * イベントのチェック処理
     */
    private checkEvent(events: Event[]): Event[] {
        const now = getCurrentDate();
        const old = new Date(now.getTime() - this.maxOld * 24 * 60 * 60 * 1000);

        const result: Event[] = [];
        const logText = [];

        for (const event of events) {
            const range = ScheduleUtils.getRange(event.schedule);

            // 6時間以上のイベントは削除
            if (range && range > this.maxTime) {
                logText.push(`6時間以上: ${EventUtils.getText(event)}`);
                continue;
            }

            // 未来のイベントは削除（開始時刻が現在より未来）
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
                (range && range < this.roundingTimeUnit * 60 * 1000)
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

    /**
     * イベントの重複を解消する処理
     *
     * @deprecated
     */
    public cleanDuplicateEvent(eventMap: Map<string, Event[]>, timeCompare: TimeCompare): Map<string, Event[]> {
        const resultMap = new Map<string, Event[]>();

        const logText = [];
        for (const [eventDate, events] of eventMap.entries()) {
            if (!events || events.length === 0) {
                resultMap.set(eventDate, []);
                logText.push(`${eventDate}: 0件`);
                continue;
            }

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
                const nextEvent = TimeTrackerAlgorithmHelper.searchNextEvent(currentItem, events, timeCompare);
                if (!nextEvent) {
                    break;
                }
                resultList.push(nextEvent);
                currentItem = nextEvent;
            }

            const excluded = events.filter((e) => !resultList.find((r) => r.uuid === e.uuid));
            logText.push(
                `${eventDate}: ${resultList.length}件, 除外: ${excluded.length} ( ${excluded.map((e) => EventUtils.getText(e)).join(", ")} )`,
            );
            resultMap.set(eventDate, resultList);
        }

        debugLog(`===イベントの重複解消処理 ( ${eventMap.size}日 )===`);
        debugLog(`RESULT: ${resultMap.size}件`);
        logText.forEach((t) => debugLog(`---> ${t}`));
        debugLog(`=================================================`);

        return resultMap;
    }

    /**
     * イベントを日ごとに分割します（勤務日外のイベントは削除）
     * @param events
     * @param schedules
     *
     * @deprecated @see TimeTrackerAlgorithmHelper.getAllEventInScheduleRange
     */
    public getEventDayMap(events: Event[], schedules: Schedule[]) {
        const dayMap = new Map<string, Event[]>();
        const recurrenceEvents = events.flatMap((event) => TimeTrackerAlgorithmHelper.getRecurrenceEvent(event));
        const filterdEvents = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(
            [...events, ...recurrenceEvents],
            schedules,
        );
        for (const event of filterdEvents) {
            const key = ScheduleUtils.getBaseDateKey(event.schedule);
            if (!dayMap.has(key)) {
                dayMap.set(key, []);
            }
            dayMap.get(key)?.push(event);
        }
        return dayMap;
    }

    /**
     * イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したイベントマップを作成します
     */
    public addStartToEndDate(eventMap: Map<string, Event[]>): Map<string, Event[]> {
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
                    // 23:XX:00に設定（XX は rounding_time_unit）
                    end: new Date(
                        firstDay.getFullYear(),
                        firstDay.getMonth(),
                        firstDay.getDate(),
                        23,
                        this.roundingTimeUnit,
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
                                this.roundingTimeUnit,
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
    }

    /**
     * 勤務時間イベントと通常イベントを統合する処理
     *
     * @description
     */
    public margedScheduleEvents(
        scheduleEventMap: Map<string, Event[]>,
        eventMap: Map<string, Event[]>,
    ): Map<string, Event[]> {
        const resultMap = new Map<string, Event[]>();

        for (const [eventDate, events] of scheduleEventMap.entries()) {
            if (events.length < 2) {
                logger.warn(
                    `勤務時間イベントが2つ未満のため、処理をスキップします。${eventDate} (生成されたイベント数: ${events.length})`,
                );
                continue;
            }

            // 勤務時間イベントをソート
            const sortedScheduleEvents = [...events].sort(
                (a, b) => a.schedule.start.getTime() - b.schedule.start.getTime(),
            );
            const startItem = sortedScheduleEvents[0];
            const endItem = sortedScheduleEvents[sortedScheduleEvents.length - 1];

            const middleItems = sortedScheduleEvents.length > 2 ? sortedScheduleEvents.slice(1, -1) : [];

            const resultEvents: Event[] = [];
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
                    resultEvents.push(startItem);
                }
                if (!isEndScheduleOverlap) {
                    resultEvents.push(endItem);
                }

                resultEvents.push(...middleItems);
                resultEvents.sort((a, b) => a.schedule.start.getTime() - b.schedule.start.getTime());
            } else {
                // イベントがない場合は勤務時間イベントのみ
                resultEvents.push(startItem, ...middleItems, endItem);
            }

            resultMap.set(eventDate, resultEvents);
        }

        debugLog(
            `===勤務時間イベントと通常イベントを統合 (勤務時間: ${scheduleEventMap.size}日分, 通常: ${eventMap.size}日分)===`,
        );
        debugLog(`RESULT: ${resultMap.size}日分`);
        for (const [dateKey, events] of resultMap.entries()) {
            debugLog(`---> ${dateKey}: ${events.length}件`);
        }
        debugLog(`=================================================`);

        return resultMap;
    }

    public cleanEvent(events: Event[], schedules: Schedule[]) {
        // イベント丸め処理
        const roundedEvents: Event[] = [];
        for (const event of events) {
            const roundedSchedule = this.roundingSchedule(event.schedule, this.eventInputInfo.roundingTimeType, events);
            if (roundedSchedule) {
                roundedEvents.push(EventUtils.scheduled(event, roundedSchedule));
            }
        }

        // 勤務時間をイベントに変換
        const schduleEvents = schedules.flatMap((schedule) => {
            try {
                const text = ScheduleUtils.getText(schedule);
                debugLog(`Schedule ${text}の変換開始`);
                const createEvents = this.scheduleToEvent(schedule, this.scheduleInputInfo, roundedEvents);
                debugLog(`Schedule ${text}: 生成されたイベント数=${createEvents.length}`);
                return createEvents;
            } catch (error) {
                // スケジュールが休日やエラーの場合はスキップ
                logger.warn("スケジュールをスキップ:", error);
                return [];
            }
        });

        // イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
        const [margedEvents, excluedMargedEvents] = TimeTrackerAlgorithmHelper.margedScheduleEvents(
            schduleEvents,
            roundedEvents,
        );
        return { margedEvents, excluedMargedEvents };
    }

    /**
     * 1日のタスクを分割する処理
     */
    public splitOneDayTask(events: Event[], schedules: Schedule[]): DayTask[] {
        logger.info(`★1日タスク分割開始: イベント数=${events?.length || 0}, スケジュール数=${schedules?.length || 0}`);

        if (!events || events.length === 0) {
            logger.warn("イベントが存在しません。");
        }

        if (!schedules || schedules.length === 0) {
            logger.warn("勤務時間が存在しません。");
        }

        events.sort((a, b) => {
            const aDate = ScheduleUtils.getBaseDate(a.schedule);
            const bDate = ScheduleUtils.getBaseDate(b.schedule);
            return aDate.getTime() - bDate.getTime();
        });

        // イベントを日ごとに分割（勤務日外のイベントは削除）
        let dayMap = this.getEventDayMap(events, schedules);

        // イベントの終了日が基準日と異なる場合、終了日までの日付毎に分割したものを追加
        dayMap = this.addStartToEndDate(dayMap);

        // イベント丸め処理
        const roundedEventMap = new Map<string, Event[]>();
        for (const [dateKey, eventsForDate] of dayMap.entries()) {
            const roundedEvents: Event[] = [];
            for (const event of eventsForDate) {
                const allEvents = Array.from(dayMap.values()).flat();
                const roundedSchedule = this.roundingSchedule(
                    event.schedule,
                    this.eventInputInfo.roundingTimeType,
                    allEvents,
                );
                if (roundedSchedule) {
                    roundedEvents.push(EventUtils.scheduled(event, roundedSchedule));
                }
            }
            roundedEventMap.set(dateKey, roundedEvents);
        }

        // 勤務時間をイベントに変換
        const scheduleEventMap = new Map<string, Event[]>();
        const allRoundedEvents = Array.from(roundedEventMap.values()).flat();

        debugLog(
            `スケジュールからイベント変換開始: スケジュール数=${schedules.length}, 既存イベント数=${allRoundedEvents.length}`,
        );
        for (const schedule of schedules) {
            try {
                const scheduleDateKey = ScheduleUtils.getBaseDateKey(schedule);
                logger.info(`Schedule ${scheduleDateKey}の変換開始`);

                const scheduleEvents = this.scheduleToEvent(schedule, this.scheduleInputInfo, allRoundedEvents);

                logger.info(`Schedule ${scheduleDateKey}: 生成されたイベント数=${scheduleEvents.length}`);

                for (const event of scheduleEvents) {
                    const dateKey = ScheduleUtils.getBaseDateKey(event.schedule);

                    if (!scheduleEventMap.has(dateKey)) {
                        scheduleEventMap.set(dateKey, []);
                    }
                    scheduleEventMap.get(dateKey)!.push(event);
                }
            } catch (error) {
                // スケジュールが休日やエラーの場合はスキップ
                logger.warn("スケジュールをスキップ:", error);
            }
        }
        debugLog(`スケジュールからイベント変換完了: 生成された日数=${scheduleEventMap.size}`);

        // イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
        const mergedEventMap = this.margedScheduleEvents(scheduleEventMap, roundedEventMap);

        // margedScheduleEventsで処理されなかった日付（スケジュールイベントがない日付）を追加
        // for (const [dateKey, events] of roundedEventMap.entries()) {
        //     if (!mergedEventMap.has(dateKey)) {
        //         mergedEventMap.set(dateKey, events);
        //     }
        // }

        // 重複を解消
        const cleanedEventMap = this.cleanDuplicateEvent(mergedEventMap, this.eventInputInfo.eventDuplicateTimeCompare);

        const result: DayTask[] = [];
        for (const [dateKey, eventsForDate] of cleanedEventMap.entries()) {
            const checkedEvents = this.checkEvent(eventsForDate);
            const baseDate = new Date(dateKey);
            result.push({
                baseDate,
                events: checkedEvents.filter((e) => !e.workingEventType),
                scheduleEvents: checkedEvents.filter((e) => e.workingEventType),
            });
        }

        logger.info(`★1日タスク分割完了: 生成された日数=${result.length}`);
        logger.info(
            result
                .map(
                    (r) =>
                        `${formatDateKey(r.baseDate)} -> Event: ${r.events.length}件, Schdule: ${r.scheduleEvents.length}件`,
                )
                .join("\n"),
        );
        return result;
    }
}
