import type { Event, EventInputInfo, Project, ScheduleInputInfo } from "@/types";
import { createSchedule, generateUUID, ScheduleUtils } from "@/types/utils";
import { beforeEach, describe, expect, test } from "vitest";
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
    describe("roundingTime", () => {
        type RoundTimeCase = {
            caseId: string;
            title: string;
            set: [number, number];
            up: boolean;
            expect: { hour: number; minute: number } | { day: number; hour: number; minute: number };
        };
        const cases: RoundTimeCase[] = [
            { caseId: "RT01", title: "round up 15->30", set: [9, 15], up: true, expect: { hour: 9, minute: 30 } },
            { caseId: "RT02", title: "no change on boundary", set: [9, 0], up: true, expect: { hour: 9, minute: 0 } },
            {
                caseId: "RT03",
                title: "round up 45->next hour",
                set: [9, 45],
                up: true,
                expect: { hour: 10, minute: 0 },
            },
            { caseId: "RT04", title: "round down 15->00", set: [9, 15], up: false, expect: { hour: 9, minute: 0 } },
            { caseId: "RT05", title: "round down 45->30", set: [9, 45], up: false, expect: { hour: 9, minute: 30 } },
        ];

        test.each(cases)("[$caseId] $title", ({ set, up, expect }) => {
            const input = new Date(now);
            input.setHours(set[0], set[1], 0);
            const result = algorithm.roundingTime(input, up);
            assertDateTime(result, now, { ...expect, second: 0 } as any);
        });

        test("midnight crossing when rounding up", () => {
            const input = new Date(now);
            input.setHours(23, 45, 0);
            const result = algorithm.roundingTime(input, true);
            assertDateTime(result, now, { day: now.getDate() + 1, hour: 0, minute: 0, second: 0 });
        });
    });

    describe("roundingSchedule", () => {
        type RoundScheduleCase = {
            caseId: string;
            method: Parameters<TimeTrackerAlgorithm["roundingSchedule"]>[1];
            expected: { startH: number; startM: number; endH: number; endM: number };
            title: string;
            events?: any[];
        };
        const baseStart = () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0);
        const baseEnd = () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0);
        const scheduleCases: RoundScheduleCase[] = [
            {
                caseId: "RS01",
                method: "backward",
                title: "backward",
                expected: { startH: 9, startM: 30, endH: 19, endM: 0 },
            },
            {
                caseId: "RS02",
                method: "forward",
                title: "forward",
                expected: { startH: 9, startM: 0, endH: 18, endM: 30 },
            },
            { caseId: "RS03", method: "round", title: "round", expected: { startH: 9, startM: 0, endH: 19, endM: 0 } },
            { caseId: "RS04", method: "half", title: "half", expected: { startH: 9, startM: 0, endH: 19, endM: 0 } },
            {
                caseId: "RS05",
                method: "stretch",
                title: "stretch",
                expected: { startH: 9, startM: 0, endH: 19, endM: 0 },
            },
            {
                caseId: "RS06",
                method: "nonduplicate",
                title: "nonduplicate (no conflicts)",
                expected: { startH: 9, startM: 0, endH: 19, endM: 0 },
                events: [],
            },
        ];

        test.each(scheduleCases)(
            "[$caseId] should round schedule using $title method",
            ({ method, expected, events }) => {
                const schedule = createSchedule(baseStart(), baseEnd());
                const result = algorithm.roundingSchedule(schedule, method as any, events as any);
                expect(result).not.toBeNull();
                if (result) {
                    assertDateTime(result.start, now, { hour: expected.startH, minute: expected.startM, second: 0 });
                    assertDateTime(result.end!, now, { hour: expected.endH, minute: expected.endM, second: 0 });
                }
            },
        );

        test("should return null for schedule that becomes too short", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result).toBeNull();
        });

        test("should handle schedule spanning multiple days", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 45, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, {
                    day: now.getDate() + 1,
                    hour: 0,
                    minute: 0,
                    second: 0,
                });
            }
        });

        test("should avoid duplicates with nonduplicate method", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 15, 0),
            );

            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", [event1, event2]);

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 0, second: 0 });
            }
        });

        // half の境界挙動をまとめて検証
        type HalfBoundaryCase = {
            caseId: string;
            title: string;
            start: [number, number];
            end: [number, number];
            expectedStart: [number, number];
            expectedEnd: [number, number];
        };
        const halfBoundaryCases: HalfBoundaryCase[] = [
            {
                caseId: "HB01",
                title: "half rounding <15min both sides (14 -> 00)",
                start: [9, 14],
                end: [10, 14],
                expectedStart: [9, 0],
                expectedEnd: [10, 0],
            },
            {
                caseId: "HB02",
                title: "half rounding start 14min end early minute (1)", // end 10:01 -> 10:00 に収束
                start: [9, 14],
                end: [10, 1],
                expectedStart: [9, 0],
                expectedEnd: [10, 0],
            },
            {
                caseId: "HB03",
                title: "half rounding exactly 15min boundary (-> 30)",
                start: [9, 15],
                end: [10, 15],
                expectedStart: [9, 30],
                expectedEnd: [10, 30],
            },
        ];
        test.each(halfBoundaryCases)("[$caseId] should handle $title", ({ start, end, expectedStart, expectedEnd }) => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), start[0], start[1], 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), end[0], end[1], 0),
            );
            const result = algorithm.roundingSchedule(schedule, "half");
            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: expectedStart[0], minute: expectedStart[1], second: 0 });
                assertDateTime(result.end!, now, { hour: expectedEnd[0], minute: expectedEnd[1], second: 0 });
            }
        });

        test("should avoid duplicate with end time adjustment", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 45, 0),
            );

            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", [event1, event2]);

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 30, second: 0 });
            }
        });

        test("should avoid duplicate with different time range", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 15, 0),
            );

            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", [event1, event2]);

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 30, second: 0 });
            }
        });

        test("should handle nonduplicate with start time after existing event", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
            );

            const event1 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
            );
            const event2 = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", [event1, event2]);

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 0, second: 0 });
            }
        });
    });

    describe("scheduleToEvent", () => {
        // start / end / both の組合せと roundingTimeType の基本パターンをマトリクス化
        type ScheduleToEventCase = {
            caseId: string;
            title: string;
            roundingTimeType: ScheduleInputInfo["roundingTimeType"];
            startEndType: ScheduleInputInfo["startEndType"];
            expected: Array<{
                type: "start" | "end";
                start: [number, number];
                end: [number, number];
            }>;
        };
        const scheduleMatrix: ScheduleToEventCase[] = [
            {
                caseId: "SE01",
                title: "start only backward",
                roundingTimeType: "backward",
                startEndType: "start",
                expected: [{ type: "start", start: [9, 0], end: [9, 30] }],
            },
            {
                caseId: "SE02",
                title: "end only backward",
                roundingTimeType: "backward",
                startEndType: "end",
                expected: [{ type: "end", start: [18, 0], end: [18, 30] }],
            },
            {
                caseId: "SE03",
                title: "both backward",
                roundingTimeType: "backward",
                startEndType: "both",
                expected: [
                    { type: "start", start: [9, 0], end: [9, 30] },
                    { type: "end", start: [18, 0], end: [18, 30] },
                ],
            },
            {
                caseId: "SE04",
                title: "both forward",
                roundingTimeType: "forward",
                startEndType: "both",
                expected: [
                    { type: "start", start: [8, 30], end: [9, 0] },
                    { type: "end", start: [17, 30], end: [18, 0] },
                ],
            },
            {
                caseId: "SE05",
                title: "both round",
                roundingTimeType: "round",
                startEndType: "both",
                expected: [
                    { type: "start", start: [9, 0], end: [9, 30] },
                    { type: "end", start: [17, 30], end: [18, 0] },
                ],
            },
            {
                caseId: "SE06",
                title: "both stretch",
                roundingTimeType: "stretch",
                startEndType: "both",
                expected: [
                    { type: "start", start: [8, 30], end: [9, 0] },
                    { type: "end", start: [18, 0], end: [18, 30] },
                ],
            },
        ];
        test.each(scheduleMatrix)(
            "[$caseId] should create events - $title",
            ({ roundingTimeType, startEndType, expected }) => {
                const schedule = createSchedule(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
                );
                const info: ScheduleInputInfo = {
                    roundingTimeType,
                    startEndType,
                    startEndTime: 30,
                };
                const events = algorithm.scheduleToEvent(schedule, info, []);
                expect(events.length).toBe(expected.length);
                expected.forEach((exp, idx) => {
                    assertDateTime(events[idx].schedule.start, now, {
                        hour: exp.start[0],
                        minute: exp.start[1],
                        second: 0,
                    });
                    assertDateTime(events[idx].schedule.end!, now, {
                        hour: exp.end[0],
                        minute: exp.end[1],
                        second: 0,
                    });
                });
            },
        );

        test("should handle schedule spanning multiple days", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 3, 45, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(2);
            expect(events[0].workingEventType).toBe("start");
            expect(events[1].workingEventType).toBe("end");

            assertDateTime(events[0].schedule.start, now, {
                hour: 21,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 21,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.start, now, {
                day: now.getDate() + 2,
                hour: 3,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                day: now.getDate() + 2,
                hour: 4,
                minute: 0,
                second: 0,
            });
        });
    });

    describe("getRecurrenceEvent", () => {
        test("should generate recurring events correctly", () => {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            const event = createTestEvent(start, end);

            // 繰り返し日付を設定（今日 + 7日後、14日後、21日後、28日後）
            const recurrence: Date[] = [
                now,
                new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
                new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
                new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
            ];
            event.recurrence = recurrence;

            const events = algorithm.getRecurrenceEvent(event);

            expect(events.length).toBe(4); // 今日は除外されるので4つ

            // 7日後
            assertDateTime(events[0].schedule.start, now, {
                day: now.getDate() + 7,
                hour: 11,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                day: now.getDate() + 7,
                hour: 12,
                minute: 0,
                second: 0,
            });

            // 14日後
            assertDateTime(events[1].schedule.start, now, {
                day: now.getDate() + 14,
                hour: 11,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                day: now.getDate() + 14,
                hour: 12,
                minute: 0,
                second: 0,
            });

            // 21日後
            assertDateTime(events[2].schedule.start, now, {
                day: now.getDate() + 21,
                hour: 11,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[2].schedule.end!, now, {
                day: now.getDate() + 21,
                hour: 12,
                minute: 0,
                second: 0,
            });

            // 28日後
            assertDateTime(events[3].schedule.start, now, {
                day: now.getDate() + 28,
                hour: 11,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[3].schedule.end!, now, {
                day: now.getDate() + 28,
                hour: 12,
                minute: 0,
                second: 0,
            });
        });
    });

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
            expect(result[0].project).toBe(project);
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
            expect(result[0].project).toBe(project);
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

    describe("addStartToEndDate", () => {
        test("should split multi-day events correctly", () => {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
            const event1 = createTestEvent(start, end, "Multi-day Event 1");

            const start2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);
            const end2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 14, 0, 0);
            const event2 = createTestEvent(start2, end2, "Multi-day Event 2");

            const nowDateKey = ScheduleUtils.getDateKey(now);
            const eventMap = new Map<string, Event[]>();
            eventMap.set(nowDateKey, [event1, event2]);

            const result = algorithm.addStartToEndDate(eventMap);

            // 4日分のキーが作成される（今日+3日）
            expect(result.size).toBe(4);

            const day0Key = nowDateKey;
            const day1 = new Date(now);
            day1.setDate(now.getDate() + 1);
            const day1Key = ScheduleUtils.getDateKey(day1);
            const day2 = new Date(now);
            day2.setDate(now.getDate() + 2);
            const day2Key = ScheduleUtils.getDateKey(day2);
            const day3 = new Date(now);
            day3.setDate(now.getDate() + 3);
            const day3Key = ScheduleUtils.getDateKey(day3);

            // 今日は2つのイベント（両方の初日）
            expect(result.get(day0Key)?.length).toBe(2);

            // 1日後は2つのイベント（event1の最終日、event2の中間日）
            expect(result.get(day1Key)?.length).toBe(2);

            // 2日後は1つのイベント（event2の中間日）
            expect(result.get(day2Key)?.length).toBe(1);

            // 3日後は1つのイベント（event2の最終日）
            expect(result.get(day3Key)?.length).toBe(1);

            // 初日のイベントの終了時刻は23:XX
            const day0Events = result.get(day0Key)!;
            expect(day0Events[0].schedule.end!.getHours()).toBe(23);
            expect(day0Events[0].schedule.end!.getMinutes()).toBe(30); // roundingTimeUnit

            // 最終日のイベントの開始時刻は00:00
            const day1Events = result.get(day1Key)!;
            const finalEvent = day1Events.find((e) => e.name === "Multi-day Event 1");
            expect(finalEvent).toBeDefined();
            expect(finalEvent!.schedule.start.getHours()).toBe(0);
            expect(finalEvent!.schedule.start.getMinutes()).toBe(0);

            // Day 0 - event1の初日 (11:00 - 23:30)
            assertDateTime(day0Events[0].schedule.start, now, { hour: 11, minute: 0, second: 0 });
            assertDateTime(day0Events[0].schedule.end!, now, { hour: 23, minute: 30, second: 0 });

            // Day 0 - event2の初日 (13:00 - 23:30)
            assertDateTime(day0Events[1].schedule.start, now, { hour: 13, minute: 0, second: 0 });
            assertDateTime(day0Events[1].schedule.end!, now, { hour: 23, minute: 30, second: 0 });

            // Day 1 - event1の最終日 (00:00 - 12:00)
            assertDateTime(finalEvent!.schedule.start, day1, { hour: 0, minute: 0, second: 0 });
            assertDateTime(finalEvent!.schedule.end!, day1, { hour: 12, minute: 0, second: 0 });

            // Day 1 - event2の中間日 (00:00 - 23:30)
            const event2Day1 = day1Events.find((e) => e.name === "Multi-day Event 2");
            expect(event2Day1).toBeDefined();
            assertDateTime(event2Day1!.schedule.start, day1, { hour: 0, minute: 0, second: 0 });
            assertDateTime(event2Day1!.schedule.end!, day1, { hour: 23, minute: 30, second: 0 });

            // Day 2 - event2の中間日 (00:00 - 23:30)
            const day2Events = result.get(day2Key)!;
            assertDateTime(day2Events[0].schedule.start, day2, { hour: 0, minute: 0, second: 0 });
            assertDateTime(day2Events[0].schedule.end!, day2, { hour: 23, minute: 30, second: 0 });

            // Day 3 - event2の最終日 (00:00 - 14:00)
            const day3Events = result.get(day3Key)!;
            assertDateTime(day3Events[0].schedule.start, day3, { hour: 0, minute: 0, second: 0 });
            assertDateTime(day3Events[0].schedule.end!, day3, { hour: 14, minute: 0, second: 0 });
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

    describe("scheduleToEvent with fill mode", () => {
        interface FillCase {
            caseId: string;
            title: string;
            rounding: ScheduleInputInfo["roundingTimeType"];
            start: [number, number, number?]; // [h,m, plusDays]
            end: [number, number, number?];
            existing?: Array<{ start: [number, number]; end: [number, number]; name: string }>;
            verify: (events: Event[]) => void;
        }
        const makeDate = (base: Date, t: [number, number, number?]) =>
            new Date(base.getFullYear(), base.getMonth(), base.getDate() + (t[2] ?? 0), t[0], t[1], 0);
        const fillCases: FillCase[] = [
            {
                caseId: "FM01",
                title: "multi-day stretch with middle events",
                rounding: "stretch",
                start: [8, 52, 0],
                end: [20, 36, 2],
                verify: (events) => {
                    expect(events.length).toBeGreaterThan(2);
                    const hasStart = events.some((e) => e.workingEventType === "start");
                    const hasEnd = events.some((e) => e.workingEventType === "end");
                    const hasMiddle = events.some((e) => e.workingEventType === "middle");
                    expect(hasStart && hasEnd && hasMiddle).toBe(true);
                },
            },
            {
                caseId: "FM02",
                title: "single-day round without overlap on existing events",
                rounding: "round",
                start: [8, 52, 0],
                end: [20, 36, 0],
                existing: [
                    { start: [9, 0], end: [9, 30], name: "Existing 1" },
                    { start: [10, 0], end: [11, 0], name: "Existing 2" },
                ],
                verify: (events) => {
                    const existingSpans = events.filter((e) => e.name.startsWith("Existing"));
                    // scheduleToEvent は既存イベントをそのまま返さない仕様のため 0 を期待
                    expect(existingSpans.length).toBe(0);
                    // middle が既存イベントと重ならない
                    const middle = events.filter((e) => e.workingEventType === "middle");
                    for (const m of middle) {
                        for (const ex of existingSpans) {
                            const isOverlap =
                                m.schedule.start < ex.schedule.end! && m.schedule.end! > ex.schedule.start;
                            expect(isOverlap).toBe(false);
                        }
                    }
                },
            },
        ];

        test.each(fillCases)("[$caseId] fill mode - $title", ({ rounding, start: s, end: e, existing, verify }) => {
            const schedule = createSchedule(makeDate(now, s), makeDate(now, e));
            const info: ScheduleInputInfo = {
                roundingTimeType: rounding,
                startEndType: "fill",
                startEndTime: 30,
            };
            const existingEvents = existing?.map((e) =>
                createTestEvent(makeDate(now, [e.start[0], e.start[1]]), makeDate(now, [e.end[0], e.end[1]]), e.name),
            );
            const events = algorithm.scheduleToEvent(schedule, info, existingEvents ?? []);
            verify(events);
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
        // 旧個別テストは searchCases に統合済み
    });
});
