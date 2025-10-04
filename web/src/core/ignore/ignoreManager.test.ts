/**
 * Ignore Manager Tests
 *
 * 無視マネージャーのテスト
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStorage } from "../../lib/storage";
import type { Event, Schedule } from "../../types";
import { IgnoreManager, getIgnoreManager, resetIgnoreManager } from "./ignoreManager";

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

describe("IgnoreManager", () => {
    let ignoreManager: IgnoreManager;

    beforeEach(() => {
        localStorageMock.clear();
        resetStorage();
        ignoreManager = new IgnoreManager();
    });

    afterEach(() => {
        resetIgnoreManager();
    });

    describe("load と dump", () => {
        it("空の設定を初期化できる", () => {
            ignoreManager.load();
            expect(ignoreManager.getSize()).toBe(0);
        });

        it("設定を保存して読み込める", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "休憩",
                matchType: "contains",
            });
            ignoreManager.dump();

            const newIgnoreManager = new IgnoreManager();
            newIgnoreManager.load();
            expect(newIgnoreManager.getSize()).toBe(1);

            const items = newIgnoreManager.getAllIgnoreItems();
            expect(items[0].name).toBe("休憩");
            expect(items[0].matchType).toBe("contains");
        });

        it("複数の設定を保存して読み込める", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "休憩" });
            ignoreManager.addIgnoreItem({ type: "event", name: "会議", matchType: "exact" });
            ignoreManager.addIgnoreItem({ type: "schedule", name: "MTG", matchType: "contains" });
            ignoreManager.dump();

            const newIgnoreManager = new IgnoreManager();
            newIgnoreManager.load();
            expect(newIgnoreManager.getSize()).toBe(3);
        });

        it("不正なデータをスキップする", () => {
            // 不正なデータを直接保存
            const invalidData = [
                { type: "event", name: "有効" },
                { type: "event" }, // nameなし
                { name: "無効" }, // typeなし
                null,
                undefined,
            ];
            const rootData = {
                version: 1,
                "ignore-items": invalidData,
            };
            localStorage.setItem("time-tracker-data", JSON.stringify(rootData));

            ignoreManager.load();
            expect(ignoreManager.getSize()).toBe(1); // '有効' のみ
        });
    });

    describe("ignoreEvent", () => {
        const testEvent: Event = {
            uuid: "test-uuid",
            name: "休憩時間",
            organizer: "test@example.com",
            start: new Date("2025-10-04T10:00:00"),
            end: new Date("2025-10-04T11:00:00"),
            isAllDay: false,
            isCancelled: false,
            isPrivate: false,
        };

        it("完全一致でイベントを無視できる", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "休憩時間",
                matchType: "exact",
            });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(true);
        });

        it("完全一致で一致しない場合は無視しない", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "休憩",
                matchType: "exact",
            });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(false);
        });

        it("部分一致でイベントを無視できる", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "休憩",
                matchType: "contains",
            });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(true);
        });

        it("matchTypeが未指定の場合は完全一致になる", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "休憩時間",
            });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(true);

            const testEvent2 = { ...testEvent, name: "休憩" };
            expect(ignoreManager.ignoreEvent(testEvent2)).toBe(false);
        });

        it("schedule設定はイベント判定に影響しない", () => {
            ignoreManager.addIgnoreItem({
                type: "schedule",
                name: "休憩時間",
            });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(false);
        });

        it("複数の設定がある場合、いずれかにマッチすれば無視する", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "会議", matchType: "contains" });
            ignoreManager.addIgnoreItem({ type: "event", name: "休憩", matchType: "contains" });

            expect(ignoreManager.ignoreEvent(testEvent)).toBe(true);
        });
    });

    describe("ignoreSchedule", () => {
        const testSchedule: Schedule = {
            start: new Date("2025-10-04T10:00:00"),
            end: new Date("2025-10-04T11:00:00"),
        };

        it("Scheduleは名前を持たないため常にfalseを返す", () => {
            ignoreManager.addIgnoreItem({
                type: "schedule",
                name: "定例会議",
                matchType: "exact",
            });

            // Scheduleは名前がないため、マッチしない
            expect(ignoreManager.ignoreSchedule(testSchedule)).toBe(false);
        });

        it("schedule設定を追加してもfalseを返す", () => {
            ignoreManager.addIgnoreItem({
                type: "schedule",
                name: "会議",
                matchType: "contains",
            });

            expect(ignoreManager.ignoreSchedule(testSchedule)).toBe(false);
        });

        it("event設定もスケジュール判定に影響しない", () => {
            ignoreManager.addIgnoreItem({
                type: "event",
                name: "定例会議",
            });

            expect(ignoreManager.ignoreSchedule(testSchedule)).toBe(false);
        });
    });

    describe("addIgnoreItem と removeIgnoreItem", () => {
        it("設定を追加できる", () => {
            expect(ignoreManager.getSize()).toBe(0);

            ignoreManager.addIgnoreItem({ type: "event", name: "テスト" });
            expect(ignoreManager.getSize()).toBe(1);
        });

        it("設定を削除できる", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト1" });
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト2" });
            expect(ignoreManager.getSize()).toBe(2);

            ignoreManager.removeIgnoreItem(0);
            expect(ignoreManager.getSize()).toBe(1);

            const items = ignoreManager.getAllIgnoreItems();
            expect(items[0].name).toBe("テスト2");
        });

        it("範囲外のインデックスで削除してもエラーにならない", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト" });

            ignoreManager.removeIgnoreItem(-1);
            expect(ignoreManager.getSize()).toBe(1);

            ignoreManager.removeIgnoreItem(10);
            expect(ignoreManager.getSize()).toBe(1);
        });
    });

    describe("clear", () => {
        it("すべての設定をクリアできる", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト1" });
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト2" });
            expect(ignoreManager.getSize()).toBe(2);

            ignoreManager.clear();
            expect(ignoreManager.getSize()).toBe(0);
        });

        it("クリア後もStorageは更新される", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト" });
            ignoreManager.dump();

            ignoreManager.clear();

            const newIgnoreManager = new IgnoreManager();
            newIgnoreManager.load();
            expect(newIgnoreManager.getSize()).toBe(0);
        });
    });

    describe("getIgnoreManager (シングルトン)", () => {
        it("同じインスタンスを返す", () => {
            const manager1 = getIgnoreManager();
            const manager2 = getIgnoreManager();
            expect(manager1).toBe(manager2);
        });

        it("データが共有される", () => {
            const manager1 = getIgnoreManager();
            manager1.addIgnoreItem({ type: "event", name: "テスト" });
            manager1.dump();

            const manager2 = getIgnoreManager();
            expect(manager2.getSize()).toBe(1);
        });

        it("resetIgnoreManager で新しいインスタンスが作成される", () => {
            const manager1 = getIgnoreManager();
            manager1.addIgnoreItem({ type: "event", name: "テスト" });

            resetIgnoreManager();

            const manager2 = getIgnoreManager();
            expect(manager2).not.toBe(manager1);
            expect(manager2.getSize()).toBe(0); // 新規インスタンスは空
        });
    });

    describe("getAllIgnoreItems", () => {
        it("すべての設定を取得できる", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト1" });
            ignoreManager.addIgnoreItem({ type: "schedule", name: "テスト2", matchType: "contains" });

            const items = ignoreManager.getAllIgnoreItems();
            expect(items).toHaveLength(2);
            expect(items[0].name).toBe("テスト1");
            expect(items[1].name).toBe("テスト2");
        });

        it("元の配列は変更されない（コピーを返す）", () => {
            ignoreManager.addIgnoreItem({ type: "event", name: "テスト" });

            const items = ignoreManager.getAllIgnoreItems();
            items.push({ type: "event", name: "追加" });

            expect(ignoreManager.getSize()).toBe(1);
        });
    });
});
