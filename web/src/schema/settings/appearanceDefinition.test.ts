/**
 * Appearance Settings Definition Tests
 *
 * 外観設定定義のユニットテストです。
 */

import type { AppearanceSettings, ThemeMode } from "@/types/settings";
import { describe, expect, it } from "vitest";
import { APPEARANCE_SETTINGS_DEFINITION } from "./appearanceDefinition";

describe("appearanceDefinition", () => {
    describe("APPEARANCE_SETTINGS_DEFINITION", () => {
        it("定義が存在する", () => {
            expect(APPEARANCE_SETTINGS_DEFINITION).toBeDefined();
            expect(APPEARANCE_SETTINGS_DEFINITION.type).toBe("object");
            expect(APPEARANCE_SETTINGS_DEFINITION.name).toBe("外観設定");
        });

        it("すべての必須フィールドが定義されている", () => {
            const children = APPEARANCE_SETTINGS_DEFINITION.children;
            expect(children).toBeDefined();
            expect(children?.theme).toBeDefined();
        });
    });

    describe("validate - 完全なバリデーション", () => {
        it("有効な設定を受け入れる(light)", () => {
            const settings: AppearanceSettings = {
                theme: "light",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(false);
        });

        it("有効な設定を受け入れる(dark)", () => {
            const settings: AppearanceSettings = {
                theme: "dark",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(false);
        });

        it("有効な設定を受け入れる(system)", () => {
            const settings: AppearanceSettings = {
                theme: "system",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(false);
        });

        it("不正なテーマ値を拒否する", () => {
            const settings: AppearanceSettings = {
                theme: "invalid" as ThemeMode,
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(true);
        });

        it("必須フィールドの欠落を検出する", () => {
            const settings = {};
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(true);
        });

        it("不明なフィールドを拒否する", () => {
            const settings = {
                theme: "light",
                unknownField: "value",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(settings);
            expect(result.isError).toBe(true);
        });

        it("nullを拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(null);
            expect(result.isError).toBe(true);
        });

        it("undefinedを拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validate(undefined);
            expect(result.isError).toBe(true);
        });

        it("配列を拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validate([]);
            expect(result.isError).toBe(true);
        });

        it("プリミティブ値を拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validate("string");
            expect(result.isError).toBe(true);
        });
    });

    describe("validatePartial - 部分的なバリデーション", () => {
        it("正しい部分設定を受け入れる(theme)", () => {
            const partial = {
                theme: "dark",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(partial);
            expect(result.isError).toBe(false);
        });

        it("空オブジェクトを受け入れる", () => {
            const partial = {};
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(partial);
            expect(result.isError).toBe(false);
        });

        it("不正なテーマ値を拒否する", () => {
            const partial = {
                theme: "invalid-theme",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(partial);
            expect(result.isError).toBe(true);
        });

        it("不明なフィールドを拒否する", () => {
            const partial = {
                unknownField: "value",
            };
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(partial);
            expect(result.isError).toBe(true);
        });

        it("nullを拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(null as unknown as Record<string, unknown>);
            expect(result.isError).toBe(true);
        });

        it("undefinedを拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(
                undefined as unknown as Record<string, unknown>,
            );
            expect(result.isError).toBe(true);
        });

        it("配列を拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial([] as unknown as Record<string, unknown>);
            expect(result.isError).toBe(true);
        });

        it("プリミティブ値を拒否する", () => {
            const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(123 as unknown as Record<string, unknown>);
            expect(result.isError).toBe(true);
        });
    });

    describe("設定定義の構造", () => {
        it("正しい名前を持つ", () => {
            expect(APPEARANCE_SETTINGS_DEFINITION.name).toBe("外観設定");
        });

        it("必須フラグが設定されている", () => {
            expect(APPEARANCE_SETTINGS_DEFINITION.required).toBe(true);
        });

        it("不明フィールド無効化が設定されている", () => {
            expect(APPEARANCE_SETTINGS_DEFINITION.disableUnknownField).toBe(true);
        });
    });
});
