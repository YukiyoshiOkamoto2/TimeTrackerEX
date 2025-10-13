/**
 * Utils Tests
 */

import { describe, expect, it } from "vitest";
import { EventUtils, ScheduleUtils, createEvent, createSchedule } from "./utils";

describe("ScheduleUtils", () => {
    describe("isSchedule", () => {
        it("SUTIL01: 有効なScheduleオブジェクトの場合はtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T18:00:00"));

            expect(ScheduleUtils.isSchedule(schedule)).toBe(true);
        });

        it("SUTIL02: 無効なオブジェクトの場合はfalseを返す", () => {
            const invalid = {
                start: "2024-01-01", // Date型ではない
                end: new Date("2024-01-01T18:00:00"),
            };

            expect(ScheduleUtils.isSchedule(invalid)).toBe(false);
        });

        it("SUTIL03: nullの場合はfalseを返す", () => {
            expect(ScheduleUtils.isSchedule(null)).toBe(false);
        });

        it("SUTIL04: undefinedの場合はfalseを返す", () => {
            expect(ScheduleUtils.isSchedule(undefined)).toBe(false);
        });

        it("SUTIL05: 空オブジェクトの場合はfalseを返す", () => {
            expect(ScheduleUtils.isSchedule({})).toBe(false);
        });

        it("SUTIL06: 有給休暇のScheduleもtrueを返す", () => {
            const schedule = createSchedule(
                new Date("2024-01-01T00:00:00"),
                new Date("2024-01-01T23:59:59"),
                true,
                true,
            );

            expect(ScheduleUtils.isSchedule(schedule)).toBe(true);
        });
    });

    describe("getRange", () => {
        it("SUTIL07: 開始時間と終了時間がある場合、時間差をミリ秒で返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T18:00:00"));

            const range = ScheduleUtils.getRange(schedule);

            expect(range).toBe(9 * 60 * 60 * 1000); // 9時間 = 32,400,000ミリ秒
        });

        it("SUTIL08: 終了時間がない場合、nullを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), null);

            const range = ScheduleUtils.getRange(schedule);

            expect(range).toBeNull();
        });

        it("SUTIL09: 開始時間と終了時間が同じ場合、0を返す", () => {
            const date = new Date("2024-01-01T09:00:00");
            const schedule = createSchedule(date, date);

            const range = ScheduleUtils.getRange(schedule);

            expect(range).toBe(0);
        });
    });

    describe("getBaseDate", () => {
        it("SUTIL10: 開始時間から基準日を取得", () => {
            const schedule = createSchedule(new Date("2024-01-15T14:30:00"), new Date("2024-01-15T15:30:00"));

            const baseDate = ScheduleUtils.getBaseDate(schedule);

            expect(baseDate.getFullYear()).toBe(2024);
            expect(baseDate.getMonth()).toBe(0); // 1月 = 0
            expect(baseDate.getDate()).toBe(15);
            expect(baseDate.getHours()).toBe(0);
            expect(baseDate.getMinutes()).toBe(0);
            expect(baseDate.getSeconds()).toBe(0);
        });

        it("SUTIL11: 開始時間がない場合は終了時間から基準日を取得", () => {
            const schedule = {
                start: undefined as unknown as Date,
                end: new Date("2024-01-20T18:00:00"),
                isHoliday: false,
                isPaidLeave: false,
            };

            const baseDate = ScheduleUtils.getBaseDate(schedule as any);

            expect(baseDate.getDate()).toBe(20);
        });

        it("SUTIL12: 開始時間も終了時間もない場合はエラー", () => {
            const schedule = {
                start: undefined as unknown as Date,
                end: undefined,
                isHoliday: false,
                isPaidLeave: false,
            };

            expect(() => ScheduleUtils.getBaseDate(schedule as any)).toThrow("Schedule has no start or end date");
        });
    });

    describe("getBaseDateKey", () => {
        it("SUTIL13: 基準日のキー(YYYY-MM-DD)を返す", () => {
            const schedule = createSchedule(new Date("2024-03-25T14:30:00"), new Date("2024-03-25T15:30:00"));

            const key = ScheduleUtils.getBaseDateKey(schedule);

            expect(key).toBe("2024-03-25");
        });
    });

    describe("isOverlap", () => {
        it("SUTIL14: 重複しているスケジュールの場合はtrueを返す", () => {
            const schedule1 = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T12:00:00"));
            const schedule2 = createSchedule(new Date("2024-01-01T10:00:00"), new Date("2024-01-01T13:00:00"));

            expect(ScheduleUtils.isOverlap(schedule1, schedule2)).toBe(true);
        });

        it("SUTIL15: 重複していないスケジュールの場合はfalseを返す", () => {
            const schedule1 = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const schedule2 = createSchedule(new Date("2024-01-01T11:00:00"), new Date("2024-01-01T12:00:00"));

            expect(ScheduleUtils.isOverlap(schedule1, schedule2)).toBe(false);
        });

        it("SUTIL16: 異なる日付のスケジュールの場合はfalseを返す", () => {
            const schedule1 = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T18:00:00"));
            const schedule2 = createSchedule(new Date("2024-01-02T09:00:00"), new Date("2024-01-02T18:00:00"));

            expect(ScheduleUtils.isOverlap(schedule1, schedule2)).toBe(false);
        });

        it("SUTIL17: 終了時間が未設定の場合はエラーをスローする", () => {
            const schedule1 = createSchedule(new Date("2024-01-01T09:00:00"), null);
            const schedule2 = createSchedule(new Date("2024-01-01T10:00:00"), new Date("2024-01-01T12:00:00"));

            expect(() => ScheduleUtils.isOverlap(schedule1, schedule2)).toThrow(
                "スケジュールの重複判定で終了時間の存在しないスケジュールが渡されました",
            );
        });

        it("SUTIL18: 時間が接している場合は重複していない", () => {
            const schedule1 = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const schedule2 = createSchedule(new Date("2024-01-01T10:00:00"), new Date("2024-01-01T11:00:00"));

            expect(ScheduleUtils.isOverlap(schedule1, schedule2)).toBe(false);
        });
    });

    describe("getText", () => {
        it("SUTIL19: 通常のスケジュールのテキスト表現を取得", () => {
            const schedule = createSchedule(new Date("2024-01-15T09:00:00"), new Date("2024-01-15T18:00:00"));

            const text = ScheduleUtils.getText(schedule);

            expect(text).toContain("2024");
            expect(text).toContain("01");
            expect(text).toContain("15");
            expect(text).toContain("09:00");
            expect(text).toContain("18:00");
        });

        it("SUTIL20: 有給休暇のスケジュールのテキスト表現", () => {
            const schedule = createSchedule(
                new Date("2024-01-15T00:00:00"),
                new Date("2024-01-15T23:59:59"),
                true,
                true,
            );

            const text = ScheduleUtils.getText(schedule);

            expect(text).toContain("<有給休暇>");
        });

        it("SUTIL21: 休日のスケジュールのテキスト表現", () => {
            const schedule = createSchedule(
                new Date("2024-01-15T00:00:00"),
                new Date("2024-01-15T23:59:59"),
                true,
                false,
            );

            const text = ScheduleUtils.getText(schedule);

            expect(text).toContain("【休日】");
        });

        it("SUTIL22: エラーメッセージ付きのスケジュールのテキスト表現", () => {
            const schedule = {
                start: new Date("2024-01-15T09:00:00"),
                end: new Date("2024-01-15T18:00:00"),
                isHoliday: false,
                isPaidLeave: false,
                errorMessage: "スケジュールエラー",
            };

            const text = ScheduleUtils.getText(schedule);

            expect(text).toContain("※スケジュールエラー");
        });

        it("SUTIL23: 終了時間が未設定のスケジュールのテキスト表現", () => {
            const schedule = createSchedule(new Date("2024-01-15T09:00:00"), null);

            const text = ScheduleUtils.getText(schedule);

            expect(text).toContain("09:00");
            expect(text).toContain("終了時間未定");
        });
    });
});

