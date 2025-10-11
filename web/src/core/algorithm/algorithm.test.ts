import type { Event, EventInputInfo, Project, ScheduleInputInfo } from "@/types";
import { createSchedule, generateUUID, ScheduleUtils } from "@/types/utils";
import { beforeEach, describe, expect, it, test } from "vitest";
import { TimeTrackerAlgorithm } from "./algorithm";

let now: Date;
let algorithm: TimeTrackerAlgorithm;
let project: Project;
let eventInputInfo: EventInputInfo;
let scheduleInputInfo: ScheduleInputInfo;

beforeEach(() => {
    // 現在日時を使用（checkEventで削除されないように）
    now = new Date();
    // 時刻を午後11時に設定して、同じ日のイベントが未来にならないようにする
    now.setHours(23, 0, 0, 0);

    scheduleInputInfo = {
        roundingTimeType: "backward",
        startEndType: "both",
        startEndTime: 30,
    };

    eventInputInfo = {
        eventDuplicateTimeCompare: "small",
        roundingTimeType: "nonduplicate",
    };

    project = {
        id: "1",
        name: "test-project",
        projectId: "",
        projectName: "",
        projectCode: "",
    };

    algorithm = new TimeTrackerAlgorithm(project, eventInputInfo, scheduleInputInfo);
});

function createTestEvent(start: Date, end: Date, name = "test-event"): Event {
    return {
        uuid: generateUUID(),
        name,
        schedule: createSchedule(start, end),
        organizer: "test-organizer-row",
        location: "test-location",
        isPrivate: false,
        isCancelled: false,
    };
}

function assertDateTime(
    actual: Date,
    expected: Date,
    overrides?: Partial<{
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
    }>,
): void {
    const expectedDate = new Date(expected);

    if (overrides?.year !== undefined) expectedDate.setFullYear(overrides.year);
    if (overrides?.month !== undefined) expectedDate.setMonth(overrides.month);
    if (overrides?.day !== undefined) expectedDate.setDate(overrides.day);
    if (overrides?.hour !== undefined) expectedDate.setHours(overrides.hour);
    if (overrides?.minute !== undefined) expectedDate.setMinutes(overrides.minute);
    if (overrides?.second !== undefined) expectedDate.setSeconds(overrides.second);

    expect(actual.getTime()).toBe(expectedDate.getTime());
}

