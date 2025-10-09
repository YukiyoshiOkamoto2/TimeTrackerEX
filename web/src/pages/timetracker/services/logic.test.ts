/**
 * TimeTracker Logic Service Unit Tests
 *
 * logic.tsの各関数をテストするユニットテストスイート
 */

import type { DayTask, Event, EventWorkItemPair, Project, Schedule, WorkItem } from "@/types";
import type { TimeTrackerSettings } from "@/types/settings";
import { describe, expect, it, vi } from "vitest";
import { AutoLinkingInput, AutoLinkingResult } from "../models/linking";
import { calculateLinkingStatistics, performAutoLinking, validateLinkingData } from "./logic";

// モック設定
vi.mock("@/core/history", () => ({
    HistoryManager: vi.fn().mockImplementation(() => ({
        load: vi.fn(),
        getWorkItemId: vi.fn().mockReturnValue(null),
        save: vi.fn(),
    })),
}));

vi.mock("@/core/ignore", () => ({
    IgnoreManager: vi.fn().mockImplementation((patterns) => ({
        ignoreEvent: vi.fn((event: Event) => {
            // パターンマッチングをシミュレート
            return patterns.some((p: any) => {
                if (p.matchMode === "partial") {
                    return event.name.includes(p.pattern);
                }
                return false;
            });
        }),
    })),
}));

vi.mock("@/core/algorithm", () => ({
    TimeTrackerAlgorithm: vi.fn().mockImplementation(() => ({
        splitOneDayTask: vi.fn((events: Event[], schedules: Schedule[]) => {
            // 簡易的な日別タスク分割をシミュレート
            const taskMap = new Map<string, DayTask>();

            // イベントから日別タスクを生成
            events.forEach((event) => {
                const dateKey = event.schedule.start.toISOString().split("T")[0];
                if (!taskMap.has(dateKey)) {
                    taskMap.set(dateKey, {
                        baseDate: new Date(dateKey),
                        project: {
                            id: "project-1",
                            name: "テストプロジェクト",
                            projectId: "1",
                            projectName: "テストプロジェクト",
                            projectCode: "TEST",
                        },
                        events: [],
                        scheduleEvents: [],
                    });
                }
                taskMap.get(dateKey)!.events.push(event);
            });

            return Array.from(taskMap.values());
        }),
    })),
}));

