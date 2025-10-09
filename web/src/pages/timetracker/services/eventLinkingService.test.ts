/**
 * Event Linking Service Unit Tests
 */

import { describe, expect, it, beforeEach } from "vitest";
import { HistoryManager } from "@/core/history";
import type {
    Event,
    IgnorableEventPattern,
    Project,
    Schedule,
    TimeTrackerSettings,
    WorkItem,
} from "@/types";
import {
    autoLinkEvents,
    createPaidLeaveDayTasks,
    getEnableEvents,
    getEnableSchedules,
    getPaidLeaveSchedules,
    splitEventsByDay,
} from "./eventLinkingService";

// テスト用のモックデータ
const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
    uuid: "test-uuid-1",
    name: "テストイベント",
    organizer: "test@example.com",
    isPrivate: false,
    isCancelled: false,
    location: "",
    schedule: {
        start: new Date("2025-10-09T09:00:00"),
        end: new Date("2025-10-09T10:00:00"),
    },
    ...overrides,
});

const createMockSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
    start: new Date("2025-10-09T09:00:00"),
    end: new Date("2025-10-09T18:00:00"),
    isHoliday: false,
    isPaidLeave: false,
    ...overrides,
});

const createMockWorkItem = (id: string, name: string): WorkItem => ({
    id,
    name,
    folderName: "root",
    folderPath: `/root/${name}`,
});

const createMockProject = (): Project => ({
    id: "1",
    name: "Test Project",
    projectId: "TEST001",
    projectName: "Test Project",
    projectCode: "TEST",
});

const createMockSettings = (): TimeTrackerSettings => ({
    userName: "testuser",
    baseUrl: "https://test.example.com",
    baseProjectId: 1,
    roundingTimeTypeOfEvent: "round",
    eventDuplicatePriority: {
        timeCompare: "small",
    },
    scheduleAutoInputInfo: {
        workItemId: 100,
        roundingTimeTypeOfSchedule: "round",
        startEndType: "both",
        startEndTime: 30,
    },
});

