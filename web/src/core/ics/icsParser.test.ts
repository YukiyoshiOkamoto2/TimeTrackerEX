import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractRecentEvents, parseICS } from "./icsParser";

describe("icsParser", () => {
    // テスト用に現在時刻を固定
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-10-04T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("parseICS", () => {
        it("空のICSファイルをパースできる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(0);
            expect(result.errorMessages).toHaveLength(0);
        });

        it("シンプルなイベントをパースできる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-001
DTSTART:20251004T090000Z
DTEND:20251004T100000Z
SUMMARY:テストイベント
LOCATION:会議室A
ORGANIZER:mailto:organizer@example.com
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(1);
            expect(result.errorMessages).toHaveLength(0);

            const event = result.events[0];
            expect(event.name).toBe("テストイベント");
            expect(event.uuid).toBe("test-event-001");
            expect(event.location).toBe("会議室A");
            expect(event.organizer).toBe("mailto:organizer@example.com");
            expect(event.isPrivate).toBe(false);
            expect(event.isCancelled).toBe(false);
            expect(event.schedule.start).toBeInstanceOf(Date);
            expect(event.schedule.end).toBeInstanceOf(Date);
        });

        it("繰り返しイベントを展開できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event-001
DTSTART:20251001T090000Z
DTEND:20251001T100000Z
SUMMARY:毎日のミーティング
RRULE:FREQ=DAILY;COUNT=5
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(1);
            expect(result.errorMessages).toHaveLength(0);

            const event = result.events[0];
            expect(event.name).toBe("毎日のミーティング");
            expect(event.recurrence).toBeDefined();
            expect(event.recurrence).toHaveLength(4); // 現在時刻(10/4)までに発生した回数
        });

        it("キャンセルされたイベントを識別できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:cancelled-event-001
DTSTART:20251004T090000Z
DTEND:20251004T100000Z
SUMMARY:キャンセル済み: ミーティング
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(1);
            const event = result.events[0];
            expect(event.isCancelled).toBe(true);
        });

        it("プライベートイベントを識別できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:private-event-001
DTSTART:20251004T090000Z
DTEND:20251004T100000Z
SUMMARY:プライベート予定
CLASS:PRIVATE
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(1);
            const event = result.events[0];
            expect(event.isPrivate).toBe(true);
        });

        it("過去のイベント(30日以前)はスキップされる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:old-event
DTSTART:20250801T090000Z
DTEND:20250801T100000Z
SUMMARY:古いイベント
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(0);
            expect(result.errorMessages).toHaveLength(1);
            expect(result.errorMessages[0]).toContain("過去のイベントです");
        });

        it("複数のイベントを開始時刻でソートする", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-002
DTSTART:20251004T140000Z
DTEND:20251004T150000Z
SUMMARY:午後のイベント
END:VEVENT
BEGIN:VEVENT
UID:event-001
DTSTART:20251004T090000Z
DTEND:20251004T100000Z
SUMMARY:午前のイベント
END:VEVENT
BEGIN:VEVENT
UID:event-003
DTSTART:20251004T090000Z
DTEND:20251004T110000Z
SUMMARY:午前の長いイベント
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(3);
            expect(result.events[0].name).toBe("午前のイベント");
            expect(result.events[1].name).toBe("午前の長いイベント");
            expect(result.events[2].name).toBe("午後のイベント");
        });

        it("不正なイベントはエラーメッセージに含まれる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:invalid-event
DTSTART:20251004T090000Z
END:VEVENT
END:VCALENDAR`;

            const result = parseICS(icsContent);

            expect(result.events).toHaveLength(0);
            expect(result.errorMessages.length).toBeGreaterThan(0);
            expect(result.errorMessages[0]).toContain("SKIP");
        });
    });

    describe("extractRecentEvents", () => {
        it("最近のイベントのみを抽出できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:old-event
DTSTART:20250801T090000Z
DTEND:20250801T100000Z
SUMMARY:古いイベント
END:VEVENT
BEGIN:VEVENT
UID:recent-event
DTSTART:20251004T090000Z
DTEND:20251004T100000Z
SUMMARY:最近のイベント
END:VEVENT
END:VCALENDAR`;

            const result = extractRecentEvents(icsContent, 30);

            expect(result).toContain("最近のイベント");
            expect(result).not.toContain("古いイベント");
            expect(result).toContain("BEGIN:VCALENDAR");
            expect(result).toContain("END:VCALENDAR");
        });

        it("日付フォーマットYYYYMMDDも処理できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:all-day-event
DTSTART:20251004
DTEND:20251005
SUMMARY:終日イベント
END:VEVENT
END:VCALENDAR`;

            const result = extractRecentEvents(icsContent, 30);

            expect(result).toContain("終日イベント");
            expect(result).toContain("END:VCALENDAR");
        });

        it("daysAgoパラメータで期間を変更できる", () => {
            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-20-days-ago
DTSTART:20250914T090000Z
DTEND:20250914T100000Z
SUMMARY:20日前のイベント
END:VEVENT
END:VCALENDAR`;

            const result30 = extractRecentEvents(icsContent, 30);
            expect(result30).toContain("20日前のイベント");

            const result10 = extractRecentEvents(icsContent, 10);
            expect(result10).not.toContain("20日前のイベント");
        });
    });
});
