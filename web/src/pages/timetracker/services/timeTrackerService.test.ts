import type { DayTask, Event, Project, Schedule, WorkItem } from "@/types";
import type { TimeTrackerSettings } from "@/types/settings";
import { describe, expect, it } from "vitest";
import type { AutoLinkingResult } from "../models";
import {
    calculateLinkingStatistics,
    createAutoLinkingResultMessage,
    getEnableEvents,
    getEnableSchedules,
    performAutoLinking,
} from "./timeTrackerService";

describe("TimeTrackerService", () => {
    const mockProject: Project = {
        id: "project-1",
        name: "テストプロジェクト",
        projectId: "1",
        projectName: "テストプロジェクト",
        projectCode: "TEST",
    };

    const mockWorkItems: WorkItem[] = [
        {
            id: "wi-1",
            name: "開発作業",
            folderName: "開発",
            folderPath: "/開発",
        },
        {
            id: "wi-2",
            name: "会議",
            folderName: "会議",
            folderPath: "/会議",
        },
    ];

    const mockSettings: TimeTrackerSettings = {
        userName: "testuser",
        baseUrl: "https://example.com",
        baseProjectId: 1,
        ignorableEvents: [
            {
                pattern: "ランチ",
                matchMode: "partial",
            },
            {
                pattern: "休憩",
                matchMode: "partial",
            },
        ],
        isHistoryAutoInput: true,
        timeOffEvent: {
            namePatterns: [
                {
                    pattern: "有給",
                    matchMode: "partial",
                },
            ],
            workItemId: 999,
        },
        eventDuplicatePriority: {
            timeCompare: "small",
        },
        roundingTimeTypeOfEvent: "backward",
        scheduleAutoInputInfo: {
            roundingTimeTypeOfSchedule: "backward",
            startEndType: "both",
            startEndTime: 30,
            workItemId: 100,
        },
    };

    describe("getEnableEvents", () => {
        it("無視リストに該当するイベントを除外", () => {
            const events: Event[] = [
                {
                    uuid: "event-1",
                    name: "開発ミーティング",
                    organizer: "test@example.com",
                    isPrivate: false,
                    isCancelled: false,
                    location: "オンライン",
                    schedule: {
                        start: new Date("2024-01-10T10:00:00"),
                        end: new Date("2024-01-10T11:00:00"),
                    },
                },
                {
                    uuid: "event-2",
                    name: "ランチ",
                    organizer: "test@example.com",
                    isPrivate: false,
                    isCancelled: false,
                    location: "",
                    schedule: {
                        start: new Date("2024-01-10T12:00:00"),
                        end: new Date("2024-01-10T13:00:00"),
                    },
                },
            ];

            const result = getEnableEvents(events, mockSettings.ignorableEvents || []);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe("開発ミーティング");
        });
    });

    describe("getEnableSchedules", () => {
        it("休日とエラーのスケジュールを除外", () => {
            const schedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T09:00:00"),
                    end: new Date("2024-01-10T18:00:00"),
                },
                {
                    start: new Date("2024-01-11T00:00:00"),
                    isHoliday: true,
                },
                {
                    start: new Date("2024-01-12T00:00:00"),
                    errorMessage: "エラー",
                },
            ];

            const result = getEnableSchedules(schedules);

            expect(result.length).toBe(1);
            expect(result[0].isHoliday).toBeUndefined();
            expect(result[0].errorMessage).toBeUndefined();
        });
    });

    describe("performAutoLinking", () => {
        it("イベントとスケジュールから自動紐付けを実行", async () => {
            const mockEvents: Event[] = [
                {
                    uuid: "event-1",
                    name: "開発ミーティング",
                    organizer: "test@example.com",
                    isPrivate: false,
                    isCancelled: false,
                    location: "オンライン",
                    schedule: {
                        start: new Date("2024-01-10T10:00:00"),
                        end: new Date("2024-01-10T11:00:00"),
                    },
                },
            ];

            const mockSchedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T09:00:00"),
                    end: new Date("2024-01-10T18:00:00"),
                },
            ];

            const result = await performAutoLinking({
                events: mockEvents,
                schedules: mockSchedules,
                project: mockProject,
                workItems: mockWorkItems,
                settings: mockSettings,
            });

            expect(result).toBeDefined();
            expect(result.linkingResult).toBeDefined();
            expect(result.dayTasks).toBeDefined();
            expect(Array.isArray(result.dayTasks)).toBe(true);
        });

        it("有給休暇スケジュールから有給休暇タスクを生成", async () => {
            const mockEvents: Event[] = [];

            const mockSchedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T09:00:00"),
                    end: new Date("2024-01-10T18:00:00"),
                },
                {
                    start: new Date("2024-01-11T09:00:00"),
                    end: new Date("2024-01-11T18:00:00"),
                    isPaidLeave: true,
                },
            ];

            const result = await performAutoLinking({
                events: mockEvents,
                schedules: mockSchedules,
                project: mockProject,
                workItems: mockWorkItems,
                settings: mockSettings,
            });

            // 有給休暇タスクが生成されている
            expect(result.dayTasks.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("calculateLinkingStatistics", () => {
        it("統計情報を正しく計算", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "会議",
                        } as Event,
                        workItem: {
                            id: "wi-1",
                            name: "作業項目1",
                        } as WorkItem,
                    },
                ],
                unlinked: [
                    {
                        uuid: "event-2",
                        name: "未紐づけイベント",
                    } as Event,
                ],
                excluded: [],
                timeOffCount: 0,
                historyCount: 1,
            };

            const mockSchedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T09:00:00"),
                    end: new Date("2024-01-10T18:00:00"),
                },
                {
                    start: new Date("2024-01-11T09:00:00"),
                    end: new Date("2024-01-11T18:00:00"),
                    isPaidLeave: true,
                },
            ];

            const mockDayTasks: DayTask[] = [
                {
                    baseDate: new Date("2024-01-10"),
                    project: mockProject,
                    events: [],
                    scheduleEvents: [],
                },
                {
                    baseDate: new Date("2024-01-11"),
                    project: mockProject,
                    events: [
                        {
                            uuid: "paid-leave-1",
                            name: "有給休暇",
                            organizer: "Automatic",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-11T09:00:00"),
                                end: new Date("2024-01-11T18:00:00"),
                                isPaidLeave: true,
                            },
                        },
                    ],
                    scheduleEvents: [],
                },
            ];

            const result = calculateLinkingStatistics(mockLinkingResult, [], mockSchedules, mockDayTasks);

            expect(result.linkedCount).toBe(1);
            expect(result.unlinkedCount).toBe(1);
            expect(result.paidLeaveDays).toBe(1);
            expect(result.normalTaskDays).toBe(1);
            expect(result.totalDays).toBe(2);
            expect(result.normalEventCount).toBe(0); // 有給休暇のみのため通常イベントは0
            expect(result.convertedEventCount).toBe(0); // 分割イベントもなし
        });
    });

    describe("createAutoLinkingResultMessage", () => {
        it("未紐づけがない場合はINFOメッセージを生成", () => {
            const mockResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "会議",
                        } as Event,
                        workItem: {
                            id: "wi-1",
                            name: "作業項目1",
                        } as WorkItem,
                    },
                ],
                unlinked: [],
                timeOffCount: 0,
                historyCount: 1,
                excluded: [],
            };

            const result = createAutoLinkingResultMessage(mockResult);

            expect(result.title).toBe("自動紐付け完了");
            expect(result.type).toBe("INFO");
            expect(result.message).toContain("✅ 紐づけ済み: 1件");
            expect(result.message).not.toContain("❌ 未紐づけ");
        });

        it("未紐づけがある場合はWARNメッセージを生成", () => {
            const mockResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "会議",
                        } as Event,
                        workItem: {
                            id: "wi-1",
                            name: "作業項目1",
                        } as WorkItem,
                    },
                ],
                unlinked: [
                    {
                        uuid: "event-2",
                        name: "未紐づけイベント",
                    } as Event,
                ],
                timeOffCount: 0,
                historyCount: 1,
                excluded: [],
            };

            const result = createAutoLinkingResultMessage(mockResult);

            expect(result.title).toBe("自動紐付け完了");
            expect(result.type).toBe("WARN");
            expect(result.message).toContain("✅ 紐づけ済み: 1件");
            expect(result.message).toContain("❌ 未紐づけ: 1件");
        });
    });
});
