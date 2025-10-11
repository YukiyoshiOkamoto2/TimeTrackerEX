import { Event, Schedule } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmEvent as TimeTrackerAlgorithmHelper } from "./TimeTrackerAlgorithmEvent";

describe("TimeTrackerAlgorithm Methods", () => {
    describe("TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
        });

        const createTestSchedule = (start: Date, end: Date): Schedule => ({
            start,
            end,
        });

        it("DUP01: イベント同士が重複していない場合はfalseを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(false);
        });

        it("DUP02: イベント同士が重複している場合はtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 12, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP03: 自分自身との比較の場合はfalseを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event1];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(false);
        });

        it("DUP04: 複数のイベントのうち1つでも重複していればtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 8, 0), new Date(2024, 1, 3, 8, 30));
            const event3 = createTestEvent("e3", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 12, 0));
            const events = [event2, event3];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP05: スケジュールがイベントと重複していない場合はfalseを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const event = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(schedule, events);

            expect(result).toBe(false);
        });

        it("DUP06: スケジュールがイベントと重複している場合はtrueを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const event = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 12, 0));
            const events = [event];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(schedule, events);

            expect(result).toBe(true);
        });

        it("DUP07: イベント配列が空の場合はfalseを返す", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event, events);

            expect(result).toBe(false);
        });

        it("DUP08: イベントが完全に包含される場合はtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 12, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP09: イベントが他のイベントを完全に包含する場合はtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 12, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP10: 開始時刻と終了時刻がぴったり一致する場合は重複とみなさない", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(false);
        });

        it("DUP11: 1分だけ重複している場合はtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 1));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP12: 自分自身を含む複数イベントがあり、他と重複していなければfalseを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 3, 11, 0), new Date(2024, 1, 3, 12, 0));
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(false);
        });

        it("DUP13: 同じ時刻のイベントが複数ある場合、自分以外と重複していればtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });

        it("DUP14: 日をまたぐイベントは基準日が異なるため重複と判定されない", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 23, 0), new Date(2024, 1, 4, 1, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 4, 0, 0), new Date(2024, 1, 4, 2, 0));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            // 基準日が異なるため重複と判定されない（event1の基準日: 2024-01-03, event2の基準日: 2024-01-04）
            expect(result).toBe(false);
        });

        it("DUP15: 同じ日の午前0時前後で重複している場合はtrueを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 22, 0), new Date(2024, 1, 3, 23, 30));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 23, 0), new Date(2024, 1, 3, 23, 59));
            const events = [event2];

            const result = TimeTrackerAlgorithmHelper.isDuplicateEventOrSchedule(event1, events);

            expect(result).toBe(true);
        });
    });

    describe("TimeTrackerAlgorithmHelper.getRecurrenceEvent", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date, recurrence?: Date[]): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
            recurrence,
        });

        it("GRE01: recurrenceがundefinedの場合は空配列を返す", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toEqual([]);
        });

        it("GRE02: recurrenceがnullの場合は空配列を返す", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), null as any);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toEqual([]);
        });

        it("GRE03: recurrenceが空配列の場合は空配列を返す", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), []);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toEqual([]);
        });

        it("GRE04: 繰り返し日が1つある場合、1つのイベントが生成される", () => {
            const event = createTestEvent(
                "e1",
                new Date(2024, 1, 3, 9, 0),
                new Date(2024, 1, 3, 10, 0),
                [new Date(2024, 1, 4)], // 翌日
            );

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
        });

        it("GRE05: 繰り返し日が複数ある場合、複数のイベントが生成される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 4),
                new Date(2024, 1, 5),
                new Date(2024, 1, 6),
            ]);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(3);
        });

        it("GRE06: 元のイベントと同じ日付は除外される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 3), // 同じ日
                new Date(2024, 1, 4),
            ]);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            // 同じ日は除外されるので1つだけ
            expect(result).toHaveLength(1);
            expect(result[0].schedule.start.getDate()).toBe(4);
        });

        it("GRE07: 繰り返しイベントは元の時刻を保持する", () => {
            const event = createTestEvent(
                "e1",
                new Date(2024, 1, 3, 14, 30, 45), // 14:30:45
                new Date(2024, 1, 3, 16, 15, 30), // 16:15:30
                [new Date(2024, 1, 5)],
            );

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            expect(result[0].schedule.start.getHours()).toBe(14);
            expect(result[0].schedule.start.getMinutes()).toBe(30);
            expect(result[0].schedule.start.getSeconds()).toBe(45);
            expect(result[0].schedule.end?.getHours()).toBe(16);
            expect(result[0].schedule.end?.getMinutes()).toBe(15);
            expect(result[0].schedule.end?.getSeconds()).toBe(30);
        });

        it("GRE08: 繰り返しイベントの日付は繰り返し日の日付になる", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 10),
            ]);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            expect(result[0].schedule.start.getFullYear()).toBe(2024);
            expect(result[0].schedule.start.getMonth()).toBe(1);
            expect(result[0].schedule.start.getDate()).toBe(10);
        });

        it("GRE09: 生成されたイベントのrecurrenceはundefinedになる", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 4),
                new Date(2024, 1, 5),
            ]);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(2);
            result.forEach((recEvent) => {
                expect(recEvent.recurrence).toBeUndefined();
            });
        });

        it("GRE10: 生成されたイベントは元のイベントのプロパティを継承する", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 4),
            ]);
            event.name = "定例会議";
            event.location = "会議室A";
            event.isPrivate = true;

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("定例会議");
            expect(result[0].location).toBe("会議室A");
            expect(result[0].isPrivate).toBe(true);
        });

        it("GRE11: UUIDは新しく生成される", () => {
            const event = createTestEvent("original-uuid", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0), [
                new Date(2024, 1, 4),
            ]);

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            // 新しいUUIDが生成されるため、元のUUIDとは異なる
            expect(result[0].uuid).not.toBe("original-uuid");
        });

        it("GRE12: 異なる月の繰り返し日も正しく処理される", () => {
            const event = createTestEvent(
                "e1",
                new Date(2024, 0, 15, 9, 0), // 1月15日
                new Date(2024, 0, 15, 10, 0),
                [
                    new Date(2024, 1, 15), // 2月15日
                    new Date(2024, 2, 15), // 3月15日
                ],
            );

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(2);
            expect(result[0].schedule.start.getMonth()).toBe(1); // 2月
            expect(result[0].schedule.start.getDate()).toBe(15);
            expect(result[1].schedule.start.getMonth()).toBe(2); // 3月
            expect(result[1].schedule.start.getDate()).toBe(15);
        });

        it("GRE13: 異なる年の繰り返し日も正しく処理される", () => {
            const event = createTestEvent(
                "e1",
                new Date(2024, 11, 1, 9, 0), // 2024年12月1日
                new Date(2024, 11, 1, 10, 0),
                [new Date(2025, 0, 1)], // 2025年1月1日
            );

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            expect(result[0].schedule.start.getFullYear()).toBe(2025);
            expect(result[0].schedule.start.getMonth()).toBe(0); // 1月
            expect(result[0].schedule.start.getDate()).toBe(1);
        });

        it("GRE14: 終了時刻がundefinedの場合も正しく処理される", () => {
            const event: Event = {
                uuid: "e1",
                name: "Event 1",
                organizer: "test@example.com",
                isPrivate: false,
                isCancelled: false,
                location: "",
                schedule: {
                    start: new Date(2024, 1, 3, 9, 0),
                    end: undefined,
                },
                recurrence: [new Date(2024, 1, 4)],
            };

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            expect(result).toHaveLength(1);
            expect(result[0].schedule.end).toBeUndefined();
        });

        it("GRE15: 過去と未来の繰り返し日が混在している場合", () => {
            const event = createTestEvent(
                "e1",
                new Date(2024, 1, 15, 9, 0), // 2月15日
                new Date(2024, 1, 15, 10, 0),
                [
                    new Date(2024, 1, 10), // 2月10日（過去）
                    new Date(2024, 1, 20), // 2月20日（未来）
                    new Date(2024, 1, 25), // 2月25日（未来）
                ],
            );

            const result = TimeTrackerAlgorithmHelper.getRecurrenceEvent(event);

            // すべての繰り返し日でイベントが生成される（基準日と異なれば）
            expect(result).toHaveLength(3);
        });
    });

    describe("TimeTrackerAlgorithmHelper.getAllEventInScheduleRange", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
        });

        const createTestSchedule = (start: Date, end: Date): Schedule => ({
            start,
            end,
        });

        it("GEISR01: スケジュールが未指定の場合、すべてのイベントを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 10, 9, 0), new Date(2024, 1, 10, 10, 0));
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events);

            expect(result).toHaveLength(3);
            expect(result).toEqual(events);
        });

        it("GEISR02: スケジュールが空配列の場合、すべてのイベントを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0));
            const events = [event1, event2];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, []);

            expect(result).toHaveLength(2);
            expect(result).toEqual(events);
        });

        it("GEISR03: スケジュール範囲内のイベントのみを返す", () => {
            const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));
            const schedule3 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲内
            const event4 = createTestEvent("e4", new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 10, 0)); // 範囲内
            const event5 = createTestEvent("e5", new Date(2024, 1, 8, 9, 0), new Date(2024, 1, 8, 10, 0)); // 範囲外
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e2", "e3", "e4"]);
        });

        it("GEISR04: スケジュール範囲の最小日のイベントを含む", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内(境界)
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲外
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e2");
        });

        it("GEISR05: スケジュール範囲の最大日のイベントを含む", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内(境界)
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲外
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e2");
        });

        it("GEISR06: スケジュールが時系列順でない場合も正しく処理される", () => {
            const schedule1 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
            const schedule3 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲内
            const event4 = createTestEvent("e4", new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 10, 0)); // 範囲内
            const event5 = createTestEvent("e5", new Date(2024, 1, 8, 9, 0), new Date(2024, 1, 8, 10, 0)); // 範囲外
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e2", "e3", "e4"]);
        });

        it("GEISR07: イベントが空配列の場合、空配列を返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange([], [schedule]);

            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
        });

        it("GEISR08: すべてのイベントが範囲外の場合、空配列を返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 10, 9, 0), new Date(2024, 1, 10, 10, 0));
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
        });

        it("GEISR09: すべてのイベントが範囲内の場合、すべてのイベントを返す", () => {
            const schedule1 = createTestSchedule(new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0));
            const schedule3 = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result).toEqual(events);
        });

        it("GEISR10: 月をまたぐスケジュール範囲", () => {
            const schedule1 = createTestSchedule(new Date(2024, 0, 30, 9, 0), new Date(2024, 0, 30, 18, 0)); // 1月30日
            const schedule2 = createTestSchedule(new Date(2024, 0, 31, 9, 0), new Date(2024, 0, 31, 18, 0)); // 1月31日
            const schedule3 = createTestSchedule(new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 18, 0)); // 2月1日

            const event1 = createTestEvent("e1", new Date(2024, 0, 29, 9, 0), new Date(2024, 0, 29, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 0, 30, 9, 0), new Date(2024, 0, 30, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 0, 31, 9, 0), new Date(2024, 0, 31, 10, 0)); // 範囲内
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 範囲内
            const event5 = createTestEvent("e5", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0)); // 範囲外
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e2", "e3", "e4"]);
        });

        it("GEISR11: 年をまたぐスケジュール範囲", () => {
            const schedule1 = createTestSchedule(new Date(2024, 11, 30, 9, 0), new Date(2024, 11, 30, 18, 0)); // 12月30日
            const schedule2 = createTestSchedule(new Date(2024, 11, 31, 9, 0), new Date(2024, 11, 31, 18, 0)); // 12月31日
            const schedule3 = createTestSchedule(new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 18, 0)); // 1月1日

            const event1 = createTestEvent("e1", new Date(2024, 11, 29, 9, 0), new Date(2024, 11, 29, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 11, 30, 9, 0), new Date(2024, 11, 30, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 11, 31, 9, 0), new Date(2024, 11, 31, 10, 0)); // 範囲内
            const event4 = createTestEvent("e4", new Date(2025, 0, 1, 9, 0), new Date(2025, 0, 1, 10, 0)); // 範囲内
            const event5 = createTestEvent("e5", new Date(2025, 0, 2, 9, 0), new Date(2025, 0, 2, 10, 0)); // 範囲外
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e2", "e3", "e4"]);
        });

        it("GEISR12: スケジュールが1日のみの場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲外
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e2");
        });

        it("GEISR13: イベントの時刻は関係なく日付のみでフィルタリング", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));

            // 同じ日付で異なる時刻のイベント
            const event1 = createTestEvent("e1", new Date(2024, 1, 5, 0, 0), new Date(2024, 1, 5, 1, 0)); // 範囲内
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 12, 0), new Date(2024, 1, 5, 13, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 1, 5, 23, 0), new Date(2024, 1, 5, 23, 59)); // 範囲内
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e2", "e3"]);
        });

        it("GEISR14: イベントが時系列順でない場合も元の順序を保持", () => {
            const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 10, 0)); // 範囲内
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 1, 10, 9, 0), new Date(2024, 1, 10, 10, 0)); // 範囲外
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule1, schedule2]);

            expect(result).toHaveLength(2);
            // 元の順序を保持
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e2"]);
        });

        it("GEISR15: 閏年の2月29日を含むスケジュール範囲", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 29, 9, 0), new Date(2024, 1, 29, 18, 0)); // 2024年2月29日

            const event1 = createTestEvent("e1", new Date(2024, 1, 28, 9, 0), new Date(2024, 1, 28, 10, 0)); // 範囲外
            const event2 = createTestEvent("e2", new Date(2024, 1, 29, 9, 0), new Date(2024, 1, 29, 10, 0)); // 範囲内
            const event3 = createTestEvent("e3", new Date(2024, 2, 1, 9, 0), new Date(2024, 2, 1, 10, 0)); // 範囲外
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e2");
        });

        it("GEISR16: 勤務日が飛び飛びの場合、勤務日のみのイベントを返す", () => {
            // 2/5, 2/7, 2/9のみが勤務日（2/6, 2/8は含まれない）
            const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0));
            const schedule3 = createTestSchedule(new Date(2024, 1, 9, 9, 0), new Date(2024, 1, 9, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0)); // 勤務日
            const event2 = createTestEvent("e2", new Date(2024, 1, 6, 10, 0), new Date(2024, 1, 6, 11, 0)); // 非勤務日(範囲内だが除外)
            const event3 = createTestEvent("e3", new Date(2024, 1, 7, 10, 0), new Date(2024, 1, 7, 11, 0)); // 勤務日
            const event4 = createTestEvent("e4", new Date(2024, 1, 8, 10, 0), new Date(2024, 1, 8, 11, 0)); // 非勤務日(範囲内だが除外)
            const event5 = createTestEvent("e5", new Date(2024, 1, 9, 10, 0), new Date(2024, 1, 9, 11, 0)); // 勤務日
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e3", "e5"]);
        });

        it("GEISR17: 範囲内でも勤務日リストにない日付は除外される", () => {
            // 2/1と2/10のみが勤務日（間の日付は含まれない）
            const schedule1 = createTestSchedule(new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 18, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 10, 9, 0), new Date(2024, 1, 10, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 勤務日
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0)); // 範囲内だが非勤務日
            const event3 = createTestEvent("e3", new Date(2024, 1, 10, 10, 0), new Date(2024, 1, 10, 11, 0)); // 勤務日
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule1, schedule2]);

            expect(result).toHaveLength(2);
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e3"]);
        });

        it("GEISR18: 同じ日付に複数のスケジュールがある場合も正しく処理される", () => {
            // 2/5に午前と午後のスケジュールがある
            const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 12, 0));
            const schedule2 = createTestSchedule(new Date(2024, 1, 5, 13, 0), new Date(2024, 1, 5, 18, 0));
            const schedule3 = createTestSchedule(new Date(2024, 1, 6, 9, 0), new Date(2024, 1, 6, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0)); // 勤務日
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 14, 0), new Date(2024, 1, 5, 15, 0)); // 勤務日(同日)
            const event3 = createTestEvent("e3", new Date(2024, 1, 6, 10, 0), new Date(2024, 1, 6, 11, 0)); // 勤務日
            const event4 = createTestEvent("e4", new Date(2024, 1, 7, 10, 0), new Date(2024, 1, 7, 11, 0)); // 非勤務日
            const events = [event1, event2, event3, event4];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e2", "e3"]);
        });

        it("GEISR19: 週の中で特定の曜日のみが勤務日の場合", () => {
            // 月・水・金のみが勤務日（2024年2月5日=月, 7日=水, 9日=金）
            const schedule1 = createTestSchedule(new Date(2024, 1, 5, 9, 0), new Date(2024, 1, 5, 18, 0)); // 月
            const schedule2 = createTestSchedule(new Date(2024, 1, 7, 9, 0), new Date(2024, 1, 7, 18, 0)); // 水
            const schedule3 = createTestSchedule(new Date(2024, 1, 9, 9, 0), new Date(2024, 1, 9, 18, 0)); // 金

            const event1 = createTestEvent("e1", new Date(2024, 1, 5, 10, 0), new Date(2024, 1, 5, 11, 0)); // 月(勤務日)
            const event2 = createTestEvent("e2", new Date(2024, 1, 6, 10, 0), new Date(2024, 1, 6, 11, 0)); // 火(非勤務日)
            const event3 = createTestEvent("e3", new Date(2024, 1, 7, 10, 0), new Date(2024, 1, 7, 11, 0)); // 水(勤務日)
            const event4 = createTestEvent("e4", new Date(2024, 1, 8, 10, 0), new Date(2024, 1, 8, 11, 0)); // 木(非勤務日)
            const event5 = createTestEvent("e5", new Date(2024, 1, 9, 10, 0), new Date(2024, 1, 9, 11, 0)); // 金(勤務日)
            const events = [event1, event2, event3, event4, event5];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [
                schedule1,
                schedule2,
                schedule3,
            ]);

            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["e1", "e3", "e5"]);
        });

        it("GEISR20: 勤務日が1日だけで、その前後にイベントがある場合", () => {
            // 2/15のみが勤務日
            const schedule = createTestSchedule(new Date(2024, 1, 15, 9, 0), new Date(2024, 1, 15, 18, 0));

            const event1 = createTestEvent("e1", new Date(2024, 1, 14, 10, 0), new Date(2024, 1, 14, 11, 0)); // 前日(非勤務日)
            const event2 = createTestEvent("e2", new Date(2024, 1, 15, 10, 0), new Date(2024, 1, 15, 11, 0)); // 勤務日
            const event3 = createTestEvent("e3", new Date(2024, 1, 16, 10, 0), new Date(2024, 1, 16, 11, 0)); // 翌日(非勤務日)
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.getAllEventInScheduleRange(events, [schedule]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e2");
        });
    });
    describe("TimeTrackerAlgorithmHelper.searchNextEvent", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
        });

        it("SNE01: イベント配列が空の場合はundefinedを返す", () => {
            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, [], "small");

            expect(result).toBeUndefined();
        });

        it("SNE02: currentItemがnullで1つのイベントがある場合、そのイベントを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const events = [event1];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e1");
        });

        it("SNE03: currentItemがnullで複数イベント - smallモードで最も小さいイベントを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30)); // 30分
            const events = [event1, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2"); // 30分の方が小さい
        });

        it("SNE04: currentItemがnullで複数イベント - largeモードで最も大きいイベントを返す", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30)); // 30分
            const events = [event1, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "large");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e1"); // 60分の方が大きい
        });

        it("SNE05: currentItemありで次のイベントがない場合はnullを返す", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const events = [current];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).toBeNull();
        });

        it("SNE06: currentItemより後のイベントを返す", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2");
        });

        it("SNE07: currentItemと重複するイベントは調整される", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 30), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2");
            // 重複部分が調整されて10:00から開始になる
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 11, 0).getTime());
        });

        it("SNE08: currentItemと完全に重複するイベントはスキップされる", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // e2はスキップされてe3が返る
        });

        it("SNE09: 複数の候補から開始時刻が最も早いものを選ぶ", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // 10:00開始のe3
        });

        it("SNE10: 開始時刻が同じで重複する場合 - smallモードで小さい方を選ぶ", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 10, 30)); // 30分
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // 小さい方
        });

        it("SNE11: 開始時刻が同じで重複する場合 - largeモードで大きい方を選ぶ", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 10, 30)); // 30分
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "large");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2"); // 大きい方
        });

        it("SNE12: 次のイベントが複数重複している場合 - smallモードで小さい方を選ぶ", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 12, 0)); // 120分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            // smallモードなので小さいe3が選ばれる
            expect(result!.uuid).toBe("e3");
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 11, 0).getTime());
        });

        it("SNE13: 次のイベントが複数重複している場合 - largeモードでそのまま返される", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 12, 0)); // 120分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "large");

            expect(result).not.toBeNull();
            // largeモードなので大きいe2がそのまま返される
            expect(result!.uuid).toBe("e2");
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 12, 0).getTime());
        });

        it("SNE14: currentItemがnullでイベントが時系列順でない場合も正しくソートされる", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [event1, event2, event3]; // 順不同

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2"); // 最も早い9:00のイベント
        });

        it("SNE15: 終了時刻がundefinedのイベントはフィルタリングされる", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            event2.schedule.end = undefined;
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // e2はスキップされる
        });

        it("SNE16: currentItemがnullで終了時刻がundefinedのイベントも含まれる場合", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            event2.schedule.end = undefined;
            const events = [event1, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "small");

            // currentItemがnullの場合は終了時刻undefinedでも返される
            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e1");
        });

        it("SNE17: 開始時刻が同じで長さが異なる複数イベント - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30)); // 30分
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // 最も小さい30分
        });

        it("SNE18: 開始時刻が同じで長さが異なる複数イベント - largeモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30)); // 30分
            const events = [event1, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(null, events, "large");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e1"); // 最も大きい180分
        });

        it("SNE19: currentItemの直後から開始するイベント", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2");
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
        });

        it("SNE20: currentItemより前のイベントは無視される", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // e2は無視される
        });

        it("SNE21: 部分的に重複するイベントの調整", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 30));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const events = [current, event2];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e2");
            // 10:30から開始に調整される
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 30).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 11, 0).getTime());
        });

        it("SNE22: 3つのイベントが重複 - smallモードで最小を選ぶ", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 13, 0)); // 180分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 12, 0)); // 120分
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const events = [current, event2, event3, event4];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            // smallモードなので最小のe4が選ばれる
            expect(result!.uuid).toBe("e4");
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 11, 0).getTime());
        });

        it("SNE23: 3つのイベントが重複 - largeモードで最大をそのまま返す", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 13, 0)); // 180分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 12, 0)); // 120分
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分
            const events = [current, event2, event3, event4];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "large");

            expect(result).not.toBeNull();
            // largeモードなので最大のe2がそのまま返される
            expect(result!.uuid).toBe("e2");
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 13, 0).getTime());
        });

        it("SNE24: 重複調整後に開始と終了が同じになる場合はスキップされる", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const events = [current, event2, event3];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            expect(result!.uuid).toBe("e3"); // e2は完全に重複してスキップされる
        });

        it("SNE25: 複雑なシナリオ - 複数の候補と重複", () => {
            const current = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 30), new Date(2024, 1, 1, 10, 30));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 30), new Date(2024, 1, 1, 11, 30));
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const events = [current, event2, event3, event4];

            const result = TimeTrackerAlgorithmHelper.searchNextEvent(current, events, "small");

            expect(result).not.toBeNull();
            // e2は調整されて10:00-10:30になる
            expect(result!.uuid).toBe("e2");
            expect(result!.schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
            expect(result!.schedule.end!.getTime()).toBe(new Date(2024, 1, 1, 10, 30).getTime());
        });
    });
});
