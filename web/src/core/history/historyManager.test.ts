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
            // 不正なデータを直接保存
            const invalidData = `key,eventName,WorkItemId,itemName,useCount,lastUsedDate
invalid-line
key1,event1,item1,name1,count,2025-10-08 10:30
key2,event2,item2,name2,5
key3,event3,item3,name3,3,2025-10-08 11:45`;
            const rootData = {
                version: 1,
                "time-tracker-history": invalidData,
            };
            localStorage.setItem("time-tracker-data", JSON.stringify(rootData));

            historyManager.load();
            expect(historyManager.getSize()).toBe(1); // key3のみ有効（6カラム形式）
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

        it("同じイベントのマッピングを複数回設定すると使用回数がインクリメントされる", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(testEvent, testWorkItem);

            expect(historyManager.getSize()).toBe(1); // 同じイベントなのでサイズは1

            // 使用回数を確認（getWorkItemIdを呼ばない）
            const entries = historyManager.getAllEntries();
            expect(entries[0].useCount).toBe(3);
        });

        it("getWorkItemIdを呼ぶと使用回数がインクリメントされる", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            // 初期状態の確認
            let entries = historyManager.getAllEntries();
            expect(entries[0].useCount).toBe(1);

            // getWorkItemIdを呼び出す
            const workItemId1 = historyManager.getWorkItemId(testEvent);
            expect(workItemId1).toBe(testWorkItem.id);

            // 使用回数が増加していることを確認
            entries = historyManager.getAllEntries();
            expect(entries[0].useCount).toBe(2);

            // 再度呼び出し
            const workItemId2 = historyManager.getWorkItemId(testEvent);
            expect(workItemId2).toBe(testWorkItem.id);

            // さらに増加していることを確認
            entries = historyManager.getAllEntries();
            expect(entries[0].useCount).toBe(3);
        });

        it("getWorkItemIdを呼ぶと最終使用日時が更新される", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            // 初期状態の日時を取得
            const initialEntries = historyManager.getAllEntries();
            const initialDate = initialEntries[0].lastUsedDate;

            // 少し待機
            const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
            return delay(10).then(() => {
                // getWorkItemIdを呼び出す
                const workItemId = historyManager.getWorkItemId(testEvent);
                expect(workItemId).toBe(testWorkItem.id);

                // 最終使用日時が更新されていることを確認
                const updatedEntries = historyManager.getAllEntries();
                const updatedDate = updatedEntries[0].lastUsedDate;

                expect(updatedDate.getTime()).toBeGreaterThan(initialDate.getTime());
            });
        });

        it("getWorkItemIdでの更新は保存される", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            // 初期の使用回数を確認
            let entries = historyManager.getAllEntries();
            expect(entries[0].useCount).toBe(1);

            // getWorkItemIdを呼び出して使用回数を増やす
            historyManager.getWorkItemId(testEvent);
            historyManager.getWorkItemId(testEvent);
            historyManager.dump();

            // 新しいマネージャーで読み込み
            const newManager = new HistoryManager();
            newManager.load();

            // 使用回数が保存されていることを確認
            entries = newManager.getAllEntries();
            expect(entries[0].useCount).toBe(3);
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

    describe("getAllEntries", () => {
        it("空の履歴で空配列を返す", () => {
            const entries = historyManager.getAllEntries();
            expect(entries).toEqual([]);
        });

        it("すべてのエントリをキーとItemIdの配列で取得できる", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            const event2: Event = { ...testEvent, uuid: "uuid-2", name: "イベント2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789", name: "作業項目2" };
            historyManager.setHistory(event2, workItem2);

            const entries = historyManager.getAllEntries();
            expect(entries).toHaveLength(2);
            expect(entries[0].key).toBe("test-uuid-123|テストイベント|test@example.com");
            expect(entries[0].eventName).toBe("テストイベント");
            expect(entries[0].itemId).toBe("work-item-456");
            expect(entries[0].itemName).toBe("テスト作業項目");
            expect(entries[0].useCount).toBe(1);
            expect(entries[0].lastUsedDate).toBeInstanceOf(Date);

            expect(entries[1].key).toBe("uuid-2|イベント2|test@example.com");
            expect(entries[1].eventName).toBe("イベント2");
            expect(entries[1].itemId).toBe("work-item-789");
            expect(entries[1].itemName).toBe("作業項目2");
            expect(entries[1].useCount).toBe(1);
            expect(entries[1].lastUsedDate).toBeInstanceOf(Date);
        });
    });

    describe("deleteByKey", () => {
        it("キーを指定して履歴を削除できる", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            expect(historyManager.getSize()).toBe(1);

            const result = historyManager.deleteByKey("test-uuid-123|テストイベント|test@example.com");
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(0);
            expect(historyManager.getWorkItemId(testEvent)).toBeNull();
        });

        it("存在しないキーを削除しようとするとfalseを返す", () => {
            const result = historyManager.deleteByKey("non-existent-key");
            expect(result).toBe(false);
            expect(historyManager.getSize()).toBe(0);
        });

        it("=を含むキー(デコード済み)で履歴を削除できる", () => {
            const eventWithEquals: Event = {
                ...testEvent,
                name: "イベント=テスト",
            };

            historyManager.setHistory(eventWithEquals, testWorkItem);
            expect(historyManager.getSize()).toBe(1);

            // デコード済みのキーで削除
            const result = historyManager.deleteByKey("test-uuid-123|イベント=テスト|test@example.com");
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(0);
            expect(historyManager.getWorkItemId(eventWithEquals)).toBeNull();
        });

        it("複数のエントリから特定のキーだけ削除できる", () => {
            const event2: Event = { ...testEvent, uuid: "uuid-2", name: "イベント2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789" };

            const event3: Event = { ...testEvent, uuid: "uuid-3", name: "イベント3" };
            const workItem3: WorkItem = { ...testWorkItem, id: "work-item-999" };

            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(event2, workItem2);
            historyManager.setHistory(event3, workItem3);
            expect(historyManager.getSize()).toBe(3);

            // 2番目のエントリを削除
            const result = historyManager.deleteByKey("uuid-2|イベント2|test@example.com");
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(2);

            // 残りのエントリは維持されている
            expect(historyManager.getWorkItemId(testEvent)).toBe("work-item-456");
            expect(historyManager.getWorkItemId(event2)).toBeNull();
            expect(historyManager.getWorkItemId(event3)).toBe("work-item-999");
        });

        it("削除後にStorageに自動保存される", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            historyManager.deleteByKey("test-uuid-123|テストイベント|test@example.com");

            // 新しいインスタンスで読み込んで確認
            const newHistory = new HistoryManager();
            newHistory.load();
            expect(newHistory.getSize()).toBe(0);
        });

        it("複数の=を含むキーでも削除できる", () => {
            const eventWithMultipleEquals: Event = {
                ...testEvent,
                name: "a=b=c",
                organizer: "test=user@example.com",
            };

            historyManager.setHistory(eventWithMultipleEquals, testWorkItem);
            expect(historyManager.getSize()).toBe(1);

            // デコード済みのキーで削除
            const result = historyManager.deleteByKey("test-uuid-123|a=b=c|test=user@example.com");
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(0);
        });
    });

    describe("getAllEntries と deleteByKey の統合", () => {
        it("getAllEntriesで取得したキーをdeleteByKeyで削除できる", () => {
            historyManager.setHistory(testEvent, testWorkItem);

            const event2: Event = { ...testEvent, uuid: "uuid-2", name: "イベント2" };
            const workItem2: WorkItem = { ...testWorkItem, id: "work-item-789" };
            historyManager.setHistory(event2, workItem2);

            // すべてのエントリを取得
            const entries = historyManager.getAllEntries();
            expect(entries).toHaveLength(2);

            // 最初のエントリのキーで削除
            const result = historyManager.deleteByKey(entries[0].key);
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(1);

            // 残っているエントリを確認
            const remainingEntries = historyManager.getAllEntries();
            expect(remainingEntries).toHaveLength(1);

            // 2番目のエントリは残っている
            // Note: entries[0]とevent2が同じイベントの場合は削除されてしまうため、
            // 残っているエントリのitemIdを確認
            expect(remainingEntries[0].itemId).toBe("work-item-789");
        });

        it("=を含むキーでもgetAllEntriesとdeleteByKeyが連携して動作する", () => {
            const eventWithEquals: Event = {
                ...testEvent,
                name: "イベント=テスト",
            };

            historyManager.setHistory(eventWithEquals, testWorkItem);

            // getAllEntriesで取得したキーはデコード済み
            const entries = historyManager.getAllEntries();
            expect(entries[0].key).toBe("test-uuid-123|イベント=テスト|test@example.com");

            // そのキーを使って削除できる
            const result = historyManager.deleteByKey(entries[0].key);
            expect(result).toBe(true);
            expect(historyManager.getSize()).toBe(0);
        });

        it("複数エントリを順次削除できる", () => {
            // 5つのエントリを追加
            for (let i = 0; i < 5; i++) {
                const event: Event = { ...testEvent, uuid: `uuid-${i}`, name: `イベント${i}` };
                const workItem: WorkItem = { ...testWorkItem, id: `work-item-${i}` };
                historyManager.setHistory(event, workItem);
            }
            expect(historyManager.getSize()).toBe(5);

            // すべてのエントリを取得
            const entries = historyManager.getAllEntries();
            expect(entries).toHaveLength(5);

            // 偶数インデックスのエントリを削除
            for (let i = 0; i < entries.length; i += 2) {
                const result = historyManager.deleteByKey(entries[i].key);
                expect(result).toBe(true);
            }

            expect(historyManager.getSize()).toBe(2); // 奇数インデックスの2つが残る

            // 残ったエントリを確認
            const remainingEntries = historyManager.getAllEntries();
            expect(remainingEntries).toHaveLength(2);
            expect(remainingEntries[0].key).toBe("uuid-1|イベント1|test@example.com");
            expect(remainingEntries[1].key).toBe("uuid-3|イベント3|test@example.com");
        });
    });

    describe("CSV形式の保存と読み込み", () => {
        beforeEach(() => {
            localStorageMock.clear();
            historyManager = new HistoryManager();
        });

        it("CSV形式のヘッダー行が含まれる", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            const rootData = localStorageMock.getItem("time-tracker-data");
            expect(rootData).not.toBeNull();
            if (rootData) {
                const parsed = JSON.parse(rootData);
                const historyData = parsed["time-tracker-history"];
                expect(historyData).toContain("key,eventName,WorkItemId,itemName,useCount,lastUsedDate");
            }
        });

        it("key,eventName,WorkItemId,項目名,使用回数,最終使用日時の形式で保存される", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            const rootData = localStorageMock.getItem("time-tracker-data");
            expect(rootData).not.toBeNull();
            if (rootData) {
                const parsed = JSON.parse(rootData);
                const historyData = parsed["time-tracker-history"];
                // CSV形式: key,eventName,WorkItemId,itemName,useCount,lastUsedDate (6カラム)
                const lines = historyData.split("\n");
                expect(lines[0]).toBe("key,eventName,WorkItemId,itemName,useCount,lastUsedDate");
                expect(lines[1]).toMatch(
                    /^test-uuid-123\|テストイベント\|test@example\.com,テストイベント,work-item-456,テスト作業項目,1,\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
                );
            }
        });

        it("使用回数がインクリメントされて保存される", () => {
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            const rootData = localStorageMock.getItem("time-tracker-data");
            expect(rootData).not.toBeNull();
            if (rootData) {
                const parsed = JSON.parse(rootData);
                const historyData = parsed["time-tracker-history"];
                // 使用回数が3になっている
                expect(historyData).toMatch(/work-item-456,テスト作業項目,3,/);
            }
        });

        it("カンマを含む項目名が正しくエスケープされる", () => {
            const workItemWithComma: WorkItem = { ...testWorkItem, name: "作業項目1,作業項目2" };
            historyManager.setHistory(testEvent, workItemWithComma);
            historyManager.dump();

            const rootData = localStorageMock.getItem("time-tracker-data");
            expect(rootData).not.toBeNull();
            if (rootData) {
                const parsed = JSON.parse(rootData);
                const historyData = parsed["time-tracker-history"];
                // CSV形式でカンマがエスケープされている
                expect(historyData).toMatch(/work-item-456,作業項目1\\,作業項目2,1,/);
            }

            // 再読み込みしても正しく復元される
            const newManager = new HistoryManager();
            newManager.load();
            const entries = newManager.getAllEntries();
            expect(entries[0].itemName).toBe("作業項目1,作業項目2");
        });

        it("CSV形式のデータを正しく保存・読み込みできる", () => {
            // データを追加して保存
            historyManager.setHistory(testEvent, testWorkItem);
            historyManager.dump();

            // 新しいマネージャーで読み込み
            const newManager = new HistoryManager();
            newManager.load();

            const entries = newManager.getAllEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].key).toBe("test-uuid-123|テストイベント|test@example.com");
            expect(entries[0].eventName).toBe("テストイベント");
            expect(entries[0].itemId).toBe("work-item-456");
            expect(entries[0].itemName).toBe("テスト作業項目");
            expect(entries[0].useCount).toBe(1);
            expect(entries[0].lastUsedDate).toBeInstanceOf(Date);

            // CSV形式で保存されていることを確認
            const rootData = localStorageMock.getItem("time-tracker-data");
            expect(rootData).not.toBeNull();
            if (rootData) {
                const parsed = JSON.parse(rootData);
                const historyData = parsed["time-tracker-history"];
                const lines = historyData.split("\n");
                expect(lines[0]).toBe("key,eventName,WorkItemId,itemName,useCount,lastUsedDate");
                expect(lines.length).toBe(2); // ヘッダー + 1エントリ
            }
        });

        it("使用回数の降順でソートされる", () => {
            const event1: Event = { ...testEvent, uuid: "uuid-1" };
            const event2: Event = { ...testEvent, uuid: "uuid-2" };
            const event3: Event = { ...testEvent, uuid: "uuid-3" };

            const workItem1: WorkItem = { ...testWorkItem, id: "item-1", name: "項目1" };
            const workItem2: WorkItem = { ...testWorkItem, id: "item-2", name: "項目2" };
            const workItem3: WorkItem = { ...testWorkItem, id: "item-3", name: "項目3" };

            // 使用回数を変えて追加
            historyManager.setHistory(event1, workItem1); // 1回
            historyManager.setHistory(event2, workItem2); // 3回
            historyManager.setHistory(event2, workItem2);
            historyManager.setHistory(event2, workItem2);
            historyManager.setHistory(event3, workItem3); // 2回
            historyManager.setHistory(event3, workItem3);

            const entries = historyManager.getAllEntries();
            expect(entries).toHaveLength(3);
            // 使用回数の降順: item-2(3回) > item-3(2回) > item-1(1回)
            expect(entries[0].itemId).toBe("item-2");
            expect(entries[0].useCount).toBe(3);
            expect(entries[1].itemId).toBe("item-3");
            expect(entries[1].useCount).toBe(2);
            expect(entries[2].itemId).toBe("item-1");
            expect(entries[2].useCount).toBe(1);
        });

        it("CSV形式のデータを読み込める", () => {
            // CSV形式のデータを設定 (key,eventName,WorkItemId,itemName,useCount,lastUsedDate)
            const csvData = `key,eventName,WorkItemId,itemName,useCount,lastUsedDate
key1,イベント1,work-item-1,項目1,5,2025-10-08 10:30
key2,イベント2,work-item-2,項目2,3,2025-10-08 11:45
key3,イベント3\\,サブイベント,work-item-3,項目3\\,サブ項目,1,2025-10-08 09:15`;

            const rootData = {
                version: 1,
                "time-tracker-history": csvData,
            };
            localStorageMock.setItem("time-tracker-data", JSON.stringify(rootData));

            const newManager = new HistoryManager();
            newManager.load();

            const entries = newManager.getAllEntries();
            expect(entries).toHaveLength(3);

            // CSV形式から正しく読み込まれる
            const item1 = entries.find((e) => e.itemId === "work-item-1");
            expect(item1?.eventName).toBe("イベント1");
            expect(item1?.itemName).toBe("項目1");
            expect(item1?.useCount).toBe(5);
            expect(item1?.lastUsedDate).toBeInstanceOf(Date);

            // カンマがエスケープされた項目名も正しく読み込まれる
            const item3 = entries.find((e) => e.itemId === "work-item-3");
            expect(item3?.eventName).toBe("イベント3,サブイベント");
            expect(item3?.itemName).toBe("項目3,サブ項目");
        });
    });
});
