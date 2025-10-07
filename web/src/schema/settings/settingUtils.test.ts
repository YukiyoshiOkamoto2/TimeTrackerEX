import { describe, expect, it } from "vitest";
import { getFieldDefaultValue, getSettingErrors, updateErrorValue } from "./settingUtils";
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

            it("Array型のデフォルト値が設定されている場合は返す", () => {
                const info = new ArraySettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: false,
                    defaultValue: ["item1", "item2"] as unknown as [],
                    itemType: "string",
                });

                const result = getFieldDefaultValue(info);
                expect(result).toEqual(["item1", "item2"]);
            });

            it("Boolean型でfalseのデフォルト値も取得できる", () => {
                const info = new BooleanSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: false,
                    defaultValue: false,
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBe(false);
            });

            it("Number型で0のデフォルト値も取得できる", () => {
                const info = new NumberSettingValueInfo({
                    name: "test",
                    description: "Test field",
                    required: false,
                    defaultValue: 0,
                });

                const result = getFieldDefaultValue(info);
                expect(result).toBe(0);
            });
        });

        describe("複雑なネスト構造", () => {
            it("配列を含むオブジェクトのデフォルト値を取得する", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Name",
                            required: true,
                            defaultValue: "default-name",
                        }),
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items",
                            required: false,
                            defaultValue: ["a", "b"] as unknown as [],
                            itemType: "string",
                        }),
                    },
                });

                const result = getFieldDefaultValue(info);
                expect(result).toEqual({
                    name: "default-name",
                    items: ["a", "b"],
                });
            });

            it("一部の子要素のみデフォルト値がある場合", () => {
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
                        field2: new StringSettingValueInfo({
                            name: "field2",
                            description: "Field 2",
                            required: true,
                        }),
                        field3: new NumberSettingValueInfo({
                            name: "field3",
                            description: "Field 3",
                            required: false,
                            defaultValue: 42,
                        }),
                    },
                });

                const result = getFieldDefaultValue(info);
                expect(result).toEqual({
                    field1: "value1",
                    field3: 42,
                });
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

        describe("配列型フィールドのエラー項目削除", () => {
            it("オブジェクト配列内の不正な項目を削除し、正常な項目のみを残す", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Array item",
                    required: true,
                    children: {
                        id: new NumberSettingValueInfo({
                            name: "id",
                            description: "Item ID",
                            required: true,
                            positive: true,
                        }),
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Item name",
                            required: true,
                            minLength: 3,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                        }),
                    },
                });

                const value = {
                    items: [
                        { id: 1, name: "valid-item" },
                        { id: -1, name: "invalid-id" }, // 不正: idが負の数
                        { id: 2, name: "ab" }, // 不正: nameが短すぎる
                        { id: 3, name: "another-valid" },
                    ],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: [
                        { id: 1, name: "valid-item" },
                        { id: 3, name: "another-valid" },
                    ],
                });
            });

            it("すべての項目が不正な場合、空配列を返す", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Array item",
                    required: true,
                    children: {
                        id: new NumberSettingValueInfo({
                            name: "id",
                            description: "Item ID",
                            required: true,
                            positive: true,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                        }),
                    },
                });

                const value = {
                    items: [{ id: -1 }, { id: -2 }, { id: -3 }],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: [],
                });
            });

            it("すべての項目が正常な場合、元の配列をそのまま返す", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Array item",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Item name",
                            required: true,
                            minLength: 3,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                        }),
                    },
                });

                const value = {
                    items: [{ name: "valid" }, { name: "also-valid" }, { name: "still-valid" }],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: [{ name: "valid" }, { name: "also-valid" }, { name: "still-valid" }],
                });
            });

            it("itemSchemaがない配列はそのまま返す", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "string",
                        }),
                    },
                });

                const value = {
                    items: ["any", "value", "allowed"],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: ["any", "value", "allowed"],
                });
            });

            it("配列型フィールドの値が配列でない場合、デフォルト値を使用する", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Item object",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Item name",
                            required: true,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                            defaultValue: [],
                        }),
                    },
                });

                const value = {
                    items: "not-an-array",
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: [],
                });
            });

            it("ネストされたオブジェクト配列で不正な項目を削除する", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "user",
                    description: "User object",
                    required: true,
                    children: {
                        id: new NumberSettingValueInfo({
                            name: "id",
                            description: "User ID",
                            required: true,
                            positive: true,
                        }),
                        email: new StringSettingValueInfo({
                            name: "email",
                            description: "User email",
                            required: true,
                            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "age",
                            description: "User age",
                            required: true,
                            min: 0,
                            max: 150,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        users: new ArraySettingValueInfo({
                            name: "users",
                            description: "Users array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                        }),
                    },
                });

                const value = {
                    users: [
                        { id: 1, email: "user1@example.com", age: 25 },
                        { id: -1, email: "user2@example.com", age: 30 }, // 不正: idが負
                        { id: 2, email: "invalid-email", age: 35 }, // 不正: emailが無効
                        { id: 3, email: "user3@example.com", age: 200 }, // 不正: ageが範囲外
                        { id: 4, email: "user4@example.com", age: 40 },
                    ],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    users: [
                        { id: 1, email: "user1@example.com", age: 25 },
                        { id: 4, email: "user4@example.com", age: 40 },
                    ],
                });
            });

            it("複数の配列フィールドを同時に処理する", () => {
                const itemSchema1 = new ObjectSettingValueInfo({
                    name: "tagItem",
                    description: "Tag item",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Tag name",
                            required: true,
                            minLength: 3,
                        }),
                    },
                });

                const itemSchema2 = new ObjectSettingValueInfo({
                    name: "scoreItem",
                    description: "Score item",
                    required: true,
                    children: {
                        value: new NumberSettingValueInfo({
                            name: "value",
                            description: "Score value",
                            required: true,
                            positive: true,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        tags: new ArraySettingValueInfo({
                            name: "tags",
                            description: "Tags array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema1,
                        }),
                        scores: new ArraySettingValueInfo({
                            name: "scores",
                            description: "Scores array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema2,
                        }),
                    },
                });

                const value = {
                    tags: [{ name: "valid" }, { name: "ab" }, { name: "also-valid" }],
                    scores: [{ value: 10 }, { value: -5 }, { value: 20 }, { value: -3 }, { value: 30 }],
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    tags: [{ name: "valid" }, { name: "also-valid" }],
                    scores: [{ value: 10 }, { value: 20 }, { value: 30 }],
                });
            });

            it("配列フィールドと通常フィールドが混在する場合", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Item object",
                    required: true,
                    children: {
                        title: new StringSettingValueInfo({
                            name: "title",
                            description: "Item title",
                            required: true,
                            minLength: 5,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Name field",
                            required: true,
                            defaultValue: "default-name",
                            minLength: 3,
                        }),
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items array",
                            required: true,
                            itemType: "object",
                            itemSchema: itemSchema,
                        }),
                        count: new NumberSettingValueInfo({
                            name: "count",
                            description: "Count field",
                            required: true,
                            defaultValue: 10,
                            positive: true,
                        }),
                    },
                });

                const value = {
                    name: "ab", // 不正: 短すぎる
                    items: [{ title: "valid-item" }, { title: "bad" }, { title: "another-valid" }],
                    count: -5, // 不正: 負の数
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    name: "default-name",
                    items: [{ title: "valid-item" }, { title: "another-valid" }],
                    count: 10,
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

            it("値がundefinedのフィールドは必須の場合のみデフォルト値を設定", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        requiredField: new StringSettingValueInfo({
                            name: "requiredField",
                            description: "Required field",
                            required: true,
                            defaultValue: "required-default",
                        }),
                        optionalField: new StringSettingValueInfo({
                            name: "optionalField",
                            description: "Optional field",
                            required: false,
                            defaultValue: "optional-default",
                        }),
                    },
                });

                const value = { requiredField: undefined, optionalField: undefined };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ requiredField: "required-default" });
            });
        });

        describe("配列型フィールドのminItems/maxItems制約", () => {
            it("minItemsを満たさない配列はデフォルト値に置き換えられる", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items",
                            required: true,
                            defaultValue: ["default1", "default2", "default3"] as unknown as [],
                            itemType: "string",
                            minItems: 3,
                        }),
                    },
                });

                // 有効な要素が2つだけでminItems=3を満たさない
                const value = { items: ["valid1", "valid2"] };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: ["default1", "default2", "default3"],
                });
            });

            it("maxItemsを超える配列は要素削除後も超える場合デフォルト値に", () => {
                const itemSchema = new StringSettingValueInfo({
                    name: "item",
                    description: "Item",
                    required: true,
                    minLength: 3,
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items",
                            required: true,
                            defaultValue: ["def"] as unknown as [],
                            itemType: "string",
                            itemSchema,
                            maxItems: 2,
                        }),
                    },
                });

                // 5要素中3要素が有効だが、maxItems=2を超える
                const value = { items: ["abc", "x", "def", "y", "ghi"] };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    items: ["def"],
                });
            });

            it("不正な要素を削除後minItems/maxItems制約を満たす場合はOK", () => {
                const itemSchema = new NumberSettingValueInfo({
                    name: "item",
                    description: "Item",
                    required: true,
                    positive: true,
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        scores: new ArraySettingValueInfo({
                            name: "scores",
                            description: "Scores",
                            required: true,
                            defaultValue: [1, 2, 3] as unknown as [],
                            itemType: "number",
                            itemSchema,
                            minItems: 2,
                            maxItems: 5,
                        }),
                    },
                });

                // 5要素中3要素が有効(正の数)で、minItems=2, maxItems=5を満たす
                const value = { scores: [10, -5, 20, 0, 30] };
                const result = updateErrorValue(value, info);
                expect(result.scores).toEqual([10, 20, 30]);
            });
        });

        describe("配列内のオブジェクト処理の詳細", () => {
            it("配列内オブジェクトの一部フィールドだけが不正な場合も要素全体を削除", () => {
                const itemSchema = new ObjectSettingValueInfo({
                    name: "user",
                    description: "User",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Name",
                            required: true,
                            minLength: 2,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "age",
                            description: "Age",
                            required: true,
                            positive: true,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        users: new ArraySettingValueInfo({
                            name: "users",
                            description: "Users",
                            required: true,
                            defaultValue: [] as unknown as [],
                            itemType: "object",
                            itemSchema,
                        }),
                    },
                });

                const value = {
                    users: [
                        { name: "John", age: 25 }, // OK
                        { name: "X", age: 30 }, // NG: name too short
                        { name: "Jane", age: -5 }, // NG: age negative
                        { name: "Bob", age: 40 }, // OK
                    ],
                };

                const result = updateErrorValue(value, info);
                expect(result.users).toEqual([
                    { name: "John", age: 25 },
                    { name: "Bob", age: 40 },
                ]);
            });

            it("ネストされた配列の処理", () => {
                const tagSchema = new StringSettingValueInfo({
                    name: "tag",
                    description: "Tag",
                    required: true,
                    minLength: 1,
                });

                const itemSchema = new ObjectSettingValueInfo({
                    name: "item",
                    description: "Item",
                    required: true,
                    children: {
                        title: new StringSettingValueInfo({
                            name: "title",
                            description: "Title",
                            required: true,
                        }),
                        tags: new ArraySettingValueInfo({
                            name: "tags",
                            description: "Tags",
                            required: false,
                            itemType: "string",
                            itemSchema: tagSchema,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        items: new ArraySettingValueInfo({
                            name: "items",
                            description: "Items",
                            required: true,
                            defaultValue: [] as unknown as [],
                            itemType: "object",
                            itemSchema,
                        }),
                    },
                });

                // itemSchemaはオブジェクト全体をチェックするが、
                // 配列内のネストした配列(tags)は個別には修正されない
                const value = {
                    items: [
                        { title: "Item1", tags: ["valid", ""] }, // tagsに空文字
                        { title: "Item2", tags: ["good"] },
                    ],
                };

                const result = updateErrorValue(value, info);
                // オブジェクト単位でバリデーションされるため、
                // tagsに不正な要素があればアイテム全体が削除される
                expect(result.items).toHaveLength(1);
                expect(result.items).toEqual([{ title: "Item2", tags: ["good"] }]);
            });
        });

        describe("Boolean型とNumber型の特殊値", () => {
            it("Boolean falseの値は正常値として扱われる", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        enabled: new BooleanSettingValueInfo({
                            name: "enabled",
                            description: "Enabled",
                            required: true,
                            defaultValue: true,
                        }),
                    },
                });

                const value = { enabled: false };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ enabled: false });
            });

            it("Number 0の値は正常値として扱われる(positiveでない場合)", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        count: new NumberSettingValueInfo({
                            name: "count",
                            description: "Count",
                            required: true,
                            defaultValue: 10,
                            min: 0,
                        }),
                    },
                });

                const value = { count: 0 };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ count: 0 });
            });

            it("Number NaNは不正値としてデフォルト値に置き換えられる", () => {
                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        score: new NumberSettingValueInfo({
                            name: "score",
                            description: "Score",
                            required: true,
                            defaultValue: 100,
                        }),
                    },
                });

                const value = { score: NaN };
                const result = updateErrorValue(value, info);
                expect(result).toEqual({ score: 100 });
            });
        });

        describe("複合的なエラーシナリオ", () => {
            it("配列、オブジェクト、プリミティブ型が混在する複雑な構造", () => {
                const addressSchema = new ObjectSettingValueInfo({
                    name: "address",
                    description: "Address",
                    required: true,
                    children: {
                        city: new StringSettingValueInfo({
                            name: "city",
                            description: "City",
                            required: true,
                            minLength: 2,
                        }),
                        zip: new StringSettingValueInfo({
                            name: "zip",
                            description: "ZIP",
                            required: true,
                            pattern: /^\d{3}-\d{4}$/,
                        }),
                    },
                });

                const info = new ObjectSettingValueInfo({
                    name: "test",
                    description: "Test object",
                    required: true,
                    children: {
                        name: new StringSettingValueInfo({
                            name: "name",
                            description: "Name",
                            required: true,
                            defaultValue: "DefaultName",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "age",
                            description: "Age",
                            required: true,
                            defaultValue: 20,
                            positive: true,
                        }),
                        address: new ObjectSettingValueInfo({
                            name: "address",
                            description: "Address",
                            required: true,
                            defaultValue: { city: "Tokyo", zip: "100-0001" },
                            children: addressSchema.children,
                        }),
                        hobbies: new ArraySettingValueInfo({
                            name: "hobbies",
                            description: "Hobbies",
                            required: false,
                            defaultValue: ["reading"] as unknown as [],
                            itemType: "string",
                            itemSchema: new StringSettingValueInfo({
                                name: "hobby",
                                description: "Hobby",
                                required: true,
                                minLength: 2,
                            }),
                        }),
                    },
                });

                const value = {
                    name: "a", // 制約なしなのでOK
                    age: -10, // エラー: 負の数
                    address: { city: "A", zip: "invalid" }, // エラー: 両方不正
                    hobbies: ["swimming", "x", "reading"], // "x"がエラー
                };

                const result = updateErrorValue(value, info);
                expect(result).toEqual({
                    name: "a", // 制約なしなのでOK
                    age: 20, // デフォルト値に置き換え
                    address: {}, // 再帰的に修正されるが、デフォルト値がないため空
                    hobbies: ["swimming", "reading"], // "x"削除
                });
            });
        });
    });
    describe("getSettingErrors", () => {
        it("有効な設定の場合、空の配列を返す", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前フィールド",
                        required: true,
                    }),
                },
            });

            const validSetting = { name: "test" };
            const errors = getSettingErrors(validSetting, definition);

            expect(errors).toEqual([]);
        });

        it("必須フィールドが欠けている場合、エラーを返す", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前フィールド",
                        required: true,
                    }),
                },
            });

            const invalidSetting = {};
            const errors = getSettingErrors(invalidSetting, definition);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toHaveProperty("id");
            expect(errors[0]).toHaveProperty("label");
            expect(errors[0]).toHaveProperty("message");
        });

        it("型が正しくない場合、エラーを返す", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢フィールド",
                        required: true,
                    }),
                },
            });

            const invalidSetting = { age: "not a number" };
            const errors = getSettingErrors(invalidSetting, definition);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].label).toContain("年齢");
        });

        it("複数のエラーがある場合、すべてのエラーを返す", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前フィールド",
                        required: true,
                        minLength: 3,
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢フィールド",
                        required: true,
                        positive: true,
                    }),
                },
            });

            const invalidSetting = {
                name: "ab", // 短すぎる
                age: -5, // 負の値
            };
            const errors = getSettingErrors(invalidSetting, definition);

            expect(errors.length).toBeGreaterThan(0);
        });

        it("エラーメッセージがラベルとメッセージに正しく分割される", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    email: new StringSettingValueInfo({
                        name: "メールアドレス",
                        description: "メールアドレス",
                        required: true,
                        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    }),
                },
            });

            const invalidSetting = { email: "invalid-email" };
            const errors = getSettingErrors(invalidSetting, definition);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].label).toBeTruthy();
            expect(errors[0].message).toBeTruthy();
        });

        it("エラーメッセージにコロンがない場合、デフォルトラベルを使用する", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {},
            });

            // 意図的に不正なデータ型を渡す
            const invalidSetting = "not an object" as any;
            const errors = getSettingErrors(invalidSetting, definition);

            if (errors.length > 0) {
                // エラーがある場合、ラベルが設定されていることを確認
                expect(errors[0].label).toBeDefined();
            }
        });

        it("エラーIDがユニークである", () => {
            const definition = new ObjectSettingValueInfo({
                name: "テスト設定",
                description: "テスト用の設定",
                required: true,
                children: {
                    field1: new StringSettingValueInfo({
                        name: "フィールド1",
                        description: "フィールド1",
                        required: true,
                    }),
                    field2: new StringSettingValueInfo({
                        name: "フィールド2",
                        description: "フィールド2",
                        required: true,
                    }),
                },
            });

            const invalidSetting = {}; // 両方のフィールドが欠けている
            const errors = getSettingErrors(invalidSetting, definition);

            const ids = errors.map((e) => e.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });
    });
});
