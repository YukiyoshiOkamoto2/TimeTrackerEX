/**
 * TimeTracker Logic Service Unit Tests
 *
 * logic.tsの各関数をテストするユニットテストスイート
 */

import type { DayTask, Event, Project, Schedule, WorkItem } from "@/types";
import type { TimeTrackerSettings } from "@/types/settings";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoLinkingInput } from "../models/linking";
import { performAutoLinking } from "./logic";

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
                    // baseDateを00:00:00の時刻で作成
                    const baseDate = new Date(event.schedule.start);
                    baseDate.setHours(0, 0, 0, 0);
                    taskMap.set(dateKey, {
                        baseDate,
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
            roundingTimeType: "backward",
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
});

// ===================== Additional Edge / Branch Coverage Tests =====================
// ケースID方針: ALxx (AutoLinking), STxx (Statistics), VCxx (Validation/Cleanup)
describe("TimeTrackerLogic Additional Branch Cases", () => {
    // 既存モック環境を利用
    const baseProject: Project = {
        id: "p-1",
        name: "P1",
        projectId: "1",
        projectName: "P1",
        projectCode: "P1",
    };

    const baseSettings: TimeTrackerSettings = {
        userName: "u",
        baseUrl: "https://example.com",
        baseProjectId: 1,
        ignorableEvents: [],
        isHistoryAutoInput: false,
        timeOffEvent: {
            namePatterns: [{ pattern: "休暇", matchMode: "partial" }],
            workItemId: 200,
        },
        eventDuplicatePriority: { timeCompare: "small" },
        roundingTimeTypeOfEvent: "backward",
        scheduleAutoInputInfo: {
            roundingTimeType: "backward",
            startEndType: "both",
            startEndTime: 30,
            workItemId: 300,
        },
        paidLeaveInputInfo: {
            workItemId: 400,
            startTime: "09:00",
            endTime: "18:00",
        },
    };

    const createEvent = (id: string, name: string, start: string, end: string, extra: Partial<Event> = {}): Event => ({
        uuid: id,
        name,
        organizer: "o",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: {
            start: new Date(start),
            end: new Date(end),
            ...((extra as any).schedule || {}),
        },
        ...extra,
    });

    const createSchedule = (day: string, opts: Partial<Schedule> = {}): Schedule => ({
        start: new Date(`${day}T00:00:00`),
        end: new Date(`${day}T08:00:00`),
        isHoliday: false,
        isPaidLeave: false,
        ...opts,
    });

    afterEach(() => {
        // 呼び出し回数等のみクリアし、モック実装自体は維持
        vi.clearAllMocks();
    });

    it("AL02: history 自動紐付け (isHistoryAutoInput=true)", async () => {
        const settings: TimeTrackerSettings = { ...baseSettings, isHistoryAutoInput: true, timeOffEvent: undefined };
        const events: Event[] = [
            createEvent("e1", "History 作業", "2024-02-01T10:00:00", "2024-02-01T11:00:00"),
            createEvent("e2", "通常作業", "2024-02-01T12:00:00", "2024-02-01T13:00:00"),
        ];
        const schedules: Schedule[] = [createSchedule("2024-02-01")];
        const workItems: WorkItem[] = [
            { id: "101", name: "履歴WI", folderName: "F", folderPath: "/F" },
            { id: "300", name: "勤務", folderName: "F", folderPath: "/F" },
        ];
        const input: AutoLinkingInput = {
            events,
            schedules,
            project: baseProject,
            workItemChirdren: workItems,
            timetracker: settings,
        } as any;
        const historyModule = await import("@/core/history");
        // 既存 mock を一回だけ差し替え
        (historyModule as any).HistoryManager.mockImplementation(() => ({
            load: vi.fn(),
            save: vi.fn(),
            getWorkItemId: (e: Event) => (e.name.includes("History") ? "101" : null),
        }));
        const result = await performAutoLinking(input);
        const historyLinked = result.linked.filter((p) => p.linkingWorkItem.autoMethod === "history");
        expect(historyLinked.length).toBe(1);
        expect(historyLinked[0].event.name).toContain("History");
    });

    it("AL03: 勤務時間 scheduleEvents 自動紐付け", async () => {
        // TimeTrackerAlgorithm モックを scheduleEvents 付きで再定義
        const algoModule = await import("@/core/algorithm");
        (algoModule.TimeTrackerAlgorithm as any).mockImplementation(() => ({
            splitOneDayTask: (_events: Event[], _schedules: Schedule[]) => [
                {
                    baseDate: new Date("2024-02-02"),
                    project: baseProject,
                    events: [],
                    scheduleEvents: [createEvent("se1", "勤務ブロック", "2024-02-02T09:00:00", "2024-02-02T18:00:00")],
                },
            ],
        }));

        const settings: TimeTrackerSettings = { ...baseSettings };
        const input: AutoLinkingInput = {
            events: [],
            schedules: [createSchedule("2024-02-02")],
            project: baseProject,
            workItemChirdren: [{ id: "300", name: "勤務", folderName: "F", folderPath: "/F" }],
            timetracker: settings,
        } as any;

        const result = await performAutoLinking(input);
        const workScheduleLinked = result.linked.filter((p) => p.linkingWorkItem.autoMethod === "workShedule");
        expect(workScheduleLinked.length).toBe(1);
        expect(workScheduleLinked[0].event.name).toBe("勤務ブロック");
    });

    it("AL04: timeOff が history より優先される", async () => {
        // TimeTrackerAlgorithmモックを上書きして、dayTasksを確実に返すようにする
        const algorithmModule = await import("@/core/algorithm");
        (algorithmModule as any).TimeTrackerAlgorithm.mockImplementationOnce(() => ({
            splitOneDayTask: vi.fn((events: Event[], _schedules: Schedule[]) => {
                if (events.length === 0) return [];
                // すべてのイベントを1つのDayTaskにまとめる
                return [
                    {
                        baseDate: new Date("2024-02-03"),
                        project: baseProject,
                        events,
                        scheduleEvents: [],
                    },
                ];
            }),
        }));
        const historyModule = await import("@/core/history");
        (historyModule as any).HistoryManager.mockImplementationOnce(() => ({
            load: vi.fn(),
            save: vi.fn(),
            // e1(年次休暇)は timeOff で処理されるので History では処理されない
            // e2(通常History)のみ History で処理
            getWorkItemId: (e: Event) => {
                if (e.name === "通常History") return "101";
                return null;
            },
        }));
        const settings: TimeTrackerSettings = { ...baseSettings, isHistoryAutoInput: true };
        const events: Event[] = [
            // タイムゾーン問題を避けるため、スケジュール日と同じ日時範囲内に設定
            createEvent("e1", "年次休暇", "2024-02-03T00:00:00", "2024-02-03T01:00:00"), // timeOff & history 両方マッチ
            createEvent("e2", "通常History", "2024-02-03T02:00:00", "2024-02-03T03:00:00"), // history のみ
        ];
        // timeOffEvent のパターンを "休暇" にしてイベントとマッチ
        settings.timeOffEvent = { namePatterns: [{ pattern: "休暇", matchMode: "partial" }], workItemId: 200 };
        const input: AutoLinkingInput = {
            events,
            // イベントが処理されるようにスケジュールを提供
            schedules: [createSchedule("2024-02-03")],
            project: baseProject,
            workItemChirdren: [
                { id: "101", name: "履歴WI", folderName: "F", folderPath: "/F" },
                { id: "200", name: "休暇WI", folderName: "F", folderPath: "/F" },
            ],
            timetracker: settings,
        } as any;
        const result = await performAutoLinking(input);
        const timeOffLinked = result.linked.filter((p) => p.linkingWorkItem.autoMethod === "timeOff");
        expect(timeOffLinked.find((p) => p.event.uuid === "e1")).toBeDefined();
        const historyLinkedSameEvent = result.linked.find(
            (p) => p.linkingWorkItem.autoMethod === "history" && p.event.uuid === "e1",
        );
        expect(historyLinkedSameEvent).toBeUndefined();
        // e2 は history として紐付く
        expect(
            result.linked.find((p) => p.linkingWorkItem.autoMethod === "history" && p.event.uuid === "e2"),
        ).toBeDefined();
    });
});

