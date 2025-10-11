import { TimeTrackerSettings } from "@/types";
import { describe, expect, it } from "vitest";
import { validateAndCleanupSettings } from "./validate";

describe("TimeTrackerLogic", () => {
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
    describe("validateAndCleanupSettings", () => {
        it("全ての設定が有効な場合は何も変更しない", async () => {
            const workItems = [
                { id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" },
                { id: "2", name: "WI2", folderName: "Folder2", folderPath: "/Folder2" },
                { id: "3", name: "WI3", folderName: "Folder3", folderPath: "/Folder3" },
            ];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings).toEqual(settings);
        });

        it("存在しないbaseProjectIdは検証対象外(削除済み)", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999, // baseProjectIdは検証されない
                timeOffEvent: undefined,
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings.baseProjectId).toBe(999); // 変更なし
        });

        it("存在しないtimeOffEvent.workItemIdを削除する", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
                timeOffEvent: { namePatterns: [], workItemId: 999 }, // 存在しないWorkItem
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(1);
            expect(result.settings.timeOffEvent).toBeUndefined();
        });

        it("存在しないscheduleAutoInputInfo.workItemIdを-1に設定する", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
                timeOffEvent: undefined,
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 999, // 存在しないWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(1);
            expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(-1);
        });

        it("存在しないpaidLeaveInputInfo.workItemIdを削除する", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
                timeOffEvent: undefined,
                paidLeaveInputInfo: { workItemId: 999, startTime: "09:00", endTime: "18:00" }, // 存在しないWorkItem
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(1);
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("複数の無効な設定を一度にクリアできる", async () => {
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

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(3);
            expect(result.settings.timeOffEvent).toBeUndefined();
            expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(-1);
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("すべての設定が有効な場合は何もクリアしない", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
                timeOffEvent: { namePatterns: [], workItemId: 1 }, // 存在するWorkItem
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings.baseProjectId).toBe(1);
        });

        it("baseProjectIdは検証対象外", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 999, // baseProjectIdは検証されない
                timeOffEvent: { namePatterns: [], workItemId: 1 }, // 存在するWorkItem
                paidLeaveInputInfo: { workItemId: 1, startTime: "09:00", endTime: "18:00" },
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings.baseProjectId).toBe(999);
        });

        it("WorkItem設定のみを検証する", async () => {
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

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings.baseProjectId).toBe(999);
        });

        it("オプショナルな設定がundefinedの場合は検証をスキップする", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
                timeOffEvent: undefined,
                paidLeaveInputInfo: undefined,
                scheduleAutoInputInfo: {
                    ...mockSettings.scheduleAutoInputInfo,
                    workItemId: 1, // 存在するWorkItem
                },
            };

            const workItems = [{ id: "1", name: "WI1", folderName: "Folder1", folderPath: "/Folder1" }];

            const result = validateAndCleanupSettings(settings, workItems);

            expect(result.items.length).toBe(0);
            expect(result.settings.timeOffEvent).toBeUndefined();
            expect(result.settings.paidLeaveInputInfo).toBeUndefined();
        });

        it("WorkItemIDが文字列の場合でも正しく検証できる", async () => {
            const settings: TimeTrackerSettings = {
                ...mockSettings,
                baseProjectId: 1,
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

            expect(result.items.length).toBe(0);
            expect(result.settings.timeOffEvent?.workItemId).toBe(1);
        });
    });

    it("VC01: workItems 空で 3 項目クリア", async () => {
        const settings: TimeTrackerSettings = {
            ...baseSettings,
            baseProjectId: 1,
            timeOffEvent: { namePatterns: [], workItemId: 10 },
            scheduleAutoInputInfo: { ...baseSettings.scheduleAutoInputInfo, workItemId: 11 },
            paidLeaveInputInfo: { workItemId: 12, startTime: "09:00", endTime: "18:00" },
        };
        const result = validateAndCleanupSettings(settings, []); // workItems 空
        expect(result.items.length).toBe(3);
        expect(result.settings.timeOffEvent).toBeUndefined();
        expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(-1);
        expect(result.settings.paidLeaveInputInfo).toBeUndefined();
    });

    it("BV-L08: 設定検証で存在するWorkItemはクリアされない", async () => {
        const workItems = [
            { id: "10", name: "WI10", folderName: "F", folderPath: "/F" },
            { id: "11", name: "WI11", folderName: "F", folderPath: "/F" },
            { id: "400", name: "WI400", folderName: "F", folderPath: "/F" }, // paidLeaveInputInfo用
        ];
        const settings: TimeTrackerSettings = {
            ...baseSettings,
            timeOffEvent: { namePatterns: [], workItemId: 10 },
            scheduleAutoInputInfo: { ...baseSettings.scheduleAutoInputInfo, workItemId: 11 },
            paidLeaveInputInfo: { workItemId: 400, startTime: "09:00", endTime: "18:00" },
        };
        const result = validateAndCleanupSettings(settings, workItems);
        expect(result.items.length).toBe(0);
        expect(result.settings.timeOffEvent?.workItemId).toBe(10);
        expect(result.settings.scheduleAutoInputInfo.workItemId).toBe(11);
        expect(result.settings.paidLeaveInputInfo?.workItemId).toBe(400);
    });
});
