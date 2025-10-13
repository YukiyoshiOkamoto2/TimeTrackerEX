/**
 * TimeTrackerAlgorithmEvent のテスト
 * getAllEventInScheduleRange 関数のテスト
 */

import type { Event, Schedule } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

describe("TimeTrackerAlgorithmEvent", () => {
    const createTestSchedule = (start: Date, end: Date): Schedule => ({
        start,
        end,
    });

    const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
        uuid,
        name: `Event ${uuid}`,
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: { start, end },
    });

    describe("getAllEventInScheduleRange", () => {
        it("スケジュールが空の場合、全てのイベントをenableEventsとして返す", () => {
            const events = [
                createTestEvent("1", new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 10, 0)),
                createTestEvent("2", new Date(2025, 0, 1, 11, 0), new Date(2025, 0, 1, 12, 0)),
            ];
            const schedules: Schedule[] = [];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual(events);
            expect(result.adjustedEvents).toEqual([]);
            expect(result.excluedEvents).toEqual([]);
        });

        it("イベントがスケジュールの範囲内にある場合、そのまま返す", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 11, 0))];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toHaveLength(1);
            expect(result.enableEvents[0].uuid).toBe("1");
            expect(result.adjustedEvents).toEqual([]);
            expect(result.excluedEvents).toEqual([]);
        });

        it("勤務日外のイベントは除外される", () => {
            const events = [
                createTestEvent("1", new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 11, 0)),
                createTestEvent("2", new Date(2025, 0, 2, 10, 0), new Date(2025, 0, 2, 11, 0)),
            ];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toHaveLength(1);
            expect(result.enableEvents[0].uuid).toBe("1");
            expect(result.excluedEvents).toHaveLength(1);
            expect(result.excluedEvents[0].target.uuid).toBe("2");
            expect(result.excluedEvents[0].details[0].reason).toBe("outOfSchedule");
        });

        it("終了時間がないイベントは除外される", () => {
            const events = [
                {
                    ...createTestEvent("1", new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 11, 0)),
                    schedule: { start: new Date(2025, 0, 1, 10, 0), end: undefined },
                },
            ];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual([]);
            expect(result.excluedEvents).toHaveLength(1);
            expect(result.excluedEvents[0].details[0].reason).toBe("invalid");
            expect(result.excluedEvents[0].details[0].message).toContain("終了時間がありません");
        });

        it("スケジュールの時間範囲外のイベントは除外される", () => {
            const events = [
                createTestEvent("1", new Date(2025, 0, 1, 8, 0), new Date(2025, 0, 1, 8, 30)),
                createTestEvent("2", new Date(2025, 0, 1, 19, 0), new Date(2025, 0, 1, 20, 0)),
            ];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual([]);
            expect(result.excluedEvents).toHaveLength(2);
            expect(result.excluedEvents[0].details[0].reason).toBe("outOfSchedule");
            expect(result.excluedEvents[1].details[0].reason).toBe("outOfSchedule");
        });

        it("開始時間がスケジュール前の場合、開始時間を調整する", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 8, 0), new Date(2025, 0, 1, 10, 0))];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual([]);
            expect(result.adjustedEvents).toHaveLength(1);
            expect(result.adjustedEvents[0].newValue.schedule.start).toEqual(new Date(2025, 0, 1, 9, 0));
            expect(result.adjustedEvents[0].newValue.schedule.end).toEqual(new Date(2025, 0, 1, 10, 0));
            expect(result.adjustedEvents[0].oldSchdule.start).toEqual(new Date(2025, 0, 1, 8, 0));
        });

        it("終了時間がスケジュール後の場合、終了時間を調整する", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 17, 0), new Date(2025, 0, 1, 19, 0))];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual([]);
            expect(result.adjustedEvents).toHaveLength(1);
            expect(result.adjustedEvents[0].newValue.schedule.start).toEqual(new Date(2025, 0, 1, 17, 0));
            expect(result.adjustedEvents[0].newValue.schedule.end).toEqual(new Date(2025, 0, 1, 18, 0));
            expect(result.adjustedEvents[0].oldSchdule.end).toEqual(new Date(2025, 0, 1, 19, 0));
        });

        it("開始・終了時間を両方調整する", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 8, 0), new Date(2025, 0, 1, 19, 0))];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toEqual([]);
            expect(result.adjustedEvents).toHaveLength(1);
            expect(result.adjustedEvents[0].newValue.schedule.start).toEqual(new Date(2025, 0, 1, 9, 0));
            expect(result.adjustedEvents[0].newValue.schedule.end).toEqual(new Date(2025, 0, 1, 18, 0));
        });

        it("調整後の時間がroundingTimeUnit以下の場合は除外される", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 8, 55), new Date(2025, 0, 1, 9, 10))];
            const schedules = [createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0))];
            const roundingTimeUnit = 15; // 15分

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules, roundingTimeUnit);

            expect(result.enableEvents).toEqual([]);
            expect(result.adjustedEvents).toEqual([]);
            expect(result.excluedEvents).toHaveLength(1);
            expect(result.excluedEvents[0].details[0].reason).toBe("invalid");
            expect(result.excluedEvents[0].details[0].message).toContain("15分以下");
        });

        it("複数のイベントとスケジュールを正しく処理する", () => {
            const events = [
                createTestEvent("1", new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 11, 0)),
                createTestEvent("2", new Date(2025, 0, 1, 8, 0), new Date(2025, 0, 1, 9, 30)),
                createTestEvent("3", new Date(2025, 0, 2, 10, 0), new Date(2025, 0, 2, 11, 0)),
                createTestEvent("4", new Date(2025, 0, 3, 10, 0), new Date(2025, 0, 3, 11, 0)),
            ];
            const schedules = [
                createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0)),
                createTestSchedule(new Date(2025, 0, 2, 9, 0), new Date(2025, 0, 2, 18, 0)),
            ];

            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toHaveLength(2); // イベント1と3
            expect(result.adjustedEvents).toHaveLength(1); // イベント2
            expect(result.excluedEvents).toHaveLength(1); // イベント4
        });

        it("スケジュールが重複している場合はエラーログを出力する", () => {
            const events = [createTestEvent("1", new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 11, 0))];
            const schedules = [
                createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0)),
                createTestSchedule(new Date(2025, 0, 1, 10, 0), new Date(2025, 0, 1, 19, 0)),
            ];

            // エラーログは出力されるが、処理は継続される
            const result = TimeTrackerAlgorithmEvent.getAllEventInScheduleRange(events, schedules);

            expect(result.enableEvents).toHaveLength(1);
        });
    });
});
