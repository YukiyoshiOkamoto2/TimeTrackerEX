/**
 * Storage Tests
 *
 * 永続データストレージのテスト
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageStorage, MemoryStorage, getStorage, resetStorage, type IStorage } from "./storage";

// LocalStorageのモック
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        },
    };
})();

Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});

describe("Storage", () => {
    describe("LocalStorageStorage", () => {
        let storage: LocalStorageStorage;

        beforeEach(() => {
            localStorageMock.clear();
            storage = new LocalStorageStorage();
        });

        describe("getValue と setValue", () => {
            it("文字列を保存・取得できる", () => {
                storage.setValue("name", "John");
                const value = storage.getValue<string>("name");
                expect(value).toBe("John");
            });

            it("数値を保存・取得できる", () => {
                storage.setValue("age", 30);
                const value = storage.getValue<number>("age");
                expect(value).toBe(30);
            });

            it("真偽値を保存・取得できる", () => {
                storage.setValue("isActive", true);
                const value = storage.getValue<boolean>("isActive");
                expect(value).toBe(true);
            });

            it("オブジェクトを保存・取得できる", () => {
                const obj = { name: "John", age: 30, tags: ["developer", "designer"] };
                storage.setValue("user", obj);
                const value = storage.getValue<typeof obj>("user");
                expect(value).toEqual(obj);
            });

            it("配列を保存・取得できる", () => {
                const arr = [1, 2, 3, 4, 5];
                storage.setValue("numbers", arr);
                const value = storage.getValue<number[]>("numbers");
                expect(value).toEqual(arr);
            });

            it("nullを保存・取得できる", () => {
                storage.setValue("nullValue", null);
                const value = storage.getValue("nullValue");
                expect(value).toBeNull();
            });

            it("存在しないキーはnullを返す", () => {
                const value = storage.getValue("nonexistent");
                expect(value).toBeNull();
            });

            it("値を上書きできる", () => {
                storage.setValue("key", "value1");
                storage.setValue("key", "value2");
                const value = storage.getValue<string>("key");
                expect(value).toBe("value2");
            });
        });

        describe("removeValue", () => {
            it("値を削除できる", () => {
                storage.setValue("key", "value");
                expect(storage.hasKey("key")).toBe(true);

                storage.removeValue("key");
                expect(storage.hasKey("key")).toBe(false);
                expect(storage.getValue("key")).toBeNull();
            });

            it("存在しないキーを削除してもエラーにならない", () => {
                const result = storage.removeValue("nonexistent");
                expect(result).toBe(true);
            });
        });

        describe("hasKey", () => {
            it("存在するキーはtrueを返す", () => {
                storage.setValue("key", "value");
                expect(storage.hasKey("key")).toBe(true);
            });

            it("存在しないキーはfalseを返す", () => {
                expect(storage.hasKey("nonexistent")).toBe(false);
            });

            it("削除したキーはfalseを返す", () => {
                storage.setValue("key", "value");
                storage.removeValue("key");
                expect(storage.hasKey("key")).toBe(false);
            });
        });

        describe("getAllKeys", () => {
            it("すべてのキーを取得できる", () => {
                storage.setValue("key1", "value1");
                storage.setValue("key2", "value2");
                storage.setValue("key3", "value3");

                const keys = storage.getAllKeys();
                expect(keys).toHaveLength(3);
                expect(keys).toContain("key1");
                expect(keys).toContain("key2");
                expect(keys).toContain("key3");
            });

            it("空の場合は空配列を返す", () => {
                const keys = storage.getAllKeys();
                expect(keys).toEqual([]);
            });
        });

        describe("clear", () => {
            it("すべての値をクリアできる", () => {
                storage.setValue("key1", "value1");
                storage.setValue("key2", "value2");
                storage.setValue("key3", "value3");

                storage.clear();

                expect(storage.getAllKeys()).toEqual([]);
                expect(storage.getValue("key1")).toBeNull();
            });
        });

        describe("prefix", () => {
            it("プレフィックス付きでキーを保存できる", () => {
                const prefixedStorage = new LocalStorageStorage("app:");

                prefixedStorage.setValue("key", "value");

                // プレフィックスなしでは取得できない
                expect(storage.getValue("key")).toBeNull();

                // プレフィックス付きで取得できる
                expect(prefixedStorage.getValue("key")).toBe("value");
            });

            it("プレフィックスごとに名前空間が分離される", () => {
                const storage1 = new LocalStorageStorage("app1:");
                const storage2 = new LocalStorageStorage("app2:");

                storage1.setValue("key", "value1");
                storage2.setValue("key", "value2");

                expect(storage1.getValue("key")).toBe("value1");
                expect(storage2.getValue("key")).toBe("value2");
            });

            it("プレフィックス付きストレージのクリアは他に影響しない", () => {
                const storage1 = new LocalStorageStorage("app1:");
                const storage2 = new LocalStorageStorage("app2:");

                storage1.setValue("key", "value1");
                storage2.setValue("key", "value2");

                storage1.clear();

                expect(storage1.getValue("key")).toBeNull();
                expect(storage2.getValue("key")).toBe("value2");
            });

            it("プレフィックス付きストレージのgetAllKeysはプレフィックスなしで返す", () => {
                const prefixedStorage = new LocalStorageStorage("app:");

                prefixedStorage.setValue("key1", "value1");
                prefixedStorage.setValue("key2", "value2");

                const keys = prefixedStorage.getAllKeys();
                expect(keys).toEqual(["key1", "key2"]);
            });
        });
    });

    describe("MemoryStorage", () => {
        let storage: MemoryStorage;

        beforeEach(() => {
            storage = new MemoryStorage();
        });

        it("値を保存・取得できる", () => {
            storage.setValue("key", "value");
            expect(storage.getValue<string>("key")).toBe("value");
        });

        it("複雑なオブジェクトを保存・取得できる", () => {
            const obj = {
                name: "Test",
                nested: { value: 123 },
                array: [1, 2, 3],
            };
            storage.setValue("obj", obj);
            expect(storage.getValue("obj")).toEqual(obj);
        });

        it("値を削除できる", () => {
            storage.setValue("key", "value");
            storage.removeValue("key");
            expect(storage.getValue("key")).toBeNull();
        });

        it("hasKeyが正しく動作する", () => {
            storage.setValue("key", "value");
            expect(storage.hasKey("key")).toBe(true);
            expect(storage.hasKey("nonexistent")).toBe(false);
        });

        it("getAllKeysが正しく動作する", () => {
            storage.setValue("key1", "value1");
            storage.setValue("key2", "value2");
            const keys = storage.getAllKeys();
            expect(keys).toHaveLength(2);
            expect(keys).toContain("key1");
            expect(keys).toContain("key2");
        });

        it("clearが正しく動作する", () => {
            storage.setValue("key1", "value1");
            storage.setValue("key2", "value2");
            storage.clear();
            expect(storage.getAllKeys()).toEqual([]);
        });

        it("プレフィックスが正しく動作する", () => {
            const storage1 = new MemoryStorage("app1:");
            const storage2 = new MemoryStorage("app2:");

            storage1.setValue("key", "value1");
            storage2.setValue("key", "value2");

            expect(storage1.getValue("key")).toBe("value1");
            expect(storage2.getValue("key")).toBe("value2");
        });
    });

    describe("getStorage", () => {
        beforeEach(() => {
            resetStorage();
        });

        afterEach(() => {
            resetStorage();
        });

        it("LocalStorageStorageを返す", () => {
            const storage = getStorage();
            expect(storage).toBeInstanceOf(LocalStorageStorage);
        });

        it("シングルトンとして動作する", () => {
            const storage1 = getStorage();
            const storage2 = getStorage();
            expect(storage1).toBe(storage2);
        });

        it("データが共有される", () => {
            const storage1 = getStorage();
            storage1.setValue("key", "value");

            const storage2 = getStorage();
            expect(storage2.getValue("key")).toBe("value");
        });

        it("resetStorage後は新しいインスタンスが作成される", () => {
            const storage1 = getStorage();
            storage1.setValue("key", "value");

            resetStorage();

            const storage2 = getStorage();
            expect(storage1).not.toBe(storage2);
        });
    });

    describe("型安全性", () => {
        let storage: IStorage;

        beforeEach(() => {
            storage = new MemoryStorage();
        });

        it("型パラメータで型安全に取得できる", () => {
            interface User {
                name: string;
                age: number;
            }

            const user: User = { name: "John", age: 30 };
            storage.setValue("user", user);

            const retrieved = storage.getValue<User>("user");
            expect(retrieved?.name).toBe("John");
            expect(retrieved?.age).toBe(30);
        });

        it("配列の型パラメータが機能する", () => {
            const numbers = [1, 2, 3, 4, 5];
            storage.setValue("numbers", numbers);

            const retrieved = storage.getValue<number[]>("numbers");
            expect(retrieved).toEqual(numbers);
            expect(retrieved?.[0]).toBe(1);
        });
    });
});
