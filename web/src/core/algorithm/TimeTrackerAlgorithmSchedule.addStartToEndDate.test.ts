/**
 * TimeTrackerAlgorithmEvent のテスト
 * scheduleToEvent, addStartToEndDate 関数のテスト
 */

import type { Schedule } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmSchedule } from "./TimeTrackerAlgorithmSchedule";

describe("TimeTrackerAlgorithmEvent", () => {
    const createTestSchedule = (start: Date, end: Date): Schedule => ({
        start,
        end,
    });

    describe("addStartToEndDate", () => {
        it("ASED01: 同じ日のスケジュールはそのまま返す", () => {
            const schedule = createTestSchedule(new Date(2024, 9, 1, 10, 0), new Date(2024, 9, 1, 17, 0));

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(schedule);
        });

        it("ASED02: 終了時刻がundefinedの場合はエラーをスローする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 9, 1, 10, 0),
            };

            expect(() => {
                TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);
            }).toThrow("event.schedule.end is undefined.");
        });

        it("ASED03: 2日間のスケジュールを分割（10/1 10:00～10/2 12:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 10, 0), // 10/1 10:00
                new Date(2024, 9, 2, 12, 0), // 10/2 12:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(2);

            // 10/1: 10:00～23:30
            expect(result[0].start.getDate()).toBe(1);
            expect(result[0].start.getHours()).toBe(10);
            expect(result[0].start.getMinutes()).toBe(0);
            expect(result[0].end?.getDate()).toBe(1);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 10/2: 0:00～12:00
            expect(result[1].start.getDate()).toBe(2);
            expect(result[1].start.getHours()).toBe(0);
            expect(result[1].start.getMinutes()).toBe(0);
            expect(result[1].end?.getDate()).toBe(2);
            expect(result[1].end?.getHours()).toBe(12);
            expect(result[1].end?.getMinutes()).toBe(0);
        });

        it("ASED04: 3日間のスケジュールを分割（10/1 10:00～10/3 12:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 10, 0), // 10/1 10:00
                new Date(2024, 9, 3, 12, 0), // 10/3 12:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(3);

            // 10/1: 10:00～23:30
            expect(result[0].start.getDate()).toBe(1);
            expect(result[0].start.getHours()).toBe(10);
            expect(result[0].start.getMinutes()).toBe(0);
            expect(result[0].end?.getDate()).toBe(1);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 10/2: 0:00～23:30 (中間日)
            expect(result[1].start.getDate()).toBe(2);
            expect(result[1].start.getHours()).toBe(0);
            expect(result[1].start.getMinutes()).toBe(0);
            expect(result[1].end?.getDate()).toBe(2);
            expect(result[1].end?.getHours()).toBe(23);
            expect(result[1].end?.getMinutes()).toBe(30);

            // 10/3: 0:00～12:00
            expect(result[2].start.getDate()).toBe(3);
            expect(result[2].start.getHours()).toBe(0);
            expect(result[2].start.getMinutes()).toBe(0);
            expect(result[2].end?.getDate()).toBe(3);
            expect(result[2].end?.getHours()).toBe(12);
            expect(result[2].end?.getMinutes()).toBe(0);
        });

        it("ASED05: 5日間のスケジュールを分割（10/1 8:00～10/5 18:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 8, 0), // 10/1 8:00
                new Date(2024, 9, 5, 18, 0), // 10/5 18:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(5);

            // 初日
            expect(result[0].start.getHours()).toBe(8);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 中間日（10/2, 10/3, 10/4）
            for (let i = 1; i <= 3; i++) {
                expect(result[i].start.getHours()).toBe(0);
                expect(result[i].start.getMinutes()).toBe(0);
                expect(result[i].end?.getHours()).toBe(23);
                expect(result[i].end?.getMinutes()).toBe(30);
            }

            // 最終日
            expect(result[4].start.getHours()).toBe(0);
            expect(result[4].start.getMinutes()).toBe(0);
            expect(result[4].end?.getHours()).toBe(18);
            expect(result[4].end?.getMinutes()).toBe(0);
        });

        it("ASED06: 日の境界時刻（23:00～翌1:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 23, 0), // 10/1 23:00
                new Date(2024, 9, 2, 1, 0), // 10/2 1:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(2);

            // 10/1: 23:00～23:30
            expect(result[0].start.getDate()).toBe(1);
            expect(result[0].start.getHours()).toBe(23);
            expect(result[0].start.getMinutes()).toBe(0);
            expect(result[0].end?.getDate()).toBe(1);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 10/2: 0:00～1:00
            expect(result[1].start.getDate()).toBe(2);
            expect(result[1].start.getHours()).toBe(0);
            expect(result[1].start.getMinutes()).toBe(0);
            expect(result[1].end?.getDate()).toBe(2);
            expect(result[1].end?.getHours()).toBe(1);
            expect(result[1].end?.getMinutes()).toBe(0);
        });

        it("ASED07: 深夜から早朝のスケジュール（0:30～翌2:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 0, 30), // 10/1 0:30
                new Date(2024, 9, 2, 2, 0), // 10/2 2:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(2);

            // 10/1: 0:30～23:30
            expect(result[0].start.getDate()).toBe(1);
            expect(result[0].start.getHours()).toBe(0);
            expect(result[0].start.getMinutes()).toBe(30);
            expect(result[0].end?.getDate()).toBe(1);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 10/2: 0:00～2:00
            expect(result[1].start.getDate()).toBe(2);
            expect(result[1].start.getHours()).toBe(0);
            expect(result[1].start.getMinutes()).toBe(0);
            expect(result[1].end?.getDate()).toBe(2);
            expect(result[1].end?.getHours()).toBe(2);
            expect(result[1].end?.getMinutes()).toBe(0);
        });

        it("ASED08: 同一時刻で日が異なる（10/1 15:00～10/2 15:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 9, 1, 15, 0), // 10/1 15:00
                new Date(2024, 9, 2, 15, 0), // 10/2 15:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(2);

            // 10/1: 15:00～23:30
            expect(result[0].start.getHours()).toBe(15);
            expect(result[0].end?.getHours()).toBe(23);
            expect(result[0].end?.getMinutes()).toBe(30);

            // 10/2: 0:00～15:00
            expect(result[1].start.getHours()).toBe(0);
            expect(result[1].end?.getHours()).toBe(15);
        });

        it("ASED09: 月をまたぐスケジュール（9/30 20:00～10/2 10:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 8, 30, 20, 0), // 9/30 20:00
                new Date(2024, 9, 2, 10, 0), // 10/2 10:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(3);

            // 9/30: 20:00～23:30
            expect(result[0].start.getMonth()).toBe(8); // 9月
            expect(result[0].start.getDate()).toBe(30);
            expect(result[0].start.getHours()).toBe(20);

            // 10/1: 0:00～23:30
            expect(result[1].start.getMonth()).toBe(9); // 10月
            expect(result[1].start.getDate()).toBe(1);
            expect(result[1].start.getHours()).toBe(0);

            // 10/2: 0:00～10:00
            expect(result[2].start.getMonth()).toBe(9); // 10月
            expect(result[2].start.getDate()).toBe(2);
            expect(result[2].end?.getHours()).toBe(10);
        });

        it("ASED10: 年をまたぐスケジュール（12/31 22:00～1/2 8:00）", () => {
            const schedule = createTestSchedule(
                new Date(2024, 11, 31, 22, 0), // 12/31 22:00
                new Date(2025, 0, 2, 8, 0), // 1/2 8:00
            );

            const result = TimeTrackerAlgorithmSchedule.addStartToEndDate(schedule);

            expect(result).toHaveLength(3);

            // 12/31: 22:00～23:30
            expect(result[0].start.getFullYear()).toBe(2024);
            expect(result[0].start.getMonth()).toBe(11); // 12月
            expect(result[0].start.getDate()).toBe(31);

            // 1/1: 0:00～23:30
            expect(result[1].start.getFullYear()).toBe(2025);
            expect(result[1].start.getMonth()).toBe(0); // 1月
            expect(result[1].start.getDate()).toBe(1);

            // 1/2: 0:00～8:00
            expect(result[2].start.getFullYear()).toBe(2025);
            expect(result[2].start.getMonth()).toBe(0); // 1月
            expect(result[2].start.getDate()).toBe(2);
            expect(result[2].end?.getHours()).toBe(8);
        });
    });
});
