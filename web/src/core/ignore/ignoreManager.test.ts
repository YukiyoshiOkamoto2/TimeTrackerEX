/**
 * Ignore Manager Tests
 *
 * 無視マネージャーのテスト
 */

import { describe, expect, it } from "vitest";
import type { Event, IgnorableEventPattern, Schedule } from "../../types";
import { IgnoreManager } from "./ignoreManager";

describe("IgnoreManager", () => {
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

    describe("コンストラクタ", () => {
        it("空のパターンで初期化できる", () => {
            const manager = new IgnoreManager();
            expect(manager.getIgnorableEventPatterns()).toHaveLength(0);
        });

        it("無視パターンを受け取れる", () => {
            const patterns: IgnorableEventPattern[] = [
                { pattern: "休憩", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
            ];

            const manager = new IgnoreManager(patterns);
            const retrievedPatterns = manager.getIgnorableEventPatterns();

            expect(retrievedPatterns).toHaveLength(2);
            expect(retrievedPatterns[0].pattern).toBe("休憩");
            expect(retrievedPatterns[0].matchMode).toBe("partial");
        });
    });

    describe("ignoreEvent", () => {
        it("部分一致（partial）でイベントを無視できる", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "休憩", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns);

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("休憩時間");
            const event3 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("前方一致（prefix）でイベントを無視できる", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "MTG", matchMode: "prefix" }];
            const manager = new IgnoreManager(patterns);

            const event1 = createTestEvent("MTG資料作成");
            const event2 = createTestEvent("MTGの準備");
            const event3 = createTestEvent("朝会MTG");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("後方一致（suffix）でイベントを無視できる", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "会議", matchMode: "suffix" }];
            const manager = new IgnoreManager(patterns);

            const event1 = createTestEvent("定例会議");
            const event2 = createTestEvent("打ち合わせ会議");
            const event3 = createTestEvent("会議の準備");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(false);
        });

        it("複数のパターンを組み合わせられる", () => {
            const patterns: IgnorableEventPattern[] = [
                { pattern: "休憩", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
                { pattern: "会議", matchMode: "suffix" },
            ];
            const manager = new IgnoreManager(patterns);

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("MTG準備");
            const event3 = createTestEvent("定例会議");
            const event4 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(true);
            expect(manager.ignoreEvent(event3)).toBe(true);
            expect(manager.ignoreEvent(event4)).toBe(false);
        });

        it("空のパターンは無視される", () => {
            const patterns: IgnorableEventPattern[] = [
                { pattern: "", matchMode: "partial" },
                { pattern: "テスト", matchMode: "partial" },
            ];
            const manager = new IgnoreManager(patterns);

            const event1 = createTestEvent("テスト実行");
            const event2 = createTestEvent("作業");

            expect(manager.ignoreEvent(event1)).toBe(true);
            expect(manager.ignoreEvent(event2)).toBe(false);
        });

        it("パターンが空の場合はfalseを返す", () => {
            const manager = new IgnoreManager([]);

            const event = createTestEvent("テスト");
            expect(manager.ignoreEvent(event)).toBe(false);
        });
    });

    describe("ignoreSchedule", () => {
        const testSchedule: Schedule = {
            start: new Date("2025-10-04T10:00:00"),
            end: new Date("2025-10-04T11:00:00"),
        };

        it("Scheduleは名前を持たないため常にfalseを返す", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "定例会議", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns);

            // Scheduleは名前がないため、マッチしない
            expect(manager.ignoreSchedule(testSchedule)).toBe(false);
        });

        it("パターンがある場合でもfalseを返す", () => {
            const patterns: IgnorableEventPattern[] = [
                { pattern: "会議", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
            ];
            const manager = new IgnoreManager(patterns);

            expect(manager.ignoreSchedule(testSchedule)).toBe(false);
        });
    });

    describe("getIgnorableEventPatterns", () => {
        it("設定されたパターンを取得できる", () => {
            const patterns: IgnorableEventPattern[] = [
                { pattern: "休憩", matchMode: "partial" },
                { pattern: "MTG", matchMode: "prefix" },
            ];
            const manager = new IgnoreManager(patterns);

            const retrieved = manager.getIgnorableEventPatterns();
            expect(retrieved).toHaveLength(2);
            expect(retrieved[0].pattern).toBe("休憩");
            expect(retrieved[1].pattern).toBe("MTG");
        });

        it("コピーを返す（元の配列は変更されない）", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "テスト", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns);

            const retrieved = manager.getIgnorableEventPatterns();
            retrieved.push({ pattern: "追加", matchMode: "partial" });

            // 元のパターンは変更されていない
            expect(manager.getIgnorableEventPatterns()).toHaveLength(1);
        });
    });

    describe("setIgnorableEventPatterns", () => {
        it("パターンを更新できる", () => {
            const manager = new IgnoreManager();
            expect(manager.getIgnorableEventPatterns()).toHaveLength(0);

            const patterns: IgnorableEventPattern[] = [{ pattern: "テスト", matchMode: "partial" }];
            manager.setIgnorableEventPatterns(patterns);

            expect(manager.getIgnorableEventPatterns()).toHaveLength(1);

            const event = createTestEvent("テスト実行");
            expect(manager.ignoreEvent(event)).toBe(true);
        });

        it("既存のパターンを上書きできる", () => {
            const patterns1: IgnorableEventPattern[] = [{ pattern: "休憩", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns1);

            const patterns2: IgnorableEventPattern[] = [{ pattern: "会議", matchMode: "prefix" }];
            manager.setIgnorableEventPatterns(patterns2);

            const event1 = createTestEvent("昼休憩");
            const event2 = createTestEvent("会議資料");

            // 休憩パターンは上書きされている
            expect(manager.ignoreEvent(event1)).toBe(false);
            expect(manager.ignoreEvent(event2)).toBe(true);
        });

        it("空のパターンを設定できる", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "テスト", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns);

            manager.setIgnorableEventPatterns([]);
            expect(manager.getIgnorableEventPatterns()).toHaveLength(0);

            const event = createTestEvent("テスト実行");
            expect(manager.ignoreEvent(event)).toBe(false);
        });
    });

    describe("matchMode動作確認", () => {
        it("partial: 日本語の部分一致が正しく動作する", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "休憩", matchMode: "partial" }];
            const manager = new IgnoreManager(patterns);

            expect(manager.ignoreEvent(createTestEvent("午前の休憩"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("休憩時間です"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("作業中休憩あり"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("作業中"))).toBe(false);
        });

        it("prefix: 日本語の前方一致が正しく動作する", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "定例", matchMode: "prefix" }];
            const manager = new IgnoreManager(patterns);

            expect(manager.ignoreEvent(createTestEvent("定例会議"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("定例MTG"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("朝会定例"))).toBe(false);
        });

        it("suffix: 日本語の後方一致が正しく動作する", () => {
            const patterns: IgnorableEventPattern[] = [{ pattern: "会議", matchMode: "suffix" }];
            const manager = new IgnoreManager(patterns);

            expect(manager.ignoreEvent(createTestEvent("定例会議"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("緊急会議"))).toBe(true);
            expect(manager.ignoreEvent(createTestEvent("会議準備"))).toBe(false);
        });
    });
});