describe("eventLinkingService", () => {
    describe("getEnableEvents", () => {
        it("should filter out private events", () => {
            const events = [
                createMockEvent({ uuid: "1", isPrivate: false }),
                createMockEvent({ uuid: "2", isPrivate: true }),
                createMockEvent({ uuid: "3", isPrivate: false }),
            ];

            const result = getEnableEvents(events, []);

            expect(result).toHaveLength(2);
            expect(result[0].uuid).toBe("1");
            expect(result[1].uuid).toBe("3");
        });

        it("should filter out cancelled events", () => {
            const events = [
                createMockEvent({ uuid: "1", isCancelled: false }),
                createMockEvent({ uuid: "2", isCancelled: true }),
                createMockEvent({ uuid: "3", isCancelled: false }),
            ];

            const result = getEnableEvents(events, []);

            expect(result).toHaveLength(2);
            expect(result[0].uuid).toBe("1");
            expect(result[1].uuid).toBe("3");
        });

        it("should filter out events matching ignore patterns (partial)", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "定例会議" }),
                createMockEvent({ uuid: "2", name: "プロジェクト会議" }),
                createMockEvent({ uuid: "3", name: "開発タスク" }),
            ];

            const patterns: IgnorableEventPattern[] = [
                { pattern: "会議", matchMode: "partial" },
            ];

            const result = getEnableEvents(events, patterns);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("3");
            expect(result[0].name).toBe("開発タスク");
        });

        it("should filter out events matching ignore patterns (prefix)", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "定例会議" }),
                createMockEvent({ uuid: "2", name: "会議：プロジェクト" }),
                createMockEvent({ uuid: "3", name: "開発会議" }),
            ];

            const patterns: IgnorableEventPattern[] = [
                { pattern: "定例", matchMode: "prefix" },
            ];

            const result = getEnableEvents(events, patterns);

            expect(result).toHaveLength(2);
            expect(result[0].uuid).toBe("2");
            expect(result[1].uuid).toBe("3");
        });

        it("should filter out events matching ignore patterns (suffix)", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "朝の定例会" }),
                createMockEvent({ uuid: "2", name: "プロジェクト定例会" }),
                createMockEvent({ uuid: "3", name: "開発タスク" }),
            ];

            const patterns: IgnorableEventPattern[] = [
                { pattern: "定例会", matchMode: "suffix" },
            ];

            const result = getEnableEvents(events, patterns);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("3");
        });

        it("should handle multiple ignore patterns", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "定例会議" }),
                createMockEvent({ uuid: "2", name: "ランチ" }),
                createMockEvent({ uuid: "3", name: "開発タスク" }),
                createMockEvent({ uuid: "4", name: "プロジェクト会議" }),
            ];

            const patterns: IgnorableEventPattern[] = [
                { pattern: "会議", matchMode: "partial" },
                { pattern: "ランチ", matchMode: "partial" },
            ];

            const result = getEnableEvents(events, patterns);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("3");
        });
    });

    describe("getEnableSchedules", () => {
        it("should filter out holiday schedules", () => {
            const schedules = [
                createMockSchedule({ isHoliday: false }),
                createMockSchedule({ isHoliday: true }),
                createMockSchedule({ isHoliday: false }),
            ];

            const result = getEnableSchedules(schedules);

            expect(result).toHaveLength(2);
            expect(result[0].isHoliday).toBe(false);
            expect(result[1].isHoliday).toBe(false);
        });

        it("should filter out schedules with error messages", () => {
            const schedules = [
                createMockSchedule({ errorMessage: undefined }),
                createMockSchedule({ errorMessage: "エラー" }),
                createMockSchedule({ errorMessage: null }),
            ];

            const result = getEnableSchedules(schedules);

            expect(result).toHaveLength(2);
        });

        it("should keep valid schedules", () => {
            const schedules = [
                createMockSchedule({ isHoliday: false, errorMessage: undefined }),
                createMockSchedule({ isHoliday: true, errorMessage: undefined }),
                createMockSchedule({ isHoliday: false, errorMessage: "エラー" }),
            ];

            const result = getEnableSchedules(schedules);

            expect(result).toHaveLength(1);
            expect(result[0].isHoliday).toBe(false);
            expect(result[0].errorMessage).toBeUndefined();
        });
    });

    describe("getPaidLeaveSchedules", () => {
        it("should return only paid leave schedules", () => {
            const schedules = [
                createMockSchedule({ isPaidLeave: true }),
                createMockSchedule({ isPaidLeave: false }),
                createMockSchedule({ isPaidLeave: true }),
            ];

            const result = getPaidLeaveSchedules(schedules);

            expect(result).toHaveLength(2);
            expect(result[0].isPaidLeave).toBe(true);
            expect(result[1].isPaidLeave).toBe(true);
        });

        it("should return empty array if no paid leave schedules", () => {
            const schedules = [
                createMockSchedule({ isPaidLeave: false }),
                createMockSchedule({ isPaidLeave: false }),
            ];

            const result = getPaidLeaveSchedules(schedules);

            expect(result).toHaveLength(0);
        });
    });

    describe("splitEventsByDay", () => {
        it("should throw error for nonduplicate rounding on schedule", () => {
            const events = [createMockEvent()];
            const schedules = [createMockSchedule()];
            const project = createMockProject();
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                scheduleAutoInputInfo: {
                    ...createMockSettings().scheduleAutoInputInfo,
                    roundingTimeTypeOfSchedule: "nonduplicate",
                },
            };

            expect(() => {
                splitEventsByDay(events, schedules, project, settings);
            }).toThrow('scheduleAutoInputInfo.roundingTimeTypeOfScheduleに"nonduplicate"は使用できません');
        });

        it("should split events by day using algorithm", () => {
            const events = [
                createMockEvent({
                    uuid: "1",
                    schedule: {
                        start: new Date("2025-10-09T09:00:00"),
                        end: new Date("2025-10-09T10:00:00"),
                    },
                }),
            ];
            const schedules = [
                createMockSchedule({
                    start: new Date("2025-10-09T09:00:00"),
                    end: new Date("2025-10-09T18:00:00"),
                }),
            ];
            const project = createMockProject();
            const settings = createMockSettings();

            const result = splitEventsByDay(events, schedules, project, settings);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // algorithm.ts の実装に依存するため、構造のみ検証
            result.forEach((dayTask) => {
                expect(dayTask).toHaveProperty("baseDate");
                expect(dayTask).toHaveProperty("project");
                expect(dayTask).toHaveProperty("events");
                expect(dayTask).toHaveProperty("scheduleEvents");
            });
        });
    });

    describe("createPaidLeaveDayTasks", () => {
        it("should create day tasks for paid leave schedules", () => {
            const schedules = [
                createMockSchedule({
                    start: new Date("2025-10-09T09:00:00"),
                    isPaidLeave: true,
                }),
                createMockSchedule({
                    start: new Date("2025-10-10T09:00:00"),
                    isPaidLeave: true,
                }),
            ];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                paidLeaveInputInfo: {
                    workItemId: 200,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };
            const project = createMockProject();
            const workItems = [createMockWorkItem("200", "有給休暇")];

            const result = createPaidLeaveDayTasks(schedules, settings, project, workItems);

            expect(result).toHaveLength(2);
            expect(result[0].events).toHaveLength(1);
            expect(result[0].events[0].name).toBe("有給休暇");
            expect(result[0].events[0].organizer).toBe("Automatic");
        });

        it("should use correct start/end times from settings", () => {
            const schedules = [
                createMockSchedule({
                    start: new Date("2025-10-09T00:00:00"),
                    isPaidLeave: true,
                }),
            ];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                paidLeaveInputInfo: {
                    workItemId: 200,
                    startTime: "08:30",
                    endTime: "17:30",
                },
            };
            const project = createMockProject();
            const workItems = [createMockWorkItem("200", "有給休暇")];

            const result = createPaidLeaveDayTasks(schedules, settings, project, workItems);

            expect(result).toHaveLength(1);
            const event = result[0].events[0];
            expect(event.schedule.start?.getHours()).toBe(8);
            expect(event.schedule.start?.getMinutes()).toBe(30);
            expect(event.schedule.end?.getHours()).toBe(17);
            expect(event.schedule.end?.getMinutes()).toBe(30);
        });

        it("should return empty array if config is missing", () => {
            const schedules = [createMockSchedule({ isPaidLeave: true })];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                paidLeaveInputInfo: undefined,
            };
            const project = createMockProject();
            const workItems = [createMockWorkItem("200", "有給休暇")];

            const result = createPaidLeaveDayTasks(schedules, settings, project, workItems);

            expect(result).toHaveLength(0);
        });

        it("should return empty array if work item not found", () => {
            const schedules = [createMockSchedule({ isPaidLeave: true })];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                paidLeaveInputInfo: {
                    workItemId: 999,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };
            const project = createMockProject();
            const workItems = [createMockWorkItem("200", "有給休暇")];

            const result = createPaidLeaveDayTasks(schedules, settings, project, workItems);

            expect(result).toHaveLength(0);
        });
    });

    describe("autoLinkEvents", () => {
        let historyManager: HistoryManager;

        beforeEach(() => {
            historyManager = new HistoryManager();
        });

        it("should link time off events first", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "有給休暇" }),
                createMockEvent({ uuid: "2", name: "プロジェクト会議" }),
            ];
            const workItems = [
                createMockWorkItem("100", "有給休暇"),
                createMockWorkItem("200", "プロジェクト"),
            ];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.linked).toHaveLength(1);
            expect(result.linked[0].event.uuid).toBe("1");
            expect(result.linked[0].workItem.id).toBe("100");
            expect(result.timeOffCount).toBe(1);
            expect(result.unlinked).toHaveLength(1);
        });

        it("should support partial match mode", () => {
            const events = [createMockEvent({ uuid: "1", name: "夏季休暇" })];
            const workItems = [createMockWorkItem("100", "休暇")];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "休暇", matchMode: "partial" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.linked).toHaveLength(1);
            expect(result.timeOffCount).toBe(1);
        });

        it("should support prefix match mode", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "有給休暇取得" }),
                createMockEvent({ uuid: "2", name: "通常有給" }),
            ];
            const workItems = [createMockWorkItem("100", "休暇")];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "有給", matchMode: "prefix" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.linked).toHaveLength(1);
            expect(result.linked[0].event.uuid).toBe("1");
        });

        it("should support suffix match mode", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "夏季休暇" }),
                createMockEvent({ uuid: "2", name: "休暇申請" }),
            ];
            const workItems = [createMockWorkItem("100", "休暇")];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "休暇", matchMode: "suffix" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.linked).toHaveLength(1);
            expect(result.linked[0].event.uuid).toBe("1");
        });

        it("should return correct counts", () => {
            const events = [
                createMockEvent({ uuid: "1", name: "有給休暇" }),
                createMockEvent({ uuid: "2", name: "プロジェクト会議" }),
                createMockEvent({ uuid: "3", name: "開発タスク" }),
            ];
            const workItems = [createMockWorkItem("100", "有給休暇")];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.timeOffCount).toBe(1);
            expect(result.historyCount).toBe(0);
            expect(result.linked).toHaveLength(1);
            expect(result.unlinked).toHaveLength(2);
        });

        it("should handle empty work items", () => {
            const events = [createMockEvent({ uuid: "1", name: "有給休暇" })];
            const workItems: WorkItem[] = [];
            const settings: TimeTrackerSettings = {
                ...createMockSettings(),
                timeOffEvent: {
                    workItemId: 100,
                    namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                },
            };

            const result = autoLinkEvents(events, workItems, settings, historyManager);

            expect(result.linked).toHaveLength(0);
            expect(result.unlinked).toHaveLength(1);
            expect(result.timeOffCount).toBe(0);
        });
    });
});
