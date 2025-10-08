import { describe, expect, it } from "vitest";
import { GENERAL_SETTINGS_DEFINITION } from "./generalDefinition";

describe("generalDefinition", () => {
    describe("GENERAL_SETTINGS_DEFINITION", () => {
        it("定義が存在する", () => {
            expect(GENERAL_SETTINGS_DEFINITION).toBeDefined();
            expect(GENERAL_SETTINGS_DEFINITION.name).toBe("一般設定");
        });

        it("すべての必須フィールドが定義されている", () => {
            expect(GENERAL_SETTINGS_DEFINITION.children).toBeDefined();
            expect(GENERAL_SETTINGS_DEFINITION.children!.language).toBeDefined();
        });

        it("language フィールドが正しく設定されている", () => {
            const languageField = GENERAL_SETTINGS_DEFINITION.children!.language;
            expect(languageField.name).toBe("言語");
            expect(languageField.required).toBe(true);
            expect(languageField.defaultValue).toBe("ja");
        });
    });

    describe("validateGeneralSettings", () => {
        it("有効な設定を受け入れる", () => {
            const validSettings = {
                language: "ja",
            };

            const result = GENERAL_SETTINGS_DEFINITION.validate(validSettings);
            expect(result.isError).toBe(false);
        });

        it("必須フィールドが欠けている場合に拒否する", () => {
            const invalidSettings = {};

            const result = GENERAL_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("型が正しくない場合に拒否する", () => {
            const invalidSettings = {
                language: 123, // 数値（文字列であるべき）
            };

            const result = GENERAL_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("許可されていない言語を拒否する", () => {
            const invalidSettings = {
                language: "en", // literalsに含まれていない
            };

            const result = GENERAL_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorPathInfo.message).toContain("言語");
            }
        });

        it("未定義のフィールドを拒否する（disableUnknownField=true）", () => {
            const invalidSettings = {
                language: "ja",
                unknownField: "value",
            };

            const result = GENERAL_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorPathInfo.message).toContain("不明なフィールド");
            }
        });
    });

    describe("validatePartialGeneralSettings", () => {
        it("部分的な更新を受け入れる", () => {
            const partialSettings = {
                language: "ja",
            };

            const result = GENERAL_SETTINGS_DEFINITION.validatePartial(partialSettings);
            expect(result.isError).toBe(false);
        });

        it("空のオブジェクトを受け入れる", () => {
            const emptySettings = {};

            const result = GENERAL_SETTINGS_DEFINITION.validatePartial(emptySettings);
            expect(result.isError).toBe(false);
        });

        it("不正な値を拒否する", () => {
            const invalidSettings = {
                language: 123,
            };

            const result = GENERAL_SETTINGS_DEFINITION.validatePartial(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("未定義のフィールドを拒否する", () => {
            const invalidSettings = {
                unknownField: "value",
            };

            const result = GENERAL_SETTINGS_DEFINITION.validatePartial(invalidSettings);
            expect(result.isError).toBe(true);
        });
    });

    describe("実践的なユースケース", () => {
        it("UIでのlanguage変更シナリオ", () => {
            // 初期状態
            const initialSettings = {
                language: "ja",
            };

            const initialResult = GENERAL_SETTINGS_DEFINITION.validate(initialSettings);
            expect(initialResult.isError).toBe(false);

            // 言語変更（部分更新）
            const updateSettings = {
                language: "ja", // 現状はjaのみサポート
            };

            const updateResult = GENERAL_SETTINGS_DEFINITION.validatePartial(updateSettings);
            expect(updateResult.isError).toBe(false);
        });

        it("設定の完全な置き換えシナリオ", () => {
            const newSettings = {
                language: "ja",
            };

            const result = GENERAL_SETTINGS_DEFINITION.validate(newSettings);
            expect(result.isError).toBe(false);
        });
    });
});
