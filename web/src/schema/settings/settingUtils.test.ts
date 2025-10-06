import { describe, expect, it } from "vitest";
import { getFieldDefaultValue, updateErrorValue } from "./settingUtils";
import {
    ArraySettingValueInfo,
    BooleanSettingValueInfo,
    NumberSettingValueInfo,
    ObjectSettingValueInfo,
    StringSettingValueInfo,
} from "./settingsDefinition";

describe("settingUtils", () => {
    describe("getFieldDefaultValue", () => {
        describe("基本動作", () => {
            it("デフォルト値が設定されている場合、そのデフォルト値を返す", () => {
                const info = new StringSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: true,
                    defaultValue: "default-value",
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBe("default-value");
            });

            it("デフォルト値が設定されていない場合、undefinedを返す", () => {
                const info = new StringSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: true,
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBeUndefined();
            });
        });

        describe("オブジェクト型の処理", () => {
            it("子要素のデフォルト値を含むオブジェクトを返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        field1: new StringSettingValueInfo({
                            name: "field1",
                            description: "Field 1",
                            required: true,
                            defaultValue: "value1",
                        }),
                        field2: new NumberSettingValueInfo({
                            name: "field2",
                            description: "Field 2",
                            required: true,
                            defaultValue: 42,
                        }),
                    },
                });

                const result = getFieldDefaultValue(info);
                expect(result).toEqual({
                    field1: "value1",
                    field2: 42,
                });
            });

            it("子要素にデフォルト値がない場合、undefinedを返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        field1: new StringSettingValueInfo({
                            name: "field1",
                            description: "Field 1",
                            required: true,
                        }),
                    },
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBeUndefined();
            });

            it("ネストされたオブジェクトのデフォルト値を再帰的に取得する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        nested: new ObjectSettingValueInfo({
                            name: "nested",
                            description: "Nested object",
                            required: true,
                            children: {
                                deepField: new StringSettingValueInfo({
                                    name: "deepField",
                                    description: "Deep field",
                                    required: true,
                                    defaultValue: "deep-value",
                                }),
                            },
                        }),
                    },
                });

                const result = getFieldDefaultValue(info);
                expect(result).toEqual({
                    nested: {
                        deepField: "deep-value",
                    },
                });
            });
        });

        describe("各型のデフォルト値", () => {
            it("Boolean型のデフォルト値を取得する", () => {
                const info = new BooleanSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: true,
                    defaultValue: true,
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBe(true);
            });

            it("Number型のデフォルト値を取得する", () => {
                const info = new NumberSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: true,
                    defaultValue: 100,
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBe(100);
            });

            it("Array型のデフォルト値がない場合はundefinedを返す", () => {
                const info = new ArraySettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: true,
                    itemType: "string",
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBeUndefined();
            });
        });
    });

    describe("updateErrorValue", () => {
        describe("基本動作", () => {
            it("正常なオブジェクトはそのまま返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        field1: new StringSettingValueInfo({
                            name: "field1",
                            description: "Field 1",
                            required: true,
                        }),
                    },
                });

                const value = { field1: "valid-value" };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ field1: "valid-value" });
            });

            it("オブジェクトでない値が渡された場合、空オブジェクトを返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {},
                });

                expect(updateErrorValue("string" as any, info)).toEqual({});
                expect(updateErrorValue(123 as any, info)).toEqual({});
                expect(updateErrorValue(null as any, info)).toEqual({});
                expect(updateErrorValue([] as any, info)).toEqual({});
            });

            it("子要素の定義がない場合、そのまま返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                });

                const value = { anyField: "value" };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ anyField: "value" });
            });
        });

        describe("エラーフィールドの修正", () => {
            it("不正な文字列フィールドをデフォルト値に置き換える", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        url: new StringSettingValueInfo({
                            name: "url",
                            description: "URL field",
                            required: true,
                            defaultValue: "https://default.com",
                            isUrl: true,
                        }),
                    },
                });

                const value = { url: "invalid-url" };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ url: "https://default.com" });
            });

            it("不正な数値フィールドをデフォルト値に置き換える", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        count: new NumberSettingValueInfo({
                            name: "count",
                            description: "Count field",
                            required: true,
                            defaultValue: 10,
                            positive: true,
                        }),
                    },
                });

                const value = { count: -5 };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ count: 10 });
            });

            it("不正な数値と文字列フィールドを修正する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        count: new NumberSettingValueInfo({
                            name: "count",
                            description: "Count field",
                            required: true,
                            defaultValue: 10,
                            positive: true,
                        }),
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Name field",
                            required: true,
                            defaultValue: "default-name",
                            minLength: 3,
                        }),
                    },
                });

                const value = { count: -5, name: "ab" };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ count: 10, name: "default-name" });
            });

            it("複数の不正なフィールドを修正する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        url: new StringSettingValueInfo({
                            name: "url",
                            description: "URL field",
                            required: true,
                            defaultValue: "https://default.com",
                            isUrl: true,
                        }),
                        count: new NumberSettingValueInfo({
                            name: "count",
                            description: "Count field",
                            required: true,
                            defaultValue: 10,
                            positive: true,
                        }),
                        validField: new StringSettingValueInfo({
                            name: "validField",
                            description: "Valid field",
                            required: true,
                        }),
                    },
                });

                const value = {
                    url: "invalid-url",
                    count: -5,
                    validField: "stays-valid",
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    url: "https://default.com",
                    count: 10,
                    validField: "stays-valid",
                });
            });
        });

        describe("必須フィールドの補完", () => {
            it("欠落している必須フィールドにデフォルト値を設定する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        requiredField: new StringSettingValueInfo({
                            name: "requiredField",
                            description: "Required field",
                            required: true,
                            defaultValue: "default-value",
                        }),
                    },
                });

                const value = {};
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ requiredField: "default-value" });
            });

            it("欠落しているオプションフィールドは設定しない", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        optionalField: new StringSettingValueInfo({
                            name: "optionalField",
                            description: "Optional field",
                            required: false,
                            defaultValue: "default-value",
                        }),
                    },
                });

                const value = {};
                const result = updateErrorValue(value, info);
                expect(result).toEqual({});
            });

            it("nullの必須フィールドにデフォルト値を設定する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        requiredField: new StringSettingValueInfo({
                            name: "requiredField",
                            description: "Required field",
                            required: true,
                            defaultValue: "default-value",
                        }),
                    },
                });

                const value = { requiredField: null };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ requiredField: "default-value" });
            });
        });

        describe("ネストされたオブジェクトの処理", () => {
            it("ネストされたオブジェクトのエラーを再帰的に修正する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        nested: new ObjectSettingValueInfo({
                            name: "nested",
                            description: "Nested object",
                            required: true,
                            children: {
                                url: new StringSettingValueInfo({
                                    name: "url",
                                    description: "URL field",
                                    required: true,
                                    defaultValue: "https://default.com",
                                    isUrl: true,
                                }),
                            },
                        }),
                    },
                });

                const value = {
                    nested: {
                        url: "invalid-url",
                    },
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    nested: {
                        url: "https://default.com",
                    },
                });
            });

            it("深くネストされたオブジェクトのエラーを修正する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        level1: new ObjectSettingValueInfo({
                            name: "level1",
                            description: "Level 1",
                            required: true,
                            children: {
                                level2: new ObjectSettingValueInfo({
                                    name: "level2",
                                    description: "Level 2",
                                    required: true,
                                    children: {
                                        count: new NumberSettingValueInfo({
                                            name: "count",
                                            description: "Count field",
                                            required: true,
                                            defaultValue: 100,
                                            positive: true,
                                        }),
                                    },
                                }),
                            },
                        }),
                    },
                });

                const value = {
                    level1: {
                        level2: {
                            count: -10,
                        },
                    },
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    level1: {
                        level2: {
                            count: 100,
                        },
                    },
                });
            });

            it("ネストされたオブジェクトの型が完全に違う場合、デフォルト値を使用する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        nested: new ObjectSettingValueInfo({
                            name: "nested",
                            description: "Nested object",
                            required: true,
                            defaultValue: { url: "https://default.com" },
                            children: {
                                url: new StringSettingValueInfo({
                                    name: "url",
                                    description: "URL field",
                                    required: true,
                                    defaultValue: "https://default.com",
                                }),
                            },
                        }),
                    },
                });

                const value = {
                    nested: "invalid-type",
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    nested: { url: "https://default.com" },
                });
            });

            it("ネストされたオブジェクトで正常なフィールドと不正なフィールドが混在する場合", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        nested: new ObjectSettingValueInfo({
                            name: "nested",
                            description: "Nested object",
                            required: true,
                            children: {
                                validField: new StringSettingValueInfo({
                                    name: "validField",
                                    description: "Valid field",
                                    required: true,
                                }),
                                invalidUrl: new StringSettingValueInfo({
                                    name: "invalidUrl",
                                    description: "Invalid URL field",
                                    required: true,
                                    defaultValue: "https://default.com",
                                    isUrl: true,
                                }),
                            },
                        }),
                    },
                });

                const value = {
                    nested: {
                        validField: "stays-valid",
                        invalidUrl: "not-a-url",
                    },
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    nested: {
                        validField: "stays-valid",
                        invalidUrl: "https://default.com",
                    },
                });
            });
        });

        describe("未定義フィールドの処理", () => {
            it("定義されていないフィールドは結果に含めない", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        knownField: new StringSettingValueInfo({
                            name: "knownField",
                            description: "Known field",
                            required: true,
                        }),
                    },
                });

                const value = {
                    knownField: "value",
                    unknownField: "should-be-removed",
                };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ knownField: "value" });
            });
        });

        describe("実践的なユースケース", () => {
            it("複雑な設定オブジェクトの部分的な修正", () => {
                const info = new ObjectSettingValueInfo({
                    name: "appSettings",
                    description: "Application settings",
                    required: true,
                    children: {
                        apiUrl: new StringSettingValueInfo({
                            name: "apiUrl",
                            description: "API URL",
                            required: true,
                            defaultValue: "https://api.example.com",
                            isUrl: true,
                        }),
                        timeout: new NumberSettingValueInfo({
                            name: "timeout",
                            description: "Timeout in seconds",
                            required: true,
                            defaultValue: 30,
                            positive: true,
                        }),
                        features: new ObjectSettingValueInfo({
                            name: "features",
                            description: "Feature flags",
                            required: true,
                            children: {
                                enableLogging: new BooleanSettingValueInfo({
                                    name: "enableLogging",
                                    description: "Enable logging",
                                    required: true,
                                    defaultValue: true,
                                }),
                                maxRetries: new NumberSettingValueInfo({
                                    name: "maxRetries",
                                    description: "Max retries",
                                    required: true,
                                    defaultValue: 3,
                                    positive: true,
                                }),
                            },
                        }),
                    },
                });

                const value = {
                    apiUrl: "not-a-valid-url",
                    timeout: 60,
                    features: {
                        enableLogging: true,
                        maxRetries: -1,
                    },
                    unknownField: "removed",
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    apiUrl: "https://api.example.com",
                    timeout: 60,
                    features: {
                        enableLogging: true,
                        maxRetries: 3,
                    },
                });
            });

            it("必須フィールドが欠落している設定を補完する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "config",
                    description: "Configuration",
                    required: true,
                    children: {
                        apiUrl: new StringSettingValueInfo({
                            name: "apiUrl",
                            description: "API URL",
                            required: true,
                            defaultValue: "https://api.example.com",
                        }),
                        timeout: new NumberSettingValueInfo({
                            name: "timeout",
                            description: "Timeout",
                            required: true,
                            defaultValue: 30,
                        }),
                        optionalField: new StringSettingValueInfo({
                            name: "optionalField",
                            description: "Optional field",
                            required: false,
                        }),
                    },
                });

                const value = {
                    timeout: 60,
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    apiUrl: "https://api.example.com",
                    timeout: 60,
                });
            });
        });

        describe("エッジケース", () => {
            it("デフォルト値がない不正なフィールドは削除される", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        field: new StringSettingValueInfo({
                            name: "field",
                            description: "Field without default",
                            required: true,
                            minLength: 5,
                        }),
                    },
                });

                const value = { field: "ab" };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({});
            });

            it("空のオブジェクトの処理", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        field: new StringSettingValueInfo({
                            name: "field",
                            description: "Field",
                            required: true,
                            defaultValue: "default",
                        }),
                    },
                });

                const value = {};
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ field: "default" });
            });
        });
    });
});
