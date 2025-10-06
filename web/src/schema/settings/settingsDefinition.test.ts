/**
 * Settings Definition 2 Tests
 *
 * 新しいクラスベースの設定定義システムのテストです。
 */

import { describe, expect, it } from "vitest";
import {
    ArraySettingValueInfo,
    BooleanSettingValueInfo,
    NumberSettingValueInfo,
    ObjectSettingValueInfo,
    StringSettingValueInfo,
} from "./settingsDefinition";

describe("settingsDefinition2", () => {
    describe("StringSettingValueInfo", () => {
        describe("基本的なバリデーション", () => {
            it("有効な文字列を受け入れる", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                });
                const result = info.validate("test value");
                expect(result.isError).toBe(false);
            });

            it("必須フィールドでundefinedの場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                });
                const result = info.validate(undefined);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("必須です");
                }
            });

            it("必須フィールドでnullの場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                });
                const result = info.validate(null);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("必須です");
                }
            });

            it("オプションフィールドでundefinedの場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: "default",
                });
                const result = info.validate(undefined);
                expect(result.isError).toBe(false);
            });

            it("オプションフィールドでnullの場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: "default",
                });
                const result = info.validate(null);
                expect(result.isError).toBe(false);
            });

            it("文字列以外の型はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                });
                const result = info.validate(123);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("stringである必要があります");
                }
            });
        });

        describe("minLength", () => {
            it("最小文字数を満たす場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    minLength: 3,
                });
                const result = info.validate("abc");
                expect(result.isError).toBe(false);
            });

            it("最小文字数を満たさない場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    minLength: 3,
                });
                const result = info.validate("ab");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("最低3文字必要です");
                }
            });
        });

        describe("maxLength", () => {
            it("最大文字数を超えない場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    maxLength: 5,
                });
                const result = info.validate("abcde");
                expect(result.isError).toBe(false);
            });

            it("最大文字数を超える場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    maxLength: 5,
                });
                const result = info.validate("abcdef");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("最大5文字までです");
                }
            });
        });

        describe("literals", () => {
            it("許可された値の場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    literals: ["foo", "bar", "baz"],
                });
                const result = info.validate("foo");
                expect(result.isError).toBe(false);
            });

            it("許可されていない値の場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    literals: ["foo", "bar", "baz"],
                });
                const result = info.validate("qux");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("foo, bar, baz のいずれかである必要があります");
                }
            });
        });

        describe("isUrl", () => {
            it("有効なURLの場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    isUrl: true,
                });
                const result = info.validate("https://example.com");
                expect(result.isError).toBe(false);
            });

            it("無効なURLの場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    isUrl: true,
                });
                const result = info.validate("not-a-url");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("有効なURLである必要があります");
                }
            });
        });

        describe("pattern", () => {
            it("パターンに一致する場合はOK", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    pattern: /^\d{3}-\d{4}$/,
                });
                const result = info.validate("123-4567");
                expect(result.isError).toBe(false);
            });

            it("パターンに一致しない場合はエラー", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: "default",
                    pattern: /^\d{3}-\d{4}$/,
                });
                const result = info.validate("abc-defg");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("形式が不正です");
                }
            });
        });
    });

    describe("BooleanSettingValueInfo", () => {
        it("有効なブール値を受け入れる", () => {
            const info = new BooleanSettingValueInfo({
                name: "テスト",
                description: "テスト説明",
                required: true,
                defaultValue: true,
            });
            const result = info.validate(true);
            expect(result.isError).toBe(false);
        });

        it("falseも受け入れる", () => {
            const info = new BooleanSettingValueInfo({
                name: "テスト",
                description: "テスト説明",
                required: true,
                defaultValue: false,
            });
            const result = info.validate(false);
            expect(result.isError).toBe(false);
        });

        it("ブール値以外の型はエラー", () => {
            const info = new BooleanSettingValueInfo({
                name: "テスト",
                description: "テスト説明",
                required: true,
                defaultValue: true,
            });
            const result = info.validate("true");
            expect(result.isError).toBe(true);
            if (result.isError) {
                expect(result.errorMessage).toContain("booleanである必要があります");
            }
        });

        it("必須フィールドでundefinedの場合はエラー", () => {
            const info = new BooleanSettingValueInfo({
                name: "テスト",
                description: "テスト説明",
                required: true,
                defaultValue: true,
            });
            const result = info.validate(undefined);
            expect(result.isError).toBe(true);
        });

        it("オプションフィールドでundefinedの場合はOK", () => {
            const info = new BooleanSettingValueInfo({
                name: "テスト",
                description: "テスト説明",
                required: false,
                defaultValue: true,
            });
            const result = info.validate(undefined);
            expect(result.isError).toBe(false);
        });
    });

    describe("NumberSettingValueInfo", () => {
        describe("基本的なバリデーション", () => {
            it("有効な数値を受け入れる", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 0,
                });
                const result = info.validate(123);
                expect(result.isError).toBe(false);
            });

            it("数値以外の型はエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 0,
                });
                const result = info.validate("123");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("numberである必要があります");
                }
            });

            it("NaNはエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 0,
                });
                const result = info.validate(NaN);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("数値である必要があります");
                }
            });
        });

        describe("integer", () => {
            it("整数の場合はOK", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 0,
                    integer: true,
                });
                const result = info.validate(123);
                expect(result.isError).toBe(false);
            });

            it("小数の場合はエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 0,
                    integer: true,
                });
                const result = info.validate(123.45);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("整数である必要があります");
                }
            });
        });

        describe("positive", () => {
            it("正の数の場合はOK", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 1,
                    positive: true,
                });
                const result = info.validate(123);
                expect(result.isError).toBe(false);
            });

            it("0の場合はエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 1,
                    positive: true,
                });
                const result = info.validate(0);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("正の数である必要があります");
                }
            });

            it("負の数の場合はエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 1,
                    positive: true,
                });
                const result = info.validate(-123);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("正の数である必要があります");
                }
            });
        });

        describe("literals", () => {
            it("許可された値の場合はOK", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 1,
                    literals: [1, 2, 3],
                });
                const result = info.validate(2);
                expect(result.isError).toBe(false);
            });

            it("許可されていない値の場合はエラー", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    defaultValue: 1,
                    literals: [1, 2, 3],
                });
                const result = info.validate(4);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("1, 2, 3 のいずれかである必要があります");
                }
            });
        });
    });

    describe("ArraySettingValueInfo", () => {
        describe("基本的なバリデーション", () => {
            it("有効な配列を受け入れる", () => {
                const info = new ArraySettingValueInfo({ name: "テスト", description: "テスト説明", required: true });
                const result = info.validate([1, 2, 3]);
                expect(result.isError).toBe(false);
            });

            it("配列以外の型はエラー", () => {
                const info = new ArraySettingValueInfo({ name: "テスト", description: "テスト説明", required: true });
                const result = info.validate("not array");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("配列である必要があります");
                }
            });

            it("空配列を受け入れる", () => {
                const info = new ArraySettingValueInfo({ name: "テスト", description: "テスト説明", required: true });
                const result = info.validate([]);
                expect(result.isError).toBe(false);
            });
        });

        describe("minItems", () => {
            it("最小要素数を満たす場合はOK", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    minItems: 2,
                });
                const result = info.validate([1, 2]);
                expect(result.isError).toBe(false);
            });

            it("最小要素数を満たさない場合はエラー", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    minItems: 2,
                });
                const result = info.validate([1]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("最低2個必要です");
                }
            });
        });

        describe("maxItems", () => {
            it("最大要素数を超えない場合はOK", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    maxItems: 3,
                });
                const result = info.validate([1, 2, 3]);
                expect(result.isError).toBe(false);
            });

            it("最大要素数を超える場合はエラー", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    maxItems: 3,
                });
                const result = info.validate([1, 2, 3, 4]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("最大3個までです");
                }
            });
        });

        describe("itemType: string", () => {
            it("すべて文字列の場合はOK", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "string",
                });
                const result = info.validate(["a", "b", "c"]);
                expect(result.isError).toBe(false);
            });

            it("文字列以外が含まれる場合はエラー", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "string",
                });
                const result = info.validate(["a", 123, "c"]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("[1]");
                    expect(result.errorMessage).toContain("テスト-> [1]-> stringである必要があります (input: number)");
                }
            });
        });

        describe("itemType: number", () => {
            it("すべて数値の場合はOK", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "number",
                });
                const result = info.validate([1, 2, 3]);
                expect(result.isError).toBe(false);
            });

            it("数値以外が含まれる場合はエラー", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "number",
                });
                const result = info.validate([1, "two", 3]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("[1]");
                    expect(result.errorMessage).toContain("テスト-> [1]-> numberである必要があります (input: string)");
                }
            });
        });

        describe("itemType: object with itemSchema", () => {
            const itemSchema = new ObjectSettingValueInfo({
                name: "情報",
                description: "情報説明",
                required: true,
                children: {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 0,
                    }),
                },
            });
            it("有効なオブジェクト配列の場合はOK", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "object",
                    itemSchema: itemSchema,
                });
                const result = info.validate([
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 },
                ]);
                expect(result.isError).toBe(false);
            });

            it("無効なオブジェクトが含まれる場合はエラー", () => {
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "object",
                    itemSchema: itemSchema,
                });
                const result = info.validate([
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: "twenty-five" }, // 年齢が数値でない
                ]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toBe(
                        "テスト-> 情報-> age-> 年齢-> numberである必要があります (input: string)",
                    );
                }
            });
        });
    });

    describe("ObjectSettingValueInfo", () => {
        describe("基本的なバリデーション", () => {
            it("有効なオブジェクトを受け入れる", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 0,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({ name: "Alice", age: 30 });
                expect(result.isError).toBe(false);
            });

            it("オブジェクト以外の型はエラー", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate("not object");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("オブジェクトである必要があります");
                }
            });

            it("配列はエラー", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate([1, 2, 3]);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("オブジェクトである必要があります");
                }
            });

            it("子要素が未定義の場合は空オブジェクトを受け入れる", () => {
                const info = new ObjectSettingValueInfo({ name: "テスト", description: "テスト説明", required: true });
                const result = info.validate({});
                expect(result.isError).toBe(false);
            });
        });

        describe("子要素のバリデーション", () => {
            it("すべての子要素が有効な場合はOK", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 0,
                    }),
                    active: new BooleanSettingValueInfo({
                        name: "アクティブ",
                        description: "アクティブ説明",
                        required: true,
                        defaultValue: true,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({ name: "Alice", age: 30, active: true });
                expect(result.isError).toBe(false);
            });

            it("子要素のバリデーションエラーを検出", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 0,
                        positive: true,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({ name: "Alice", age: -5 }); // 負の年齢
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("age");
                    expect(result.errorMessage).toContain("正の数である必要があります");
                }
            });

            it("複数の子要素のバリデーションエラーをすべて報告", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                        minLength: 3,
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 0,
                        positive: true,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({ name: "Al", age: -5 }); // 短い名前と負の年齢
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("name");
                    expect(result.errorMessage).toContain("age");
                }
            });
        });

        describe("未定義フィールドの検出", () => {
            it("disableUnknownFieldが有効な場合、未定義のフィールドがある場合はエラー", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                    disableUnknownField: true,
                });
                const result = info.validate({ name: "Alice", unknownField: "value" });
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("unknownField");
                    expect(result.errorMessage).toContain("不明なフィールドです");
                }
            });

            it("disableUnknownFieldが無効な場合、未定義のフィールドは許可される", () => {
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({ name: "Alice", unknownField: "value" });
                expect(result.isError).toBe(false);
            });
        });

        describe("ネストされたオブジェクト", () => {
            it("ネストされたオブジェクトを検証できる", () => {
                const addressChildren = {
                    city: new StringSettingValueInfo({
                        name: "市区町村",
                        description: "市区町村説明",
                        required: true,
                        defaultValue: "",
                    }),
                    zipCode: new StringSettingValueInfo({
                        name: "郵便番号",
                        description: "郵便番号説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    address: new ObjectSettingValueInfo({
                        name: "住所",
                        description: "住所説明",
                        required: true,
                        children: addressChildren,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({
                    name: "Alice",
                    address: {
                        city: "Tokyo",
                        zipCode: "100-0001",
                    },
                });
                expect(result.isError).toBe(false);
            });

            it("ネストされたオブジェクトのエラーを検出", () => {
                const addressChildren = {
                    city: new StringSettingValueInfo({
                        name: "市区町村",
                        description: "市区町村説明",
                        required: true,
                        defaultValue: "",
                    }),
                    zipCode: new StringSettingValueInfo({
                        name: "郵便番号",
                        description: "郵便番号説明",
                        required: true,
                        defaultValue: "",
                    }),
                };
                const children = {
                    name: new StringSettingValueInfo({
                        name: "名前",
                        description: "名前説明",
                        required: true,
                        defaultValue: "",
                    }),
                    address: new ObjectSettingValueInfo({
                        name: "住所",
                        description: "住所説明",
                        required: true,
                        children: addressChildren,
                    }),
                };
                const info = new ObjectSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    children,
                });
                const result = info.validate({
                    name: "Alice",
                    address: {
                        city: "Tokyo",
                        // zipCodeが欠けている
                    },
                });
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("address");
                    expect(result.errorMessage).toContain("zipCode");
                }
            });
        });

        describe("validatePatial (部分バリデーション)", () => {
            describe("基本的な動作", () => {
                it("完全なオブジェクトを受け入れる", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: "Alice", age: 30 });
                    expect(result.isError).toBe(false);
                });

                it("部分的なオブジェクトを受け入れる（必須フィールドが欠けていてもOK）", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: "Alice" }); // ageが欠けているがOK
                    expect(result.isError).toBe(false);
                });

                it("空のオブジェクトを受け入れる", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({});
                    expect(result.isError).toBe(false);
                });

                it("オプションフィールドでundefinedの場合はOK", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        children,
                    });
                    const result = info.validatePartial(undefined as any);
                    expect(result.isError).toBe(false);
                });
            });

            describe("型チェック", () => {
                it("オブジェクト以外の型はエラー", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial("not object" as any);
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("オブジェクトである必要があります");
                    }
                });

                it("配列はエラー", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial([1, 2, 3] as any);
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("オブジェクトである必要があります");
                    }
                });
            });

            describe("フィールドのバリデーション", () => {
                it("提供されたフィールドのバリデーションエラーを検出", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                            minLength: 3,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                            positive: true,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: "Al" }); // 短い名前
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("最低3文字必要です");
                    }
                });

                it("複数のフィールドのバリデーションエラーをすべて報告", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                            minLength: 3,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                            positive: true,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: "Al", age: -5 }); // 短い名前と負の年齢
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("age");
                    }
                });
            });

            describe("未定義フィールドの処理", () => {
                it("disableUnknownFieldが有効な場合、未定義のフィールドはエラー", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                        disableUnknownField: true,
                    });
                    const result = info.validatePartial({ name: "Alice", unknownField: "value" });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("unknownField");
                        expect(result.errorMessage).toContain("不明なフィールドです");
                    }
                });

                it("disableUnknownFieldが無効な場合、未定義のフィールドは許可される", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: "Alice", unknownField: "value" });
                    expect(result.isError).toBe(false);
                });
            });

            describe("ネストされたオブジェクトの部分バリデーション", () => {
                it("ネストされたオブジェクトの部分的なフィールドを受け入れる", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
                            required: true,
                            defaultValue: "",
                        }),
                        zipCode: new StringSettingValueInfo({
                            name: "郵便番号",
                            description: "郵便番号説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        address: new ObjectSettingValueInfo({
                            name: "住所",
                            description: "住所説明",
                            required: true,
                            children: addressChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({
                        address: {
                            city: "Tokyo", // zipCodeが欠けているがOK
                        },
                    });
                    expect(result.isError).toBe(false);
                });

                it("ネストされたオブジェクトのバリデーションエラーを検出", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
                            required: true,
                            defaultValue: "",
                            minLength: 2,
                        }),
                        zipCode: new StringSettingValueInfo({
                            name: "郵便番号",
                            description: "郵便番号説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        address: new ObjectSettingValueInfo({
                            name: "住所",
                            description: "住所説明",
                            required: true,
                            children: addressChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({
                        address: {
                            city: "T", // 短すぎる
                        },
                    });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("address");
                        expect(result.errorMessage).toContain("city");
                    }
                });

                it("トップレベルとネストの両方の部分更新", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
                            required: true,
                            defaultValue: "",
                        }),
                        zipCode: new StringSettingValueInfo({
                            name: "郵便番号",
                            description: "郵便番号説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                        }),
                        address: new ObjectSettingValueInfo({
                            name: "住所",
                            description: "住所説明",
                            required: true,
                            children: addressChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({
                        name: "Bob",
                        address: {
                            city: "Osaka",
                        },
                    });
                    expect(result.isError).toBe(false);
                });
            });

            describe("実際のユースケース", () => {
                it("UIでの単一フィールド更新シナリオ", () => {
                    const children = {
                        firstName: new StringSettingValueInfo({
                            name: "名",
                            description: "名説明",
                            required: true,
                            defaultValue: "",
                        }),
                        lastName: new StringSettingValueInfo({
                            name: "姓",
                            description: "姓説明",
                            required: true,
                            defaultValue: "",
                        }),
                        email: new StringSettingValueInfo({
                            name: "メール",
                            description: "メール説明",
                            required: true,
                            defaultValue: "",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "ユーザー情報",
                        description: "ユーザー情報説明",
                        required: true,
                        children,
                    });

                    // メールアドレスだけを更新
                    const result = info.validatePartial({ email: "newemail@example.com" });
                    expect(result.isError).toBe(false);
                });

                it("UIでの複数フィールド更新シナリオ", () => {
                    const children = {
                        firstName: new StringSettingValueInfo({
                            name: "名",
                            description: "名説明",
                            required: true,
                            defaultValue: "",
                        }),
                        lastName: new StringSettingValueInfo({
                            name: "姓",
                            description: "姓説明",
                            required: true,
                            defaultValue: "",
                        }),
                        email: new StringSettingValueInfo({
                            name: "メール",
                            description: "メール説明",
                            required: true,
                            defaultValue: "",
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "ユーザー情報",
                        description: "ユーザー情報説明",
                        required: true,
                        children,
                    });

                    // 名前と年齢を更新
                    const result = info.validatePartial({ firstName: "John", age: 25 });
                    expect(result.isError).toBe(false);
                });

                it("UIでのネストされた設定の部分更新シナリオ", () => {
                    const notificationChildren = {
                        email: new BooleanSettingValueInfo({
                            name: "メール通知",
                            description: "メール通知説明",
                            required: true,
                            defaultValue: false,
                        }),
                        push: new BooleanSettingValueInfo({
                            name: "プッシュ通知",
                            description: "プッシュ通知説明",
                            required: true,
                            defaultValue: false,
                        }),
                        sms: new BooleanSettingValueInfo({
                            name: "SMS通知",
                            description: "SMS通知説明",
                            required: true,
                            defaultValue: false,
                        }),
                    };
                    const children = {
                        username: new StringSettingValueInfo({
                            name: "ユーザー名",
                            description: "ユーザー名説明",
                            required: true,
                            defaultValue: "",
                        }),
                        notifications: new ObjectSettingValueInfo({
                            name: "通知設定",
                            description: "通知設定説明",
                            required: true,
                            children: notificationChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "設定",
                        description: "設定説明",
                        required: true,
                        children,
                    });

                    // 通知設定のメールだけをトグル
                    const result = info.validatePartial({
                        notifications: {
                            email: true,
                        },
                    });
                    expect(result.isError).toBe(false);
                });
            });
        });
    });
});
