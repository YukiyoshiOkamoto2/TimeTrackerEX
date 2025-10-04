/**
 * Settings Definition Tests
 *
 * 設定定義とスキーマ生成のテストです。
 */

import { describe, expect, it } from "vitest";
import {
    createZodSchemaFromDefinition,
    GeneratedAppSettingsSchema,
    generateHelpText,
    getDefaultValues,
    SETTINGS_DEFINITION,
} from "./settingsDefinition";

describe("settingsDefinition", () => {
    describe("SETTINGS_DEFINITION", () => {
        it("すべての必須フィールドが定義されている", () => {
            const requiredFields = [
                "userName",
                "baseUrl",
                "baseProjectId",
                "roundingTimeTypeOfEvent",
                "eventDuplicatePriority",
                "scheduleAutoInputInfo",
            ];

            requiredFields.forEach((field) => {
                expect(SETTINGS_DEFINITION).toHaveProperty(field);
                expect(SETTINGS_DEFINITION[field as keyof typeof SETTINGS_DEFINITION].required).toBe(true);
            });
        });

        it("オプションフィールドが定義されている", () => {
            const optionalFields = ["enableAutoUpdate", "isHistoryAutoInput", "timeOffEvent", "paidLeaveInputInfo"];

            optionalFields.forEach((field) => {
                expect(SETTINGS_DEFINITION).toHaveProperty(field);
                expect(SETTINGS_DEFINITION[field as keyof typeof SETTINGS_DEFINITION].required).toBe(false);
            });
        });

        it("各フィールドに名前と説明がある", () => {
            Object.entries(SETTINGS_DEFINITION).forEach(([_key, info]) => {
                expect(info.name).toBeTruthy();
                expect(typeof info.name).toBe("string");
                expect(info.name.length).toBeGreaterThan(0);
            });
        });
    });

    describe("createZodSchemaFromDefinition", () => {
        it("文字列型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.userName);
            const result = schema.safeParse("testuser");
            expect(result.success).toBe(true);
        });

        it("文字列型で最小文字数を検証できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.userName);
            const result = schema.safeParse("");
            expect(result.success).toBe(false);
        });

        it("URL型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.baseUrl);
            const validResult = schema.safeParse("https://example.com");
            expect(validResult.success).toBe(true);

            const invalidResult = schema.safeParse("not-a-url");
            expect(invalidResult.success).toBe(false);
        });

        it("列挙型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.roundingTimeTypeOfEvent);
            const validResult = schema.safeParse("backward");
            expect(validResult.success).toBe(true);

            const invalidResult = schema.safeParse("invalid");
            expect(invalidResult.success).toBe(false);
        });

        it("数値型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.baseProjectId);
            const validResult = schema.safeParse(123);
            expect(validResult.success).toBe(true);

            const negativeResult = schema.safeParse(-1);
            expect(negativeResult.success).toBe(false);

            const floatResult = schema.safeParse(1.5);
            expect(floatResult.success).toBe(false);
        });

        it("ブール型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.enableAutoUpdate);
            const trueResult = schema.safeParse(true);
            expect(trueResult.success).toBe(true);

            const falseResult = schema.safeParse(false);
            expect(falseResult.success).toBe(true);

            const stringResult = schema.safeParse("true");
            expect(stringResult.success).toBe(false);
        });

        it("配列型のスキーマを生成できる", () => {
            const timeOffEvent = SETTINGS_DEFINITION.timeOffEvent;
            if (timeOffEvent.type === "object") {
                const nameOfEventInfo = timeOffEvent.children.nameOfEvent;
                const schema = createZodSchemaFromDefinition(nameOfEventInfo);

                const validResult = schema.safeParse(["有給", "休暇"]);
                expect(validResult.success).toBe(true);

                const emptyResult = schema.safeParse([]);
                expect(emptyResult.success).toBe(false);
            }
        });

        it("オブジェクト型のスキーマを生成できる", () => {
            const schema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.eventDuplicatePriority);
            const validResult = schema.safeParse({ timeCompare: "small" });
            expect(validResult.success).toBe(true);

            const invalidResult = schema.safeParse({ timeCompare: "invalid" });
            expect(invalidResult.success).toBe(false);

            const missingResult = schema.safeParse({});
            expect(missingResult.success).toBe(false);
        });

        it("正規表現パターンを検証できる", () => {
            const paidLeaveInfo = SETTINGS_DEFINITION.paidLeaveInputInfo;
            if (paidLeaveInfo.type === "object") {
                const startTimeInfo = paidLeaveInfo.children.startTime;
                const schema = createZodSchemaFromDefinition(startTimeInfo);

                const validResult = schema.safeParse("09:00");
                expect(validResult.success).toBe(true);

                const invalidResult1 = schema.safeParse("9:00");
                expect(invalidResult1.success).toBe(false);

                const invalidResult2 = schema.safeParse("09:0");
                expect(invalidResult2.success).toBe(false);
            }
        });
    });

    describe("GeneratedAppSettingsSchema", () => {
        it("有効な設定を受け入れる", () => {
            const validSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = GeneratedAppSettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
        });

        it("必須フィールドが欠けている場合は拒否する", () => {
            const invalidSettings = {
                userName: "testuser",
                // baseUrlが欠けている
                baseProjectId: 123,
            };

            const result = GeneratedAppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });

        it("オプションフィールドは省略できる", () => {
            const settingsWithoutOptional = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                // enableAutoUpdate, isHistoryAutoInput, timeOffEvent, paidLeaveInputInfoは省略
            };

            const result = GeneratedAppSettingsSchema.safeParse(settingsWithoutOptional);
            expect(result.success).toBe(true);
        });

        it("型が正しくない場合は拒否する", () => {
            const invalidSettings = {
                userName: 123, // 文字列であるべき
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = GeneratedAppSettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });

        it("ネストされたオブジェクトを検証できる", () => {
            const settingsWithTimeOffEvent = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                timeOffEvent: {
                    nameOfEvent: ["有給", "休暇"],
                    workItemId: 789,
                },
            };

            const result = GeneratedAppSettingsSchema.safeParse(settingsWithTimeOffEvent);
            expect(result.success).toBe(true);
        });
    });

    describe("generateHelpText", () => {
        it("ヘルプテキストを生成できる", () => {
            const helpText = generateHelpText();
            expect(typeof helpText).toBe("string");
            expect(helpText.length).toBeGreaterThan(0);
        });

        it("すべての設定項目が含まれる", () => {
            const helpText = generateHelpText();
            Object.entries(SETTINGS_DEFINITION).forEach(([key, info]) => {
                expect(helpText).toContain(info.name);
                expect(helpText).toContain(key);
            });
        });

        it("必須/オプション情報が含まれる", () => {
            const helpText = generateHelpText();
            expect(helpText).toContain("必須: はい");
            expect(helpText).toContain("必須: いいえ");
        });

        it("デフォルト値が含まれる", () => {
            const helpText = generateHelpText();
            expect(helpText).toContain("デフォルト");
        });
    });

    describe("getDefaultValues", () => {
        it("デフォルト値を取得できる", () => {
            const defaults = getDefaultValues();
            expect(typeof defaults).toBe("object");
        });

        it("デフォルト値が定義されているフィールドが含まれる", () => {
            const defaults = getDefaultValues();
            expect(defaults).toHaveProperty("enableAutoUpdate");
            expect(defaults.enableAutoUpdate).toBe(true);
            expect(defaults).toHaveProperty("isHistoryAutoInput");
            expect(defaults.isHistoryAutoInput).toBe(true);
            expect(defaults).toHaveProperty("roundingTimeTypeOfEvent");
            expect(defaults.roundingTimeTypeOfEvent).toBe("nonduplicate");
        });

        it("ネストされたデフォルト値を取得できる", () => {
            const defaults = getDefaultValues();
            expect(defaults).toHaveProperty("eventDuplicatePriority");
            expect(defaults.eventDuplicatePriority).toHaveProperty("timeCompare");

            expect(defaults).toHaveProperty("scheduleAutoInputInfo");
            const scheduleInfo = defaults.scheduleAutoInputInfo as Record<string, unknown>;
            expect(scheduleInfo.startEndType).toBe("both");
            expect(scheduleInfo.roundingTimeTypeOfSchedule).toBe("half");
            expect(scheduleInfo.startEndTime).toBe(30);
        });

        it("デフォルト値がないフィールドは含まれない", () => {
            const defaults = getDefaultValues();
            expect(defaults).not.toHaveProperty("userName");
            expect(defaults).not.toHaveProperty("baseUrl");
            expect(defaults).not.toHaveProperty("baseProjectId");
        });
    });
});