vi.mock("@/lib/logger", () => ({
    getLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));

describe("TimeTrackerLogic", () => {
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
        isHistoryAutoInput: false,
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
        paidLeaveInputInfo: {
            workItemId: 999,
            startTime: "09:00",
            endTime: "18:00",
        },
    };

    describe("validateLinkingData", () => {
        it("イベントとスケジュールがない場合、noDataエラーを返す", () => {
            const result = validateLinkingData(false, false, true);
            expect(result).toEqual({ valid: false, reason: "noData" });
        });

        it("設定がない場合、noSettingsエラーを返す", () => {
            const result = validateLinkingData(true, true, false);
            expect(result).toEqual({ valid: false, reason: "noSettings" });
        });

        it("すべてのデータが揃っている場合、validを返す", () => {
            const result = validateLinkingData(true, true, true);
            expect(result).toEqual({ valid: true });
        });

        it("イベントのみある場合、validを返す", () => {
            const result = validateLinkingData(true, false, true);
            expect(result).toEqual({ valid: true });
        });
    });

    describe("performAutoLinking", () => {
        const createMockEvent = (uuid: string, name: string, start: Date, end: Date): Event => ({
            uuid,
            name,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: {
                start,
                end,
            },
        });

        const createMockSchedule = (start: Date, isHoliday = false, isPaidLeave = false): Schedule => ({
            start,
            end: new Date(start.getTime() + 8 * 60 * 60 * 1000),
            isHoliday,
            isPaidLeave,
        });

        it("通常のイベントを処理できる", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "開発ミーティング",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
                createMockEvent(
                    "event-2",
                    "レビュー",
                    new Date("2024-01-10T14:00:00"),
                    new Date("2024-01-10T15:00:00"),
                ),
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            expect(result.linkingResult).toBeDefined();
            expect(result.dayTasks).toBeDefined();
            expect(result.dayTasks.length).toBeGreaterThan(0);
        });

        it("無視リストに該当するイベントを除外する", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "開発ミーティング",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
                createMockEvent("event-2", "ランチ", new Date("2024-01-10T12:00:00"), new Date("2024-01-10T13:00:00")),
                createMockEvent("event-3", "休憩", new Date("2024-01-10T15:00:00"), new Date("2024-01-10T15:15:00")),
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // 除外されたイベントが記録されているか確認
            expect(result.linkingResult.excluded).toBeDefined();
            expect(result.linkingResult.excluded.length).toBeGreaterThan(0);

            // ランチと休憩が除外されているか
            const excludedNames = result.linkingResult.excluded.map((e) => e.event.name);
            expect(excludedNames).toContain("ランチ");
            expect(excludedNames).toContain("休憩");
        });

        it("休暇イベントを自動紐付けできる", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "有給休暇",
                    new Date("2024-01-10T09:00:00"),
                    new Date("2024-01-10T18:00:00"),
                ),
                createMockEvent(
                    "event-2",
                    "通常ミーティング",
                    new Date("2024-01-11T10:00:00"),
                    new Date("2024-01-11T11:00:00"),
                ),
            ];

            const schedules: Schedule[] = [
                createMockSchedule(new Date("2024-01-10T00:00:00")),
                createMockSchedule(new Date("2024-01-11T00:00:00")),
            ];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // 休暇イベントが紐付けされているか確認
            const timeOffLinked = result.linkingResult.linked.filter((pair) => pair.event.name.includes("有給"));
            expect(timeOffLinked.length).toBeGreaterThan(0);
        });

        it("プライベートイベントとキャンセルイベントを除外する", async () => {
            const events: Event[] = [
                {
                    ...createMockEvent(
                        "event-1",
                        "通常イベント",
                        new Date("2024-01-10T10:00:00"),
                        new Date("2024-01-10T11:00:00"),
                    ),
                },
                {
                    ...createMockEvent(
                        "event-2",
                        "プライベート",
                        new Date("2024-01-10T14:00:00"),
                        new Date("2024-01-10T15:00:00"),
                    ),
                    isPrivate: true,
                },
                {
                    ...createMockEvent(
                        "event-3",
                        "キャンセル済み",
                        new Date("2024-01-10T16:00:00"),
                        new Date("2024-01-10T17:00:00"),
                    ),
                    isCancelled: true,
                },
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // プライベートとキャンセルが除外されているか
            const excludedReasons = result.linkingResult.excluded.map((e) => e.reasonDetail);
            expect(excludedReasons).toContain("非公開イベント");
            expect(excludedReasons).toContain("キャンセル済みイベント");
        });

        it("スケジュール範囲外のイベントを除外する", async () => {
            const events: Event[] = [
                createMockEvent("event-1", "範囲内", new Date("2024-01-10T10:00:00"), new Date("2024-01-10T11:00:00")),
                createMockEvent("event-2", "範囲外", new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00")),
            ];

            const schedules: Schedule[] = [
                createMockSchedule(new Date("2024-01-10T00:00:00")),
                // 2024-01-15のスケジュールはない
            ];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // スケジュール範囲外のイベントが除外されているか
            const outOfRangeExcluded = result.linkingResult.excluded.filter((e) => e.reason === "outOfSchedule");
            expect(outOfRangeExcluded.length).toBeGreaterThan(0);
        });

        it("スケジュールがない場合でもICSイベントを処理できる", async () => {
            const events: Event[] = [
                createMockEvent("event-1", "ICSのみ", new Date("2024-01-10T10:00:00"), new Date("2024-01-10T11:00:00")),
            ];

            const input: AutoLinkingInput = {
                events,
                schedules: [], // スケジュールなし
                project: mockProject,
                workItemChirdren: [
                    ...mockWorkItems,
                    { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                ],
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            expect(result.dayTasks.length).toBeGreaterThan(0);
            expect(result.linkingResult).toBeDefined();
        });
    });

    describe("calculateLinkingStatistics", () => {
        it("統計情報を正しく計算できる", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "開発",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T10:00:00"),
                                end: new Date("2024-01-10T11:00:00"),
                            },
                        },
                        linkingWorkItem: {
                            type: "auto",
                            autoMethod: "history",
                            workItem: mockWorkItems[0],
                        },
                    },
                    {
                        event: {
                            uuid: "event-2",
                            name: "有給",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-11T09:00:00"),
                                end: new Date("2024-01-11T18:00:00"),
                            },
                        },
                        linkingWorkItem: {
                            type: "auto",
                            autoMethod: "timeOff",
                            workItem: { id: "999", name: "休暇", folderName: "休暇", folderPath: "/休暇" },
                        },
                    },
                ],
                unlinked: [
                    {
                        uuid: "event-3",
                        name: "未紐付け",
                        organizer: "test@example.com",
                        isPrivate: false,
                        isCancelled: false,
                        location: "",
                        schedule: {
                            start: new Date("2024-01-12T10:00:00"),
                            end: new Date("2024-01-12T11:00:00"),
                        },
                    },
                ],
                excluded: [],
            };

            const manualPairs: EventWorkItemPair[] = [
                {
                    event: {
                        uuid: "event-4",
                        name: "手動紐付け",
                        organizer: "test@example.com",
                        isPrivate: false,
                        isCancelled: false,
                        location: "",
                        schedule: {
                            start: new Date("2024-01-13T10:00:00"),
                            end: new Date("2024-01-13T11:00:00"),
                        },
                    },
                    workItem: mockWorkItems[1],
                },
            ];

            const schedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T00:00:00"),
                    end: new Date("2024-01-10T18:00:00"),
                    isHoliday: false,
                    isPaidLeave: false,
                },
                {
                    start: new Date("2024-01-11T00:00:00"),
                    end: new Date("2024-01-11T18:00:00"),
                    isHoliday: false,
                    isPaidLeave: true,
                },
                {
                    start: new Date("2024-01-12T00:00:00"),
                    end: new Date("2024-01-12T18:00:00"),
                    isHoliday: false,
                    isPaidLeave: false,
                },
            ];

            const dayTasks: DayTask[] = [
                {
                    baseDate: new Date("2024-01-10T00:00:00"),
                    project: mockProject,
                    events: [mockLinkingResult.linked[0].event],
                    scheduleEvents: [],
                },
                {
                    baseDate: new Date("2024-01-11T00:00:00"),
                    project: mockProject,
                    events: [
                        {
                            ...mockLinkingResult.linked[1].event,
                            schedule: {
                                ...mockLinkingResult.linked[1].event.schedule,
                                isPaidLeave: true,
                            },
                        },
                    ],
                    scheduleEvents: [],
                },
                {
                    baseDate: new Date("2024-01-12T00:00:00"),
                    project: mockProject,
                    events: [mockLinkingResult.unlinked[0]],
                    scheduleEvents: [],
                },
            ];

            const stats = calculateLinkingStatistics(mockLinkingResult, manualPairs, schedules, dayTasks);

            expect(stats.linkedCount).toBe(2);
            expect(stats.unlinkedCount).toBe(1);
            expect(stats.manualCount).toBe(1);
            expect(stats.totalLinked).toBe(3);
            expect(stats.paidLeaveDays).toBe(1);
            expect(stats.normalTaskDays).toBe(2);
            expect(stats.totalDays).toBe(3);
        });

        it("linkingResultがnullの場合でも動作する", () => {
            const stats = calculateLinkingStatistics(null, [], [], []);

            expect(stats.linkedCount).toBe(0);
            expect(stats.unlinkedCount).toBe(0);
            expect(stats.manualCount).toBe(0);
            expect(stats.totalLinked).toBe(0);
        });

        it("通常イベントと勤務時間変換イベントを正しくカウントする", () => {
            const dayTasks: DayTask[] = [
                {
                    baseDate: new Date("2024-01-10T00:00:00"),
                    project: mockProject,
                    events: [
                        {
                            uuid: "event-1",
                            name: "通常イベント",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T10:00:00"),
                                end: new Date("2024-01-10T11:00:00"),
                            },
                        },
                    ],
                    scheduleEvents: [
                        {
                            uuid: "schedule-event-1",
                            name: "勤務時間変換",
                            organizer: "System",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T09:00:00"),
                                end: new Date("2024-01-10T09:30:00"),
                            },
                        },
                    ],
                },
            ];

            const stats = calculateLinkingStatistics(null, [], [], dayTasks);

            expect(stats.normalEventCount).toBe(1);
            expect(stats.convertedEventCount).toBe(1);
        });
    });
});
