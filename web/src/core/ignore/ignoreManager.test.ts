/**
 * Ignore Manager Tests
 *
 * 無視マネージャーのテスト
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStorage } from "../../lib/storage";
import type { Event, EventPattern, Schedule } from "../../types";
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
            location: "",
            schedule: {
                start: new Date("2025-10-04T10:00:00"),
                end: new Date("2025-10-04T11:00:00"),
            },
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

    describe("EventPatternを使用した新形式", () => {
        // テスト用のイベント作成ヘルパー
        const createTestEvent = (name: string): Event => ({
            uuid: `test-${name}`,
            name,
            organizer: "test@example.com",
            location: "",
            schedule: {
                start: new Date("2025-10-04T10:00:00"),
                end: new Date("2025-10-04T11:00:00"),
            },
            isCancelled: false,
            isPrivate: false,
        });

        it("コンストラクタで無視パターンを受け取れる", () => {
            const patterns: EventPattern[] = [
                { pattern: "休憩", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
            ];

            const manager = new IgnoreManager({ ignorableEvents: patterns });
            const retrievedPatterns = manager.getIgnorableEventPatterns();

            expect(retrievedPatterns).toHaveLength(2);
            expect(retrievedPatterns[0].pattern).toBe("休憩");
            expect(retrievedPatterns[0].matchMode).toBe("partial");
        });

        it("部分一致（partial）でイベントを無視できる", () => {
            const patterns: EventPattern[] = [{ pattern: "休憩", matchMode: "partial" }];

            const manager = new IgnoreManager({ ignorableEvents: patterns });

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("休憩時間");
            const event3 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("前方一致（prefix）でイベントを無視できる", () => {
            const patterns: EventPattern[] = [{ pattern: "MTG", matchMode: "prefix" }];

            const manager = new IgnoreManager({ ignorableEvents: patterns });

            const event1 = createTestEvent("MTG資料作成");
            const event2 = createTestEvent("MTGの準備");
            const event3 = createTestEvent("朝会MTG");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("後方一致（suffix）でイベントを無視できる", () => {
            const patterns: EventPattern[] = [{ pattern: "会議", matchMode: "suffix" }];

            const manager = new IgnoreManager({ ignorableEvents: patterns });

            const event1 = createTestEvent("定例会議");
            const event2 = createTestEvent("打ち合わせ会議");
            const event3 = createTestEvent("会議の準備");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("複数のパターンを組み合わせられる", () => {
            const patterns: EventPattern[] = [
                { pattern: "休憩", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
                { pattern: "会議", matchMode: "suffix" },
            ];

            const manager = new IgnoreManager({ ignorableEvents: patterns });

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("MTG準備");
            const event3 = createTestEvent("定例会議");
            const event4 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(true);
            expect(manager.ignoreEvent(event4)).toBe(false);
        });

        it("setIgnorableEventPatternsでパターンを更新できる", () => {
            const manager = new IgnoreManager();

            const patterns: EventPattern[] = [{ pattern: "テスト", matchMode: "partial" }];
            manager.setIgnorableEventPatterns(patterns);

            const event = createTestEvent("テスト実行");
            expect(manager.ignoreEvent(event)).toBe(true);
        });

        it("新形式のパターンがある場合は旧形式より優先される", () => {
            const patterns: EventPattern[] = [{ pattern: "休憩", matchMode: "partial" }];

            const manager = new IgnoreManager({ ignorableEvents: patterns });
            // 旧形式も追加
            manager.addIgnoreItem({ type: "event", name: "会議", matchType: "exact" });

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("会議");

            // 新形式のパターンでマッチ
            expect(manager.ignoreEvent(event1)).toBe(true);
            // 新形式のパターンが優先されるため、旧形式の設定は無視される
            expect(manager.ignoreEvent(event2)).toBe(false);
        });

        it("新形式のパターンが空の場合は旧形式が使用される", () => {
            const manager = new IgnoreManager();
            manager.addIgnoreItem({ type: "event", name: "会議", matchType: "exact" });

            const event1 = createTestEvent("会議");
            const event2 = createTestEvent("定例会議");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(false);
        });

        it("空のパターンは無視される", () => {
            const patterns: EventPattern[] = [
                { pattern: "", matchMode: "partial" },
                { pattern: "テスト", matchMode: "partial" },
            ];

            const manager = new IgnoreManager({ ignorableEvents: patterns });

            const event1 = createTestEvent("テスト実行");
            const event2 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(false);
        });
    });
});
