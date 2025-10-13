/**
 * TimeTrackerAlgorithmCore のテスト
 * TimeTrackerAlgorithmCore.roundingTime, TimeTrackerAlgorithmCore.roundingSchedule 関数のテスト
 */

import * as lib from "@/lib";
import type { Event, Schedule } from "@/types";
import { createEvent, createSchedule } from "@/types/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_OLD, MAX_TIME, TimeTrackerAlgorithmCore } from "./TimeTrackerAlgorithmCore";

describe("TimeTrackerAlgorithmCore", () => {
    describe("TimeTrackerAlgorithmCore.roundingTime", () => {
        it("RT01: 丸め単位(30分)で割り切れる時刻はそのまま返す", () => {
            const time = new Date(2024, 1, 3, 9, 0, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false);

            expect(result.getTime()).toBe(time.getTime());
        });

        it("RT02: backward=falseの場合、切り捨てる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false);

            expect(result.getHours()).toBe(9);
            expect(result.getMinutes()).toBe(0);
        });

        it("RT03: backward=trueの場合、切り上げる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, true);

            expect(result.getHours()).toBe(9);
            expect(result.getMinutes()).toBe(30);
        });

        it("RT04: 秒とミリ秒は0にリセットされる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 45, 123);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false);

            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it("RT05: 29分は切り捨てで0分になる", () => {
            const time = new Date(2024, 1, 3, 9, 29, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false);

            expect(result.getMinutes()).toBe(0);
        });

        it("RT06: 29分は切り上げで30分になる", () => {
            const time = new Date(2024, 1, 3, 9, 29, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, true);

            expect(result.getMinutes()).toBe(30);
        });

        it("RT07: 59分は切り上げで次の時間の0分になる", () => {
            const time = new Date(2024, 1, 3, 9, 59, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, true);

            // 59 % 30 = 29, 59 + (30 - 29) = 60 → 次の時間の0分
            expect(result.getHours()).toBe(10);
            expect(result.getMinutes()).toBe(0);
        });

        it("RT08: 1分だけずれている場合も正しく丸められる", () => {
            const time = new Date(2024, 1, 3, 9, 1, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false);

            expect(result.getMinutes()).toBe(0);
        });

        it("RT09: カスタム丸め単位(15分)で動作する", () => {
            const time = new Date(2024, 1, 3, 9, 8, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, false, 15);

            expect(result.getMinutes()).toBe(0);
        });

        it("RT10: カスタム丸め単位(15分)で切り上げる", () => {
            const time = new Date(2024, 1, 3, 9, 8, 0);
            const result = TimeTrackerAlgorithmCore.roundingTime(time, true, 15);

            expect(result.getMinutes()).toBe(15);
        });
    });

    describe("TimeTrackerAlgorithmCore.roundingSchedule", () => {
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

        it("RS01: endがundefinedの場合はエラーをthrowする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
            };

            expect(() => TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward")).toThrow(
                "終了予定時間がありません",
            );
        });

        it("RS02: 開始終了とも丸め単位で割り切れる場合はそのまま返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward");

            expect(result).toEqual(schedule);
        });

        it("RS03: backwardモードで両方切り上げられる", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS04: forwardモードで両方切り捨てられる", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "forward");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS05: stretchモードで開始は切り捨て、終了は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "stretch");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS06: roundモードで15分未満は切り捨て、15分以上は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 10), new Date(2024, 1, 3, 10, 20));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "round");

            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS07: halfモードで15分ちょうどは切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "half");

            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS08: 丸めた結果、開始と終了が同じ時刻になる場合はnullを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 9, 20));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "forward");

            expect(result).toBeNull();
        });

        it("RS09: 丸めた結果、開始と終了が30分ちょうどの場合はそのまま返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 25), new Date(2024, 1, 3, 9, 35));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward");

            // start: 9:30, end: 10:00 となり30分なのでそのまま返す
            expect(result).not.toBeNull();
            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS10: 丸めた結果が丸め単位(30分)未満になる場合はnullを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 5), new Date(2024, 1, 3, 9, 20));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "forward");

            // start: 9:00, end: 9:00 となるのでnull
            expect(result).toBeNull();
        });

        it("RS11: nonduplicateモード - イベント配列がデフォルトで空配列の場合は動作する", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));

            // デフォルトで events = [] が設定されているため、エラーにはならない
            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "nonduplicate");

            // 開始は切り捨て(forward)、終了は切り上げ(backward)
            expect(result).not.toBeNull();
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS12: nonduplicateモード - 重複しない場合は切り捨てと切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));
            const events: Event[] = [];

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "nonduplicate", events);

            // 開始は切り捨て(forward)、終了は切り上げ(backward)
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS13: nonduplicateモード - 開始が重複する場合は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 11, 0));
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 8, 30), new Date(2024, 1, 3, 9, 30));
            const events: Event[] = [existingEvent];

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "nonduplicate", events);

            // 9:00に切り捨てると重複するので9:30に切り上げ
            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(30);
        });

        it("RS14: nonduplicateモード - 終了が重複する場合は切り捨て", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 45));
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 30), new Date(2024, 1, 3, 11, 30));
            const events: Event[] = [existingEvent];

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "nonduplicate", events);

            // 11:00に切り上げると重複するので10:30に切り捨て
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS15: 開始のみ丸めが必要で終了は丸め不要の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 0));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward");

            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS16: 終了のみ丸めが必要で開始は丸め不要の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 15));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "backward");

            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS17: カスタム丸め単位(15分)で動作する", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 8), new Date(2024, 1, 3, 10, 22));

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "forward", [], 15);

            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(15);
        });

        it("RS18: nonduplicateモード - 複数の重複イベントを考慮", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 11, 45));
            const event1 = createTestEvent("e1", new Date(2024, 1, 3, 8, 30), new Date(2024, 1, 3, 9, 30));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 11, 30), new Date(2024, 1, 3, 12, 30));
            const events: Event[] = [event1, event2];

            const result = TimeTrackerAlgorithmCore.roundingSchedule(schedule, "nonduplicate", events);

            // 9:00に切り捨てると重複するので9:30に、12:00に切り上げると重複するので11:30に
            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getHours()).toBe(11);
            expect(result?.end?.getMinutes()).toBe(30);
        });
    });

    describe("TimeTrackerAlgorithmCore.check", () => {
        // 2024/2/3 12:00:00 を現在時刻とする
        const mockNow = new Date(2024, 1, 3, 12, 0, 0);

        // 現在時刻をモック
        beforeEach(() => {
            vi.spyOn(lib, "getCurrentDate").mockReturnValue(mockNow);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe("Scheduleのチェック", () => {
            it("CHK01: 正常なスケジュールはnullを返す", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).toBeNull();
            });

            it("CHK02: 終了時間がない場合はinvalidエラーを返す", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), null);

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("invalid");
                expect(result?.details[0].message).toContain("終了時間がありません");
            });

            it("CHK03: 6時間以上のスケジュールはinvalidエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 15, 30), // 6.5時間
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("6時間以上");
            });

            it("CHK04: 6時間ちょうどのスケジュールは正常", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 15, 0), // 6時間
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).toBeNull();
            });

            it("CHK05: 未来のスケジュールはoutOfScheduleエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 4, 9, 0), // 明日
                    new Date(2024, 1, 4, 10, 0),
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("未来のスケジュール");
            });

            it("CHK06: 30日以上前のスケジュールはoutOfScheduleエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 0, 1, 9, 0), // 33日前
                    new Date(2024, 0, 1, 10, 0),
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("30日以上前のスケジュール");
            });

            it("CHK07: 30日前ちょうどのスケジュールは正常", () => {
                const schedule = createSchedule(
                    new Date(2024, 0, 4, 12, 0), // 30日前の同時刻
                    new Date(2024, 0, 4, 13, 0),
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).toBeNull();
            });

            it("CHK08: 開始時刻と終了時刻が同じ場合はinvalidエラーを返す", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 9, 0));

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("invalid");
                expect(result?.details[0].message).toContain("開始時間と終了時間が同じ");
            });

            it("CHK09: 丸め単位(30分)未満のスケジュールはinvalidエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 9, 29), // 29分
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("invalid");
                expect(result?.details[0].message).toContain("丸め単位よりも小さい");
            });

            it("CHK10: 丸め単位(30分)ちょうどのスケジュールは正常", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 9, 30), // 30分
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).toBeNull();
            });

            it("CHK11: 複数のエラーを同時に返す", () => {
                // 未来 + 過去
                const schedule = createSchedule(
                    new Date(2024, 1, 5, 9, 0), // 未来
                    new Date(2000, 1, 5, 16, 0), // 過去
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).not.toBeNull();
                expect(result?.details.length).toBeGreaterThanOrEqual(2);
                expect(result?.details.some((d) => d.reason === "invalid")).toBe(true);
                expect(result?.details.some((d) => d.reason === "outOfSchedule")).toBe(true);
            });

            it("CHK12: カスタムmaxTimeでチェック", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 11, 30), // 2.5時間
                );

                // maxTime = 2時間でチェック
                const result = TimeTrackerAlgorithmCore.check(schedule, 2 * 60 * 60 * 1000);

                expect(result).not.toBeNull();
                expect(result?.details[0].message).toContain("6時間以上");
            });

            it("CHK13: カスタムmaxOldでチェック", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 1, 9, 0), // 2日前
                    new Date(2024, 1, 1, 10, 0),
                );

                // maxOld = 1日でチェック
                const result = TimeTrackerAlgorithmCore.check(schedule, MAX_TIME, 1);

                expect(result).not.toBeNull();
                expect(result?.details[0].reason).toBe("outOfSchedule");
            });

            it("CHK14: カスタムTimeTrackerAlgorithmCore.roundingTimeUnitでチェック", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 9, 10), // 10分
                );

                // TimeTrackerAlgorithmCore.roundingTimeUnit = 15分でチェック
                const result = TimeTrackerAlgorithmCore.check(schedule, MAX_TIME, MAX_OLD, 15);

                expect(result).not.toBeNull();
                expect(result?.details[0].reason).toBe("invalid");
            });

            it("CHK15: 有給休暇のスケジュールも正しくチェックされる", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 10, 0),
                    true, // isHoliday
                    true, // isPaidLeave
                );

                const result = TimeTrackerAlgorithmCore.check(schedule);

                expect(result).toBeNull();
            });
        });

        describe("Eventのチェック", () => {
            it("CHK16: 正常なイベントはnullを返す", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
                const event = createEvent("Meeting", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).toBeNull();
            });

            it("CHK17: イベントのスケジュールに終了時間がない場合はinvalidエラーを返す", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), null);
                const event = createEvent("Meeting", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).not.toBeNull();
                expect(result?.target).toEqual(event);
                expect(result?.details).toHaveLength(1);
                expect(result?.details[0].reason).toBe("invalid");
                expect(result?.details[0].message).toContain("終了時間がありません");
            });

            it("CHK18: イベントのスケジュールが6時間以上の場合はinvalidエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 3, 9, 0),
                    new Date(2024, 1, 3, 16, 0), // 7時間
                );
                const event = createEvent("Long Meeting", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).not.toBeNull();
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("6時間以上");
            });

            it("CHK19: 未来のイベントはoutOfScheduleエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 4, 9, 0), // 明日
                    new Date(2024, 1, 4, 10, 0),
                );
                const event = createEvent("Future Meeting", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).not.toBeNull();
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("未来のスケジュール");
            });

            it("CHK20: 30日以上前のイベントはoutOfScheduleエラーを返す", () => {
                const schedule = createSchedule(
                    new Date(2024, 0, 1, 9, 0), // 33日前
                    new Date(2024, 0, 1, 10, 0),
                );
                const event = createEvent("Old Meeting", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).not.toBeNull();
                expect(result?.details[0].reason).toBe("outOfSchedule");
                expect(result?.details[0].message).toContain("30日以上前のスケジュール");
            });

            it("CHK21: イベントの複数エラーも正しく検出される", () => {
                const schedule = createSchedule(
                    new Date(2024, 1, 5, 9, 0), // 未来
                    new Date(2024, 1, 5, 16, 0), // 7時間
                );
                const event = createEvent("Invalid Event", schedule);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).not.toBeNull();
                expect(result?.details.length).toBeGreaterThanOrEqual(2);
            });

            it("CHK22: キャンセルされたイベントもチェックされる", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
                const event = createEvent("Meeting", schedule, "", "", false, true);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).toBeNull();
            });

            it("CHK23: プライベートイベントもチェックされる", () => {
                const schedule = createSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
                const event = createEvent("Private Meeting", schedule, "", "", true);

                const result = TimeTrackerAlgorithmCore.check(event);

                expect(result).toBeNull();
            });
        });

        describe("不正な入力のチェック", () => {
            it("CHK24: Schedule/Event以外のオブジェクトはエラーをthrowする", () => {
                const invalidObject = { foo: "bar" };

                expect(() => TimeTrackerAlgorithmCore.check(invalidObject as any)).toThrow(
                    "不正なEvent、Scheduleが渡されました",
                );
            });

            it("CHK25: nullを渡すとエラーをthrowする", () => {
                expect(() => TimeTrackerAlgorithmCore.check(null as any)).toThrow(
                    "不正なEvent、Scheduleが渡されました",
                );
            });

            it("CHK26: undefinedを渡すとエラーをthrowする", () => {
                expect(() => TimeTrackerAlgorithmCore.check(undefined as any)).toThrow(
                    "不正なEvent、Scheduleが渡されました",
                );
            });
        });
    });
});
