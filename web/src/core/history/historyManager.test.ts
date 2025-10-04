/**
 * History Manager Tests
 *
 * 履歴マネージャーのテスト
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Event, WorkItem } from "../../types";
import { HistoryManager, getHistoryManager, resetHistoryManager } from "./historyManager";

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
    };
})();

Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});

describe("HistoryManager", () => {
    let historyManager: HistoryManager;
    let testEvent: Event;
    let testWorkItem: WorkItem;

    beforeEach(() => {
        localStorageMock.clear();
        historyManager = new HistoryManager();

        // テスト用データ
        testEvent = {
            uuid: "test-uuid-123",
            name: "テストイベント",
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "テスト場所",
            schedule: {
                start: new Date("2025-10-04T09:00:00"),
                end: new Date("2025-10-04T10:00:00"),
            },
        };

        testWorkItem = {
            id: "work-item-456",
            name: "テスト作業項目",
            folderName: "テストフォルダ",
            folderPath: "/test/folder",
        };
    });

    afterEach(() => {
        resetHistoryManager();
    });

    describe("load と dump", () => {
        it("空の履歴を初期化できる", () => {
            historyManager.load();
            expect(historyManager.getSize()).toBe(0);
        });

        it("履歴を保存して読み込める", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            const newHistory = new HistoryManager();
            newHistory.load();

            const workItemId = newHistory.getWorkItemId(testEvent);
            expect(workItemId).toBe(testWorkItem.id);
        });

        it("複数の履歴を保存して読み込める", () => {
            const event2: Event = { ...testEvent, uuid: "uuid-2", name: "イベント2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789" };

            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(event2, workItem2);
            historyManager.dump();

            const newHistory = new HistoryManager();
            newHistory.load();

            expect(newHistory.getWorkItemId(testEvent)).toBe(testWorkItem.id);
            expect(newHistory.getWorkItemId(event2)).toBe(workItem2.id);
            expect(newHistory.getSize()).toBe(2);
        });

        it("不正なデータをスキップする", () => {
            // 不正なデータを直接保存 (Storageシステムは構造化データで保存するため)
            const invalidData = "invalid-line\nkey1=value1\n=value2\nkey3=";
            const rootData = {
                version: 1,
                "time-tracker-history": invalidData,
            };
            localStorage.setItem("time-tracker-data", JSON.stringify(rootData));

            historyManager.load();
            expect(historyManager.getSize()).toBe(1); // key1=value1 のみ有効
        });
    });

    describe("setHistory と getWorkItemId", () => {
        it("イベントと作業項目をマッピングできる", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            const workItemId = historyManager.getWorkItemId(testEvent);
            expect(workItemId).toBe(testWorkItem.id);
        });

        it("存在しないイベントはnullを返す", () => {
            const workItemId = historyManager.getWorkItemId(testEvent);
            expect(workItemId).toBeNull();
        });

        it("同じイベントのマッピングを上書きできる", () => {
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-999" };

            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(testEvent, workItem2);

            const workItemId = historyManager.getWorkItemId(testEvent);
            expect(workItemId).toBe(workItem2.id);
            expect(historyManager.getSize()).toBe(1); // 上書きされるのでサイズは1
        });

        it("イベントキーに = が含まれていても正しく処理できる", () => {
            const eventWithEquals: Event = {
                ...testEvent,
                name: "イベント=テスト",
            };

            historyManager.setHistory(eventWithEquals, testWorkItem);

            const workItemId = historyManager.getWorkItemId(eventWithEquals);
            expect(workItemId).toBe(testWorkItem.id);
        });
    });

    describe("checkWorkItemId", () => {
        it("有効な作業項目IDは残る", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            historyManager.checkWorkItemId([testWorkItem]);

            expect(historyManager.getWorkItemId(testEvent)).toBe(testWorkItem.id);
        });

        it("無効な作業項目IDは削除される", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            // 別の作業項目リストでチェック
            const otherWorkItem: WorkItem = { ...testWorkItem, id: "other-id" };
            historyManager.checkWorkItemId([otherWorkItem]);

            expect(historyManager.getWorkItemId(testEvent)).toBeNull();
            expect(historyManager.getSize()).toBe(0);
        });

        it("複数の作業項目を一度にチェックできる", () => {
            const event2: Event = { ...testEvent, uuid: "uuid-2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789" };
            const event3: Event = { ...testEvent, uuid: "uuid-3" };
            const workItem3: WorkItem = { ...testWorkItem, id: "work-item-999" };

            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(event2, workItem2);
            historyManager.setHistory(event3, workItem3);

            // workItem と workItem3 のみ有効
            historyManager.checkWorkItemId([testWorkItem, workItem3]);

            expect(historyManager.getWorkItemId(testEvent)).toBe(testWorkItem.id);
            expect(historyManager.getWorkItemId(event2)).toBeNull();
            expect(historyManager.getWorkItemId(event3)).toBe(workItem3.id);
            expect(historyManager.getSize()).toBe(2);
        });
    });

    describe("最大サイズ管理", () => {
        it("最大サイズを超えると古いエントリが削除される", () => {
            const smallHistory = new HistoryManager({ maxSize: 3 });

            const events: Event[] = [];
            const workItems: WorkItem[] = [];

            // 4つのエントリを追加
            for (let i = 0; i < 4; i++) {
                const event: Event = { ...testEvent, uuid: `uuid-${i}` };
                const workItem: WorkItem = { ...testWorkItem, id: `work-item-${i}` };
                events.push(event);
                workItems.push(workItem);
                smallHistory.setHistory(event, workItem);
            }

            expect(smallHistory.getSize()).toBe(3);
            expect(smallHistory.getWorkItemId(events[0])).toBeNull(); // 最も古いエントリは削除
            expect(smallHistory.getWorkItemId(events[1])).toBe("work-item-1");
            expect(smallHistory.getWorkItemId(events[2])).toBe("work-item-2");
            expect(smallHistory.getWorkItemId(events[3])).toBe("work-item-3");
        });

        it("読み込み時に最大サイズを超えるデータは切り捨てられる", () => {
            const smallHistory = new HistoryManager({ maxSize: 2 });

            // 3つのエントリを追加
            for (let i = 0; i < 3; i++) {
                const event: Event = { ...testEvent, uuid: `uuid-${i}` };
                const workItem: WorkItem = { ...testWorkItem, id: `work-item-${i}` };
                smallHistory.setHistory(event, workItem);
            }
            smallHistory.dump();

            // 新しいインスタンスで読み込み
            const newHistory = new HistoryManager({ maxSize: 2 });
            newHistory.load();

            // 最初の2つだけ読み込まれる
            expect(newHistory.getSize()).toBe(2);
        });
    });

    describe("clear", () => {
        it("すべての履歴をクリアできる", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            expect(historyManager.getSize()).toBe(1);

            historyManager.clear();
            expect(historyManager.getSize()).toBe(0);
            expect(historyManager.getWorkItemId(testEvent)).toBeNull();
        });

        it("クリア後もLocalStorageは更新される", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            historyManager.clear();

            const newHistory = new HistoryManager();
            newHistory.load();
            expect(newHistory.getSize()).toBe(0);
        });
    });

    describe("getHistoryManager (シングルトン)", () => {
        it("同じインスタンスを返す", () => {
            const instance1 = getHistoryManager();
            const instance2 = getHistoryManager();

            expect(instance1).toBe(instance2);
        });

        it("データが共有される", () => {
            const instance1 = getHistoryManager();
            instance1.setHistory(testEvent, testWorkItem);

            const instance2 = getHistoryManager();
            expect(instance2.getWorkItemId(testEvent)).toBe(testWorkItem.id);
        });

        it("resetHistoryManager で新しいインスタンスが作成される", () => {
            const instance1 = getHistoryManager();
            instance1.setHistory(testEvent, testWorkItem);

            resetHistoryManager();

            const instance2 = getHistoryManager();
            expect(instance1).not.toBe(instance2);
        });
    });

    describe("getAll", () => {
        it("すべてのエントリを取得できる", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            const event2: Event = { ...testEvent, uuid: "uuid-2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789" };
            historyManager.setHistory(event2, workItem2);

            const all = historyManager.getAll();
            expect(all.size).toBe(2);
            expect(all.has(`test-uuid-123|テストイベント|test@example.com`)).toBe(true);
            expect(all.has(`uuid-2|テストイベント|test@example.com`)).toBe(true);
        });
    });
});
