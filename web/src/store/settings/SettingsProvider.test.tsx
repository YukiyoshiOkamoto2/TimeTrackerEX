/**
 * Settings Provider Tests
 *
 * SettingsProviderで使用される機能(スキーマ、バリデーション)のテストです。
 */

import { APP_SETTINGS_DEFINITION, getFieldDefaultValue, updateErrorValue } from "@/schema";
import type { AppSettings } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStorage } from "../../lib/storage";

// ストレージのモック
vi.mock("../../lib/storage", () => ({
    getStorage: vi.fn(),
}));

// MessageDialogのモック
vi.mock("@/components/message-dialog", () => ({
    appMessageDialogRef: {
        showMessageAsync: vi.fn(),
    },
}));

describe("SettingsProvider - Core Logic", () => {
    let mockStorage: {
        getValue: ReturnType<typeof vi.fn>;
        setValue: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        // ストレージモックの初期化
        mockStorage = {
            getValue: vi.fn(),
            setValue: vi.fn().mockReturnValue(true),
        };
        vi.mocked(getStorage).mockReturnValue(mockStorage as any);
    });

    describe("getFieldDefaultValue with APP_SETTINGS_DEFINITION", () => {
        it("デフォルト設定を生成できる", () => {
            const defaults = getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;

            expect(defaults).toBeDefined();
            expect(defaults.timetracker).toBeDefined();
            expect(defaults.appearance).toBeDefined();
        });

        it("デフォルト設定にtimetrackerとappearanceが含まれる", () => {
            const defaults = getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;

            // トップレベルのオブジェクトが存在すること
            expect(defaults.timetracker).toBeDefined();
            expect(defaults.appearance).toBeDefined();
            expect(typeof defaults.timetracker).toBe("object");
            expect(typeof defaults.appearance).toBe("object");
        });

        it("デフォルト設定のappearanceにthemeが設定されている", () => {
            const defaults = getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;

            // appearance.themeはデフォルト値が設定されている
            expect(defaults.appearance.theme).toBeDefined();
            expect(typeof defaults.appearance.theme).toBe("string");
        });
    });

    describe("updateErrorValue with APP_SETTINGS_DEFINITION", () => {
        it("正しい設定はそのまま返される", () => {
            const validSettings: AppSettings = {
                timetracker: {
                    userName: "testuser",
                    baseUrl: "https://test.example.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: "round",
                    eventDuplicatePriority: {
                        timeCompare: "small",
                    },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "round",
                        startEndTime: 0,
                        workItemId: 0,
                    },
                },
                appearance: {
                    theme: "dark",
                },
            };

            const result = updateErrorValue(
                validSettings as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            expect(result.timetracker.userName).toBe("testuser");
            expect(result.timetracker.baseProjectId).toBe(123);
            expect(result.appearance.theme).toBe("dark");
        });

        it("部分的に欠けた設定でもオブジェクト構造は維持される", () => {
            const incompleteSettings = {
                timetracker: {
                    userName: "testuser",
                    // 他のフィールドが欠けている
                },
                appearance: {},
            };

            const result = updateErrorValue(
                incompleteSettings as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            expect(result.timetracker).toBeDefined();
            expect(result.timetracker.userName).toBe("testuser"); // 既存の値は保持
            expect(result.appearance).toBeDefined();
            expect(result.appearance.theme).toBeDefined(); // デフォルト値で補完
        });

        it("不正な型の値はバリデーションで処理される", () => {
            const invalidSettings = {
                timetracker: {
                    userName: 12345, // 数値 (本来は文字列)
                    baseUrl: "https://test.com",
                    baseProjectId: "invalid", // 文字列 (本来は数値)
                    roundingTimeTypeOfEvent: 123, // 数値 (本来は文字列)
                },
                appearance: {
                    theme: 123, // 数値 (本来は文字列)
                },
            };

            const result = updateErrorValue(
                invalidSettings as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            // バリデーション後、オブジェクト構造は維持される
            expect(result.timetracker).toBeDefined();
            expect(result.appearance).toBeDefined();
            expect(typeof result.appearance.theme).toBe("string");
        });

        it("空のオブジェクトからでもオブジェクト構造を生成できる", () => {
            const emptySettings = {};

            const result = updateErrorValue(
                emptySettings as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            expect(result.timetracker).toBeDefined();
            expect(result.appearance).toBeDefined();
            expect(typeof result.timetracker).toBe("object");
            expect(typeof result.appearance).toBe("object");
            expect(result.appearance.theme).toBeDefined(); // デフォルト値が設定されているフィールド
        });
    });

    describe("JSON シリアライズ/デシリアライズ", () => {
        it("設定をJSONに変換して復元できる", () => {
            const originalSettings = getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;

            // JSON化
            const jsonString = JSON.stringify(originalSettings);
            expect(jsonString).toBeDefined();

            // パース
            const parsed = JSON.parse(jsonString);
            expect(parsed).toBeDefined();

            // バリデーション
            const validated = updateErrorValue(
                parsed as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            expect(validated.timetracker).toBeDefined();
            expect(validated.appearance).toBeDefined();
        });

        it("部分的なJSONからもバリデーションで構造を復元できる", () => {
            const malformedJson = '{"timetracker":{"userName":"test"},"appearance":{}}';
            const parsed = JSON.parse(malformedJson);

            const validated = updateErrorValue(
                parsed as unknown as Record<string, unknown>,
                APP_SETTINGS_DEFINITION,
            ) as unknown as AppSettings;

            expect(validated.timetracker).toBeDefined();
            expect(validated.timetracker.userName).toBe("test");
            expect(validated.appearance).toBeDefined();
            expect(validated.appearance.theme).toBeDefined(); // デフォルト値で補完
        });
    });

    describe("ストレージ操作", () => {
        it("ストレージから値を取得できる", () => {
            const testSettings: AppSettings = {
                timetracker: {
                    userName: "storeduser",
                    baseUrl: "https://stored.com",
                    baseProjectId: 999,
                    roundingTimeTypeOfEvent: "round",
                    eventDuplicatePriority: {
                        timeCompare: "small",
                    },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "round",
                        startEndTime: 0,
                        workItemId: 0,
                    },
                },
                appearance: {
                    theme: "light",
                },
            };

            mockStorage.getValue.mockReturnValue(JSON.stringify(testSettings));

            const stored = mockStorage.getValue("settings");
            expect(stored).toBeDefined();

            const parsed = JSON.parse(stored as string);
            expect(parsed.timetracker.userName).toBe("storeduser");
            expect(parsed.appearance.theme).toBe("light");
        });

        it("ストレージに値を保存できる", () => {
            const settings = getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;
            const jsonString = JSON.stringify(settings);

            const success = mockStorage.setValue("settings", jsonString);
            expect(success).toBe(true);
            expect(mockStorage.setValue).toHaveBeenCalledWith("settings", jsonString);
        });

        it("ストレージに値がない場合、nullを返す", () => {
            mockStorage.getValue.mockReturnValue(null);

            const stored = mockStorage.getValue("settings");
            expect(stored).toBeNull();
        });
    });

    describe("設定の部分更新", () => {
        it("既存の設定を部分的に更新できる", () => {
            const currentSettings: AppSettings = {
                timetracker: {
                    userName: "original",
                    baseUrl: "https://original.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: "round",
                    eventDuplicatePriority: {
                        timeCompare: "small",
                    },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "round",
                        startEndTime: 0,
                        workItemId: 0,
                    },
                },
                appearance: {
                    theme: "dark",
                },
            };

            const updates: Partial<AppSettings> = {
                appearance: {
                    theme: "light",
                },
            };

            const updated = { ...currentSettings, ...updates };

            expect(updated.appearance.theme).toBe("light");
            expect(updated.timetracker.userName).toBe("original"); // 変更なし
        });
    });
});
