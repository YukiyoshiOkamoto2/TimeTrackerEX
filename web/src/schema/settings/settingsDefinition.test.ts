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
                    defaultValue: "abc",
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
                    defaultValue: "abc",
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
                    defaultValue: "foo",
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
                    defaultValue: "foo",
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
                    defaultValue: "https://example.com",
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
                    defaultValue: "https://example.com",
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
                    defaultValue: "123-4567",
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
                    defaultValue: "123-4567",
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
                        "テスト-> [1]-> 情報-> age-> 年齢-> numberである必要があります (input: string)",
                    );
                }
            });
        });

        describe("itemType: string with itemSchema", () => {
            it("有効な文字列配列の場合はOK", () => {
                const stringSchema = new StringSettingValueInfo({
                    name: "タグ",
                    description: "タグ名",
                    required: true,
                    minLength: 2,
                    maxLength: 10,
                });
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "string",
                    itemSchema: stringSchema,
                });
                const result = info.validate(["tag1", "tag2", "tag3"]);
                expect(result.isError).toBe(false);
            });

            it("無効な文字列が含まれる場合はエラー", () => {
                const stringSchema = new StringSettingValueInfo({
                    name: "タグ",
                    description: "タグ名",
                    required: true,
                    minLength: 2,
                    maxLength: 10,
                });
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "string",
                    itemSchema: stringSchema,
                });
                const result = info.validate(["tag1", "a", "verylongtagname"]); // "a"は短すぎ、"verylongtagname"は長すぎ
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("タグ-> 最低2文字必要です");
                    expect(result.errorMessage).toContain("タグ-> 最大10文字までです");
                }
            });
        });

        describe("itemType: number with itemSchema", () => {
            it("有効な数値配列の場合はOK", () => {
                const numberSchema = new NumberSettingValueInfo({
                    name: "スコア",
                    description: "スコア値",
                    required: true,
                    min: 0,
                    max: 100,
                    integer: true,
                });
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "number",
                    itemSchema: numberSchema,
                });
                const result = info.validate([50, 75, 100]);
                expect(result.isError).toBe(false);
            });

            it("無効な数値が含まれる場合はエラー", () => {
                const numberSchema = new NumberSettingValueInfo({
                    name: "スコア",
                    description: "スコア値",
                    required: true,
                    min: 0,
                    max: 100,
                    integer: true,
                });
                const info = new ArraySettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: true,
                    itemType: "number",
                    itemSchema: numberSchema,
                });
                const result = info.validate([50, -10, 150, 75.5]); // -10は小さすぎ、150は大きすぎ、75.5は整数でない
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("スコア-> 0以上である必要があります");
                    expect(result.errorMessage).toContain("スコア-> 100以下である必要があります");
                    expect(result.errorMessage).toContain("スコア-> 整数である必要があります");
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
                        defaultValue: 1,
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
                        defaultValue: "Alice",
                        minLength: 3,
                    }),
                    age: new NumberSettingValueInfo({
                        name: "年齢",
                        description: "年齢説明",
                        required: true,
                        defaultValue: 1,
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
                            defaultValue: "Alice",
                            minLength: 3,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 1,
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
                            defaultValue: "Alice",
                            minLength: 3,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 1,
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
                            defaultValue: "Tokyo",
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

            describe("undefined/nullが提供された場合", () => {
                it("必須フィールドにundefinedを提供するとエラー", () => {
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
                            required: false,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: undefined });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("必須です");
                    }
                });

                it("必須フィールドにnullを提供するとエラー", () => {
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
                    const result = info.validatePartial({ name: null });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("必須です");
                    }
                });

                it("オプションフィールドにundefinedを提供するとOK", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: false,
                            defaultValue: "",
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ name: undefined });
                    expect(result.isError).toBe(false);
                });

                it("オプションフィールドにnullを提供するとOK", () => {
                    const children = {
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: false,
                            defaultValue: 0,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ age: null });
                    expect(result.isError).toBe(false);
                });

                it("ネストされた必須オブジェクトにundefinedを提供するとエラー", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const children = {
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
                    const result = info.validatePartial({ address: undefined });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("address");
                    }
                });

                it("ネストされたオプションオブジェクトにundefinedを提供するとOK", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const children = {
                        address: new ObjectSettingValueInfo({
                            name: "住所",
                            description: "住所説明",
                            required: false,
                            children: addressChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });
                    const result = info.validatePartial({ address: undefined });
                    expect(result.isError).toBe(false);
                });
            });

            describe("深くネストされたオブジェクト", () => {
                it("3階層のネストされたオブジェクトの部分バリデーション", () => {
                    const phoneChildren = {
                        countryCode: new StringSettingValueInfo({
                            name: "国番号",
                            description: "国番号説明",
                            required: true,
                            defaultValue: "+81",
                        }),
                        number: new StringSettingValueInfo({
                            name: "電話番号",
                            description: "電話番号説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const contactChildren = {
                        email: new StringSettingValueInfo({
                            name: "メール",
                            description: "メール説明",
                            required: true,
                            defaultValue: "",
                        }),
                        phone: new ObjectSettingValueInfo({
                            name: "電話",
                            description: "電話説明",
                            required: true,
                            children: phoneChildren,
                        }),
                    };
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        contact: new ObjectSettingValueInfo({
                            name: "連絡先",
                            description: "連絡先説明",
                            required: true,
                            children: contactChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 3階層目のフィールドのみ更新
                    const result = info.validatePartial({
                        contact: {
                            phone: {
                                countryCode: "+1",
                            },
                        },
                    });
                    expect(result.isError).toBe(false);
                });

                it("3階層のネストされたオブジェクトのバリデーションエラーを検出", () => {
                    const phoneChildren = {
                        countryCode: new StringSettingValueInfo({
                            name: "国番号",
                            description: "国番号説明",
                            required: true,
                            defaultValue: "+81",
                            minLength: 2,
                        }),
                        number: new StringSettingValueInfo({
                            name: "電話番号",
                            description: "電話番号説明",
                            required: true,
                            defaultValue: "",
                        }),
                    };
                    const contactChildren = {
                        email: new StringSettingValueInfo({
                            name: "メール",
                            description: "メール説明",
                            required: true,
                            defaultValue: "",
                        }),
                        phone: new ObjectSettingValueInfo({
                            name: "電話",
                            description: "電話説明",
                            required: true,
                            children: phoneChildren,
                        }),
                    };
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        contact: new ObjectSettingValueInfo({
                            name: "連絡先",
                            description: "連絡先説明",
                            required: true,
                            children: contactChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 3階層目のバリデーションエラー
                    const result = info.validatePartial({
                        contact: {
                            phone: {
                                countryCode: "+", // 短すぎる
                            },
                        },
                    });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("contact");
                        expect(result.errorMessage).toContain("phone");
                        expect(result.errorMessage).toContain("countryCode");
                    }
                });
            });

            describe("配列を含むオブジェクトの部分バリデーション", () => {
                it("配列フィールドを含むオブジェクトの部分更新", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        tags: new ArraySettingValueInfo({
                            name: "タグ",
                            description: "タグ説明",
                            required: true,
                            defaultValue: [],
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 配列フィールドのみ更新
                    const result = info.validatePartial({ tags: ["tag1", "tag2"] });
                    expect(result.isError).toBe(false);
                });

                it("配列フィールドのバリデーションエラーを検出", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "",
                        }),
                        tags: new ArraySettingValueInfo({
                            name: "タグ",
                            description: "タグ説明",
                            required: true,
                            defaultValue: [],
                            maxItems: 3,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 配列が長すぎる
                    const result = info.validatePartial({ tags: ["tag1", "tag2", "tag3", "tag4"] });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("tags");
                        expect(result.errorMessage).toContain("最大3個まで");
                    }
                });
            });

            describe("複雑なシナリオ", () => {
                it("複数階層での複数フィールドの部分更新", () => {
                    const settingsChildren = {
                        theme: new StringSettingValueInfo({
                            name: "テーマ",
                            description: "テーマ説明",
                            required: true,
                            defaultValue: "light",
                            literals: ["light", "dark"],
                        }),
                        fontSize: new NumberSettingValueInfo({
                            name: "フォントサイズ",
                            description: "フォントサイズ説明",
                            required: true,
                            defaultValue: 14,
                        }),
                    };
                    const profileChildren = {
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
                    const children = {
                        profile: new ObjectSettingValueInfo({
                            name: "プロフィール",
                            description: "プロフィール説明",
                            required: true,
                            children: profileChildren,
                        }),
                        settings: new ObjectSettingValueInfo({
                            name: "設定",
                            description: "設定説明",
                            required: true,
                            children: settingsChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 複数の階層で複数フィールドを更新
                    const result = info.validatePartial({
                        profile: {
                            name: "Alice",
                        },
                        settings: {
                            theme: "dark",
                        },
                    });
                    expect(result.isError).toBe(false);
                });

                it("複数階層での複数バリデーションエラーを全て検出", () => {
                    const settingsChildren = {
                        theme: new StringSettingValueInfo({
                            name: "テーマ",
                            description: "テーマ説明",
                            required: true,
                            defaultValue: "light",
                            literals: ["light", "dark"],
                        }),
                        fontSize: new NumberSettingValueInfo({
                            name: "フォントサイズ",
                            description: "フォントサイズ説明",
                            required: true,
                            defaultValue: 14,
                            min: 10,
                        }),
                    };
                    const profileChildren = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "Alice",
                            minLength: 2,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 1,
                            positive: true,
                        }),
                    };
                    const children = {
                        profile: new ObjectSettingValueInfo({
                            name: "プロフィール",
                            description: "プロフィール説明",
                            required: true,
                            children: profileChildren,
                        }),
                        settings: new ObjectSettingValueInfo({
                            name: "設定",
                            description: "設定説明",
                            required: true,
                            children: settingsChildren,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 複数の階層で複数のエラー
                    const result = info.validatePartial({
                        profile: {
                            name: "A", // 短すぎる
                            age: -1, // 負数
                        },
                        settings: {
                            theme: "invalid", // 不正な値
                            fontSize: 5, // 小さすぎる
                        },
                    });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("profile");
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("age");
                        expect(result.errorMessage).toContain("settings");
                        expect(result.errorMessage).toContain("theme");
                        expect(result.errorMessage).toContain("fontSize");
                    }
                });

                it("空のネストされたオブジェクトを提供", () => {
                    const addressChildren = {
                        city: new StringSettingValueInfo({
                            name: "市区町村",
                            description: "市区町村説明",
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

                    // 空のネストされたオブジェクト（フィールドが欠けている）
                    const result = info.validatePartial({
                        address: {},
                    });
                    expect(result.isError).toBe(false);
                });
            });

            describe("エッジケース", () => {
                it("childrenが定義されていないオブジェクトの部分バリデーション", () => {
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                    });
                    const result = info.validatePartial({ anyField: "value" });
                    expect(result.isError).toBe(false);
                });

                it("disableUnknownFieldがtrueでchildrenが未定義の場合", () => {
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        disableUnknownField: true,
                    });
                    const result = info.validatePartial({ anyField: "value" });
                    expect(result.isError).toBe(false);
                });

                it("全フィールドが不正な値を持つ場合", () => {
                    const children = {
                        name: new StringSettingValueInfo({
                            name: "名前",
                            description: "名前説明",
                            required: true,
                            defaultValue: "Alice",
                            minLength: 5,
                        }),
                        age: new NumberSettingValueInfo({
                            name: "年齢",
                            description: "年齢説明",
                            required: true,
                            defaultValue: 1,
                            positive: true,
                        }),
                        active: new BooleanSettingValueInfo({
                            name: "アクティブ",
                            description: "アクティブ説明",
                            required: true,
                            defaultValue: false,
                        }),
                    };
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children,
                    });

                    // 全フィールドが不正
                    const result = info.validatePartial({
                        name: "Ab", // 短すぎる
                        age: -10, // 負数
                        active: "not boolean" as any, // 型が違う
                    });
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("name");
                        expect(result.errorMessage).toContain("age");
                        expect(result.errorMessage).toContain("active");
                    }
                });

                it("必須オブジェクトフィールド自体がnullの場合", () => {
                    const info = new ObjectSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: true,
                        children: {
                            name: new StringSettingValueInfo({
                                name: "名前",
                                description: "名前説明",
                                required: true,
                                defaultValue: "",
                            }),
                        },
                    });
                    const result = info.validatePartial(null as any);
                    expect(result.isError).toBe(true);
                    if (result.isError) {
                        expect(result.errorMessage).toContain("必須です");
                    }
                });
            });
        });
    });

    describe("新機能のテスト", () => {
        describe("StringSettingValueInfo - disableEmpty", () => {
            it("disableEmptyがfalse(デフォルト)の場合は空文字を許容", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                });
                const result = info.validate("");
                expect(result.isError).toBe(false);
            });

            it("disableEmptyがtrueの場合は空文字を拒否", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: "default",
                    disableEmpty: true,
                });
                const result = info.validate("");
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("空文字は許可されていません");
                }
            });

            it("disableEmptyがtrueでもrequiredがfalseならundefinedは許容", () => {
                const info = new StringSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: "default",
                    disableEmpty: true,
                });
                const result = info.validate(undefined);
                expect(result.isError).toBe(false);
            });

            it("コンストラクタでdisableEmpty=trueかつdefaultValueが空文字の場合はエラー", () => {
                expect(() => {
                    new StringSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        defaultValue: "",
                        disableEmpty: true,
                    });
                }).toThrow("defaultValue cannot be empty string");
            });

            it("コンストラクタでdisableEmpty=trueかつliteralsに空文字が含まれる場合はエラー", () => {
                expect(() => {
                    new StringSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        defaultValue: "option1",
                        literals: ["", "option1", "option2"],
                        disableEmpty: true,
                    });
                }).toThrow("literals cannot contain empty string");
            });

            it("コンストラクタでdisableEmpty=falseのliteralsに空文字が含まれるのはOK", () => {
                expect(() => {
                    new StringSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        defaultValue: "",
                        literals: ["", "option1", "option2"],
                        disableEmpty: false,
                    });
                }).not.toThrow();
            });
        });

        describe("NumberSettingValueInfo - min/max", () => {
            it("minより小さい値は拒否", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: 5,
                    min: 1,
                });
                const result = info.validate(0);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("1以上である必要があります");
                }
            });

            it("min以上の値は許容", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: 5,
                    min: 1,
                });
                const result = info.validate(1);
                expect(result.isError).toBe(false);
            });

            it("maxより大きい値は拒否", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: 5,
                    max: 10,
                });
                const result = info.validate(11);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("10以下である必要があります");
                }
            });

            it("max以下の値は許容", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: 5,
                    max: 10,
                });
                const result = info.validate(10);
                expect(result.isError).toBe(false);
            });

            it("minとmaxの範囲内の値は許容", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    defaultValue: 5,
                    min: 1,
                    max: 10,
                });
                const result = info.validate(5);
                expect(result.isError).toBe(false);
            });

            it("requiredがfalseならminが設定されていてもundefinedは許容", () => {
                const info = new NumberSettingValueInfo({
                    name: "テスト",
                    description: "テスト説明",
                    required: false,
                    min: 1,
                });
                const result = info.validate(undefined);
                expect(result.isError).toBe(false);
            });

            it("コンストラクタでmin > maxの場合はエラー", () => {
                expect(() => {
                    new NumberSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        min: 10,
                        max: 1,
                    });
                }).toThrow("min (10) cannot be greater than max (1)");
            });

            it("コンストラクタでdefaultValueがminより小さい場合はエラー", () => {
                expect(() => {
                    new NumberSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        defaultValue: 0,
                        min: 1,
                    });
                }).toThrow("defaultValue must be at least 1");
            });

            it("コンストラクタでdefaultValueがmaxより大きい場合はエラー", () => {
                expect(() => {
                    new NumberSettingValueInfo({
                        name: "テスト",
                        description: "テスト説明",
                        required: false,
                        defaultValue: 11,
                        max: 10,
                    });
                }).toThrow("defaultValue must be at most 10");
            });
        });

        describe("コンストラクタでの妥当性確認", () => {
            describe("StringSettingValueInfo", () => {
                it("literalsが設定されている場合、defaultValueがリストに含まれないとエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "invalid",
                            literals: ["option1", "option2"],
                        });
                    }).toThrow("defaultValue must be one of [option1, option2]");
                });

                it("minLengthが設定されている場合、defaultValueが短いとエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "ab",
                            minLength: 3,
                        });
                    }).toThrow("defaultValue length must be at least 3");
                });

                it("maxLengthが設定されている場合、defaultValueが長いとエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "abcde",
                            maxLength: 3,
                        });
                    }).toThrow("defaultValue length must be at most 3");
                });

                it("minLength > maxLengthの場合はエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            minLength: 10,
                            maxLength: 5,
                        });
                    }).toThrow("minLength (10) cannot be greater than maxLength (5)");
                });

                it("isUrlがtrueでdefaultValueが無効なURLの場合はエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "not-a-url",
                            isUrl: true,
                        });
                    }).toThrow("defaultValue must be a valid URL");
                });

                it("patternが設定されていてdefaultValueがマッチしない場合はエラー", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "abc",
                            pattern: /^[0-9]+$/,
                        });
                    }).toThrow("defaultValue does not match pattern");
                });
            });

            describe("NumberSettingValueInfo", () => {
                it("literalsが設定されている場合、defaultValueがリストに含まれないとエラー", () => {
                    expect(() => {
                        new NumberSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: 5,
                            literals: [1, 2, 3],
                        });
                    }).toThrow("defaultValue must be one of [1, 2, 3]");
                });

                it("integerがtrueでdefaultValueが整数でない場合はエラー", () => {
                    expect(() => {
                        new NumberSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: 1.5,
                            integer: true,
                        });
                    }).toThrow("defaultValue must be an integer");
                });

                it("positiveがtrueでdefaultValueが0以下の場合はエラー", () => {
                    expect(() => {
                        new NumberSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: 0,
                            positive: true,
                        });
                    }).toThrow("defaultValue must be positive");
                });

                it("defaultValueがNaNの場合はエラー", () => {
                    expect(() => {
                        new NumberSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: NaN,
                        });
                    }).toThrow("defaultValue cannot be NaN");
                });
            });

            describe("ArraySettingValueInfo", () => {
                it("minItems > maxItemsの場合はエラー", () => {
                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            minItems: 10,
                            maxItems: 5,
                        });
                    }).toThrow("minItems (10) cannot be greater than maxItems (5)");
                });

                it("defaultValueがminItemsより少ない場合はエラー", () => {
                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: [],
                            minItems: 1,
                        });
                    }).toThrow("defaultValue length must be at least 1");
                });

                it("defaultValueがmaxItemsより多い場合はエラー", () => {
                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: [1, 2] as unknown as [],
                            maxItems: 1,
                            itemType: "number",
                        });
                    }).toThrow("defaultValue length must be at most 1");
                });

                it("defaultValueの配列要素の型が不正な場合はエラー", () => {
                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: ["a", 123, "c"] as unknown as [],
                            itemType: "string",
                        });
                    }).toThrow("defaultValue[1] must be string, but got number");
                });

                it("defaultValueの配列要素がitemSchemaのバリデーションに失敗する場合はエラー", () => {
                    const itemSchema = new StringSettingValueInfo({
                        name: "アイテム",
                        description: "説明",
                        required: true,
                        minLength: 3,
                    });

                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: ["abc", "de", "fgh"] as unknown as [],
                            itemType: "string",
                            itemSchema,
                        });
                    }).toThrow("defaultValue[1] validation failed");
                });

                it("defaultValueのオブジェクト配列要素がitemSchemaのバリデーションに失敗する場合はエラー", () => {
                    const itemSchema = new ObjectSettingValueInfo({
                        name: "アイテム",
                        description: "説明",
                        required: true,
                        children: {
                            name: new StringSettingValueInfo({
                                name: "名前",
                                description: "説明",
                                required: true,
                                minLength: 2,
                            }),
                        },
                    });

                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: [
                                { name: "John" },
                                { name: "X" }, // minLength違反
                                { name: "Jane" },
                            ] as unknown as [],
                            itemType: "object",
                            itemSchema,
                        });
                    }).toThrow("defaultValue[1] validation failed");
                });
            });

            describe("ObjectSettingValueInfo", () => {
                it("disableUnknownFieldがtrueでdefaultValueに未知のフィールドがある場合はエラー", () => {
                    expect(() => {
                        new ObjectSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: { unknown: "value" },
                            children: {
                                known: new StringSettingValueInfo({
                                    name: "既知フィールド",
                                    description: "説明",
                                    required: false,
                                }),
                            },
                            disableUnknownField: true,
                        });
                    }).toThrow("Unknown field 'unknown' in defaultValue");
                });

                it("defaultValueの子要素がバリデーションに失敗する場合はエラー", () => {
                    expect(() => {
                        new ObjectSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: {
                                name: "ab", // minLength: 3に違反
                            },
                            children: {
                                name: new StringSettingValueInfo({
                                    name: "名前",
                                    description: "説明",
                                    required: true,
                                    minLength: 3,
                                }),
                            },
                        });
                    }).toThrow("defaultValue validation failed");
                });

                it("defaultValueのネストされたオブジェクトがバリデーションに失敗する場合はエラー", () => {
                    expect(() => {
                        new ObjectSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: {
                                user: {
                                    name: "John",
                                    age: -5, // positive違反
                                },
                            },
                            children: {
                                user: new ObjectSettingValueInfo({
                                    name: "ユーザー",
                                    description: "説明",
                                    required: true,
                                    children: {
                                        name: new StringSettingValueInfo({
                                            name: "名前",
                                            description: "説明",
                                            required: true,
                                        }),
                                        age: new NumberSettingValueInfo({
                                            name: "年齢",
                                            description: "説明",
                                            required: true,
                                            positive: true,
                                        }),
                                    },
                                }),
                            },
                        });
                    }).toThrow("defaultValue validation failed");
                });

                it("defaultValueが正常な場合はエラーが発生しない", () => {
                    expect(() => {
                        new ObjectSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: {
                                name: "John Doe",
                                age: 30,
                                tags: ["developer", "typescript"],
                            },
                            children: {
                                name: new StringSettingValueInfo({
                                    name: "名前",
                                    description: "説明",
                                    required: true,
                                    minLength: 2,
                                }),
                                age: new NumberSettingValueInfo({
                                    name: "年齢",
                                    description: "説明",
                                    required: true,
                                    positive: true,
                                }),
                                tags: new ArraySettingValueInfo({
                                    name: "タグ",
                                    description: "説明",
                                    required: false,
                                    itemType: "string",
                                    minItems: 1,
                                }),
                            },
                        });
                    }).not.toThrow();
                });
            });

            describe("BaseSettingValueInfo", () => {
                it("defaultValueの型が不正な場合はエラー(string)", () => {
                    expect(() => {
                        new StringSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: 123 as unknown as string,
                        });
                    }).toThrow("defaultValue must be string, but got number");
                });

                it("defaultValueの型が不正な場合はエラー(number)", () => {
                    expect(() => {
                        new NumberSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "123" as unknown as number,
                        });
                    }).toThrow("defaultValue must be number, but got string");
                });

                it("defaultValueの型が不正な場合はエラー(boolean)", () => {
                    expect(() => {
                        new BooleanSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: "true" as unknown as boolean,
                        });
                    }).toThrow("defaultValue must be boolean, but got string");
                });

                it("defaultValueの型が不正な場合はエラー(array)", () => {
                    expect(() => {
                        new ArraySettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: {} as unknown as [],
                        });
                    }).toThrow("defaultValue must be array, but got object");
                });

                it("defaultValueの型が不正な場合はエラー(object - array渡し)", () => {
                    expect(() => {
                        new ObjectSettingValueInfo({
                            name: "テスト",
                            description: "テスト説明",
                            required: false,
                            defaultValue: [] as unknown as Record<string, unknown>,
                        });
                    }).toThrow("defaultValue must be object, but got object");
                });
            });
        });
    });
});
