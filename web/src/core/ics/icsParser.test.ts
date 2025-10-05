import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractRecentEvents, parseICS } from "./icsParser";
import { EventUtils } from "@/types";

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

    describe("実際のICSファイルのテスト", () => {
        it("岡本 行欽 の予定表.icsをパースできる", () => {
            // 実際のICSファイルを読み込む
            const icsPath = resolve(__dirname, "岡本 行欽 の予定表.ics");
            const icsContent = readFileSync(icsPath, "utf-8");

            const result = parseICS(icsContent);
            console.log(result.events.map(e => EventUtils.getText(e)).join(""))

            // 結果の基本検証
            expect(result).toHaveProperty("events");
            expect(result).toHaveProperty("errorMessages");
            expect(Array.isArray(result.events)).toBe(true);
            expect(Array.isArray(result.errorMessages)).toBe(true);

            // イベントが抽出されていることを確認
            expect(result.events.length).toBeGreaterThan(0);

            // 最初のイベントの構造を検証
            const firstEvent = result.events[0];
            expect(firstEvent).toHaveProperty("name");
            expect(firstEvent).toHaveProperty("uuid");
            expect(firstEvent).toHaveProperty("schedule");
            expect(firstEvent.schedule).toHaveProperty("start");
            expect(firstEvent.schedule).toHaveProperty("end");
            expect(firstEvent.schedule.start).toBeInstanceOf(Date);
            expect(firstEvent.schedule.end).toBeInstanceOf(Date);

            // イベント情報をログ出力
            console.log("\n=== ICS解析結果サマリー ===");
            console.log(`パースされたイベント数: ${result.events.length}`);
            console.log(`エラーメッセージ数: ${result.errorMessages.length}`);

            if (result.events.length > 0) {
                console.log(`\n最初のイベント: ${firstEvent.name}`);
                console.log(`  UUID: ${firstEvent.uuid}`);
                console.log(`  開始: ${firstEvent.schedule.start.toISOString()}`);
                console.log(`  終了: ${firstEvent.schedule.end?.toISOString()}`);
                console.log(`  場所: ${firstEvent.location || "(なし)"}`);
                console.log(`  主催者: ${firstEvent.organizer || "(なし)"}`);
                console.log(`  プライベート: ${firstEvent.isPrivate}`);
                console.log(`  キャンセル: ${firstEvent.isCancelled}`);
                if (firstEvent.recurrence) {
                    console.log(`  繰り返し: ${firstEvent.recurrence.length}回`);
                }

                // Pythonと同じ形式で全イベントを出力（非キャンセル・非プライベートのみ）
                console.log("\n=== 全イベントリスト（非キャンセル・非プライベート） ===");
                const visibleEvents = result.events.filter((e) => !e.isCancelled && !e.isPrivate);
                console.log(`表示対象イベント数: ${visibleEvents.length}`);
                console.log("---");
                visibleEvents.forEach((event, index) => {
                    console.log(`${index + 1}. ${EventUtils.getText(event)}`);
                });
            }

            // エラーメッセージがある場合は警告として出力
            if (result.errorMessages.length > 0) {
                console.warn("\n=== ICSパース警告 ===");
                result.errorMessages.slice(0, 10).forEach((msg, i) => {
                    console.warn(`  ${i + 1}. ${msg}`);
                });
                if (result.errorMessages.length > 10) {
                    console.warn(`  ... 他 ${result.errorMessages.length - 10} 件`);
                }
            }
        });

        it("Pythonと同じ結果が出力される", () => {
            // 実際のICSファイルを読み込む
            const icsPath = resolve(__dirname, "岡本 行欽 の予定表.ics");
            const icsContent = readFileSync(icsPath, "utf-8");

            const result = parseICS(icsContent);

            // Pythonの実装と同様の条件でフィルタリング
            const visibleEvents = result.events.filter((e) => !e.isCancelled && !e.isPrivate);

            // イベント数の検証
            expect(result.events.length).toBe(72); // Pythonと同じ総イベント数
            expect(visibleEvents.length).toBeGreaterThan(0);

            // イベントのソート順を検証（開始時刻順、同じ場合は期間でソート）
            for (let i = 1; i < result.events.length; i++) {
                const prev = result.events[i - 1];
                const curr = result.events[i];
                const prevStart = prev.schedule.start.getTime();
                const currStart = curr.schedule.start.getTime();

                if (prevStart === currStart) {
                    // 開始時刻が同じ場合、期間の短い順
                    const prevDuration =
                        (prev.schedule.end?.getTime() ?? 0) - prev.schedule.start.getTime();
                    const currDuration =
                        (curr.schedule.end?.getTime() ?? 0) - curr.schedule.start.getTime();
                    expect(prevDuration).toBeLessThanOrEqual(currDuration);
                } else {
                    // 開始時刻でソート
                    expect(prevStart).toBeLessThan(currStart);
                }
            }

            // 最初のイベントの詳細検証
            const firstEvent = result.events[0];
            expect(firstEvent.name).toBe("保育園送り");
            expect(firstEvent.isPrivate).toBe(false);
            expect(firstEvent.isCancelled).toBe(false);
            expect(firstEvent.recurrence).toBeDefined();
            expect(firstEvent.recurrence!.length).toBeGreaterThan(0);

            console.log("\n=== Python互換性チェック ===");
            console.log(`✓ 総イベント数: ${result.events.length} (期待値: 72)`);
            console.log(`✓ 表示イベント数: ${visibleEvents.length}`);
            console.log(`✓ 最初のイベント名: "${firstEvent.name}" (期待値: "保育園送り")`);
            console.log(`✓ イベントソート順: 正常`);
            console.log(`✓ 繰り返しイベント処理: 正常`);
        });
    });
});
