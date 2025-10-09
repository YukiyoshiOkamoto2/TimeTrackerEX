import { getLogger } from "@/lib";
import type {
    DayTask,
    Event,
    EventInputInfo,
    Project,
    RoundingTimeType,
    Schedule,
    ScheduleInputInfo,
    TimeCompareType,
    WorkingEventType,
} from "@/types";
import { createEvent, EventUtils, ScheduleUtils } from "@/types/utils";

const logger = getLogger("TimeTrackerAlgorithm");

/**
 * TimeTracker アルゴリズム
 */
export class TimeTrackerAlgorithm {
    private readonly roundingTimeUnit = 30;
    private readonly project: Project;
    private readonly eventInputInfo: EventInputInfo;
    private readonly scheduleInputInfo: ScheduleInputInfo;

    constructor(project: Project, eventInputInfo: EventInputInfo, scheduleInputInfo: ScheduleInputInfo) {
        logger.info(`アルゴリズム初期化: プロジェクト=${project.name}`);
        this.project = project;
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

        logger.debug(`設定: 丸め単位=${this.roundingTimeUnit}分, 開始終了時間=${scheduleInputInfo.startEndTime}分`);
    }

    /**
     * イベントまたはスケジュールが重複しているかを判定
     */
    private isDuplicateEventOrSchedule(eventOrSchedule: Event | Schedule, events: Event[]): boolean {
        const isTypeEvent = "uuid" in eventOrSchedule;
        const targetSchedule = isTypeEvent ? eventOrSchedule.schedule : eventOrSchedule;

        return events.some((event) => {
            if (isTypeEvent && event.uuid === eventOrSchedule.uuid) {
                return false;
            }
            return ScheduleUtils.isOverlap(event.schedule, targetSchedule);
        });
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
        roundingTimeType: RoundingTimeType,
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

                if (this.isDuplicateEventOrSchedule(testSchedule, events)) {
                    start = this.roundingTime(oldStart, true);
                }
            }
            if (isEndRounding) {
                const oldEnd = new Date(end);
                // 終了時刻はまずbackward（切り上げ）を試す
                end = this.roundingTime(end, true);
                const testSchedule = { ...schedule, start: schedule.start, end };

                // 重複する場合はforward（切り捨て）を試す
                if (this.isDuplicateEventOrSchedule(testSchedule, events)) {
                    end = this.roundingTime(oldEnd, false);
                }
            }
        }

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
    public scheduleToEvent(schedule: Schedule, scheduleInputInfo: ScheduleInputInfo, events: Event[]): Event[] {
        if (schedule.isHoliday || !schedule.end || schedule.errorMessage) {
            const errorMsg = "スケジュールが休日またはエラーのためイベントに変換できません。";
            logger.debug(errorMsg);
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

                const isDuplicate = this.isDuplicateEventOrSchedule(roundedStartSchedule, events);
                if (!isDuplicate) {
                    result.push(getEvent("勤務開始", roundedStartSchedule, "start"));
                } else {
                    logger.debug(
                        `勤務開始イベントが既存イベントと重複のためスキップ: ${ScheduleUtils.getText(roundedStartSchedule)}`,
                    );
                }
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

                const isDuplicate = this.isDuplicateEventOrSchedule(roundedEndSchedule, events);
                if (!isDuplicate) {
                    result.push(getEvent("勤務終了", roundedEndSchedule, "end"));
                } else {
                    logger.debug(
                        `勤務終了イベントが既存イベントと重複のためスキップ: ${ScheduleUtils.getText(roundedEndSchedule)}`,
                    );
                }
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
                        if (!this.isDuplicateEventOrSchedule(fillSchedule, events)) {
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

        return result;
    }

    /**
     * 繰り返しイベントを取得する処理
     */
    public getRecurrenceEvent(event: Event): Event[] {
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

        return result;
    }

    /**
     * イベントのチェック処理
     */
    private checkEvent(events: Event[]): Event[] {
        const maxTime = 6 * 60 * 60 * 1000; // 6時間
        const maxOld = 30; // 30日
        const now = new Date();
        const old = new Date(now.getTime() - maxOld * 24 * 60 * 60 * 1000);

        const result: Event[] = [];

        for (const event of events) {
            const range = ScheduleUtils.getRange(event.schedule);

            // 6時間以上のイベントは削除
            if (range && range > maxTime) {
                continue;
            }

            // 未来のイベントは削除（開始時刻が現在より未来）
            if (event.schedule.start > now) {
                continue;
            }

            // 30日以上前のイベントは削除
            if (event.schedule.end && event.schedule.end < old) {
                continue;
            }

            // 開始時間と終了時間が同じ、または丸め単位よりも小さい場合は削除
            if (
                !event.schedule.end ||
                event.schedule.start.getTime() === event.schedule.end.getTime() ||
                (range && range < this.roundingTimeUnit * 60 * 1000)
            ) {
                continue;
            }

            result.push(event);
        }

        return result;
    }

    /**
     * 次のイベントを検索する処理
     */
    public searchNextEvent(currentItem: Event | null, events: Event[], timeCompare: TimeCompareType): Event | null {
        if (!events || events.length === 0) {
            return null;
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
            return null;
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
            return null;
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
    }

    /**
     * イベントの重複を解消する処理
     */
    public cleanDuplicateEvent(eventMap: Map<string, Event[]>, timeCompare: TimeCompareType): Map<string, Event[]> {
        const resultMap = new Map<string, Event[]>();

        for (const [eventDate, events] of eventMap.entries()) {
            if (!events || events.length === 0) {
                resultMap.set(eventDate, []);
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
                const nextEvent = this.searchNextEvent(currentItem, events, timeCompare);
                if (!nextEvent) {
                    break;
                }
                resultList.push(nextEvent);
                currentItem = nextEvent;
            }

            resultMap.set(eventDate, resultList);
        }

        return resultMap;
    }

    /**
     * 1日のタスクを分割する処理
     */
    public splitOneDayTask(events: Event[], schedules: Schedule[]): DayTask[] {
        logger.info(`1日タスク分割開始: イベント数=${events?.length || 0}, スケジュール数=${schedules?.length || 0}`);

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

        let dayMap = new Map<string, Event[]>();

        for (const event of events) {
            const dateKey = ScheduleUtils.getBaseDateKey(event.schedule);

            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, []);
            }
            dayMap.get(dateKey)!.push(event);

            // 繰り返しイベントの処理
            for (const recurrenceEvent of this.getRecurrenceEvent(event)) {
                const recurrenceDateKey = ScheduleUtils.getBaseDateKey(recurrenceEvent.schedule);

                if (!dayMap.has(recurrenceDateKey)) {
                    dayMap.set(recurrenceDateKey, []);
                }
                dayMap.get(recurrenceDateKey)!.push(recurrenceEvent);
            }
        }

        // 勤務時間範囲外のイベントは削除
        if (schedules.length > 0) {
            const scheduleDates = schedules.map((s) => ScheduleUtils.getBaseDate(s));
            const minDate = new Date(Math.min(...scheduleDates.map((d) => d.getTime())));
            const maxDate = new Date(Math.max(...scheduleDates.map((d) => d.getTime())));

            const minDateKey = ScheduleUtils.getDateKey(minDate);
            const maxDateKey = ScheduleUtils.getDateKey(maxDate);

            for (const dateKey of Array.from(dayMap.keys())) {
                if (dateKey < minDateKey || dateKey > maxDateKey) {
                    dayMap.delete(dateKey);
                }
            }
        }

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

        logger.info(
            `スケジュールからイベント変換開始: スケジュール数=${schedules.length}, 既存イベント数=${allRoundedEvents.length}`,
        );

        for (const schedule of schedules) {
            try {
                const scheduleDateKey = ScheduleUtils.getBaseDateKey(schedule);
                logger.debug(`Schedule ${scheduleDateKey}の変換開始`);

                const scheduleEvents = this.scheduleToEvent(schedule, this.scheduleInputInfo, allRoundedEvents);

                logger.debug(`Schedule ${scheduleDateKey}: 生成されたイベント数=${scheduleEvents.length}`);

                for (const event of scheduleEvents) {
                    const dateKey = ScheduleUtils.getBaseDateKey(event.schedule);

                    if (!scheduleEventMap.has(dateKey)) {
                        scheduleEventMap.set(dateKey, []);
                    }
                    scheduleEventMap.get(dateKey)!.push(event);
                }
            } catch (error) {
                // スケジュールが休日やエラーの場合はスキップ
                logger.info("スケジュールをスキップ:", error);
            }
        }

        logger.info(`スケジュールからイベント変換完了: 生成された日数=${scheduleEventMap.size}`);

        // イベントを勤務開始終了時間に合わせるor勤務時間外を消す、重複した場合は勤務時間イベントを消す
        const mergedEventMap = this.margedScheduleEvents(scheduleEventMap, roundedEventMap);

        // margedScheduleEventsで処理されなかった日付（スケジュールイベントがない日付）を追加
        for (const [dateKey, events] of roundedEventMap.entries()) {
            if (!mergedEventMap.has(dateKey)) {
                mergedEventMap.set(dateKey, events);
            }
        }

        // 重複を解消
        const cleanedEventMap = this.cleanDuplicateEvent(mergedEventMap, this.eventInputInfo.eventDuplicateTimeCompare);

        const result: DayTask[] = [];

        for (const [dateKey, eventsForDate] of cleanedEventMap.entries()) {
            const checkedEvents = this.checkEvent(eventsForDate);
            const baseDate = new Date(dateKey);

            result.push({
                baseDate,
                project: this.project,
                events: checkedEvents.filter((e) => !e.workingEventType),
                scheduleEvents: checkedEvents.filter((e) => e.workingEventType),
            });
        }

        logger.info(`1日タスク分割完了: 生成されたタスク数=${result.length}`);
        return result;
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

                // 開始日と終了日の日数差を計算(ISO文字列から日付を取得)
                const startDate = new Date(dateKey + "T00:00:00.000Z");
                const endDate = new Date(eventEndDateKey + "T00:00:00.000Z");
                const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

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

        return resultMap;
    }

    /**
     * 勤務時間イベントと通常イベントを統合する処理
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
                        startItem.schedule.start >= event.schedule.end! ||
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

        return resultMap;
    }
}
