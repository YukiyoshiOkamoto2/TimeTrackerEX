/**
 * Filter Service Tests
 */

import type { Event, IgnorableEventPattern, PaidLeaveInputInfo, Schedule, TimeTrackerSettings } from "@/types";
import { describe, expect, it } from "vitest";
import { getAllEvents } from "./converter";

describe("Filter Service", () => {
    // テストヘルパー関数
    const createTestEvent = (
        uuid: string,
        start: Date,
        end: Date,
        options: {
            name?: string;
            isPrivate?: boolean;
            isCancelled?: boolean;
            organizer?: string;
            recurrence?: Date[];
        } = {},
    ): Event => ({
        uuid,
        name: options.name || `Event ${uuid}`,
        organizer: options.organizer || "test@example.com",
        isPrivate: options.isPrivate || false,
        isCancelled: options.isCancelled || false,
        location: "",
        schedule: { start, end },
        recurrence: options.recurrence,
    });

    const createTestSchedule = (
        start: Date,
        end: Date,
        options: {
            isHoliday?: boolean;
            isPaidLeave?: boolean;
            errorMessage?: string;
        } = {},
    ): Schedule => ({
        start,
        end,
        isHoliday: options.isHoliday,
        isPaidLeave: options.isPaidLeave,
        errorMessage: options.errorMessage,
    });

    const createDefaultSettings = (overrides?: Partial<TimeTrackerSettings>): TimeTrackerSettings =>
        ({
            ignorableEvents: [],
            paidLeaveInputInfo: undefined,
            ...overrides,
        }) as TimeTrackerSettings;

    describe("getAllEvents", () => {
        describe("基本的なフィルタリング", () => {
            it("FILTER01: 通常のイベントとスケジュールが正しく処理される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));
                const schedules = [schedule1, schedule2];

                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 6, 10, 0), new Date(2024, 1, 6, 11, 0));
                const events = [event1, event2];

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, events);

                expect(result.schedules).toHaveLength(2);
                expect(result.events).toHaveLength(2);
                expect(result.paidLeaveDayEvents).toHaveLength(0);
                expect(result.excludedSchedules).toHaveLength(0);
                expect(result.excludedEvents).toHaveLength(0);
            });

            it("FILTER02: 空の配列を渡した場合、空の結果が返る", () => {
                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [], []);

                expect(result.schedules).toHaveLength(0);
                expect(result.events).toHaveLength(0);
                expect(result.paidLeaveDayEvents).toHaveLength(0);
                expect(result.excludedSchedules).toHaveLength(0);
                expect(result.excludedEvents).toHaveLength(0);
            });
        });

        describe("スケジュールのフィルタリング", () => {
            it("FILTER03: 休日スケジュールが除外される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    isHoliday: true,
                });
                const schedules = [schedule1, schedule2];

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, []);

                expect(result.schedules).toHaveLength(1);
                expect(result.schedules[0]).toEqual(schedule1);
                expect(result.excludedSchedules).toHaveLength(1);
                expect(result.excludedSchedules[0].schedule).toEqual(schedule2);
                expect(result.excludedSchedules[0].reason).toBe("holiday");
                expect(result.excludedSchedules[0].reasonDetail).toBe("休日");
            });

            it("FILTER04: 有給休暇スケジュールが除外される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });
                const schedules = [schedule1, schedule2];

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, []);

                expect(result.schedules).toHaveLength(1);
                expect(result.excludedSchedules).toHaveLength(1);
                expect(result.excludedSchedules[0].reason).toBe("holiday");
                expect(result.excludedSchedules[0].reasonDetail).toBe("有給");
            });

            it("FILTER05: エラーメッセージがあるスケジュールが除外される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    errorMessage: "Invalid schedule",
                });
                const schedules = [schedule1, schedule2];

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, []);

                expect(result.schedules).toHaveLength(1);
                expect(result.excludedSchedules).toHaveLength(1);
                expect(result.excludedSchedules[0].reason).toBe("invalid");
                expect(result.excludedSchedules[0].reasonDetail).toBe("Invalid schedule");
            });

            it("FILTER06: 複数の除外理由があるスケジュールが正しく処理される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    isHoliday: true,
                });
                const schedule3 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0), {
                    errorMessage: "Error",
                });
                const schedules = [schedule1, schedule2, schedule3];

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, []);

                expect(result.schedules).toHaveLength(1);
                expect(result.excludedSchedules).toHaveLength(2);
            });
        });

        describe("イベントのフィルタリング", () => {
            it("FILTER07: 非公開イベントが除外される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0), {
                    isPrivate: true,
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], [event1, event2]);

                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                expect(result.excludedEvents).toHaveLength(1);
                expect(result.excludedEvents[0].event.uuid).toBe("e2");
                expect(result.excludedEvents[0].reason).toBe("invalid");
                expect(result.excludedEvents[0].reasonDetail).toBe("非公開イベント");
            });

            it("FILTER08: キャンセル済みイベントが除外される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0), {
                    isCancelled: true,
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], [event1, event2]);

                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                expect(result.excludedEvents).toHaveLength(1);
                expect(result.excludedEvents[0].event.uuid).toBe("e2");
                expect(result.excludedEvents[0].reason).toBe("invalid");
                expect(result.excludedEvents[0].reasonDetail).toBe("キャンセル済みイベント");
            });

            it("FILTER09: 無視リストに一致するイベントが除外される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0), {
                    name: "Meeting",
                });
                const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0), {
                    name: "Lunch",
                });

                const ignorablePatterns: IgnorableEventPattern[] = [{ pattern: "Lunch", matchMode: "partial" }];

                const settings = createDefaultSettings({ ignorableEvents: ignorablePatterns });

                const result = getAllEvents(settings, [schedule], [event1, event2]);

                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                expect(result.excludedEvents).toHaveLength(1);
                expect(result.excludedEvents[0].event.uuid).toBe("e2");
                expect(result.excludedEvents[0].reason).toBe("ignored");
                expect(result.excludedEvents[0].reasonDetail).toBe("無視リストに一致");
            });

            it("FILTER10: 勤務日外のイベントが除外される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 10, 12, 0), new Date(2024, 1, 10, 13, 0));

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], [event1, event2]);

                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                expect(result.excludedEvents).toHaveLength(1);
                expect(result.excludedEvents[0].event.uuid).toBe("e2");
                expect(result.excludedEvents[0].reason).toBe("outOfSchedule");
            });

            it("FILTER11: 複数の除外理由があるイベントが正しく処理される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0), {
                    isPrivate: true,
                });
                const event3 = createTestEvent("e3", new Date(2024, 1, 5, 14, 0), new Date(2024, 1, 5, 15, 0), {
                    name: "Lunch",
                });
                const event4 = createTestEvent("e4", new Date(2024, 1, 10, 10, 0), new Date(2024, 1, 10, 11, 0));

                const ignorablePatterns: IgnorableEventPattern[] = [{ pattern: "Lunch", matchMode: "partial" }];

                const settings = createDefaultSettings({ ignorableEvents: ignorablePatterns });

                const result = getAllEvents(settings, [schedule], [event1, event2, event3, event4]);

                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                expect(result.excludedEvents).toHaveLength(3);

                const reasonCounts = result.excludedEvents.reduce(
                    (acc, item) => {
                        acc[item.reason] = (acc[item.reason] || 0) + 1;
                        return acc;
                    },
                    {} as Record<string, number>,
                );

                expect(reasonCounts.invalid).toBe(1);
                expect(reasonCounts.ignored).toBe(1);
                expect(reasonCounts.outOfSchedule).toBe(1);
            });
        });

        describe("繰り返しイベント", () => {
            it("FILTER12: 繰り返しイベントが正しく展開される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));
                const schedule3 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0));
                const schedules = [schedule1, schedule2, schedule3];

                const event = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0), {
                    recurrence: [new Date(2024, 1, 6, 0, 0), new Date(2024, 1, 7, 0, 0)],
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, schedules, [event]);

                // 元のイベント + 繰り返しイベント2つ = 3つ
                expect(result.events).toHaveLength(3);
            });

            it("FILTER13: 繰り返しイベントが勤務日外に展開された場合は除外される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

                const event = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0), {
                    recurrence: [new Date(2024, 1, 10, 0, 0)], // 勤務日外
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], [event]);

                // 元のイベントのみ
                expect(result.events).toHaveLength(1);
                expect(result.events[0].uuid).toBe("e1");
                // 繰り返しイベントは除外される
                expect(result.excludedEvents).toHaveLength(1);
                expect(result.excludedEvents[0].reason).toBe("outOfSchedule");
            });
        });

        describe("有給休暇イベント", () => {
            it("FILTER14: 有給休暇設定がない場合、有給休暇イベントは生成されない", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], []);

                expect(result.paidLeaveDayEvents).toHaveLength(0);
            });

            it("FILTER15: 有給休暇設定がある場合、有給休暇イベントが生成される", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });

                const paidLeaveConfig: PaidLeaveInputInfo = {
                    workItemId: 123,
                    startTime: "09:00",
                    endTime: "18:00",
                };

                const settings = createDefaultSettings({ paidLeaveInputInfo: paidLeaveConfig });

                const result = getAllEvents(settings, [schedule], []);

                expect(result.paidLeaveDayEvents).toHaveLength(1);
                expect(result.paidLeaveDayEvents[0].name).toBe("有給休暇");
                expect(result.paidLeaveDayEvents[0].organizer).toBe("Automatic");
                expect(result.paidLeaveDayEvents[0].schedule.start.getHours()).toBe(9);
                expect(result.paidLeaveDayEvents[0].schedule.start.getMinutes()).toBe(0);
                expect(result.paidLeaveDayEvents[0].schedule.end!.getHours()).toBe(18);
                expect(result.paidLeaveDayEvents[0].schedule.end!.getMinutes()).toBe(0);
            });

            it("FILTER16: 複数の有給休暇スケジュールがある場合、複数の有給休暇イベントが生成される", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });

                const paidLeaveConfig: PaidLeaveInputInfo = {
                    workItemId: 123,
                    startTime: "09:30",
                    endTime: "17:30",
                };

                const settings = createDefaultSettings({ paidLeaveInputInfo: paidLeaveConfig });

                const result = getAllEvents(settings, [schedule1, schedule2], []);

                expect(result.paidLeaveDayEvents).toHaveLength(2);
                expect(result.paidLeaveDayEvents[0].schedule.start.getHours()).toBe(9);
                expect(result.paidLeaveDayEvents[0].schedule.start.getMinutes()).toBe(30);
                expect(result.paidLeaveDayEvents[1].schedule.start.getHours()).toBe(9);
                expect(result.paidLeaveDayEvents[1].schedule.start.getMinutes()).toBe(30);
            });

            it("FILTER17: 有給休暇でない休日スケジュールは有給休暇イベントを生成しない", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: false,
                });

                const paidLeaveConfig: PaidLeaveInputInfo = {
                    workItemId: 123,
                    startTime: "09:00",
                    endTime: "18:00",
                };

                const settings = createDefaultSettings({ paidLeaveInputInfo: paidLeaveConfig });

                const result = getAllEvents(settings, [schedule], []);

                expect(result.paidLeaveDayEvents).toHaveLength(0);
            });
        });

        describe("統合テスト", () => {
            it("FILTER18: すべての機能が組み合わさって正しく動作する", () => {
                // スケジュール: 通常1日、休日1日、有給1日、エラー1日
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0), {
                    isHoliday: true,
                });
                const schedule3 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0), {
                    isHoliday: true,
                    isPaidLeave: true,
                });
                const schedule4 = createTestSchedule(new Date(2024, 1, 8, 9, 0), new Date(2024, 1, 8, 18, 0), {
                    errorMessage: "Error",
                });

                // イベント: 通常、非公開、無視、勤務日外、繰り返し
                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0), {
                    isPrivate: true,
                });
                const event3 = createTestEvent("e3", new Date(2024, 1, 5, 14, 0), new Date(2024, 1, 5, 15, 0), {
                    name: "Lunch",
                });
                const event4 = createTestEvent("e4", new Date(2024, 1, 10, 10, 0), new Date(2024, 1, 10, 11, 0));
                const event5 = createTestEvent("e5", new Date(2024, 1, 5, 16, 0), new Date(2024, 1, 5, 17, 0), {
                    recurrence: [new Date(2024, 1, 7, 0, 0)],
                });

                const ignorablePatterns: IgnorableEventPattern[] = [{ pattern: "Lunch", matchMode: "partial" }];

                const paidLeaveConfig: PaidLeaveInputInfo = {
                    workItemId: 123,
                    startTime: "09:00",
                    endTime: "18:00",
                };

                const settings = createDefaultSettings({
                    ignorableEvents: ignorablePatterns,
                    paidLeaveInputInfo: paidLeaveConfig,
                });

                const result = getAllEvents(
                    settings,
                    [schedule1, schedule2, schedule3, schedule4],
                    [event1, event2, event3, event4, event5],
                );

                // 有効なスケジュール: 1つ (schedule1のみ)
                expect(result.schedules).toHaveLength(1);

                // 除外されたスケジュール: 3つ
                expect(result.excludedSchedules).toHaveLength(3);

                // 有効なイベント: e1 + e5 = 2つ
                // getAllEventInScheduleRangeはenableSchedulesを使うため、範囲は2/5のみ
                // e5の繰り返し(2/7)は範囲外になる
                expect(result.events).toHaveLength(2);

                // 除外されたイベント: e2(非公開) + e3(無視) + e4(勤務日外) + e5の繰り返し(勤務日外) = 4つ
                expect(result.excludedEvents).toHaveLength(4);

                // 有給休暇イベント: 1つ
                expect(result.paidLeaveDayEvents).toHaveLength(1);
            });

            it("FILTER19: すべてが除外される極端なケース", () => {
                const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0), {
                    isHoliday: true,
                });

                const event = createTestEvent("e1", new Date(2024, 1, 10, 10, 0), new Date(2024, 1, 10, 11, 0), {
                    isPrivate: true,
                });

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule], [event]);

                expect(result.schedules).toHaveLength(0);
                expect(result.events).toHaveLength(0);
                expect(result.paidLeaveDayEvents).toHaveLength(0);
                expect(result.excludedSchedules).toHaveLength(1);
                expect(result.excludedEvents).toHaveLength(1);
            });

            it("FILTER20: すべてが有効な通常ケース", () => {
                const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
                const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));

                const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0));
                const event2 = createTestEvent("e2", new Date(2024, 1, 6, 10, 0), new Date(2024, 1, 6, 11, 0));

                const settings = createDefaultSettings();

                const result = getAllEvents(settings, [schedule1, schedule2], [event1, event2]);

                expect(result.schedules).toHaveLength(2);
                expect(result.events).toHaveLength(2);
                expect(result.paidLeaveDayEvents).toHaveLength(0);
                expect(result.excludedSchedules).toHaveLength(0);
                expect(result.excludedEvents).toHaveLength(0);
            });
        });
    });
});