describe("TimeTrackerLogic 境界値テスト", () => {
    const baseProject: Project = {
        id: "project-1",
        name: "テストプロジェクト",
        projectId: "1",
        projectName: "テストプロジェクト",
        projectCode: "TEST",
    };

    const baseSettings: TimeTrackerSettings = {
        userName: "u",
        baseUrl: "https://example.com",
        baseProjectId: 1,
        ignorableEvents: [],
        isHistoryAutoInput: false,
        timeOffEvent: {
            namePatterns: [{ pattern: "休暇", matchMode: "partial" }],
            workItemId: 200,
        },
        eventDuplicatePriority: { timeCompare: "small" },
        roundingTimeTypeOfEvent: "backward",
        scheduleAutoInputInfo: {
            roundingTimeType: "backward",
            startEndType: "both",
            startEndTime: 30,
            workItemId: 300,
        },
        paidLeaveInputInfo: {
            workItemId: 400,
            startTime: "09:00",
            endTime: "18:00",
        },
    };

    const createEvent = (id: string, name: string, start: string, end: string, extra: Partial<Event> = {}): Event => ({
        uuid: id,
        name,
        organizer: "o",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: {
            start: new Date(start),
            end: new Date(end),
            ...((extra as any).schedule || {}),
        },
        ...extra,
    });

    const createSchedule = (day: string, opts: Partial<Schedule> = {}): Schedule => ({
        start: new Date(`${day}T00:00:00`),
        end: new Date(`${day}T08:00:00`),
        isHoliday: false,
        isPaidLeave: false,
        ...opts,
    });

    it("BV-L01: 空のイベントとスケジュールを処理", async () => {
        const { performAutoLinking } = await import("./logic");
        const input: AutoLinkingInput = {
            events: [],
            schedules: [],
            project: baseProject,
            workItemChirdren: [],
            timetracker: baseSettings,
        } as any;
        const result = await performAutoLinking(input);
        expect(result.linked).toHaveLength(0);
        expect(result.unlinked).toHaveLength(0);
        expect(result.excluded).toHaveLength(0);
    });

    it("BV-L02: 1件のイベントと1件のスケジュール", async () => {
        const { performAutoLinking } = await import("./logic");
        // TimeTrackerAlgorithmをモックしてdayTasksを確実に返すようにする
        const algorithmModule = await import("@/core/algorithm");
        const testEvent = createEvent("e1", "イベント", "2024-02-03T09:00:00", "2024-02-03T10:00:00");
        (algorithmModule as any).TimeTrackerAlgorithm.mockImplementationOnce(() => ({
            splitOneDayTask: vi.fn((events: Event[], _schedules: Schedule[]) => {
                return events.length > 0
                    ? [
                          {
                              baseDate: new Date("2024-02-03"),
                              project: baseProject,
                              events,
                              scheduleEvents: [],
                          },
                      ]
                    : [];
            }),
        }));
        const events = [testEvent];
        const schedules = [createSchedule("2024-02-03")];
        const input: AutoLinkingInput = {
            events,
            schedules,
            project: baseProject,
            workItemChirdren: [],
            timetracker: baseSettings,
        } as any;
        const result = await performAutoLinking(input);
        // イベントは処理されるが、workItemが空なので unlinked になる
        expect(result.unlinked.length + result.linked.length).toBe(1);
    });

    it("BV-L03: 100件のイベントを処理", async () => {
        const { performAutoLinking } = await import("./logic");
        // TimeTrackerAlgorithmをモックしてdayTasksを確実に返すようにする
        const algorithmModule = await import("@/core/algorithm");
        const events = Array.from({ length: 100 }, (_, i) =>
            createEvent(`e${i}`, `イベント${i}`, "2024-02-03T09:00:00", "2024-02-03T10:00:00"),
        );
        (algorithmModule as any).TimeTrackerAlgorithm.mockImplementationOnce(() => ({
            splitOneDayTask: vi.fn((events: Event[], _schedules: Schedule[]) => {
                return events.length > 0
                    ? [
                          {
                              baseDate: new Date("2024-02-03"),
                              project: baseProject,
                              events,
                              scheduleEvents: [],
                          },
                      ]
                    : [];
            }),
        }));
        const schedules = [createSchedule("2024-02-03")];
        const input: AutoLinkingInput = {
            events,
            schedules,
            project: baseProject,
            workItemChirdren: [],
            timetracker: baseSettings,
        } as any;
        const result = await performAutoLinking(input);
        const totalProcessed = result.linked.length + result.unlinked.length + result.excluded.length;
        expect(totalProcessed).toBe(100);
    });

    it("BV-L04: プライベートイベントのみ", async () => {
        const { performAutoLinking } = await import("./logic");
        const events = [
            createEvent("e1", "プライベート", "2024-02-03T09:00:00", "2024-02-03T10:00:00", { isPrivate: true }),
        ];
        const schedules = [createSchedule("2024-02-03")];
        const input: AutoLinkingInput = {
            events,
            schedules,
            project: baseProject,
            workItemChirdren: [],
            timetracker: baseSettings,
        } as any;
        const result = await performAutoLinking(input);
        expect(result.excluded).toHaveLength(1);
        expect(result.excluded[0].reason).toBe("invalid");
    });

    it("BV-L05: 全イベントが無視リストに一致", async () => {
        const { performAutoLinking } = await import("./logic");
        const events = [
            createEvent("e1", "無視A", "2024-02-03T09:00:00", "2024-02-03T10:00:00"),
            createEvent("e2", "無視B", "2024-02-03T11:00:00", "2024-02-03T12:00:00"),
        ];
        const schedules = [createSchedule("2024-02-03")];
        const settings = {
            ...baseSettings,
            ignorableEvents: [{ pattern: "無視", matchMode: "partial" as const }],
        };
        const input: AutoLinkingInput = {
            events,
            schedules,
            project: baseProject,
            workItemChirdren: [],
            timetracker: settings,
        } as any;
        const result = await performAutoLinking(input);
        expect(result.excluded.filter((e) => e.reason === "ignored")).toHaveLength(2);
    });
});
