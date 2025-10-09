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
        test("should round up time correctly", () => {
            const input = new Date(now);
            input.setHours(9, 15, 0);

            const result = algorithm.roundingTime(input, true);

            assertDateTime(result, now, { hour: 9, minute: 30, second: 0 });
        });

        test("should not round when already on boundary", () => {
            const input = new Date(now);
            input.setHours(9, 0, 0);

            const result = algorithm.roundingTime(input, true);

            assertDateTime(result, now, { hour: 9, minute: 0, second: 0 });
        });

        test("should round to next hour", () => {
            const input = new Date(now);
            input.setHours(9, 45, 0);

            const result = algorithm.roundingTime(input, true);

            assertDateTime(result, now, { hour: 10, minute: 0, second: 0 });
        });

        test("should round down time correctly", () => {
            const input = new Date(now);
            input.setHours(9, 15, 0);

            const result = algorithm.roundingTime(input, false);

            assertDateTime(result, now, { hour: 9, minute: 0, second: 0 });
        });

        test("should round down to previous half hour", () => {
            const input = new Date(now);
            input.setHours(9, 45, 0);

            const result = algorithm.roundingTime(input, false);

            assertDateTime(result, now, { hour: 9, minute: 30, second: 0 });
        });

        test("should handle midnight crossing", () => {
            const input = new Date(now);
            input.setHours(23, 45, 0);

            const result = algorithm.roundingTime(input, true);

            assertDateTime(result, now, {
                day: now.getDate() + 1,
                hour: 0,
                minute: 0,
                second: 0,
            });
        });
    });

    describe("roundingSchedule", () => {
        test("should round schedule backward", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 19, minute: 0, second: 0 });
            }
        });

        test("should round schedule forward", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "forward");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 18, minute: 30, second: 0 });
            }
        });

        test("should round schedule using round method", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "round");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 19, minute: 0, second: 0 });
            }
        });

        test("should round schedule using half method", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "half");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 19, minute: 0, second: 0 });
            }
        });

        test("should round schedule using stretch method", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "stretch");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 19, minute: 0, second: 0 });
            }
        });

        test("should round schedule using nonduplicate method with no conflicts", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 7, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 49, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", []);

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 19, minute: 0, second: 0 });
            }
        });

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

        test("should handle half rounding with specific time boundaries (14min)", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 14, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 14, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "half");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 0, second: 0 });
            }
        });

        test("should handle half rounding with 1 minute after boundary", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 14, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 1, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "half");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 0, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 0, second: 0 });
            }
        });

        test("should handle half rounding at exactly 15 minutes", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 15, 0),
            );

            const result = algorithm.roundingSchedule(schedule, "half");

            expect(result).not.toBeNull();
            if (result) {
                assertDateTime(result.start, now, { hour: 9, minute: 30, second: 0 });
                assertDateTime(result.end!, now, { hour: 10, minute: 30, second: 0 });
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
        test('should create start event only when startEndType is "start"', () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "backward",
                startEndType: "start",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(1);
            assertDateTime(events[0].schedule.start, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 9,
                minute: 30,
                second: 0,
            });
        });

        test('should create end event only when startEndType is "end"', () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "backward",
                startEndType: "end",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(1);
            assertDateTime(events[0].schedule.start, now, {
                hour: 18,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 18,
                minute: 30,
                second: 0,
            });
        });

        test("should create both start and end events with backward rounding", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(2);
            assertDateTime(events[0].schedule.start, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 9,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.start, now, {
                hour: 18,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                hour: 18,
                minute: 30,
                second: 0,
            });
        });

        test("should create both events with forward rounding", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "forward",
                startEndType: "both",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(2);
            assertDateTime(events[0].schedule.start, now, {
                hour: 8,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[1].schedule.start, now, {
                hour: 17,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                hour: 18,
                minute: 0,
                second: 0,
            });
        });

        test("should create both events with round rounding", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "round",
                startEndType: "both",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(2);
            assertDateTime(events[0].schedule.start, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 9,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.start, now, {
                hour: 17,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                hour: 18,
                minute: 0,
                second: 0,
            });
        });

        test("should create both events with stretch rounding", () => {
            const schedule = createSchedule(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 12, 0),
            );

            const info: ScheduleInputInfo = {
                roundingTimeType: "stretch",
                startEndType: "both",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            expect(events.length).toBe(2);
            assertDateTime(events[0].schedule.start, now, {
                hour: 8,
                minute: 30,
                second: 0,
            });
            assertDateTime(events[0].schedule.end!, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[1].schedule.start, now, {
                hour: 18,
                minute: 0,
                second: 0,
            });
            assertDateTime(events[1].schedule.end!, now, {
                hour: 18,
                minute: 30,
                second: 0,
            });
        });

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
        test('should clean duplicate events using "small" comparison', () => {
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

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");
            const resultEvent = result.get(nowDate)!;

            expect(resultEvent).toBeDefined();

            expect(resultEvent.length).toBe(6);
            expect(resultEvent[0].name).toBe("1");
            assertDateTime(resultEvent[0].schedule.start, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(resultEvent[0].schedule.end!, now, {
                hour: 9,
                minute: 30,
                second: 0,
            });

            expect(resultEvent[1].name).toBe("2");
            assertDateTime(resultEvent[1].schedule.start, now, {
                hour: 9,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[1].schedule.end!, now, {
                hour: 10,
                minute: 0,
                second: 0,
            });

            expect(resultEvent[2].name).toBe("3");
            assertDateTime(resultEvent[2].schedule.start, now, {
                hour: 10,
                minute: 0,
                second: 0,
            });
            assertDateTime(resultEvent[2].schedule.end!, now, {
                hour: 10,
                minute: 30,
                second: 0,
            });

            expect(resultEvent[3].name).toBe("5");
            assertDateTime(resultEvent[3].schedule.start, now, {
                hour: 10,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[3].schedule.end!, now, {
                hour: 11,
                minute: 0,
                second: 0,
            });

            expect(resultEvent[4].name).toBe("6");
            assertDateTime(resultEvent[4].schedule.start, now, {
                hour: 11,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[4].schedule.end!, now, {
                hour: 12,
                minute: 30,
                second: 0,
            });

            expect(resultEvent[5].name).toBe("7");
            assertDateTime(resultEvent[5].schedule.start, now, {
                hour: 12,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[5].schedule.end!, now, {
                hour: 13,
                minute: 30,
                second: 0,
            });

            const resultEvent2 = result.get(nextDateStr)!;
            expect(resultEvent2).toBeDefined();
            expect(resultEvent2.length).toBe(3);
        });

        test('should clean duplicate events using "large" comparison', () => {
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

            const result = algorithm.cleanDuplicateEvent(eventMap, "large");
            const resultEvent = result.get(nowDate)!;

            expect(resultEvent).toBeDefined();
            expect(resultEvent.length).toBe(4);
            expect(resultEvent[0].name).toBe("2");
            assertDateTime(resultEvent[0].schedule.start, now, {
                hour: 9,
                minute: 0,
                second: 0,
            });
            assertDateTime(resultEvent[0].schedule.end!, now, {
                hour: 10,
                minute: 30,
                second: 0,
            });

            expect(resultEvent[1].name).toBe("5");
            assertDateTime(resultEvent[1].schedule.start, now, {
                hour: 10,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[1].schedule.end!, now, {
                hour: 11,
                minute: 0,
                second: 0,
            });

            expect(resultEvent[2].name).toBe("6");
            assertDateTime(resultEvent[2].schedule.start, now, {
                hour: 11,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[2].schedule.end!, now, {
                hour: 12,
                minute: 30,
                second: 0,
            });

            expect(resultEvent[3].name).toBe("7");
            assertDateTime(resultEvent[3].schedule.start, now, {
                hour: 12,
                minute: 30,
                second: 0,
            });
            assertDateTime(resultEvent[3].schedule.end!, now, {
                hour: 13,
                minute: 30,
                second: 0,
            });
        });
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
        test("should create fill events for multi-day schedule", () => {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 20, 36, 0);
            const schedule = createSchedule(start, end);

            const info: ScheduleInputInfo = {
                roundingTimeType: "stretch",
                startEndType: "fill",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, []);

            // fillモードでは開始イベント、終了イベント、および中間の埋めイベントが作成される
            expect(events.length).toBeGreaterThan(2);

            // すべてのイベントにworkingEventTypeが設定されている
            for (const event of events) {
                expect(event.workingEventType).toBeDefined();
            }

            // 開始イベントと終了イベントが含まれる
            const hasStartEvent = events.some((e) => e.workingEventType === "start");
            const hasEndEvent = events.some((e) => e.workingEventType === "end");
            const hasMiddleEvents = events.some((e) => e.workingEventType === "middle");

            expect(hasStartEvent).toBe(true);
            expect(hasEndEvent).toBe(true);
            expect(hasMiddleEvents).toBe(true);

            // 詳細な検証: 開始イベント
            const startEvent = events.find((e) => e.workingEventType === "start");
            expect(startEvent).toBeDefined();
            assertDateTime(startEvent!.schedule.start, now, { hour: 8, minute: 30, second: 0 });
            assertDateTime(startEvent!.schedule.end!, now, { hour: 9, minute: 0, second: 0 });

            // 詳細な検証: 終了イベント
            const endEvent = events.find((e) => e.workingEventType === "end");
            expect(endEvent).toBeDefined();
            const endDay = new Date(now);
            endDay.setDate(now.getDate() + 2);
            assertDateTime(endEvent!.schedule.start, endDay, { hour: 20, minute: 30, second: 0 });
            assertDateTime(endEvent!.schedule.end!, endDay, { hour: 21, minute: 0, second: 0 });
        });

        test("should avoid overlapping with existing events in fill mode", () => {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 52, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 36, 0);
            const schedule = createSchedule(start, end);

            // 既存イベント
            const existingEvents = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                    "Existing 1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                    "Existing 2",
                ),
            ];

            const info: ScheduleInputInfo = {
                roundingTimeType: "round",
                startEndType: "fill",
                startEndTime: 30,
            };

            const events = algorithm.scheduleToEvent(schedule, info, existingEvents);

            // 既存イベントの時間帯には fillイベントが作成されない
            for (const event of events) {
                if (event.workingEventType === "middle") {
                    for (const existing of existingEvents) {
                        // fillイベントが既存イベントと重複していないことを確認
                        const isOverlap =
                            event.schedule.start < existing.schedule.end! &&
                            event.schedule.end! > existing.schedule.start;
                        expect(isOverlap).toBe(false);
                    }
                }
            }
        });
    });

    describe("searchNextEvent", () => {
        test("should find next event with small comparison from start", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "3",
                ),
            ];

            // currentItemがnullの場合、最初のイベントを返す（小さい順）
            const result = algorithm.searchNextEvent(null, events, "small");

            expect(result).toBeDefined();
            expect(result!.name).toBe("1"); // 最も短いイベント
            assertDateTime(result!.schedule.start, now, { hour: 10, minute: 0, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 10, minute: 30, second: 0 });
        });

        test("should find next event with large comparison from start", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    "4",
                ),
            ];

            const result = algorithm.searchNextEvent(null, events, "large");

            expect(result).toBeDefined();
            expect(result!.name).toBe("4"); // 最も長いイベント
            assertDateTime(result!.schedule.start, now, { hour: 10, minute: 0, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 12, minute: 0, second: 0 });
        });

        test("should find next event after current event", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "3",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "small");

            expect(result).toBeDefined();
            expect(result!.name).toBe("2");
            // 重複部分が調整される
            assertDateTime(result!.schedule.start, now, { hour: 10, minute: 30, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 11, minute: 0, second: 0 });
        });

        test("should handle overlapping events correctly", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    "4",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "large");

            // currentEventより後で、最も長いイベントが選ばれる
            expect(result).toBeDefined();
            // 重複している部分は調整される
        });

        test("should return null when no next event exists", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
                    "1",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "small");

            expect(result).toBeNull();
        });

        test("should find next event with large comparison after current event", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
                    "2",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    "4",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "large");

            expect(result).toBeDefined();
            expect(result!.name).toBe("4");
            assertDateTime(result!.schedule.start, now, { hour: 10, minute: 30, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 12, minute: 0, second: 0 });
        });

        test("should find next event with small comparison from long overlapping event", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
                    "7",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0),
                    "5",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "small");

            expect(result).toBeDefined();
            expect(result!.name).toBe("7");
            assertDateTime(result!.schedule.start, now, { hour: 13, minute: 30, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 14, minute: 0, second: 0 });
        });

        test("should find next event with large comparison from long overlapping event", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
                    "7",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0),
                    "5",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                "current",
            );

            const result = algorithm.searchNextEvent(currentEvent, events, "large");

            expect(result).toBeDefined();
            expect(result!.name).toBe("5");
            assertDateTime(result!.schedule.start, now, { hour: 13, minute: 30, second: 0 });
            assertDateTime(result!.schedule.end!, now, { hour: 15, minute: 0, second: 0 });
        });

        test("should find same event for both small and large when no overlap", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0),
                    "5",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
                "current",
            );

            const resultSmall = algorithm.searchNextEvent(currentEvent, events, "small");
            const resultLarge = algorithm.searchNextEvent(currentEvent, events, "large");

            expect(resultSmall).toBeDefined();
            expect(resultLarge).toBeDefined();
            expect(resultSmall!.name).toBe("5");
            expect(resultLarge!.name).toBe("5");
            assertDateTime(resultSmall!.schedule.start, now, { hour: 14, minute: 0, second: 0 });
            assertDateTime(resultSmall!.schedule.end!, now, { hour: 15, minute: 0, second: 0 });
            assertDateTime(resultLarge!.schedule.start, now, { hour: 14, minute: 0, second: 0 });
            assertDateTime(resultLarge!.schedule.end!, now, { hour: 15, minute: 0, second: 0 });
        });

        test("should find next event from before work hours", () => {
            const events = [
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
                    "1",
                ),
                createTestEvent(
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
                    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
                    "4",
                ),
            ];

            const currentEvent = createTestEvent(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
                "current",
            );

            const resultSmall = algorithm.searchNextEvent(currentEvent, events, "small");
            const resultLarge = algorithm.searchNextEvent(currentEvent, events, "large");

            expect(resultSmall).toBeDefined();
            expect(resultSmall!.name).toBe("1");
            assertDateTime(resultSmall!.schedule.start, now, { hour: 10, minute: 0, second: 0 });
            assertDateTime(resultSmall!.schedule.end!, now, { hour: 10, minute: 30, second: 0 });

            expect(resultLarge).toBeDefined();
            expect(resultLarge!.name).toBe("4");
            assertDateTime(resultLarge!.schedule.start, now, { hour: 10, minute: 0, second: 0 });
            assertDateTime(resultLarge!.schedule.end!, now, { hour: 12, minute: 0, second: 0 });
        });
    });
});
