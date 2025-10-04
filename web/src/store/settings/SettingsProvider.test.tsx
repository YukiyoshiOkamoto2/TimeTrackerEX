/**
 * Settings Tests
 *
 * 設定の型定義とバリデーション機能を検証するテストです。
 */

import { describe, expect, it } from "vitest";
import type { AppSettings } from "../../schema/settings/settings";
import {
    DEFAULT_SETTINGS,
    isSettingsComplete,
    SettingsValidationError,
    validateSettings,
} from "../../schema/settings/settings";

describe("Settings", () => {
    describe("DEFAULT_SETTINGS", () => {
        it("デフォルト値が正しく設定されている", () => {
            expect(DEFAULT_SETTINGS.enableAutoUpdate).toBe(true);
            expect(DEFAULT_SETTINGS.isHistoryAutoInput).toBe(true);
            expect(DEFAULT_SETTINGS.roundingTimeTypeOfEvent).toBe("nonduplicate");
            expect((DEFAULT_SETTINGS.eventDuplicatePriority as any)?.timeCompare).toBe("small");
            expect((DEFAULT_SETTINGS.scheduleAutoInputInfo as any)?.startEndType).toBe("both");
            expect((DEFAULT_SETTINGS.scheduleAutoInputInfo as any)?.roundingTimeTypeOfSchedule).toBe("half");
            expect((DEFAULT_SETTINGS.scheduleAutoInputInfo as any)?.startEndTime).toBe(30);
        });
    });

    describe("validateSettings", () => {
        it("完全な設定の場合、エラーが返されない", () => {
            const completeSettings: AppSettings = {
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

            const errors = validateSettings(completeSettings);
            expect(errors).toEqual([]);
        });

        it("ユーザー名が欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("ユーザー名(ログイン名)は必須です");
        });

        it("ベースURLが欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseProjectId: 123,
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("TimeTrackerのベースURLは必須です");
        });

        it("プロジェクトIDが欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("プロジェクトIDは必須です");
        });

        it("イベント時間の丸め方法が欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("イベント時間の丸め方法は必須です");
        });

        it("イベント重複時の優先判定が欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("イベント重複時の優先判定は必須です");
        });

        it("勤務時間の自動入力設定が欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
            };

            const errors = validateSettings(settings);
            expect(errors).toContain("勤務時間の自動入力設定は必須です");
        });

        it("勤務時間の自動入力設定の各項目が欠けている場合、エラーが返される", () => {
            const settings: Partial<AppSettings> = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "half",
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {} as any,
            };

            const errors = validateSettings(settings);
            // 4つのエラーが返される
            expect(errors.length).toBe(4);
            expect(errors).toContain("開始終了時間の自動入力タイプは必須です");
            expect(errors).toContain("勤務時間の丸め方法は必須です");
            expect(errors).toContain("自動入力WorkItemIDは必須です");
        });

        it("複数のエラーが同時に返される", () => {
            const settings: Partial<AppSettings> = {};

            const errors = validateSettings(settings);
            expect(errors.length).toBeGreaterThan(1);
            expect(errors).toContain("ユーザー名(ログイン名)は必須です");
            expect(errors).toContain("TimeTrackerのベースURLは必須です");
            expect(errors).toContain("プロジェクトIDは必須です");
        });
    });

    describe("isSettingsComplete", () => {
        it("完全な設定の場合、trueを返す", () => {
            const completeSettings: AppSettings = {
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

            expect(isSettingsComplete(completeSettings)).toBe(true);
        });

        it("不完全な設定の場合、falseを返す", () => {
            const incompleteSettings: Partial<AppSettings> = {
                userName: "test@example.com",
            };

            expect(isSettingsComplete(incompleteSettings)).toBe(false);
        });
    });

    describe("SettingsValidationError", () => {
        it("エラーメッセージが正しく設定される", () => {
            const error = new SettingsValidationError("テストエラー");

            expect(error.message).toBe("テストエラー");
            expect(error.name).toBe("SettingsValidationError");
            expect(error instanceof Error).toBe(true);
        });
    });

    describe("AppSettings型", () => {
        it("オプション項目を含む完全な設定を作成できる", () => {
            const fullSettings: AppSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                enableAutoUpdate: true,
                isHistoryAutoInput: false,
                roundingTimeTypeOfEvent: "backward",
                timeOffEvent: {
                    nameOfEvent: ["休暇", "有給"],
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
                    workItemId: 789,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            expect(fullSettings.userName).toBe("test@example.com");
            expect(fullSettings.enableAutoUpdate).toBe(true);
            expect((fullSettings.timeOffEvent as any)?.nameOfEvent).toEqual(["休暇", "有給"]);
            expect((fullSettings.paidLeaveInputInfo as any)?.startTime).toBe("09:00");
        });

        it("オプション項目を省略した設定を作成できる", () => {
            const minimalSettings: AppSettings = {
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
            expect(minimalSettings.enableAutoUpdate).toBeUndefined();
            expect(minimalSettings.timeOffEvent).toBeUndefined();
            expect(minimalSettings.paidLeaveInputInfo).toBeUndefined();
        });
    });
});
