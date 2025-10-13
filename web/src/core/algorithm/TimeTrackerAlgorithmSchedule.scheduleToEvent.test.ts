/**
 * TimeTrackerAlgorithmSchedule のテスト
 * scheduleToEvent, addStartToEndDate 関数のテスト
 */

import type { Event, Schedule, ScheduleAutoInputInfo } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmSchedule } from "./TimeTrackerAlgorithmSchedule";

describe("TimeTrackerAlgorithmSchedule", () => {
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

    describe("scheduleToEvent", () => {
        it("STE01: 休日スケジュールの場合も正常に処理される", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
                end: new Date(2024, 1, 3, 17, 0),
                isHoliday: true,
            };
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);
            
            // 休日フラグは無視されて通常通りイベントが生成される
            expect(result).toHaveLength(2);
            expect(result[0].workingEventType).toBe("start");
            expect(result[1].workingEventType).toBe("end");
        });

        it("STE02: 終了時刻がundefinedの場合はエラーをスローする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
            };
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            expect(() => {
                TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);
            }).toThrow("スケジュールが不正です");
        });

        it("STE03: エラーメッセージがある場合も正常に処理される", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
                end: new Date(2024, 1, 3, 17, 0),
                errorMessage: "テストエラー",
            };
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);
            
            // エラーメッセージがあっても通常通りイベントが生成される
            expect(result).toHaveLength(2);
            expect(result[0].workingEventType).toBe("start");
            expect(result[1].workingEventType).toBe("end");
        });

        it("STE04: bothモード - 勤務開始と勤務終了イベントが生成される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("勤務開始");
            expect(result[0].workingEventType).toBe("start");
            expect(result[1].name).toBe("勤務終了");
            expect(result[1].workingEventType).toBe("end");
        });

        it("STE05: bothモード - 勤務開始は30分間のイベント", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            const startEvent = result.find((e) => e.workingEventType === "start");
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.start.getMinutes()).toBe(0);
            expect(startEvent?.schedule.end?.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getMinutes()).toBe(30);
            const endEvent = result.find((e) => e.workingEventType === "end");
            expect(endEvent?.schedule.start.getHours()).toBe(16);
            expect(endEvent?.schedule.start.getMinutes()).toBe(30);
            expect(endEvent?.schedule.end?.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getMinutes()).toBe(0);
        });

        it("STE06: bothモード - 既存イベントと重複する場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 16, 0), new Date(2024, 1, 3, 17, 0));
            const events: Event[] = [existingEvent];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
        });

        it("STE07: bothモード - 既存イベントと重複しない場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events: Event[] = [existingEvent];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
        });

        it("STE08: fillモード - 勤務開始、勤務中、勤務終了が生成される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "fill",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            expect(result.length).toBeGreaterThan(2);
            const startEvents = result.filter((e) => e.workingEventType === "start");
            const middleEvents = result.filter((e) => e.workingEventType === "middle");
            const endEvents = result.filter((e) => e.workingEventType === "end");

            expect(startEvents).toHaveLength(1);
            expect(middleEvents).toHaveLength(1);
            expect(endEvents).toHaveLength(1);
        });

        it("STE10: fillモード - 既存イベントがある場合、その時間は埋めない", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 12, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "fill",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events: Event[] = [existingEvent];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            // 既存イベントの時間帯は埋められないため、中間イベントは分割される
            const middleEvents = result.filter((e) => e.workingEventType === "middle");

            // 既存イベントがある場合、その前後で分割される
            expect(middleEvents).toHaveLength(2);

            const first = middleEvents[0];
            expect(first?.schedule.start.getHours()).toBe(9);
            expect(first?.schedule.start.getMinutes()).toBe(30);
            expect(first?.schedule.end?.getHours()).toBe(10);
            expect(first?.schedule.end?.getMinutes()).toBe(0);
            const second = middleEvents[1];
            expect(second?.schedule.start.getHours()).toBe(11);
            expect(second?.schedule.start.getMinutes()).toBe(0);
            expect(second?.schedule.end?.getHours()).toBe(11);
            expect(second?.schedule.end?.getMinutes()).toBe(30);
        });

        it("STE12: bothモード - roundingTimeTypeがstretchの場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 17, 15));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "stretch",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
            // stretchは開始を切り捨て、終了を切り上げ
            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            // 開始は9:00-9:30
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.start.getMinutes()).toBe(0);
            expect(startEvent?.schedule.end?.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getMinutes()).toBe(30);

            // 終了は17:00-17:30
            expect(endEvent?.schedule.start.getHours()).toBe(17);
            expect(endEvent?.schedule.start.getMinutes()).toBe(0);
            expect(endEvent?.schedule.end?.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getMinutes()).toBe(30);
        });

        it("STE13: bothモード - startEndTimeが60分の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 60,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            // 開始は9:00-10:00の1時間
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getHours()).toBe(10);

            // 終了は17:00-18:00の1時間
            expect(endEvent?.schedule.start.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getHours()).toBe(18);
        });

        it("STE14: bothモード - 勤務時間が短い場合でも開始・終了は別々に処理される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const scheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "forward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.scheduleToEvent(schedule, scheduleAutoInputInfo, events);

            // 勤務開始(9:00-9:30)と勤務終了(9:30-10:00)が生成される
            expect(result).toHaveLength(2);
            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            expect(startEvent).toBeDefined();
            expect(endEvent).toBeDefined();
        });
    });
});
