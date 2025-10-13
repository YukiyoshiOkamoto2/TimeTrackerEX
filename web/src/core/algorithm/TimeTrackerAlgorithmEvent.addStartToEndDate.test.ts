/**
 * TimeTrackerAlgorithmEvent のテスト
 * scheduleToEvent, addStartToEndDate 関数のテスト
 */

import type { Event, Schedule } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

describe("TimeTrackerAlgorithmEvent", () => {
    const createTestSchedule = (start: Date, end: Date): Schedule => ({
        start,
        end,
    });

    const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
        uuid,
        name: `Event ${uuid}`,
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: { start, end },
    });

    describe("addStartToEndDate", () => {
        it("ASED01: 終了日が開始日と同じイベントはそのまま", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-01")![0].uuid).toBe("e1");
        });

        it("ASED02: 終了日がundefinedのイベントはそのまま", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event.schedule.end = undefined;
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
        });

        it("ASED03: 2日間にまたがるイベントを分割", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);

            // 1日目: 22:00-23:30
            const day1Event = result.get("2024-02-01")![0];
            expect(day1Event.schedule.start.getHours()).toBe(22);
            expect(day1Event.schedule.start.getMinutes()).toBe(0);
            expect(day1Event.schedule.end!.getHours()).toBe(23);
            expect(day1Event.schedule.end!.getMinutes()).toBe(30);

            // 2日目: 00:00-02:00
            const day2Event = result.get("2024-02-02")![0];
            expect(day2Event.schedule.start.getHours()).toBe(0);
            expect(day2Event.schedule.start.getMinutes()).toBe(0);
            expect(day2Event.schedule.end!.getHours()).toBe(2);
            expect(day2Event.schedule.end!.getMinutes()).toBe(0);
        });

        it("ASED04: 3日間にまたがるイベントを分割", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 20, 0), new Date(2024, 1, 3, 4, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(3);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
            expect(result.get("2024-02-03")!.length).toBe(1);

            // 1日目: 20:00-23:30
            const day1Event = result.get("2024-02-01")![0];
            expect(day1Event.schedule.start.getHours()).toBe(20);
            expect(day1Event.schedule.end!.getHours()).toBe(23);
            expect(day1Event.schedule.end!.getMinutes()).toBe(30);

            // 2日目(中間日): 00:00-23:30
            const day2Event = result.get("2024-02-02")![0];
            expect(day2Event.schedule.start.getHours()).toBe(0);
            expect(day2Event.schedule.end!.getHours()).toBe(23);
            expect(day2Event.schedule.end!.getMinutes()).toBe(30);

            // 3日目(最終日): 00:00-04:00
            const day3Event = result.get("2024-02-03")![0];
            expect(day3Event.schedule.start.getHours()).toBe(0);
            expect(day3Event.schedule.end!.getHours()).toBe(4);
        });

        it("ASED05: 複数イベントが同じ日に存在する場合", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBe(2); // e1とe2の初日部分
            expect(result.get("2024-02-02")!.length).toBe(1); // e2の2日目部分
        });

        it("ASED06: 分割されたイベントのrecurrenceはundefinedになる", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            event.recurrence = [new Date(2024, 1, 5, 0, 0, 0)];
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            // 1日目は元のrecurrenceを保持
            expect(result.get("2024-02-01")![0].recurrence).toBeDefined();
            // 2日目以降はundefinedになる
            expect(result.get("2024-02-02")![0].recurrence).toBeUndefined();
        });

        it("ASED07: 異なる日付キーに異なるイベント", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 2, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 4, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1]);
            eventMap.set("2024-02-03", [event2]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(4); // 2/1, 2/2, 2/3, 2/4
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
            expect(result.get("2024-02-03")!.length).toBe(1);
            expect(result.get("2024-02-04")!.length).toBe(1);
        });

        it("ASED08: 空のイベントマップ", () => {
            const eventMap = new Map<string, Event[]>();

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(0);
        });

        it("ASED09: 日付キーに空配列", () => {
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", []);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            // 空配列の日付キーは結果に含まれない
            expect(result.size).toBe(0);
        });

        it("ASED10: 丸め単位(30分)が終了時刻に反映される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 20, 0), new Date(2024, 1, 2, 4, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            // 1日目の終了時刻は23:30 (roundingTimeUnit=30)
            const day1Event = result.get("2024-02-01")![0];
            expect(day1Event.schedule.end!.getMinutes()).toBe(30);
        });

        it("ASED11: 月をまたぐイベント", () => {
            const event = createTestEvent("e1", new Date(2024, 0, 31, 22, 0), new Date(2024, 1, 1, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-01-31", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-01-31")!.length).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
        });

        it("ASED12: 年をまたぐイベント", () => {
            const event = createTestEvent("e1", new Date(2023, 11, 31, 22, 0), new Date(2024, 0, 1, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2023-12-31", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2023-12-31")!.length).toBe(1);
            expect(result.get("2024-01-01")!.length).toBe(1);
        });

        it("ASED13: 5日間にまたがる長時間イベント", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 5, 14, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(5);
            // 各日にイベントが存在
            for (let i = 1; i <= 5; i++) {
                const dateKey = `2024-02-0${i}`;
                expect(result.get(dateKey)!.length).toBe(1);
            }

            // 初日は元の開始時刻
            expect(result.get("2024-02-01")![0].schedule.start.getHours()).toBe(10);
            // 最終日は元の終了時刻
            expect(result.get("2024-02-05")![0].schedule.end!.getHours()).toBe(14);
            // 中間日は00:00-23:30
            expect(result.get("2024-02-03")![0].schedule.start.getHours()).toBe(0);
            expect(result.get("2024-02-03")![0].schedule.end!.getHours()).toBe(23);
        });

        it("ASED14: 分割されたイベントのuuidは元のイベントと同じ", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            // 初日は元のuuidを保持
            expect(result.get("2024-02-01")![0].uuid).toBe("e1");
            // 2日目はEventUtils.scheduledで新しいuuidが生成される
            expect(result.get("2024-02-02")![0].uuid).toBeDefined();
            expect(result.get("2024-02-02")![0].uuid).not.toBe("");
        });

        it("ASED15: 複数の日をまたぐイベントが複数存在", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 3, 2, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 20, 0), new Date(2024, 1, 4, 1, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1]);
            eventMap.set("2024-02-02", [event2]);

            const result = TimeTrackerAlgorithmEvent.addStartToEndDate(eventMap);

            expect(result.size).toBe(4);
            // 2/1: e1のみ
            expect(result.get("2024-02-01")!.length).toBe(1);
            // 2/2: e1の2日目 + e2の初日
            expect(result.get("2024-02-02")!.length).toBe(2);
            // 2/3: e1の3日目 + e2の2日目
            expect(result.get("2024-02-03")!.length).toBe(2);
            // 2/4: e2の3日目
            expect(result.get("2024-02-04")!.length).toBe(1);
        });
    });
});
