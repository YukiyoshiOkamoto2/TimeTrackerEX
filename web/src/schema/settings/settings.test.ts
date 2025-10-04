/**
 * Settings Schema Tests
 *
 * Zodスキーマのバリデーションをテストします。
 */

import { describe, expect, it } from "vitest";
import {
    AppSettingsSchema,
    EventDuplicatePrioritySchema,
    formatZodError,
    PaidLeaveInputInfoSchema,
    PartialAppSettingsSchema,
    RoundingMethodSchema,
    ScheduleAutoInputInfoSchema,
    StartEndTypeSchema,
    TimeCompareSchema,
    TimeOffEventConfigSchema,
    validatePartialSettingsWithZod,
    validateSettingsWithZod,
} from "./settings";

describe("Settings Schema", () => {
    describe("RoundingMethodSchema", () => {
        it("有効な丸め方法を受け入れる", () => {
            const validMethods = ["backward", "forward", "round", "half", "stretch", "nonduplicate"];

            validMethods.forEach((method) => {
                const result = RoundingMethodSchema.safeParse(method);
                expect(result.success).toBe(true);
            });
        });

        it("無効な丸め方法を拒否する", () => {
            const result = RoundingMethodSchema.safeParse("invalid");
            expect(result.success).toBe(false);
        });
    });

    describe("StartEndTypeSchema", () => {
        it("有効な開始終了タイプを受け入れる", () => {
            const validTypes = ["both", "start", "end", "fill"];

            validTypes.forEach((type) => {
                const result = StartEndTypeSchema.safeParse(type);
                expect(result.success).toBe(true);
            });
        });

        it("無効な開始終了タイプを拒否する", () => {
            const result = StartEndTypeSchema.safeParse("invalid");
            expect(result.success).toBe(false);
        });
    });

    describe("TimeCompareSchema", () => {
        it("有効な時間比較タイプを受け入れる", () => {
            expect(TimeCompareSchema.safeParse("small").success).toBe(true);
            expect(TimeCompareSchema.safeParse("large").success).toBe(true);
        });

        it("無効な時間比較タイプを拒否する", () => {
            const result = TimeCompareSchema.safeParse("invalid");
            expect(result.success).toBe(false);
        });
    });

    describe("TimeOffEventConfigSchema", () => {
        it("有効な休暇イベント設定を受け入れる", () => {
            const validConfig = {
                nameOfEvent: ["休暇", "有給"],
                workItemId: 999,
            };

            const result = TimeOffEventConfigSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });

        it("空の配列を拒否する", () => {
            const invalidConfig = {
                nameOfEvent: [],
                workItemId: 999,
            };

            const result = TimeOffEventConfigSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });

        it("負のworkItemIdを拒否する", () => {
            const invalidConfig = {
                nameOfEvent: ["休暇"],
                workItemId: -1,
            };

            const result = TimeOffEventConfigSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });
    });

    describe("EventDuplicatePrioritySchema", () => {
        it("有効な優先判定を受け入れる", () => {
            const validPriority = {
                timeCompare: "small" as const,
            };

            const result = EventDuplicatePrioritySchema.safeParse(validPriority);
            expect(result.success).toBe(true);
        });
    });

    describe("ScheduleAutoInputInfoSchema", () => {
        it("有効な自動入力設定を受け入れる", () => {
            const validInfo = {
                startEndType: "both" as const,
                roundingTimeTypeOfSchedule: "half" as const,
                startEndTime: 30,
                workItemId: 456,
            };

            const result = ScheduleAutoInputInfoSchema.safeParse(validInfo);
            expect(result.success).toBe(true);
        });

        it("30, 60, 90以外の時間を拒否する", () => {
            const invalidInfo = {
                startEndType: "both" as const,
                roundingTimeTypeOfSchedule: "half" as const,
                startEndTime: 45, // 無効
                workItemId: 456,
            };

            const result = ScheduleAutoInputInfoSchema.safeParse(invalidInfo);
            expect(result.success).toBe(false);
        });
    });

    describe("PaidLeaveInputInfoSchema", () => {
        it("有効な有給休暇設定を受け入れる", () => {
            const validInfo = {
                workItemId: 789,
                startTime: "09:00",
                endTime: "18:00",
            };

            const result = PaidLeaveInputInfoSchema.safeParse(validInfo);
            expect(result.success).toBe(true);
        });

        it("無効な時間形式を拒否する", () => {
            const invalidInfo = {
                workItemId: 789,
                startTime: "9:00", // 無効（HH:MM形式でない）
                endTime: "18:00",
            };

            const result = PaidLeaveInputInfoSchema.safeParse(invalidInfo);
            expect(result.success).toBe(false);
        });
    });

    describe("AppSettingsSchema", () => {
        it("完全な設定を受け入れる", () => {
            const validSettings = {
                userName: "test@example.com",
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

            const result = AppSettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
        });

        it("オプション項目を含む完全な設定を受け入れる", () => {
            const validSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                enableAutoUpdate: true,
                isHistoryAutoInput: false,
                roundingTimeTypeOfEvent: "half" as const,
                timeOffEvent: {
                    nameOfEvent: ["休暇"],
                    workItemId: 999,
                },
                eventDuplicatePriority: { timeCompare: "small" as const },
                scheduleAutoInputInfo: {
                    startEndType: "both" as const,
                    roundingTimeTypeOfSchedule: "half" as const,
                    startEndTime: 60,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    workItemId: 789,
                    startTime: "09:00",
                    endTime: "18:00",
                },
            };

            const result = AppSettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
        });

        it("必須項目が欠けている場合は拒否する", () => {
            const invalidSettings = {
                userName: "test@example.com",
                // baseUrlが欠けている
                baseProjectId: 123,
            };

            const result = AppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });

        it("無効なURL形式を拒否する", () => {
            const invalidSettings = {
                userName: "test@example.com",
                baseUrl: "not-a-url", // 無効なURL
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

            const result = AppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });

        it("負のbaseProjectIdを拒否する", () => {
            const invalidSettings = {
                userName: "test@example.com",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: -1, // 負の値
                roundingTimeTypeOfEvent: "half" as const,
                eventDuplicatePriority: { timeCompare: "small" as const },
                scheduleAutoInputInfo: {
                    startEndType: "both" as const,
                    roundingTimeTypeOfSchedule: "half" as const,
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = AppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });
    });

    describe("PartialAppSettingsSchema", () => {
        it("部分的な設定を受け入れる", () => {
            const partialSettings = {
                userName: "test@example.com",
            };

            const result = PartialAppSettingsSchema.safeParse(partialSettings);
            expect(result.success).toBe(true);
        });

        it("空のオブジェクトを受け入れる", () => {
            const result = PartialAppSettingsSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("無効な値は拒否する", () => {
            const invalidSettings = {
                baseUrl: "not-a-url",
            };

            const result = PartialAppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });
    });

    describe("validateSettingsWithZod", () => {
        it("有効な設定を検証する", () => {
            const settings = {
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

            const result = validateSettingsWithZod(settings);
            expect(result.success).toBe(true);
        });

        it("無効な設定を検証する", () => {
            const settings = {
                userName: "test@example.com",
                // 必須項目が欠けている
            };

            const result = validateSettingsWithZod(settings);
            expect(result.success).toBe(false);
        });
    });

    describe("validatePartialSettingsWithZod", () => {
        it("部分的な設定を検証する", () => {
            const settings = {
                userName: "test@example.com",
            };

            const result = validatePartialSettingsWithZod(settings);
            expect(result.success).toBe(true);
        });
    });

    describe("formatZodError", () => {
        it("エラーを人間が読める形式に変換する", () => {
            const invalidSettings = {
                userName: "",
                baseUrl: "not-a-url",
            };

            const result = AppSettingsSchema.safeParse(invalidSettings);

            if (!result.success) {
                const errors = formatZodError(result.error);

                expect(Array.isArray(errors)).toBe(true);
                expect(errors.length).toBeGreaterThan(0);
                // 日本語のフィールド名に変換されることを確認
                expect(errors.some((e) => e.includes("ユーザー名"))).toBe(true);
                expect(errors.some((e) => e.includes("ベースURL"))).toBe(true);
            }
        });
    });
});
