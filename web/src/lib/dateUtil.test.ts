import { describe, expect, it } from "vitest";
import {
    addDays,
    compareDates,
    formatDateKey,
    getCurrentDate,
    getDayCount,
    getToday,
    getUniqueDateKeys,
    isOverlapping,
    isSameDay,
    parseDateKey,
    resetTime,
} from "./dateUtil";

describe("dateUtil", () => {
    describe("getCurrentDate", () => {
        it("should return current date", () => {
            const before = Date.now();
            const current = getCurrentDate();
            const after = Date.now();

            expect(current.getTime()).toBeGreaterThanOrEqual(before);
            expect(current.getTime()).toBeLessThanOrEqual(after);
        });
    });

    describe("getToday", () => {
        it("should return today with time reset to 00:00:00", () => {
            const today = getToday();
            const now = new Date();

            expect(today.getFullYear()).toBe(now.getFullYear());
            expect(today.getMonth()).toBe(now.getMonth());
            expect(today.getDate()).toBe(now.getDate());
            expect(today.getHours()).toBe(0);
            expect(today.getMinutes()).toBe(0);
            expect(today.getSeconds()).toBe(0);
            expect(today.getMilliseconds()).toBe(0);
        });
    });

    describe("formatDateKey", () => {
        it("should format date as YYYY-MM-DD", () => {
            const date = new Date(2024, 1, 3); // 2024-02-03 (month is 0-indexed)
            expect(formatDateKey(date)).toBe("2024-02-03");
        });

        it("should handle single digit months and days", () => {
            const date = new Date(2024, 0, 5); // 2024-01-05
            expect(formatDateKey(date)).toBe("2024-01-05");
        });

        it("should handle end of year", () => {
            const date = new Date(2024, 11, 31); // 2024-12-31
            expect(formatDateKey(date)).toBe("2024-12-31");
        });
    });

    describe("resetTime", () => {
        it("should reset time to 00:00:00.000", () => {
            const date = new Date(2024, 1, 3, 15, 30, 45, 123);
            const reset = resetTime(date);

            expect(reset.getFullYear()).toBe(2024);
            expect(reset.getMonth()).toBe(1);
            expect(reset.getDate()).toBe(3);
            expect(reset.getHours()).toBe(0);
            expect(reset.getMinutes()).toBe(0);
            expect(reset.getSeconds()).toBe(0);
            expect(reset.getMilliseconds()).toBe(0);
        });

        it("should not modify original date", () => {
            const original = new Date(2024, 1, 3, 15, 30);
            const reset = resetTime(original);

            expect(original.getHours()).toBe(15);
            expect(reset.getHours()).toBe(0);
        });
    });

    describe("isSameDay", () => {
        it("should return true for same day with different times", () => {
            const date1 = new Date(2024, 1, 3, 9, 0);
            const date2 = new Date(2024, 1, 3, 18, 0);
            expect(isSameDay(date1, date2)).toBe(true);
        });

        it("should return false for different days", () => {
            const date1 = new Date(2024, 1, 3);
            const date2 = new Date(2024, 1, 4);
            expect(isSameDay(date1, date2)).toBe(false);
        });

        it("should return false for same day in different months", () => {
            const date1 = new Date(2024, 1, 3);
            const date2 = new Date(2024, 2, 3);
            expect(isSameDay(date1, date2)).toBe(false);
        });

        it("should return false for same day in different years", () => {
            const date1 = new Date(2024, 1, 3);
            const date2 = new Date(2025, 1, 3);
            expect(isSameDay(date1, date2)).toBe(false);
        });
    });

    describe("compareDates", () => {
        it("should return negative for earlier date", () => {
            const date1 = new Date(2024, 1, 3);
            const date2 = new Date(2024, 1, 4);
            expect(compareDates(date1, date2)).toBeLessThan(0);
        });

        it("should return positive for later date", () => {
            const date1 = new Date(2024, 1, 5);
            const date2 = new Date(2024, 1, 4);
            expect(compareDates(date1, date2)).toBeGreaterThan(0);
        });

        it("should return 0 for same day regardless of time", () => {
            const date1 = new Date(2024, 1, 3, 9, 0);
            const date2 = new Date(2024, 1, 3, 18, 0);
            expect(compareDates(date1, date2)).toBe(0);
        });
    });

    describe("parseDateKey", () => {
        it("should parse YYYY-MM-DD string to Date", () => {
            const date = parseDateKey("2024-02-03");
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(1); // 0-indexed
            expect(date.getDate()).toBe(3);
            expect(date.getHours()).toBe(0);
            expect(date.getMinutes()).toBe(0);
        });

        it("should handle single digit months and days", () => {
            const date = parseDateKey("2024-01-05");
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(0);
            expect(date.getDate()).toBe(5);
        });

        it("should roundtrip with formatDateKey", () => {
            const original = "2024-02-03";
            const parsed = parseDateKey(original);
            const formatted = formatDateKey(parsed);
            expect(formatted).toBe(original);
        });
    });

    describe("getDayCount", () => {
        it("should return 1 for same day", () => {
            const date = new Date(2024, 1, 3);
            expect(getDayCount(date, date)).toBe(1);
        });

        it("should return correct count for date range", () => {
            const start = new Date(2024, 1, 1);
            const end = new Date(2024, 1, 3);
            expect(getDayCount(start, end)).toBe(3);
        });

        it("should ignore time component", () => {
            const start = new Date(2024, 1, 1, 23, 59);
            const end = new Date(2024, 1, 3, 0, 1);
            expect(getDayCount(start, end)).toBe(3);
        });

        it("should handle cross-month ranges", () => {
            const start = new Date(2024, 0, 30);
            const end = new Date(2024, 1, 2);
            expect(getDayCount(start, end)).toBe(4); // Jan 30, 31, Feb 1, 2
        });
    });

    describe("addDays", () => {
        it("should add positive days", () => {
            const date = new Date(2024, 1, 1);
            const result = addDays(date, 5);
            expect(formatDateKey(result)).toBe("2024-02-06");
        });

        it("should subtract negative days", () => {
            const date = new Date(2024, 1, 5);
            const result = addDays(date, -3);
            expect(formatDateKey(result)).toBe("2024-02-02");
        });

        it("should handle month boundaries", () => {
            const date = new Date(2024, 0, 30);
            const result = addDays(date, 3);
            expect(formatDateKey(result)).toBe("2024-02-02");
        });

        it("should not modify original date", () => {
            const original = new Date(2024, 1, 1);
            const originalStr = formatDateKey(original);
            addDays(original, 5);
            expect(formatDateKey(original)).toBe(originalStr);
        });

        it("should preserve time component", () => {
            const date = new Date(2024, 1, 1, 15, 30);
            const result = addDays(date, 1);
            expect(result.getHours()).toBe(15);
            expect(result.getMinutes()).toBe(30);
        });
    });

    describe("isOverlapping", () => {
        it("should return true for overlapping ranges", () => {
            const start1 = new Date(2024, 1, 1, 9, 0);
            const end1 = new Date(2024, 1, 1, 12, 0);
            const start2 = new Date(2024, 1, 1, 11, 0);
            const end2 = new Date(2024, 1, 1, 14, 0);
            expect(isOverlapping(start1, end1, start2, end2)).toBe(true);
        });

        it("should return true for contained ranges", () => {
            const start1 = new Date(2024, 1, 1, 9, 0);
            const end1 = new Date(2024, 1, 1, 17, 0);
            const start2 = new Date(2024, 1, 1, 11, 0);
            const end2 = new Date(2024, 1, 1, 14, 0);
            expect(isOverlapping(start1, end1, start2, end2)).toBe(true);
        });

        it("should return false for non-overlapping ranges", () => {
            const start1 = new Date(2024, 1, 1, 9, 0);
            const end1 = new Date(2024, 1, 1, 12, 0);
            const start2 = new Date(2024, 1, 1, 13, 0);
            const end2 = new Date(2024, 1, 1, 15, 0);
            expect(isOverlapping(start1, end1, start2, end2)).toBe(false);
        });

        it("should return false for adjacent ranges (touching at boundary)", () => {
            const start1 = new Date(2024, 1, 1, 9, 0);
            const end1 = new Date(2024, 1, 1, 12, 0);
            const start2 = new Date(2024, 1, 1, 12, 0);
            const end2 = new Date(2024, 1, 1, 15, 0);
            expect(isOverlapping(start1, end1, start2, end2)).toBe(false);
        });

        it("should return true when reversed argument order", () => {
            const start1 = new Date(2024, 1, 1, 11, 0);
            const end1 = new Date(2024, 1, 1, 14, 0);
            const start2 = new Date(2024, 1, 1, 9, 0);
            const end2 = new Date(2024, 1, 1, 12, 0);
            expect(isOverlapping(start1, end1, start2, end2)).toBe(true);
        });
    });

    describe("getUniqueDateKeys", () => {
        it("should return unique date keys", () => {
            const dates = [
                new Date(2024, 1, 1, 9, 0),
                new Date(2024, 1, 1, 18, 0),
                new Date(2024, 1, 2),
                new Date(2024, 1, 3),
            ];
            const result = getUniqueDateKeys(dates);
            expect(result.size).toBe(3);
            expect(result.has("2024-02-01")).toBe(true);
            expect(result.has("2024-02-02")).toBe(true);
            expect(result.has("2024-02-03")).toBe(true);
        });

        it("should handle empty array", () => {
            const result = getUniqueDateKeys([]);
            expect(result.size).toBe(0);
        });

        it("should handle single date", () => {
            const dates = [new Date(2024, 1, 1)];
            const result = getUniqueDateKeys(dates);
            expect(result.size).toBe(1);
            expect(result.has("2024-02-01")).toBe(true);
        });
    });
});
