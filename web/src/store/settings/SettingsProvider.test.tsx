/**
 * Settings Tests
 *
 * 設定の型定義とバリデーション機能を検証するテストです。
 */

import {
    getDefaultTimeTrackerSettings,
    isTimeTrackerSettingsComplete,
    validateTimeTrackerSettings,
} from "@/schema/settings/settingsDefinition";
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
});
