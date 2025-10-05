/**
 * Settings Definition Tests
 *
 * 設定定義とバリデーションシステムのテストです。
 */

import { describe, expect, it } from "vitest";
import type { RoundingMethod, TimeTrackerSettings } from "../../types";
import {
    generateHelpText,
    getDefaultTimeTrackerSettings,
    isTimeTrackerSettingsComplete,
    parseAndFixTimeTrackerSettings,
    parseTimeTrackerSettings,
    SETTINGS_DEFINITION,
    stringifyTimeTrackerSettings,
    validateTimeTrackerSettings,
} from "./settingsDefinition";

describe("settingsDefinition", () => {
    describe("SETTINGS_DEFINITION", () => {
        it("timetrackerオブジェクトが定義されている", () => {
            expect(SETTINGS_DEFINITION).toHaveProperty("timetracker");
            expect(SETTINGS_DEFINITION.timetracker.type).toBe("object");
        });

        it("timetracker内にchildrenが定義されている", () => {
            if (SETTINGS_DEFINITION.timetracker.type === "object") {
                const children = SETTINGS_DEFINITION.timetracker.children;
                expect(children).toBeDefined();
                expect(Object.keys(children).length).toBeGreaterThan(0);
            }
        });

        it("各フィールドに名前と説明がある", () => {
            if (SETTINGS_DEFINITION.timetracker.type === "object") {
                Object.entries(SETTINGS_DEFINITION.timetracker.children).forEach(([_key, info]) => {
                    expect(info.name).toBeTruthy();
                    expect(typeof info.name).toBe("string");
                    expect(info.name.length).toBeGreaterThan(0);
                });
            }
        });

        it("必須フィールドがrequired=trueで定義されている", () => {
            if (SETTINGS_DEFINITION.timetracker.type === "object") {
                const children = SETTINGS_DEFINITION.timetracker.children;
                expect(children.userName.required).toBe(true);
                expect(children.baseUrl.required).toBe(true);
                expect(children.baseProjectId.required).toBe(true);
            }
        });
    });

    describe("validateTimeTrackerSettings", () => {
        it("有効な設定を受け入れる", () => {
            const validSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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
                    nameOfEvent: ["有給"],
                    workItemId: 789,
                },
                paidLeaveInputInfo: {
                    startTime: "09:00",
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = validateTimeTrackerSettings(validSettings);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value).toEqual(validSettings);
            }
        });

        it("必須フィールドが欠けている場合は拒否する", () => {
            const invalidSettings = {
                userName: "testuser",
                // baseUrlが欠けている
                baseProjectId: 123,
            };

            const result = validateTimeTrackerSettings(invalidSettings as TimeTrackerSettings);
            expect(result.isError).toBe(true);
        });

        it("型が正しくない場合は拒否する", () => {
            const invalidSettings = {
                userName: 123, // 文字列であるべき
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
            };

            const result = validateTimeTrackerSettings(invalidSettings as unknown as TimeTrackerSettings);
            expect(result.isError).toBe(true);
        });

        it("URL形式のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "not-a-url",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            const result = validateTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("列挙型のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "invalid" as RoundingMethod,
                isHistoryAutoInput: true,
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

            const result = validateTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("正の整数のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: -1, // 負の値は不可
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            const result = validateTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("配列のminItems検証", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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
                    nameOfEvent: [], // 空配列は不可
                    workItemId: 789,
                },
            };

            const result = validateTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("正規表現パターンの検証", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    startTime: "9:00", // HH:MM形式でないので不可
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = validateTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("オプションフィールドは省略可能", () => {
            const minimalSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            const result = validateTimeTrackerSettings(minimalSettings);
            expect(result.isError).toBe(false);
        });

        it("ネストされたオブジェクトを正しく検証", () => {
            const validSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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
                paidLeaveInputInfo: {
                    startTime: "09:00",
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = validateTimeTrackerSettings(validSettings);
            expect(result.isError).toBe(false);
        });
    });

    describe("parseTimeTrackerSettings", () => {
        it("有効なJSON文字列をパースできる", () => {
            const jsonString = JSON.stringify({
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            });

            const result = parseTimeTrackerSettings(jsonString);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.userName).toBe("testuser");
            }
        });

        it("不正なJSON文字列の場合はエラー", () => {
            const invalidJson = "{invalid json}";
            const result = parseTimeTrackerSettings(invalidJson);
            expect(result.isError).toBe(true);
        });

        it("JSONパース後のバリデーションエラーを検出", () => {
            const invalidSettings = JSON.stringify({
                userName: "testuser",
                // baseUrlが欠けている
                baseProjectId: 123,
            });

            const result = parseTimeTrackerSettings(invalidSettings);
            expect(result.isError).toBe(true);
        });
    });

    describe("parseAndFixTimeTrackerSettings", () => {
        it("不完全な設定にデフォルト値を補完する", () => {
            const incompleteSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: { timeCompare: "small" },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                // timeOffEventとpaidLeaveInputInfoが欠けている
            };

            const result = parseAndFixTimeTrackerSettings(incompleteSettings);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.userName).toBe("testuser");
                expect(result.value.roundingTimeTypeOfEvent).toBe("nonduplicate");
                expect(result.value.isHistoryAutoInput).toBe(true);
            }
        });

        it("必須フィールドが不足している場合はエラー", () => {
            const incompleteSettings = {
                userName: "testuser",
                // baseUrlが欠けている
            };
            const result = parseAndFixTimeTrackerSettings(incompleteSettings);
            expect(result.isError).toBe(true);
        });

        it("部分的な設定をマージしてデフォルト値で補完", () => {
            const partialSettings = {
                userName: "customuser",
                baseUrl: "https://custom.example.com",
                baseProjectId: 999,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: false,
                eventDuplicatePriority: { timeCompare: "large" },
                scheduleAutoInputInfo: {
                    startEndType: "start",
                    roundingTimeTypeOfSchedule: "backward",
                    startEndTime: 60,
                    workItemId: 789,
                },
            };

            const result = parseAndFixTimeTrackerSettings(partialSettings);
            expect(result.isError).toBe(false);
            if (!result.isError) {
                expect(result.value.userName).toBe("customuser");
                expect(result.value.baseUrl).toBe("https://custom.example.com");
                expect(result.value.baseProjectId).toBe(999);
                expect(result.value.isHistoryAutoInput).toBe(false);
                expect(result.value.eventDuplicatePriority.timeCompare).toBe("large");
            }
        });
    });

    describe("stringifyTimeTrackerSettings", () => {
        it("設定オブジェクトをJSON文字列に変換できる", () => {
            const settings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            const jsonString = stringifyTimeTrackerSettings(settings);
            expect(typeof jsonString).toBe("string");
            const parsed = JSON.parse(jsonString);
            expect(parsed.userName).toBe("testuser");
        });

        it("pretty=trueでインデントされたJSON文字列を生成", () => {
            const settings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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
            const jsonString = stringifyTimeTrackerSettings(settings, true);
            expect(jsonString).toContain("\n");
            expect(jsonString).toContain("  ");
        });
    });

    describe("getDefaultTimeTrackerSettings", () => {
        it("デフォルト値を取得できる", () => {
            const defaults = getDefaultTimeTrackerSettings();
            expect(typeof defaults).toBe("object");
        });

        it("デフォルト値が定義されているフィールドが含まれる", () => {
            const defaults = getDefaultTimeTrackerSettings();
            expect(defaults.roundingTimeTypeOfEvent).toBe("nonduplicate");
            expect(defaults.isHistoryAutoInput).toBe(true);
        });

        it("ネストされたデフォルト値が含まれる", () => {
            const defaults = getDefaultTimeTrackerSettings();
            expect(defaults.eventDuplicatePriority).toBeDefined();
            if (defaults.eventDuplicatePriority) {
                expect(defaults.eventDuplicatePriority.timeCompare).toBe("small");
            }

            expect(defaults.scheduleAutoInputInfo).toBeDefined();
            if (defaults.scheduleAutoInputInfo) {
                expect(defaults.scheduleAutoInputInfo.startEndType).toBe("both");
                expect(defaults.scheduleAutoInputInfo.roundingTimeTypeOfSchedule).toBe("half");
                expect(defaults.scheduleAutoInputInfo.startEndTime).toBe(30);
            }
        });

        it("必須フィールドにはデフォルト値が設定されている", () => {
            const defaults = getDefaultTimeTrackerSettings();
            // 必須フィールドでデフォルト値が定義されていないものはundefinedになる
            expect(defaults.roundingTimeTypeOfEvent).toBe("nonduplicate");
            expect(defaults.isHistoryAutoInput).toBe(true);
            // eventDuplicatePriorityとscheduleAutoInputInfoはデフォルトで存在する
            expect(defaults.eventDuplicatePriority).toBeDefined();
            expect(defaults.scheduleAutoInputInfo).toBeDefined();
        });
    });

    describe("isTimeTrackerSettingsComplete", () => {
        it("完全な設定の場合はtrueを返す", () => {
            const completeSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            expect(isTimeTrackerSettingsComplete(completeSettings)).toBe(true);
        });

        it("必須フィールドが空の場合はfalseを返す", () => {
            const incompleteSettings: TimeTrackerSettings = {
                userName: "",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            expect(isTimeTrackerSettingsComplete(incompleteSettings)).toBe(false);
        });

        it("baseProjectIdが0の場合はfalseを返す", () => {
            const incompleteSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 0,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
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

            expect(isTimeTrackerSettingsComplete(incompleteSettings)).toBe(false);
        });
    });

    describe("generateHelpText", () => {
        it("ヘルプテキストを生成できる", () => {
            const helpText = generateHelpText();
            expect(typeof helpText).toBe("string");
            expect(helpText.length).toBeGreaterThan(0);
        });

        it("timetrackerの設定項目が含まれる", () => {
            const helpText = generateHelpText();
            expect(helpText).toContain("TimeTracker設定");
            expect(helpText).toContain("timetracker");
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
});