describe("TimeTrackerAlgorithm", () => {
    describe("cleanDuplicateEvent", () => {
        // 重複除去ロジックを比較タイプ別にパラメトリック化
        function buildDuplicateEventData() {
            const events1 = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "3",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "4",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                    "5",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0),
                    "6",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                    "7",
                ),
            ];
            const events2 = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0),
                    "3",
                ),
            ];
            const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + 1);
            const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
            const eventMap = new Map<string, Event[]>();
            eventMap.set(nowDate, events1);
            eventMap.set(nextDateStr, events2);
            return { eventMap, nowDate, nextDateStr };
        }

        interface DuplicateCase {
            caseId: string;
            compare: "small" | "large";
            expectedLength: number;
            expectedOrder: string[];
        }
        const duplicateCases: DuplicateCase[] = [
            { caseId: "CD01", compare: "small", expectedLength: 6, expectedOrder: ["1", "2", "3", "5", "6", "7"] },
            { caseId: "CD02", compare: "large", expectedLength: 4, expectedOrder: ["2", "5", "6", "7"] },
        ];

        test.each(duplicateCases)(
            "[$caseId] should clean duplicates ($compare)",
            ({ compare, expectedLength, expectedOrder }) => {
                const { eventMap, nowDate, nextDateStr } = buildDuplicateEventData();
                const result = algorithm.cleanDuplicateEvent(eventMap, compare);
                const resultEvent = result.get(nowDate)!;
                expect(resultEvent.length).toBe(expectedLength);
                expectedOrder.forEach((name, idx) => expect(resultEvent[idx].name).toBe(name));
                // 2日目 (共通検証)
                const day2 = result.get(nextDateStr)!;
                expect(day2.length).toBe(3);
            },
        );
    });

    describe("splitOneDayTask", () => {
        test("should split events into day tasks", () => {
            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0),
            );

            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([event1, event2], [schedule]);

            expect(result.length).toBeGreaterThan(0);
        });

        test("should create day tasks with working events", () => {
            // splitOneDayTaskは複雑な統合処理なので、基本動作のみテスト
            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                "Meeting",
            );

            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([event1], [schedule]);

            // 基本的な動作確認
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].baseDate).toBeDefined();

            // splitOneDayTaskはcheckEventでフィルタリングするため、
            // 実際に含まれるイベントやスケジュールイベントの数は
            // checkEventの実装（現在時刻との比較など）に依存する
        });

        test("should handle events on multiple days", () => {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const event1 = createTestEvent(
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0),
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0),
                "Today Event",
            );
            const event2 = createTestEvent(
                new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0, 0),
                new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0, 0),
                "Tomorrow Event",
            );

            const schedule1 = createSchedule(
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0),
                new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0),
            );
            const schedule2 = createSchedule(
                new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0, 0),
                new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([event1, event2], [schedule1, schedule2]);

            // addStartToEndDateで複数日イベントが分割される可能性を考慮
            // イベントは当日のみなので、2日分のタスクが作成される
            expect(result.length).toBeGreaterThanOrEqual(2);

            // baseDateから日付キーで比較
            const todayKey = ScheduleUtils.getDateKey(today);
            const tomorrowKey = ScheduleUtils.getDateKey(tomorrow);

            const todayTask = result.find((task) => ScheduleUtils.getDateKey(task.baseDate) === todayKey);
            const tomorrowTask = result.find((task) => ScheduleUtils.getDateKey(task.baseDate) === tomorrowKey);

            expect(todayTask).toBeDefined();
            expect(tomorrowTask).toBeDefined();
        });

        test("should handle recurring events", () => {
            const event = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                "Recurring Meeting",
            );

            // 7日間の繰り返し設定
            const recurrence: Date[] = [now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)];
            event.recurrence = recurrence;

            const schedule1 = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
            );

            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const schedule2 = createSchedule(
                new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 9, 0, 0),
                new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([event], [schedule1, schedule2]);

            // 繰り返しイベントが getRecurrenceEvent で処理され、複数日分のタスクが作成される
            // addStartToEndDateで複数日イベントが分割される可能性も考慮
            expect(result.length).toBeGreaterThanOrEqual(2);

            // 詳細な繰り返しイベントの処理は getRecurrenceEvent のユニットテストで確認
        });

        test("should filter out invalid events", () => {
            const validEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                "Valid Event",
            );

            // 未来のイベント（除外されるべき）
            const futureEvent = createTestEvent(
                new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 11, 0, 0),
                "Future Event",
            );

            // 6時間以上のイベント（除外されるべき）
            const longEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0),
                "Long Event",
            );

            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([validEvent, futureEvent, longEvent], [schedule]);

            // タスクが作成されること
            expect(result.length).toBeGreaterThan(0);

            // checkEventで無効なイベントがフィルタリングされることを期待
            // （詳細な検証はcheckEventのユニットテストで行う）
        });

        test("should clean duplicate events correctly", () => {
            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                "Short Event",
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                "Long Event",
            );

            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
            );

            const result = algorithm.splitOneDayTask([event1, event2], [schedule]);

            // 重複イベントが cleanDuplicateEvent で処理される
            expect(result.length).toBeGreaterThan(0);

            // 詳細な重複処理のテストは cleanDuplicateEvent のユニットテストで実施
        });
    });

    describe("margedScheduleEvents", () => {
        test("should merge schedule events with normal events", () => {
            const scheduleEvent1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "勤務開始",
            );
            scheduleEvent1.workingEventType = "start";

            const scheduleEvent2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                "勤務終了",
            );
            scheduleEvent2.workingEventType = "end";

            const normalEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                "Meeting",
            );

            const nowDateKey = ScheduleUtils.getDateKey(now);
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set(nowDateKey, [scheduleEvent1, scheduleEvent2]);

            const eventMap = new Map<string, Event[]>();
            eventMap.set(nowDateKey, [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            const events = result.get(nowDateKey)!;
            expect(events.length).toBe(3); // 勤務開始 + Meeting + 勤務終了

            // イベントがソートされている
            expect(events[0].name).toBe("勤務開始");
            expect(events[1].name).toBe("Meeting");
            expect(events[2].name).toBe("勤務終了");
        });

        test("should handle overlapping events correctly", () => {
            const scheduleEvent1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "勤務開始",
            );
            scheduleEvent1.workingEventType = "start";

            const scheduleEvent2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                "勤務終了",
            );
            scheduleEvent2.workingEventType = "end";

            // 勤務開始と重複するイベント
            const overlappingEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "Early Meeting",
            );

            const nowDateKey = ScheduleUtils.getDateKey(now);
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set(nowDateKey, [scheduleEvent1, scheduleEvent2]);

            const eventMap = new Map<string, Event[]>();
            eventMap.set(nowDateKey, [overlappingEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            const events = result.get(nowDateKey)!;

            // 勤務開始は重複により除外され、overlappingEventが調整される
            expect(events.length).toBe(2); // Early Meeting (adjusted) + 勤務終了

            // overlappingEventの開始時刻が勤務開始時刻に調整されている
            const adjustedEvent = events.find((e) => e.name === "Early Meeting");
            expect(adjustedEvent).toBeDefined();
            expect(adjustedEvent!.schedule.start.getTime()).toBe(scheduleEvent1.schedule.start.getTime());
        });

        test("should only include schedule events when no normal events", () => {
            const scheduleEvent1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "勤務開始",
            );
            scheduleEvent1.workingEventType = "start";

            const scheduleEvent2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                "勤務終了",
            );
            scheduleEvent2.workingEventType = "end";

            const nowDateKey = ScheduleUtils.getDateKey(now);
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set(nowDateKey, [scheduleEvent1, scheduleEvent2]);

            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            const events = result.get(nowDateKey)!;
            expect(events.length).toBe(2); // 勤務開始 + 勤務終了のみ
        });

        test("should handle complex multi-day scenario with filtering", () => {
            // 複数日付にわたる複雑なシナリオ
            const nowDateKey = ScheduleUtils.getDateKey(now);
            const day1 = new Date(now);
            day1.setDate(now.getDate() + 1);
            const day1Key = ScheduleUtils.getDateKey(day1);
            const day2 = new Date(now);
            day2.setDate(now.getDate() + 2);
            const day2Key = ScheduleUtils.getDateKey(day2);

            // Day 0 のイベント (7つ, 3つはフィルタされる)
            const events1 = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0),
                    "1",
                ), // × 勤務時間前
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                    "2",
                ), // × 勤務時間前から開始
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "3",
                ), // ○ 調整される
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "4",
                ), // ○
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0),
                    "5",
                ), // ○ 調整される
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                    "6",
                ), // ○
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0),
                    "7",
                ), // × 勤務時間後
            ];

            // Day 0 のスケジュール
            const schedule1Start = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "勤務開始",
            );
            schedule1Start.workingEventType = "start";
            const schedule1End = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0),
                "勤務終了",
            );
            schedule1End.workingEventType = "end";

            // Day 1 のイベント (7つ, 3つはフィルタされる)
            const events2 = [
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 7, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 8, 30, 0),
                    "1",
                ), // × 勤務時間前
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 6, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 8, 0, 0),
                    "2",
                ), // × 勤務時間前
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 9, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 9, 30, 0),
                    "3",
                ), // ○
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 9, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 11, 30, 0),
                    "4",
                ), // ○
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 16, 30, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 17, 0, 0),
                    "5",
                ), // ○
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 17, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 17, 30, 0),
                    "6",
                ), // ○
                createTestEvent(
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 18, 0, 0),
                    new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 21, 0, 0),
                    "7",
                ), // × 勤務時間後まで続く
            ];

            // Day 1 のスケジュール
            const schedule2Start = createTestEvent(
                new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 8, 30, 0),
                new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 9, 0, 0),
                "勤務開始",
            );
            schedule2Start.workingEventType = "start";
            const schedule2End = createTestEvent(
                new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 17, 30, 0),
                new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 18, 0, 0),
                "勤務終了",
            );
            schedule2End.workingEventType = "end";

            // Day 2 のスケジュールのみ (イベントなし)
            const schedule3Start = createTestEvent(
                new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 9, 0, 0),
                new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 9, 30, 0),
                "勤務開始",
            );
            schedule3Start.workingEventType = "start";
            const schedule3End = createTestEvent(
                new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 18, 30, 0),
                new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 19, 0, 0),
                "勤務終了",
            );
            schedule3End.workingEventType = "end";

            const eventMap = new Map<string, Event[]>();
            eventMap.set(nowDateKey, events1);
            eventMap.set(day1Key, events2);

            const scheduleMap = new Map<string, Event[]>();
            scheduleMap.set(nowDateKey, [schedule1Start, schedule1End]);
            scheduleMap.set(day1Key, [schedule2Start, schedule2End]);
            scheduleMap.set(day2Key, [schedule3Start, schedule3End]);

            const result = algorithm.margedScheduleEvents(scheduleMap, eventMap);

            // 3日分の結果
            expect(result.size).toBe(3);
            expect(result.has(nowDateKey)).toBe(true);
            expect(result.has(day1Key)).toBe(true);
            expect(result.has(day2Key)).toBe(true);

            // Day 0: 4つのイベント (フィルタ後)
            const result0 = result.get(nowDateKey)!;
            expect(result0.length).toBe(4);
            expect(result0[0].name).toBe("3");
            assertDateTime(result0[0].schedule.start, now, { hour: 9, minute: 0, second: 0 });
            assertDateTime(result0[0].schedule.end!, now, { hour: 11, minute: 30, second: 0 });
            expect(result0[1].name).toBe("4");
            assertDateTime(result0[1].schedule.start, now, { hour: 9, minute: 30, second: 0 });
            assertDateTime(result0[1].schedule.end!, now, { hour: 11, minute: 30, second: 0 });
            expect(result0[2].name).toBe("5");
            assertDateTime(result0[2].schedule.start, now, { hour: 19, minute: 30, second: 0 });
            assertDateTime(result0[2].schedule.end!, now, { hour: 20, minute: 30, second: 0 });
            expect(result0[3].name).toBe("6");
            assertDateTime(result0[3].schedule.start, now, { hour: 20, minute: 0, second: 0 });
            assertDateTime(result0[3].schedule.end!, now, { hour: 20, minute: 30, second: 0 });

            // Day 1: 6つのイベント (スケジュール2 + 通常4)
            const result1 = result.get(day1Key)!;
            expect(result1.length).toBe(6);
            expect(result1[0].name).toBe("勤務開始");
            assertDateTime(result1[0].schedule.start, day1, { hour: 8, minute: 30, second: 0 });
            assertDateTime(result1[0].schedule.end!, day1, { hour: 9, minute: 0, second: 0 });
            expect(result1[1].name).toBe("3");
            assertDateTime(result1[1].schedule.start, day1, { hour: 9, minute: 0, second: 0 });
            assertDateTime(result1[1].schedule.end!, day1, { hour: 9, minute: 30, second: 0 });
            expect(result1[2].name).toBe("4");
            assertDateTime(result1[2].schedule.start, day1, { hour: 9, minute: 0, second: 0 });
            assertDateTime(result1[2].schedule.end!, day1, { hour: 11, minute: 30, second: 0 });
            expect(result1[3].name).toBe("5");
            assertDateTime(result1[3].schedule.start, day1, { hour: 16, minute: 30, second: 0 });
            assertDateTime(result1[3].schedule.end!, day1, { hour: 17, minute: 0, second: 0 });
            expect(result1[4].name).toBe("6");
            assertDateTime(result1[4].schedule.start, day1, { hour: 17, minute: 0, second: 0 });
            assertDateTime(result1[4].schedule.end!, day1, { hour: 17, minute: 30, second: 0 });
            expect(result1[5].name).toBe("勤務終了");
            assertDateTime(result1[5].schedule.start, day1, { hour: 17, minute: 30, second: 0 });
            assertDateTime(result1[5].schedule.end!, day1, { hour: 18, minute: 0, second: 0 });

            // Day 2: 2つのイベント (スケジュールのみ)
            const result2 = result.get(day2Key)!;
            expect(result2.length).toBe(2);
            expect(result2[0].name).toBe("勤務開始");
            assertDateTime(result2[0].schedule.start, day2, { hour: 9, minute: 0, second: 0 });
            assertDateTime(result2[0].schedule.end!, day2, { hour: 9, minute: 30, second: 0 });
            expect(result2[1].name).toBe("勤務終了");
            assertDateTime(result2[1].schedule.start, day2, { hour: 18, minute: 30, second: 0 });
            assertDateTime(result2[1].schedule.end!, day2, { hour: 19, minute: 0, second: 0 });
        });
    });

    describe("searchNextEvent", () => {
        interface SearchCaseSingle {
            caseId: string;
            title: string;
            events: Array<{ start: [number, number]; end: [number, number]; name: string }>;
            current?: { start: [number, number]; end: [number, number]; name: string } | null;
            compare: "small" | "large";
            expectedName: string | null;
            expectedStart?: [number, number];
            expectedEnd?: [number, number];
        }
        interface SearchCaseBoth {
            caseId: string;
            title: string;
            events: Array<{ start: [number, number]; end: [number, number]; name: string }>;
            current: { start: [number, number]; end: [number, number]; name: string } | null;
            compare: "both";
            expectedSmall: { name: string | null; start?: [number, number]; end?: [number, number] };
            expectedLarge: { name: string | null; start?: [number, number]; end?: [number, number] };
        }
        type SearchCase = SearchCaseSingle | SearchCaseBoth;
        const baseDay = () => [now.getFullYear(), now.getMonth(), now.getDate()] as const;
        const makeDate = (h: number, m: number) => new Date(baseDay()[0], baseDay()[1], baseDay()[2], h, m, 0);
        const searchCases: SearchCase[] = [
            {
                caseId: "SN01",
                title: "initial selection small (shortest)",
                events: [
                    { start: [10, 0], end: [10, 30], name: "1" },
                    { start: [10, 0], end: [11, 30], name: "2" },
                    { start: [11, 0], end: [11, 30], name: "3" },
                ],
                current: null,
                compare: "small",
                expectedName: "1",
                expectedStart: [10, 0],
                expectedEnd: [10, 30],
            },
            {
                caseId: "SN02",
                title: "initial selection large (longest)",
                events: [
                    { start: [10, 0], end: [10, 30], name: "1" },
                    { start: [10, 0], end: [12, 0], name: "4" },
                ],
                current: null,
                compare: "large",
                expectedName: "4",
                expectedStart: [10, 0],
                expectedEnd: [12, 0],
            },
            {
                caseId: "SN03",
                title: "no next event (returns null)",
                events: [{ start: [10, 0], end: [11, 0], name: "1" }],
                current: { start: [12, 0], end: [13, 0], name: "current" },
                compare: "small",
                expectedName: null,
            },
            {
                caseId: "SN04",
                title: "after current event (small)",
                events: [
                    { start: [10, 0], end: [10, 30], name: "1" },
                    { start: [10, 0], end: [11, 30], name: "2" },
                    { start: [11, 0], end: [11, 30], name: "3" },
                ],
                current: { start: [10, 0], end: [10, 30], name: "current" },
                compare: "small",
                expectedName: "2",
                expectedStart: [10, 30],
                expectedEnd: [11, 0],
            },
            {
                caseId: "SN05",
                title: "overlapping long current choose longest (large)",
                events: [
                    { start: [10, 0], end: [11, 30], name: "2" },
                    { start: [10, 0], end: [12, 0], name: "4" },
                ],
                current: { start: [10, 0], end: [13, 30], name: "current" },
                compare: "large",
                // current が全体を包含するため候補なし -> null
                expectedName: null,
            },
            {
                caseId: "SN06",
                title: "no next exists (explicit)",
                events: [{ start: [10, 0], end: [11, 0], name: "1" }],
                current: { start: [12, 0], end: [13, 0], name: "current" },
                compare: "small",
                expectedName: null,
            },
            {
                caseId: "SN07",
                title: "large comparison after current event",
                events: [
                    { start: [10, 0], end: [11, 30], name: "2" },
                    { start: [10, 0], end: [12, 0], name: "4" },
                ],
                current: { start: [10, 0], end: [10, 30], name: "current" },
                compare: "large",
                expectedName: "4",
                expectedStart: [10, 30],
                expectedEnd: [12, 0],
            },
            {
                caseId: "SN08",
                title: "small from long overlapping event",
                events: [
                    { start: [12, 30], end: [14, 0], name: "7" },
                    { start: [13, 30], end: [15, 0], name: "5" },
                ],
                current: { start: [10, 0], end: [13, 30], name: "current" },
                compare: "small",
                expectedName: "7",
                expectedStart: [13, 30],
                expectedEnd: [14, 0],
            },
            {
                caseId: "SN09",
                title: "large from long overlapping event",
                events: [
                    { start: [12, 30], end: [14, 0], name: "7" },
                    { start: [13, 30], end: [15, 0], name: "5" },
                ],
                current: { start: [10, 0], end: [13, 30], name: "current" },
                compare: "large",
                expectedName: "5",
                expectedStart: [13, 30],
                expectedEnd: [15, 0],
            },
            {
                caseId: "SN10",
                title: "no overlap same result both",
                events: [{ start: [13, 30], end: [15, 0], name: "5" }],
                current: { start: [10, 0], end: [14, 0], name: "current" },
                compare: "both",
                expectedSmall: { name: "5", start: [14, 0], end: [15, 0] },
                expectedLarge: { name: "5", start: [14, 0], end: [15, 0] },
            },
            {
                caseId: "SN11",
                title: "before work hours both comparisons",
                events: [
                    { start: [10, 0], end: [10, 30], name: "1" },
                    { start: [10, 0], end: [12, 0], name: "4" },
                ],
                current: { start: [9, 0], end: [9, 30], name: "current" },
                compare: "both",
                expectedSmall: { name: "1", start: [10, 0], end: [10, 30] },
                expectedLarge: { name: "4", start: [10, 0], end: [12, 0] },
            },
        ];

        test.each(searchCases)("[$caseId] should find next event - $title", (c) => {
            const evs = c.events.map((e) =>
                createTestEvent(makeDate(e.start[0], e.start[1]), makeDate(e.end[0], e.end[1]), e.name),
            );
            const curr = c.current
                ? createTestEvent(
                      makeDate(c.current.start[0], c.current.start[1]),
                      makeDate(c.current.end[0], c.current.end[1]),
                      c.current.name,
                  )
                : null;
            if (c.compare === "both") {
                const small = algorithm.searchNextEvent(curr, evs, "small");
                const large = algorithm.searchNextEvent(curr, evs, "large");
                if (c.expectedSmall.name === null) expect(small).toBeNull();
                else {
                    expect(small).not.toBeNull();
                    expect(small!.name).toBe(c.expectedSmall.name);
                    if (c.expectedSmall.start && c.expectedSmall.end) {
                        assertDateTime(small!.schedule.start, now, {
                            hour: c.expectedSmall.start[0],
                            minute: c.expectedSmall.start[1],
                            second: 0,
                        });
                        assertDateTime(small!.schedule.end!, now, {
                            hour: c.expectedSmall.end[0],
                            minute: c.expectedSmall.end[1],
                            second: 0,
                        });
                    }
                }
                if (c.expectedLarge.name === null) expect(large).toBeNull();
                else {
                    expect(large).not.toBeNull();
                    expect(large!.name).toBe(c.expectedLarge.name);
                    if (c.expectedLarge.start && c.expectedLarge.end) {
                        assertDateTime(large!.schedule.start, now, {
                            hour: c.expectedLarge.start[0],
                            minute: c.expectedLarge.start[1],
                            second: 0,
                        });
                        assertDateTime(large!.schedule.end!, now, {
                            hour: c.expectedLarge.end[0],
                            minute: c.expectedLarge.end[1],
                            second: 0,
                        });
                    }
                }
            } else {
                const result = algorithm.searchNextEvent(curr, evs, c.compare);
                if (c.expectedName === null) {
                    expect(result).toBeNull();
                } else {
                    expect(result).not.toBeNull();
                    expect(result!.name).toBe(c.expectedName);
                    if (c.expectedStart && c.expectedEnd) {
                        assertDateTime(result!.schedule.start, now, {
                            hour: c.expectedStart[0],
                            minute: c.expectedStart[1],
                            second: 0,
                        });
                        assertDateTime(result!.schedule.end!, now, {
                            hour: c.expectedEnd[0],
                            minute: c.expectedEnd[1],
                            second: 0,
                        });
                    }
                }
            }
        });
    });
});
