/**
 * TimeTracker Logic Service Unit Tests
 *
 * logic.tsの各関数をテストするユニットテストスイート
 */

import type { DayTask, Event, EventWorkItemPair, Project, Schedule, WorkItem } from "@/types";
import type { TimeTrackerSettings } from "@/types/settings";
import { describe, expect, it, vi } from "vitest";
import { AutoLinkingInput, AutoLinkingResult, LinkingEventWorkItemPair } from "../models/linking";
import { calculateLinkingStatistics, performAutoLinking } from "./logic";

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
                switch (p.matchMode) {
                    case "partial":
                        return event.name.includes(p.pattern);
                    case "prefix":
                        return event.name.startsWith(p.pattern);
                    case "suffix":
                        return event.name.endsWith(p.pattern);
                    default:
                        return false;
                }
            });
        }),
    })),
}));

vi.mock("@/core/algorithm", () => ({
    TimeTrackerAlgorithm: vi.fn().mockImplementation(() => ({
        splitOneDayTask: vi.fn((events: Event[], _schedules: Schedule[]) => {
            // 簡易的な日別タスク分割をシミュレート
            const taskMap = new Map<string, DayTask>();

            // イベントから日別タスクを生成
            events.forEach((event) => {
                const dateKey = event.schedule.start.toLocaleDateString("en-CA");
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

            expect(result.linked).toBeDefined();
            expect(result.unlinked).toBeDefined();
            expect(result.excluded).toBeDefined();
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
            expect(result.excluded).toBeDefined();
            expect(result.excluded.length).toBeGreaterThan(0);

            // ランチと休憩が除外されているか
            const excludedNames = result.excluded.map((e) => e.event.name);
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
            const timeOffLinked = result.linked.filter((pair) => pair.event.name.includes("有給"));
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
            const excludedReasons = result.excluded.map((e) => e.reasonDetail);
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
            const outOfRangeExcluded = result.excluded.filter((e) => e.reason === "outOfSchedule");
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

            expect(result.linked).toBeDefined();
            expect(result.unlinked).toBeDefined();
            expect(result.excluded).toBeDefined();
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

            // 手動紐づけをlinkedItemに追加
            const allLinkedItems: LinkingEventWorkItemPair[] = [
                ...mockLinkingResult.linked,
                {
                    event: manualPairs[0].event,
                    linkingWorkItem: {
                        type: "manual",
                        autoMethod: "none",
                        workItem: manualPairs[0].workItem,
                    },
                },
            ];

            const stats = calculateLinkingStatistics(mockLinkingResult.unlinked, allLinkedItems, []);

            // linked: 2 (auto) + 1 (manual) = 3
            // unlinked: 1
            expect(stats.linked.historyCount).toBe(1); // 履歴から
            expect(stats.linked.timeOffCount).toBe(1); // 休暇
            expect(stats.linked.manualCount).toBe(1); // 手動
            expect(stats.linked.unlinkedCount).toBe(1); // 未紐づけ
            // 有給休暇日数: schedule.isPaidLeaveが設定されていないため0
            expect(stats.day.paidLeaveDays).toBe(0);
            // 通常勤務日数: 2024-01-10, 2024-01-11, 2024-01-12, 2024-01-13 の4日
            expect(stats.day.normalDays).toBe(4);
        });

        it("空のデータでも動作する", () => {
            const stats = calculateLinkingStatistics([], [], []);

            expect(stats.linked.historyCount).toBe(0);
            expect(stats.linked.timeOffCount).toBe(0);
            expect(stats.linked.manualCount).toBe(0);
            expect(stats.linked.unlinkedCount).toBe(0);
            expect(stats.day.normalDays).toBe(0);
            expect(stats.day.paidLeaveDays).toBe(0);
        });

        it("複数の自動紐付け方法を区別して計算できる", () => {
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
                            name: "レビュー",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T14:00:00"),
                                end: new Date("2024-01-10T15:00:00"),
                            },
                        },
                        linkingWorkItem: {
                            type: "auto",
                            autoMethod: "ai",
                            workItem: mockWorkItems[0],
                        },
                    },
                    {
                        event: {
                            uuid: "event-3",
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
                unlinked: [],
                excluded: [],
            };

            const stats = calculateLinkingStatistics(mockLinkingResult.unlinked, mockLinkingResult.linked, []);

            expect(stats.linked.historyCount).toBe(1); // history
            expect(stats.linked.timeOffCount).toBe(1); // timeOff
            expect(stats.linked.manualCount).toBe(0);
            expect(stats.linked.unlinkedCount).toBe(0);
        });
    });

    describe("performAutoLinking - 追加のテストケース", () => {
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

        it("休日スケジュールを除外する", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "平日イベント",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
                createMockEvent(
                    "event-2",
                    "休日イベント",
                    new Date("2024-01-13T10:00:00"),
                    new Date("2024-01-13T11:00:00"),
                ),
            ];

            const schedules: Schedule[] = [
                createMockSchedule(new Date("2024-01-10T00:00:00"), false), // 平日
                createMockSchedule(new Date("2024-01-13T00:00:00"), true), // 休日
            ];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems,
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // 休日のイベントが処理されるか確認
            // (休日スケジュールは除外されるため、範囲外として扱われる)
            const outOfScheduleEvents = result.excluded.filter((e) => e.reason === "outOfSchedule");
            expect(outOfScheduleEvents.length).toBeGreaterThan(0);
        });

        it("有給休暇スケジュールから自動タスクを生成する", async () => {
            const events: Event[] = [];

            const schedules: Schedule[] = [
                createMockSchedule(new Date("2024-01-10T00:00:00"), false, true), // 有給休暇
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

            // 有給休暇の自動タスクが生成されているか
            expect(result.linked.length).toBeGreaterThan(0);
            const paidLeaveEvent = result.linked.find((pair) => pair.event.name === "有給休暇");
            expect(paidLeaveEvent).toBeDefined();
        });

        it("エラーメッセージがあるスケジュールを除外する", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "イベント",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
            ];

            const schedules: Schedule[] = [
                {
                    start: new Date("2024-01-10T00:00:00"),
                    end: new Date("2024-01-10T08:00:00"),
                    isHoliday: false,
                    isPaidLeave: false,
                    errorMessage: "PDFのパース失敗",
                },
            ];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems,
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // エラーのあるスケジュールは除外されるため、有効なスケジュールがない状態となる
            // スケジュールがない場合でも処理は継続される
            expect(result.linked.length + result.unlinked.length + result.excluded.length).toBeGreaterThan(0);
        });

        it("複数日にまたがるイベントを処理できる", async () => {
            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "長時間イベント",
                    new Date("2024-01-10T23:00:00"),
                    new Date("2024-01-11T01:00:00"),
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
                workItemChirdren: mockWorkItems,
                timetracker: mockSettings,
            };

            const result = await performAutoLinking(input);

            // イベントが処理されるか確認
            expect(result.linked.length + result.unlinked.length).toBeGreaterThan(0);
        });

        it("イベント名がprefixパターンにマッチする", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                ignorableEvents: [
                    {
                        pattern: "[TEST]",
                        matchMode: "prefix",
                    },
                ],
            };

            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "[TEST]テストイベント",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
                createMockEvent(
                    "event-2",
                    "通常イベント[TEST]",
                    new Date("2024-01-10T14:00:00"),
                    new Date("2024-01-10T15:00:00"),
                ),
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems,
                timetracker: customSettings,
            };

            const result = await performAutoLinking(input);

            // prefixマッチのイベントのみが除外される
            const excluded = result.excluded.filter((e) => e.reason === "ignored");
            expect(excluded.length).toBe(1);
            expect(excluded[0].event.name).toBe("[TEST]テストイベント");
        });

        it("イベント名がsuffixパターンにマッチする", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                ignorableEvents: [
                    {
                        pattern: "(キャンセル)",
                        matchMode: "suffix",
                    },
                ],
            };

            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "ミーティング(キャンセル)",
                    new Date("2024-01-10T10:00:00"),
                    new Date("2024-01-10T11:00:00"),
                ),
                createMockEvent(
                    "event-2",
                    "(キャンセル)ミーティング",
                    new Date("2024-01-10T14:00:00"),
                    new Date("2024-01-10T15:00:00"),
                ),
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems,
                timetracker: customSettings,
            };

            const result = await performAutoLinking(input);

            // suffixマッチのイベントのみが除外される
            const excluded = result.excluded.filter((e) => e.reason === "ignored");
            expect(excluded.length).toBe(1);
            expect(excluded[0].event.name).toBe("ミーティング(キャンセル)");
        });

        it("休暇設定のWorkItemが存在しない場合でもエラーにならない", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                timeOffEvent: {
                    namePatterns: [
                        {
                            pattern: "有給",
                            matchMode: "partial",
                        },
                    ],
                    workItemId: 9999, // 存在しないID
                },
            };

            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "有給休暇",
                    new Date("2024-01-10T09:00:00"),
                    new Date("2024-01-10T18:00:00"),
                ),
            ];

            const schedules: Schedule[] = [createMockSchedule(new Date("2024-01-10T00:00:00"))];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems, // workItemId 9999 は含まれない
                timetracker: customSettings,
            };

            // エラーをスローせずに処理が完了することを確認
            await expect(performAutoLinking(input)).resolves.toBeDefined();
        });

        it("有給休暇設定のWorkItemが存在しない場合は有給タスクを生成しない", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                paidLeaveInputInfo: {
                    workItemId: 9999, // 存在しないID
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            const events: Event[] = [];

            const schedules: Schedule[] = [
                createMockSchedule(new Date("2024-01-10T00:00:00"), false, true), // 有給休暇
            ];

            const input: AutoLinkingInput = {
                events,
                schedules,
                project: mockProject,
                workItemChirdren: mockWorkItems, // workItemId 9999 は含まれない
                timetracker: customSettings,
            };

            const result = await performAutoLinking(input);

            // 有給休暇タスクが生成されていないことを確認
            const paidLeaveEvent = result.linked.find((pair) => pair.event.name === "有給休暇");
            expect(paidLeaveEvent).toBeUndefined();
        });

        it("休暇イベント設定が未設定の場合は通常処理を行う", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                timeOffEvent: undefined, // 未設定
            };

            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "有給休暇",
                    new Date("2024-01-10T09:00:00"),
                    new Date("2024-01-10T18:00:00"),
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
                timetracker: customSettings,
            };

            const result = await performAutoLinking(input);

            // 休暇設定がないため、通常のイベントとして処理される
            expect(result.linked.length + result.unlinked.length).toBe(1);
        });

        it("空のイベント名パターンでも動作する", async () => {
            const customSettings: TimeTrackerSettings = {
                ...mockSettings,
                timeOffEvent: {
                    namePatterns: [], // 空のパターン
                    workItemId: 999,
                },
            };

            const events: Event[] = [
                createMockEvent(
                    "event-1",
                    "有給休暇",
                    new Date("2024-01-10T09:00:00"),
                    new Date("2024-01-10T18:00:00"),
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
                timetracker: customSettings,
            };

            const result = await performAutoLinking(input);

            // パターンが空のため、休暇として紐付けられない
            const timeOffLinked = result.linked.filter((pair) => pair.linkingWorkItem.autoMethod === "timeOff");
            expect(timeOffLinked.length).toBe(0);
        });
    });

    describe("validateAndCleanupSettings", () => {
        it("全ての設定が有効な場合は何も変更しない", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 100,
                timeOffEvent: { namePatterns: [], workItemId: 1 },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 2,
                },
                paidLeaveInputInfo: { workItemId: 3, startTime: "09:00", endTime: "18:00" },
            };

            const workItems = [
                { id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" },
                { id: "2", name: "WI2", folderName: "Folder2", folderPath: "/Folder2" },
                { id: "3", name: "WI3", folderName: "Folder3", folderPath: "/Folder3" },
            ];

            const projects: Project[] = [
                { id: "100", projectId: "100", name: "Project1", projectName: "Project1", projectCode: "P1" },
            ];

            const result = validateAndCleanupSettings(settings, workItems, projects);

            expect(result.cleanedCount).toBe(0);
            expect(result.settings).toEqual(settings);
        });

        it("存在しないbaseProjectIdをnullに設定する", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999, // 存在しないプロジェクト
                timeOffEvent: undefined, // 他の設定をクリア
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];
            const projects: Project[] = [
                { id: "100", projectId: "100", name: "Project1", projectName: "Project1", projectCode: "P1" },
            ];

            const result = validateAndCleanupSettings(settings, workItems, projects);

            expect(result.cleanedCount).toBe(1);
            expect(result.settings.baseProjectId).toBeNull();
        });

        it("存在しないtimeOffEvent.workItemIdを削除する", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: { namePatterns: [], workItemId: 999 }, // 存在しないWorkItem
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.cleanedCount).toBe(1);
            expect(result.settings.timeOffEvent).toBeUndefined();
        });

        it("存在しないscheduleAutoInputInfo.workItemIdを0に設定する", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: undefined,
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 999, // 存在しないWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.cleanedCount).toBe(1);
            expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(0);
        });

        it("存在しないpaidLeaveInputInfo.workItemIdを削除する", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: undefined,
                paidLeaveInputInfo: { workItemId: 999, startTime: "09:00", endTime: "18:00" }, // 存在しないWorkItem
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.cleanedCount).toBe(1);
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("複数の無効な設定を一度にクリアできる", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999,
                timeOffEvent: { namePatterns: [], workItemId: 998 },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 997,
                },
                paidLeaveInputInfo: { workItemId: 996, startTime: "09:00", endTime: "18:00" },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];
            const projects: Project[] = [
                { id: "100", projectId: "100", name: "Project1", projectName: "Project1", projectCode: "P1" },
            ];

            const result = validateAndCleanupSettings(settings, workItems, projects);

            expect(result.cleanedCount).toBe(4);
            expect(result.settings.baseProjectId).toBeNull();
            expect(result.settings.timeOffEvent).toBeUndefined();
            expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(0);
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("baseProjectIdがnullの場合は検証をスキップする", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: { namePatterns: [], workItemId: 1 }, // 存在するWorkItem
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];
            const projects: Project[] = [
                { id: "100", projectId: "100", name: "Project1", projectName: "Project1", projectCode: "P1" },
            ];

            const result = validateAndCleanupSettings(settings, workItems, projects);

            expect(result.cleanedCount).toBe(0);
            expect(result.settings.baseProjectId).toBeNull();
        });

        it("プロジェクトリストが提供されない場合はbaseProjectIdの検証をスキップする", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999, // 存在しないが検証されない
                timeOffEvent: { namePatterns: [], workItemId: 1 }, // 存在するWorkItem
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems); // projectsを渡さない

            expect(result.cleanedCount).toBe(0);
            expect(result.settings.baseProjectId).toBe(999);
        });

        it("空のプロジェクトリストの場合はbaseProjectIdの検証をスキップする", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999,
                timeOffEvent: { namePatterns: [], workItemId: 1 }, // 存在するWorkItem
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];
            const projects: Project[] = []; // 空のリスト

            const result = validateAndCleanupSettings(settings, workItems, projects);

            expect(result.cleanedCount).toBe(0);
            expect(result.settings.baseProjectId).toBe(999);
        });

        it("オプショナルな設定がundefinedの場合は検証をスキップする", async () => {
            const { validateAndCleanupSettings } = await import("./logic");

            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: undefined,
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.cleanedCount).toBe(0);
            expect(result.settings.timeOffEvent).toBeUndefined();
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("WorkItemIDが文字列の場合でも正しく検証できる", async () => {
            const { validateAndCleanupSettings } = await import("./logic");
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: null,
                timeOffEvent: { namePatterns: [], workItemId: 1 },
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [
                { id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }, // 文字列のID
            ];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.cleanedCount).toBe(0);
            expect(result.settings.timeOffEvent?.workItemId).toBe(1);
        });
    });
});
