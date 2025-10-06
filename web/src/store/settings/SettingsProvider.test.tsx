/**
 * Settings Tests
 *
 * 設定の型定義とバリデーション機能を検証するテストです。
 */

import {
    getDefaultTimeTrackerSettings,
    isTimeTrackerSettingsComplete,
    parseAndFixTimeTrackerSettings,
    parseTimeTrackerSettings,
    stringifyTimeTrackerSettings,
} from "@/schema/settings/settingUtils";
import { validateTimeTrackerSettings } from "@/schema/settings/timetrackerDefinition";
import { TimeTrackerSettings } from "@/types";
import { describe, expect, it } from "vitest";

describe("Settings", () => {
    describe("getDefaultTimeTrackerSettings", () => {
        it("デフォルト値が正しく設定されている", () => {
            const defaults = getDefaultTimeTrackerSettings();

            expect(defaults.roundingTimeTypeOfEvent).toBe("nonduplicate");
            expect(defaults.isHistoryAutoInput).toBe(true);
            expect(defaults.eventDuplicatePriority?.timeCompare).toBe("small");
            expect(defaults.scheduleAutoInputInfo?.startEndType).toBe("both");
            expect(defaults.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule).toBe("half");
            expect(defaults.scheduleAutoInputInfo?.startEndTime).toBe(30);
        });
    });

    describe("validateTimeTrackerSettings", () => {
        it("完全な設定の場合、検証が成功する", () => {
            const completeSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                isHistoryAutoInput: true,
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = validateTimeTrackerSettings(completeSettings);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value).toEqual(completeSettings);
            }
        });

        it("ユーザー名が欠けている場合、エラーが返される", () => {
            const settings = {
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half" as const,
                eventDuplicatePriority: { timeCompare: "small" as const },
                scheduleAutoInputInfo: {
                    startEndType: "both" as const,
                    roundingTimeTypeOfSchedule: "half" as const,
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = validateTimeTrackerSettings(settings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorMessage).toContain("userName");
            }
        });

        it("ベースURLが欠けている場合、エラーが返される", () => {
            const settings = {
                userName: "test@example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half" as const,
                eventDuplicatePriority: { timeCompare: "small" as const },
                scheduleAutoInputInfo: {
                    startEndType: "both" as const,
                    roundingTimeTypeOfSchedule: "half" as const,
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = validateTimeTrackerSettings(settings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorMessage).toContain("baseUrl");
            }
        });

        it("プロジェクトIDが欠けている場合、エラーが返される", () => {
            const settings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                roundingTimeTypeOfEvent: "half" as const,
                eventDuplicatePriority: { timeCompare: "small" as const },
                scheduleAutoInputInfo: {
                    startEndType: "both" as const,
                    roundingTimeTypeOfSchedule: "half" as const,
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = validateTimeTrackerSettings(settings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorMessage).toContain("baseProjectId");
            }
        });

        it("複数のフィールドが欠けている場合、複数のエラーが返される", () => {
            const settings = {};

            const result = validateTimeTrackerSettings(settings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorMessage.length).toBeGreaterThan(0);
            }
        });
    });

    describe("isTimeTrackerSettingsComplete", () => {
        it("完全な設定の場合、trueを返す", () => {
            const completeSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                isHistoryAutoInput: true,
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            expect(isTimeTrackerSettingsComplete(completeSettings)).toBe(true);
        });

        it("不完全な設定の場合、falseを返す", () => {
            const incompleteSettings: Partial<TimeTrackerSettings> = {
                userName: "test@example.com",
            };

            expect(isTimeTrackerSettingsComplete(incompleteSettings)).toBe(false);
        });
    });

    // SettingsValidationErrorは削除され、ValidationResultパターンを使用

    describe("TimeTrackerSettings型", () => {
        it("オプション項目を含む完全な設定を作成できる", () => {
            const fullSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                isHistoryAutoInput: false,
                roundingTimeTypeOfEvent: "backward",
                timeOffEvent: {
                    namePatterns: [
                        { pattern: "休暇", matchMode: "partial" },
                        { pattern: "有給", matchMode: "prefix" },
                    ],
                    workItemId: 999,
                },
                eventDuplicatePriority: { timeCompare: "large" },
                scheduleAutoInputInfo: {
                    startEndType: "start",
                    roundingTimeTypeOfSchedule: "forward",
                    startEndTime: 60,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    enabled: true,
                    workItemId: 789,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            expect(fullSettings.userName).toBe("test@example.com");
            expect(fullSettings.isHistoryAutoInput).toBe(false);
            expect(fullSettings.timeOffEvent?.namePatterns).toEqual([
                { pattern: "休暇", matchMode: "partial" },
                { pattern: "有給", matchMode: "prefix" },
            ]);
            expect(fullSettings.paidLeaveInputInfo?.startTime).toBe("09:00");
        });

        it("オプション項目を省略した設定を作成できる", () => {
            const minimalSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            expect(minimalSettings.userName).toBe("test@example.com");
            expect(minimalSettings.isHistoryAutoInput).toBeUndefined();
            expect(minimalSettings.timeOffEvent).toBeUndefined();
            expect(minimalSettings.paidLeaveInputInfo).toBeUndefined();
        });
    });

    describe("paidLeaveInputInfo設定", () => {
        it("有効な有給休暇設定を検証できる", () => {
            const settingsWithPaidLeave: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    enabled: true,
                    workItemId: 789,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            const result = validateTimeTrackerSettings(settingsWithPaidLeave);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.paidLeaveInputInfo?.enabled).toBe(true);
                expect(result.value.paidLeaveInputInfo?.workItemId).toBe(789);
                expect(result.value.paidLeaveInputInfo?.startTime).toBe("09:00");
                expect(result.value.paidLeaveInputInfo?.endTime).toBe("18:00");
            }
        });

        it("無効化された有給休暇設定を検証できる", () => {
            const settingsWithDisabledPaidLeave: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    enabled: false,
                    workItemId: 789,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            const result = validateTimeTrackerSettings(settingsWithDisabledPaidLeave);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.paidLeaveInputInfo?.enabled).toBe(false);
            }
        });

        it("時刻フォーマットのバリデーション", () => {
            const invalidTimeFormat: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    enabled: true,
                    workItemId: 789,
                    startTime: "9:0", // 不正なフォーマット
                    endTime: "18:00",
                },
            };

            const result = validateTimeTrackerSettings(invalidTimeFormat);
            expect(result.isError).toBe(true);
        });

        it("有給休暇設定が未設定でも完全性チェックに影響しない", () => {
            const settingsWithoutPaidLeave: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            expect(isTimeTrackerSettingsComplete(settingsWithoutPaidLeave)).toBe(true);
        });
    });

    describe("ignorableEvents設定", () => {
        it("複数の無視パターンを設定できる", () => {
            const settingsWithIgnorableEvents: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                ignorableEvents: [
                    { pattern: "MTG", matchMode: "partial" },
                    { pattern: "ミーティング", matchMode: "prefix" },
                    { pattern: "打ち合わせ", matchMode: "suffix" },
                ],
            };

            const result = validateTimeTrackerSettings(settingsWithIgnorableEvents);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.ignorableEvents).toHaveLength(3);
            }
        });

        it("空の無視パターン配列は無効", () => {
            const settingsWithEmptyIgnorableEvents: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                ignorableEvents: [],
            };

            const result = validateTimeTrackerSettings(settingsWithEmptyIgnorableEvents);
            expect(result.isError).toBe(true);
        });
    });

    describe("roundingTimeTypeOfEvent設定", () => {
        it("すべての丸め方式を受け入れる", () => {
            const roundingMethods: Array<TimeTrackerSettings["roundingTimeTypeOfEvent"]> = [
                "backward",
                "forward",
                "round",
                "half",
                "stretch",
                "nonduplicate",
            ];

            roundingMethods.forEach((method) => {
                const settings: TimeTrackerSettings = {
                    userName: "test@example.com",
                    baseUrl: "https://timetracker.example.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: method,
                    eventDuplicatePriority: { timeCompare: "small" },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "half",
                        startEndTime: 30,
                        workItemId: 456,
                    },
                };

                const result = validateTimeTrackerSettings(settings);
                expect(result.isError).toBe(false);
            });
        });
    });

    describe("scheduleAutoInputInfo設定", () => {
        it("すべてのstartEndTypeを受け入れる", () => {
            const startEndTypes: Array<"both" | "start" | "end" | "fill"> = ["both", "start", "end", "fill"];

            startEndTypes.forEach((type) => {
                const settings: TimeTrackerSettings = {
                    userName: "test@example.com",
                    baseUrl: "https://timetracker.example.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: "half",
                    eventDuplicatePriority: { timeCompare: "small" },
                    scheduleAutoInputInfo: {
                        startEndType: type,
                        roundingTimeTypeOfSchedule: "half",
                        startEndTime: 30,
                        workItemId: 456,
                    },
                };

                const result = validateTimeTrackerSettings(settings);
                expect(result.isError).toBe(false);
            });
        });

        it("startEndTimeの境界値テスト", () => {
            // 最小値: 1
            const minSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 1,
                    workItemId: 456,
                },
            };

            const minResult = validateTimeTrackerSettings(minSettings);
            expect(minResult.isError).toBe(false);

            // 大きい値
            const largeSettings: TimeTrackerSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 120,
                    workItemId: 456,
                },
            };

            const largeResult = validateTimeTrackerSettings(largeSettings);
            expect(largeResult.isError).toBe(false);
        });
    });

    describe("eventDuplicatePriority設定", () => {
        it("両方のtimeCompare値を受け入れる", () => {
            const compareTypes: Array<"small" | "large"> = ["small", "large"];

            compareTypes.forEach((type) => {
                const settings: TimeTrackerSettings = {
                    userName: "test@example.com",
                    baseUrl: "https://timetracker.example.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: "half",
                    eventDuplicatePriority: { timeCompare: type },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "half",
                        startEndTime: 30,
                        workItemId: 456,
                    },
                };

                const result = validateTimeTrackerSettings(settings);
                expect(result.isError).toBe(false);
            });
        });
    });

    describe("統合テスト", () => {
        it("すべてのオプション機能を有効化した設定が正しく動作する", () => {
            const fullSettings: TimeTrackerSettings = {
                userName: "full@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 999,
                roundingTimeTypeOfEvent: "backward",
                isHistoryAutoInput: false,
                ignorableEvents: [
                    { pattern: "ランチ", matchMode: "partial" },
                    { pattern: "休憩", matchMode: "prefix" },
                ],
                eventDuplicatePriority: { timeCompare: "large" },
                scheduleAutoInputInfo: {
                    startEndType: "fill",
                    roundingTimeTypeOfSchedule: "stretch",
                    startEndTime: 60,
                    workItemId: 111,
                },
                timeOffEvent: {
                    namePatterns: [
                        { pattern: "有給", matchMode: "partial" },
                        { pattern: "休暇", matchMode: "prefix" },
                    ],
                    workItemId: 222,
                },
                paidLeaveInputInfo: {
                    enabled: true,
                    workItemId: 333,
                    startTime: "08:30",
                    endTime: "17:30",
                },
            };

            const result = validateTimeTrackerSettings(fullSettings);
            expect(result.isError).toBe(false);
            expect(isTimeTrackerSettingsComplete(fullSettings)).toBe(true);

            // JSON変換のラウンドトリップテスト
            const jsonString = stringifyTimeTrackerSettings(fullSettings);
            const parseResult = parseTimeTrackerSettings(jsonString);
            expect(parseResult.isError).toBe(false);

            if (!parseResult.isError) {
                expect(parseResult.value).toEqual(fullSettings);
            }
        });

        it("デフォルト値を使用した最小設定から完全設定への拡張", () => {
            const minimal = {
                userName: "min@example.com",
                baseUrl: "https://min.example.com",
                baseProjectId: 1,
            };

            // デフォルト値で補完
            const fixedResult = parseAndFixTimeTrackerSettings(minimal);
            expect(fixedResult.isError).toBe(false);

            if (!fixedResult.isError) {
                expect(fixedResult.value.userName).toBe("min@example.com");
                expect(fixedResult.value.roundingTimeTypeOfEvent).toBeDefined();
                expect(fixedResult.value.eventDuplicatePriority).toBeDefined();
                expect(fixedResult.value.scheduleAutoInputInfo).toBeDefined();
                expect(isTimeTrackerSettingsComplete(fixedResult.value)).toBe(true);
            }
        });
    });
});