describe("EventUtils", () => {
    describe("isEvent", () => {
        it("EUTIL01: 有効なEventオブジェクトの場合はtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("テストイベント", schedule, "test@example.com", "会議室A");

            expect(EventUtils.isEvent(event)).toBe(true);
        });

        it("EUTIL02: 無効なオブジェクトの場合はfalseを返す", () => {
            const invalid = {
                uuid: "test-uuid",
                name: "テストイベント",
                // organizerが欠けている
                schedule: {
                    start: new Date("2024-01-01T09:00:00"),
                    end: new Date("2024-01-01T10:00:00"),
                },
            };

            expect(EventUtils.isEvent(invalid)).toBe(false);
        });

        it("EUTIL03: nullの場合はfalseを返す", () => {
            expect(EventUtils.isEvent(null)).toBe(false);
        });

        it("EUTIL04: undefinedの場合はfalseを返す", () => {
            expect(EventUtils.isEvent(undefined)).toBe(false);
        });

        it("EUTIL05: 空オブジェクトの場合はfalseを返す", () => {
            expect(EventUtils.isEvent({})).toBe(false);
        });

        it("EUTIL06: 勤務イベントタイプを持つEventもtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T09:30:00"));
            const event = createEvent("勤務開始", schedule, "Automatic", "", false, false, "start");

            expect(EventUtils.isEvent(event)).toBe(true);
        });

        it("EUTIL07: プライベートイベントもtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("プライベートイベント", schedule, "test@example.com", "", true);

            expect(EventUtils.isEvent(event)).toBe(true);
        });

        it("EUTIL08: キャンセル済みイベントもtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("キャンセル済みイベント", schedule, "test@example.com", "", false, true);

            expect(EventUtils.isEvent(event)).toBe(true);
        });
    });

    describe("getKey", () => {
        it("EUTIL09: イベントの識別キーを生成", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("テストイベント", schedule, "organizer@test.com", "会議室");

            const key = EventUtils.getKey(event);

            // キーは name_organizer_workingEventType_isPrivate の形式
            expect(key).toContain("テストイベント");
            expect(key).toContain("organizer@test.com");
        });
    });

    describe("isSame", () => {
        it("EUTIL10: 同じ属性のイベントはtrueを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event1 = createEvent("イベント1", schedule, "organizer@test.com", "会議室");
            const event2 = { ...event1, uuid: "different-uuid" }; // UUIDは異なるが他の属性が同じ

            expect(EventUtils.isSame(event1, event2)).toBe(true);
        });

        it("EUTIL11: 異なる名前のイベントはfalseを返す", () => {
            const schedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event1 = createEvent("イベント1", schedule, "organizer@test.com", "会議室");
            const event2 = createEvent("イベント2", schedule, "organizer@test.com", "会議室");

            expect(EventUtils.isSame(event1, event2)).toBe(false);
        });
    });

    describe("scheduled", () => {
        it("EUTIL12: スケジュールを変更した新しいイベントを作成", () => {
            const oldSchedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("テストイベント", oldSchedule);

            const newSchedule = createSchedule(new Date("2024-01-02T14:00:00"), new Date("2024-01-02T15:00:00"));
            const scheduledEvent = EventUtils.scheduled(event, newSchedule);

            expect(scheduledEvent.uuid).toBe(event.uuid);
            expect(scheduledEvent.name).toBe(event.name);
            expect(scheduledEvent.schedule).toEqual(newSchedule);
            expect(scheduledEvent.schedule).not.toBe(event.schedule);
        });

        it("EUTIL13: 元のイベントオブジェクトは変更されない", () => {
            const oldSchedule = createSchedule(new Date("2024-01-01T09:00:00"), new Date("2024-01-01T10:00:00"));
            const event = createEvent("テストイベント", oldSchedule);
            const originalSchedule = event.schedule;

            const newSchedule = createSchedule(new Date("2024-01-02T14:00:00"), new Date("2024-01-02T15:00:00"));
            EventUtils.scheduled(event, newSchedule);

            expect(event.schedule).toBe(originalSchedule);
        });
    });

    describe("getText", () => {
        it("EUTIL14: 基本的なイベント情報を含むテキストを生成", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("チーム会議", schedule, "alice@example.com", "会議室A");

            const text = EventUtils.getText(event);

            expect(text).toContain("チーム会議");
            expect(text).toContain("（alice@example.com）"); // 全角カッコ
            expect(text).toContain("2024/01/15");
        });

        it("EUTIL15: キャンセルされたイベントは【キャンセル】を含む", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("会議", schedule, "alice@example.com", "会議室A", false, true);

            const text = EventUtils.getText(event);

            expect(text).toContain("【キャンセル】"); // 全角の墨付きカッコ
        });

        it("EUTIL16: プライベートイベントは【非公開】を含む", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("個人的な予定", schedule, "", "", true);

            const text = EventUtils.getText(event);

            expect(text).toContain("【非公開】"); // 全角の墨付きカッコ
        });

        it("EUTIL17: 主催者が空の場合は含まれない", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("会議", schedule, "", "会議室A");

            const text = EventUtils.getText(event);

            expect(text).not.toContain("（");
            expect(text).not.toContain("）");
        });

        it("EUTIL18: 主催者がある場合は含まれる", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("会議", schedule, "alice@example.com", "");

            const text = EventUtils.getText(event);

            expect(text).toContain("（alice@example.com）");
        });

        it("EUTIL19: 主催者と場所の両方が空の場合", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("シンプルな予定", schedule, "", "");

            const text = EventUtils.getText(event);

            expect(text).toContain("シンプルな予定");
            expect(text).toContain("2024/01/15");
        });

        it("EUTIL20: キャンセル+プライベートの組み合わせ", () => {
            const schedule = createSchedule(new Date("2024-01-15T10:00:00"), new Date("2024-01-15T11:00:00"));
            const event = createEvent("予定", schedule, "alice@example.com", "会議室A", true, true);

            const text = EventUtils.getText(event);

            expect(text).toContain("【非公開】");
            expect(text).toContain("【キャンセル】");
        });
    });
});
