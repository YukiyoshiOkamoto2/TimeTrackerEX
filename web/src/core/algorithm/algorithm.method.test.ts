import type { Event, EventInputInfo, Schedule, ScheduleAutoInputInfo, WorkingEventType } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";
import { TimeTrackerAlgorithm } from "./algorithm";

describe("TimeTrackerAlgorithm Methods", () => {
    let algorithm: TimeTrackerAlgorithm;
    const mockEventInputInfo: EventInputInfo = {
        roundingTimeType: "backward",
        eventDuplicateTimeCompare: "small",
    };
    const mockScheduleAutoInputInfo: ScheduleAutoInputInfo = {
        roundingTimeType: "backward",
        startEndType: "both",
        startEndTime: 30,
        workItemId: 1,
    };

    beforeEach(() => {
        algorithm = new TimeTrackerAlgorithm(mockEventInputInfo, mockScheduleAutoInputInfo);
    });

    describe("roundingTime", () => {
        it("RT01: 丸め単位(30分)で割り切れる時刻はそのまま返す", () => {
            const time = new Date(2024, 1, 3, 9, 0, 0);
            const result = algorithm.roundingTime(time, false);

            expect(result.getTime()).toBe(time.getTime());
        });

        it("RT02: backward=falseの場合、切り捨てる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 0);
            const result = algorithm.roundingTime(time, false);

            expect(result.getHours()).toBe(9);
            expect(result.getMinutes()).toBe(0);
        });

        it("RT03: backward=trueの場合、切り上げる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 0);
            const result = algorithm.roundingTime(time, true);

            expect(result.getHours()).toBe(9);
            expect(result.getMinutes()).toBe(30);
        });

        it("RT04: 秒とミリ秒は0にリセットされる", () => {
            const time = new Date(2024, 1, 3, 9, 15, 45, 123);
            const result = algorithm.roundingTime(time, false);

            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it("RT05: 29分は切り捨てで0分になる", () => {
            const time = new Date(2024, 1, 3, 9, 29, 0);
            const result = algorithm.roundingTime(time, false);

            expect(result.getMinutes()).toBe(0);
        });

        it("RT06: 29分は切り上げで30分になる", () => {
            const time = new Date(2024, 1, 3, 9, 29, 0);
            const result = algorithm.roundingTime(time, true);

            expect(result.getMinutes()).toBe(30);
        });

        it("RT07: 59分は切り上げで次の時間の0分になる", () => {
            const time = new Date(2024, 1, 3, 9, 59, 0);
            const result = algorithm.roundingTime(time, true);

            // 59 % 30 = 29, 59 + (30 - 29) = 60 → 次の時間の0分
            expect(result.getHours()).toBe(10);
            expect(result.getMinutes()).toBe(0);
        });

        it("RT08: 1分だけずれている場合も正しく丸められる", () => {
            const time = new Date(2024, 1, 3, 9, 1, 0);
            const result = algorithm.roundingTime(time, false);

            expect(result.getMinutes()).toBe(0);
        });
    });

    describe("roundingSchedule", () => {
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

        it("RS01: endがundefinedの場合はnullを返す", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
            };

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result).toBeNull();
        });

        it("RS02: 開始終了とも丸め単位で割り切れる場合はそのまま返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result).toEqual(schedule);
        });

        it("RS03: backwardモードで両方切り上げられる", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS04: forwardモードで両方切り捨てられる", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = algorithm.roundingSchedule(schedule, "forward");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS05: stretchモードで開始は切り捨て、終了は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 25));

            const result = algorithm.roundingSchedule(schedule, "stretch");

            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS06: roundモードで15分未満は切り捨て、15分以上は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 10), new Date(2024, 1, 3, 10, 20));

            const result = algorithm.roundingSchedule(schedule, "round");

            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS07: halfモードで15分ちょうどは切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));

            const result = algorithm.roundingSchedule(schedule, "half");

            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS08: 丸めた結果、開始と終了が同じ時刻になる場合はnullを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 9, 20));

            const result = algorithm.roundingSchedule(schedule, "forward");

            expect(result).toBeNull();
        });

        it("RS09: 丸めた結果、開始と終了が30分ちょうどの場合はそのまま返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 25), new Date(2024, 1, 3, 9, 35));

            const result = algorithm.roundingSchedule(schedule, "backward");

            // start: 9:30, end: 10:00 となり30分なのでそのまま返す
            expect(result).not.toBeNull();
            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS10: 丸めた結果が丸め単位(30分)未満になる場合はnullを返す", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 5), new Date(2024, 1, 3, 9, 20));

            const result = algorithm.roundingSchedule(schedule, "forward");

            // start: 9:00, end: 9:00 となるのでnull
            expect(result).toBeNull();
        });

        it("RS11: nonduplicateモード - イベント配列がデフォルトで空配列の場合は動作する", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));

            // デフォルトで events = [] が設定されているため、エラーにはならない
            const result = algorithm.roundingSchedule(schedule, "nonduplicate");

            // 開始は切り捨て(forward)、終了は切り上げ(backward)
            expect(result).not.toBeNull();
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS12: nonduplicateモード - 重複しない場合は切り捨てと切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 15));
            const events: Event[] = [];

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", events);

            // 開始は切り捨て(forward)、終了は切り上げ(backward)
            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS13: nonduplicateモード - 開始が重複する場合は切り上げ", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 11, 0));
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 8, 30), new Date(2024, 1, 3, 9, 30));
            const events: Event[] = [existingEvent];

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", events);

            // 9:00に切り捨てると重複するので9:30に切り上げ
            expect(result?.start.getHours()).toBe(9);
            expect(result?.start.getMinutes()).toBe(30);
        });

        it("RS14: nonduplicateモード - 終了が重複する場合は切り捨て", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 45));
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 30), new Date(2024, 1, 3, 11, 30));
            const events: Event[] = [existingEvent];

            const result = algorithm.roundingSchedule(schedule, "nonduplicate", events);

            // 11:00に切り上げると重複するので10:30に切り捨て
            expect(result?.end?.getHours()).toBe(10);
            expect(result?.end?.getMinutes()).toBe(30);
        });

        it("RS15: 開始のみ丸めが必要で終了は丸め不要の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 10, 0));

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result?.start.getMinutes()).toBe(30);
            expect(result?.end?.getMinutes()).toBe(0);
        });

        it("RS16: 終了のみ丸めが必要で開始は丸め不要の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 15));

            const result = algorithm.roundingSchedule(schedule, "backward");

            expect(result?.start.getMinutes()).toBe(0);
            expect(result?.end?.getMinutes()).toBe(30);
        });
    });

    describe("scheduleToEvent", () => {
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

        it("STE01: 休日スケジュールの場合はエラーをスローする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
                end: new Date(2024, 1, 3, 17, 0),
                isHoliday: true,
            };
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            expect(() => {
                algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);
            }).toThrow("スケジュールが休日またはエラーのためイベントに変換できません。");
        });

        it("STE02: 終了時刻がundefinedの場合はエラーをスローする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
            };
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            expect(() => {
                algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);
            }).toThrow("スケジュールが休日またはエラーのためイベントに変換できません。");
        });

        it("STE03: エラーメッセージがある場合はエラーをスローする", () => {
            const schedule: Schedule = {
                start: new Date(2024, 1, 3, 9, 0),
                end: new Date(2024, 1, 3, 17, 0),
                errorMessage: "テストエラー",
            };
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            expect(() => {
                algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);
            }).toThrow("スケジュールが休日またはエラーのためイベントに変換できません。");
        });

        it("STE04: bothモード - 勤務開始と勤務終了イベントが生成される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("勤務開始");
            expect(result[0].workingEventType).toBe("start");
            expect(result[1].name).toBe("勤務終了");
            expect(result[1].workingEventType).toBe("end");
        });

        it("STE05: bothモード - 勤務開始は30分間のイベント", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            const startEvent = result.find((e) => e.workingEventType === "start");
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.start.getMinutes()).toBe(0);
            expect(startEvent?.schedule.end?.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getMinutes()).toBe(30);
            const endEvent = result.find((e) => e.workingEventType === "end");
            expect(endEvent?.schedule.start.getHours()).toBe(16);
            expect(endEvent?.schedule.start.getMinutes()).toBe(30);
            expect(endEvent?.schedule.end?.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getMinutes()).toBe(0);
        });

        it("STE06: bothモード - 既存イベントと重複する場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 16, 0), new Date(2024, 1, 3, 17, 0));
            const events: Event[] = [existingEvent];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
        });

        it("STE07: bothモード - 既存イベントと重複しない場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 17, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events: Event[] = [existingEvent];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
        });

        it("STE08: fillモード - 勤務開始、勤務中、勤務終了が生成される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 11, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "fill",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            expect(result.length).toBeGreaterThan(2);
            const startEvents = result.filter((e) => e.workingEventType === "start");
            const middleEvents = result.filter((e) => e.workingEventType === "middle");
            const endEvents = result.filter((e) => e.workingEventType === "end");

            expect(startEvents).toHaveLength(1);
            expect(middleEvents).toHaveLength(1);
            expect(endEvents).toHaveLength(1);
        });

        it("STE10: fillモード - 既存イベントがある場合、その時間は埋めない", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 12, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "fill",
                startEndTime: 30,
                workItemId: 1,
            };
            const existingEvent = createTestEvent("e1", new Date(2024, 1, 3, 10, 0), new Date(2024, 1, 3, 11, 0));
            const events: Event[] = [existingEvent];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            // 既存イベントの時間帯は埋められないため、中間イベントは分割される
            const middleEvents = result.filter((e) => e.workingEventType === "middle");

            // 既存イベントがある場合、その前後で分割される
            expect(middleEvents).toHaveLength(2);

            const first = middleEvents[0];
            expect(first?.schedule.start.getHours()).toBe(9);
            expect(first?.schedule.start.getMinutes()).toBe(30);
            expect(first?.schedule.end?.getHours()).toBe(10);
            expect(first?.schedule.end?.getMinutes()).toBe(0);
            const second = middleEvents[1];
            expect(second?.schedule.start.getHours()).toBe(11);
            expect(second?.schedule.start.getMinutes()).toBe(0);
            expect(second?.schedule.end?.getHours()).toBe(11);
            expect(second?.schedule.end?.getMinutes()).toBe(30);
        });

        it("STE12: bothモード - roundingTimeTypeがstretchの場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 15), new Date(2024, 1, 3, 17, 15));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "stretch",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            expect(result).toHaveLength(2);
            // stretchは開始を切り捨て、終了を切り上げ
            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            // 開始は9:00-9:30の1時間
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.start.getMinutes()).toBe(0);
            expect(startEvent?.schedule.end?.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getMinutes()).toBe(30);

            // 終了は17:00-17:30の1時間
            expect(endEvent?.schedule.start.getHours()).toBe(17);
            expect(endEvent?.schedule.start.getMinutes()).toBe(0);
            expect(endEvent?.schedule.end?.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getMinutes()).toBe(30);
        });

        it("STE13: bothモード - startEndTimeが60分の場合", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "backward",
                startEndType: "both",
                startEndTime: 60,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            // 開始は9:00-10:00の1時間
            expect(startEvent?.schedule.start.getHours()).toBe(9);
            expect(startEvent?.schedule.end?.getHours()).toBe(10);

            // 終了は17:00-18:00の1時間
            expect(endEvent?.schedule.start.getHours()).toBe(17);
            expect(endEvent?.schedule.end?.getHours()).toBe(18);
        });

        it("STE14: bothモード - 勤務時間が短い場合でも開始・終了は別々に処理される", () => {
            const schedule = createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));
            const ScheduleAutoInputInfo: ScheduleAutoInputInfo = {
                roundingTimeType: "forward",
                startEndType: "both",
                startEndTime: 30,
                workItemId: 1,
            };
            const events: Event[] = [];

            const result = algorithm.scheduleToEvent(schedule, ScheduleAutoInputInfo, events);

            // 勤務開始(9:00-9:30)と勤務終了(9:30-10:00)が生成される
            expect(result).toHaveLength(2);
            const startEvent = result.find((e) => e.workingEventType === "start");
            const endEvent = result.find((e) => e.workingEventType === "end");

            expect(startEvent).toBeDefined();
            expect(endEvent).toBeDefined();
        });
    });

    describe("checkEvent", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
        });

        // privateメソッドにアクセスするためのヘルパー
        const checkEvent = (events: Event[]): Event[] => {
            return (algorithm as any).checkEvent(events);
        };

        it("CE01: 通常のイベントはそのまま通過する", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 60 * 60 * 1000); // 1時間前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE02: 6時間以上のイベントは削除される", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 7 * 60 * 60 * 1000); // 7時間前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE03: 未来のイベントは削除される", () => {
            const now = new Date();
            const future1 = new Date(now.getTime() + 60 * 60 * 1000); // 1時間後
            const future2 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2時間後
            const event = createTestEvent("e1", future1, future2);

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE04: 30日以上前のイベントは削除される", () => {
            const now = new Date();
            const past1 = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31日前
            const past2 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000); // 30日と1時間前
            const event = createTestEvent("e1", past1, past2);

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE05: 開始時間と終了時間が同じイベントは削除される", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 60 * 60 * 1000);
            const event = createTestEvent("e1", past, past);

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE06: 終了時間がundefinedのイベントは削除される", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 60 * 60 * 1000);
            const event = createTestEvent("e1", past, past);
            event.schedule.end = undefined;

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE07: 丸め単位(30分)よりも小さいイベントは削除される", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 29 * 60 * 1000); // 29分前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(0);
        });

        it("CE08: ちょうど丸め単位(30分)のイベントは通過する", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 30 * 60 * 1000); // 30分前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE09: 6時間未満のイベントは通過する", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 5 * 60 * 60 * 1000 - 59 * 60 * 1000); // 5時間59分前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE10: ちょうど6時間のイベントは通過する", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6時間前
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE11: 終了時刻が29日前のイベントは通過する", () => {
            const now = new Date();
            const past2 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); // 29日前
            const past1 = new Date(past2.getTime() - 60 * 60 * 1000); // さらに1時間前
            const event = createTestEvent("e1", past1, past2);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE12: 終了時刻がちょうど30日前のイベントは通過する", () => {
            const now = new Date();
            const past2 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30日前
            const past1 = new Date(past2.getTime() - 60 * 60 * 1000); // さらに1時間前
            const event = createTestEvent("e1", past1, past2);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });

        it("CE13: 複数イベントで条件を満たすものだけが残る", () => {
            const now = new Date();
            const event1 = createTestEvent("e1", new Date(now.getTime() - 60 * 60 * 1000), now); // 通過
            const event2 = createTestEvent("e2", new Date(now.getTime() - 7 * 60 * 60 * 1000), now); // 6時間超
            const event3 = createTestEvent(
                "e3",
                new Date(now.getTime() + 60 * 60 * 1000),
                new Date(now.getTime() + 2 * 60 * 60 * 1000),
            ); // 未来
            const event4 = createTestEvent(
                "e4",
                new Date(now.getTime() - 2 * 60 * 60 * 1000),
                new Date(now.getTime() - 60 * 60 * 1000),
            ); // 通過

            const result = checkEvent([event1, event2, event3, event4]);

            expect(result).toHaveLength(2);
            expect(result[0].uuid).toBe("e1");
            expect(result[1].uuid).toBe("e4");
        });

        it("CE14: 空の配列を渡すと空の配列が返る", () => {
            const result = checkEvent([]);

            expect(result).toHaveLength(0);
        });

        it("CE15: 開始時刻が現在時刻と同じイベントは通過する", () => {
            const now = new Date();
            const past = new Date(now.getTime() - 60 * 60 * 1000);
            const event = createTestEvent("e1", past, now);

            const result = checkEvent([event]);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("e1");
        });
    });

    describe("cleanDuplicateEvent", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
            uuid,
            name: `Event ${uuid}`,
            organizer: "test@example.com",
            isPrivate: false,
            isCancelled: false,
            location: "",
            schedule: { start, end },
        });

        it("CDE01: 空のマップを渡すと空のマップを返す", () => {
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(0);
        });

        it("CDE02: イベントが1日分だけで重複がない場合", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(1);
            const events = result.get("2024-02-01");
            expect(events).toHaveLength(2);
            expect(events![0].uuid).toBe("e1");
            expect(events![1].uuid).toBe("e2");
        });

        it("CDE03: 重複するイベント - smallモードで小さい方を優先", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0)); // 120分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // smallモードでe2が選ばれ、e1は10:00-11:00に調整される
            expect(events).toHaveLength(2);
            expect(events![0].uuid).toBe("e2");
            expect(events![1].uuid).toBe("e1");
            expect(events![1].schedule.start.getTime()).toBe(new Date(2024, 1, 1, 10, 0).getTime());
        });

        it("CDE04: 重複するイベント - largeモードで大きい方を優先", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0)); // 120分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "large");

            const events = result.get("2024-02-01");
            expect(events).toHaveLength(1);
            expect(events![0].uuid).toBe("e1"); // 大きい方が選ばれる
        });

        it("CDE05: 複数日のイベントマップ", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1]);
            eventMap.set("2024-02-02", [event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")).toHaveLength(1);
            expect(result.get("2024-02-02")).toHaveLength(1);
        });

        it("CDE06: 空のイベント配列がある日付", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1]);
            eventMap.set("2024-02-02", []);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")).toHaveLength(1);
            expect(result.get("2024-02-02")).toHaveLength(0);
        });

        it("CDE07: 3つのイベントが連続して重複 - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 30));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 30), new Date(2024, 1, 1, 11, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 30));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // smallモードでe1が選ばれ、e2とe3は調整されて残る
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE08: 3つのイベントが連続して重複 - largeモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 30)); // 90分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 30), new Date(2024, 1, 1, 11, 0)); // 90分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 30)); // 90分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "large");

            const events = result.get("2024-02-01");
            // largeモードで同じ長さなのでe1が選ばれ、他は調整される
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE09: 部分的に重複する4つのイベント - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 30), new Date(2024, 1, 1, 10, 30));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 10, 30), new Date(2024, 1, 1, 11, 30));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3, event4]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // e1(9:00-10:00)が選ばれ、e2は10:00-10:30に調整、e3は10:30-11:00に調整、e4は11:00-11:30
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE10: 重複なしの時系列イベント", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 12, 0), new Date(2024, 1, 1, 13, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3, event4]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            expect(events).toHaveLength(4);
            expect(events![0].uuid).toBe("e1");
            expect(events![1].uuid).toBe("e2");
            expect(events![2].uuid).toBe("e3");
            expect(events![3].uuid).toBe("e4");
        });

        it("CDE11: イベントが順不同で入力されても正しく処理される", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]); // 順不同

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            expect(events).toHaveLength(3);
            // 時系列順に並んでいることを確認
            expect(events![0].schedule.start.getTime()).toBeLessThan(events![1].schedule.start.getTime());
            expect(events![1].schedule.start.getTime()).toBeLessThan(events![2].schedule.start.getTime());
        });

        it("CDE12: 完全に包含されるイベント - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分、e1に包含
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // smallモードでe1が選ばれ、e2とe1の残りが分割される
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE13: 完全に包含されるイベント - largeモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0)); // 60分、e1に包含
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "large");

            const events = result.get("2024-02-01");
            // largeモードなので大きいe1が選ばれる
            expect(events).toHaveLength(1);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE14: 複数日で各日に異なる重複パターン", () => {
            // 1日目: 重複あり
            const day1_event1 = createTestEvent("d1e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0));
            const day1_event2 = createTestEvent("d1e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));

            // 2日目: 重複なし
            const day2_event1 = createTestEvent("d2e1", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));
            const day2_event2 = createTestEvent("d2e2", new Date(2024, 1, 2, 10, 0), new Date(2024, 1, 2, 11, 0));

            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [day1_event1, day1_event2]);
            eventMap.set("2024-02-02", [day2_event1, day2_event2]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBeGreaterThan(0); // d1e2が選ばれ、d1e1の残りが調整される
            expect(result.get("2024-02-02")!.length).toBe(2); // 重複なしで2つ
        });

        it("CDE15: 同じ開始時刻で異なる終了時刻 - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0)); // 120分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // smallモードでe3が選ばれ、e2とe1の残りが調整される
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e3");
        });

        it("CDE16: 同じ開始時刻で異なる終了時刻 - largeモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 12, 0)); // 180分
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 11, 0)); // 120分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0)); // 60分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "large");

            const events = result.get("2024-02-01");
            // largeモードなので最大のe1が選ばれる
            expect(events).toHaveLength(1);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE17: 連続する5つのイベントで一部重複", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 10, 30), new Date(2024, 1, 1, 11, 30)); // e2と重複
            const event4 = createTestEvent("e4", new Date(2024, 1, 1, 11, 30), new Date(2024, 1, 1, 12, 30));
            const event5 = createTestEvent("e5", new Date(2024, 1, 1, 12, 30), new Date(2024, 1, 1, 13, 30));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3, event4, event5]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // e2とe3が重複、smallモードでe2が優先され、e3は11:00-11:30に調整される可能性
            expect(events!.length).toBeGreaterThan(0);
            expect(events![0].uuid).toBe("e1");
        });

        it("CDE18: 全てのイベントが同じ時刻 - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // 全て同じなので1つだけ残る
            expect(events).toHaveLength(1);
        });

        it("CDE19: マップに複数の日付キーがあり、一部は空", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1]);
            eventMap.set("2024-02-02", []);
            eventMap.set("2024-02-03", []);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            expect(result.size).toBe(3);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(0);
            expect(result.get("2024-02-03")!.length).toBe(0);
        });

        it("CDE20: 長時間イベントと短時間イベントの混在 - smallモード", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 17, 0)); // 8時間
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 10, 30)); // 30分
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 11, 30)); // 30分
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2, event3]);

            const result = algorithm.cleanDuplicateEvent(eventMap, "small");

            const events = result.get("2024-02-01");
            // smallモードなので短時間のイベントが優先される
            expect(events!.length).toBeGreaterThan(0);
            // 最初に選ばれるのは最小のイベント
            const firstEvent = events!.find((e) => e.uuid === "e2" || e.uuid === "e3");
            expect(firstEvent).toBeDefined();
        });
    });

    describe("getEventDayMap", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => {
            return {
                uuid,
                name: `Event ${uuid}`,
                organizer: "",
                isPrivate: false,
                isCancelled: false,
                location: "",
                schedule: { start, end },
            };
        };

        const createTestSchedule = (start: Date, end: Date): Schedule => {
            return { start, end };
        };

        it("GEDM01: 単一イベント、スケジュールなし", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const result = algorithm.getEventDayMap([event], []);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-01")![0].uuid).toBe("e1");
        });

        it("GEDM02: 複数イベント、同じ日", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 11, 0), new Date(2024, 1, 1, 12, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 1, 13, 0), new Date(2024, 1, 1, 14, 0));
            const result = algorithm.getEventDayMap([event1, event2, event3], []);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(3);
        });

        it("GEDM03: 複数イベント、異なる日", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 11, 0), new Date(2024, 1, 2, 12, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 3, 13, 0), new Date(2024, 1, 3, 14, 0));
            const result = algorithm.getEventDayMap([event1, event2, event3], []);

            expect(result.size).toBe(3);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
            expect(result.get("2024-02-03")!.length).toBe(1);
        });

        it("GEDM04: スケジュール範囲外のイベントは削除される", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 5, 11, 0), new Date(2024, 1, 5, 12, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 10, 13, 0), new Date(2024, 1, 10, 14, 0));

            const schedules = [
                createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0)),
                createTestSchedule(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0)),
                createTestSchedule(new Date(2024, 1, 4, 9, 0), new Date(2024, 1, 4, 18, 0)),
            ];

            const result = algorithm.getEventDayMap([event1, event2, event3], schedules);

            // スケジュール範囲は2024-02-02から2024-02-04まで
            // event2(2024-02-05)は範囲外で削除、event1(2024-02-01)も範囲外で削除
            expect(result.size).toBe(0);
        });

        it("GEDM05: スケジュール範囲内のイベントのみ残る", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 11, 0), new Date(2024, 1, 2, 12, 0));
            const event3 = createTestEvent("e3", new Date(2024, 1, 5, 13, 0), new Date(2024, 1, 5, 14, 0));

            const schedules = [
                createTestSchedule(new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 18, 0)),
                createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0)),
            ];

            const result = algorithm.getEventDayMap([event1, event2, event3], schedules);

            // スケジュール範囲は2024-02-01から2024-02-02まで
            // event3(2024-02-05)は範囲外で削除
            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
        });

        it("GEDM06: 繰り返しイベントが展開される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event.recurrence = [new Date(2024, 1, 2, 0, 0, 0), new Date(2024, 1, 3, 0, 0, 0)];

            const result = algorithm.getEventDayMap([event], []);

            // 元のイベント + 繰り返し2回 = 3日分
            expect(result.size).toBe(3);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
            expect(result.get("2024-02-03")!.length).toBe(1);
        });

        it("GEDM07: 繰り返しイベントの時刻が保持される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 14, 30), new Date(2024, 1, 1, 16, 0));
            event.recurrence = [new Date(2024, 1, 5, 0, 0, 0)];

            const result = algorithm.getEventDayMap([event], []);

            const recurrenceEvent = result.get("2024-02-05")![0];
            expect(recurrenceEvent.schedule.start.getHours()).toBe(14);
            expect(recurrenceEvent.schedule.start.getMinutes()).toBe(30);
            expect(recurrenceEvent.schedule.end!.getHours()).toBe(16);
            expect(recurrenceEvent.schedule.end!.getMinutes()).toBe(0);
        });

        it("GEDM08: 繰り返しイベントがスケジュール範囲外で削除される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event.recurrence = [
                new Date(2024, 1, 2, 0, 0, 0),
                new Date(2024, 1, 10, 0, 0, 0), // スケジュール範囲外
            ];

            const schedules = [
                createTestSchedule(new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 18, 0)),
                createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0)),
            ];

            const result = algorithm.getEventDayMap([event], schedules);

            // 範囲外の繰り返しは削除される
            expect(result.size).toBe(2);
            expect(result.has("2024-02-10")).toBe(false);
        });

        it("GEDM09: 空のイベント配列", () => {
            const result = algorithm.getEventDayMap([], []);
            expect(result.size).toBe(0);
        });

        it("GEDM10: 同じ日に通常イベントと繰り返しイベント", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 11, 0), new Date(2024, 1, 2, 12, 0));
            event2.recurrence = [new Date(2024, 1, 1, 0, 0, 0)]; // e1と同じ日

            const result = algorithm.getEventDayMap([event1, event2], []);

            // 2024-02-01にe1とe2の繰り返しが入る
            expect(result.get("2024-02-01")!.length).toBe(2);
            expect(result.get("2024-02-02")!.length).toBe(1);
        });

        it("GEDM11: 複数のイベントに繰り返しがある", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event1.recurrence = [new Date(2024, 1, 3, 0, 0, 0)];

            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 11, 0), new Date(2024, 1, 2, 12, 0));
            event2.recurrence = [new Date(2024, 1, 3, 0, 0, 0)];

            const result = algorithm.getEventDayMap([event1, event2], []);

            // 2024-02-03に両方の繰り返しが入る
            expect(result.size).toBe(3);
            expect(result.get("2024-02-03")!.length).toBe(2);
        });

        it("GEDM12: スケジュール範囲の境界値(最小日)", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));

            const schedules = [createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0))];

            const result = algorithm.getEventDayMap([event1, event2], schedules);

            // 2024-02-01は範囲外
            expect(result.size).toBe(1);
            expect(result.has("2024-02-01")).toBe(false);
            expect(result.has("2024-02-02")).toBe(true);
        });

        it("GEDM13: スケジュール範囲の境界値(最大日)", () => {
            const event1 = createTestEvent("e1", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 10, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 10, 0));

            const schedules = [createTestSchedule(new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 18, 0))];

            const result = algorithm.getEventDayMap([event1, event2], schedules);

            // 2024-02-03は範囲外
            expect(result.size).toBe(1);
            expect(result.has("2024-02-02")).toBe(true);
            expect(result.has("2024-02-03")).toBe(false);
        });

        it("GEDM14: 繰り返しイベントのrecurrenceがundefinedに設定される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event.recurrence = [new Date(2024, 1, 2, 0, 0, 0)];

            const result = algorithm.getEventDayMap([event], []);

            const recurrenceEvent = result.get("2024-02-02")![0];
            // 繰り返しイベントのrecurrenceはundefinedに設定される
            expect(recurrenceEvent.recurrence).toBeUndefined();
        });

        it("GEDM15: 大量のイベントと繰り返し", () => {
            const events: Event[] = [];
            for (let i = 0; i < 10; i++) {
                const event = createTestEvent(`e${i}`, new Date(2024, 1, 1, 9 + i, 0), new Date(2024, 1, 1, 10 + i, 0));
                event.recurrence = [new Date(2024, 1, 2, 0, 0, 0), new Date(2024, 1, 3, 0, 0, 0)];
                events.push(event);
            }

            const result = algorithm.getEventDayMap(events, []);

            // 元の日 + 繰り返し2日 = 3日分
            expect(result.size).toBe(3);
            // 各日に10イベント
            expect(result.get("2024-02-01")!.length).toBe(10);
            expect(result.get("2024-02-02")!.length).toBe(10);
            expect(result.get("2024-02-03")!.length).toBe(10);
        });
    });

    describe("addStartToEndDate", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date): Event => {
            return {
                uuid,
                name: `Event ${uuid}`,
                organizer: "",
                isPrivate: false,
                isCancelled: false,
                location: "",
                schedule: { start, end },
            };
        };

        it("ASED01: 終了日が開始日と同じイベントはそのまま", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-01")![0].uuid).toBe("e1");
        });

        it("ASED02: 終了日がundefinedのイベントはそのまま", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 10, 0));
            event.schedule.end = undefined;
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
        });

        it("ASED03: 2日間にまたがるイベントを分割", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

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

            const result = algorithm.addStartToEndDate(eventMap);

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

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBe(2); // e1とe2の初日部分
            expect(result.get("2024-02-02")!.length).toBe(1); // e2の2日目部分
        });

        it("ASED06: 分割されたイベントのrecurrenceはundefinedになる", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 22, 0), new Date(2024, 1, 2, 2, 0));
            event.recurrence = [new Date(2024, 1, 5, 0, 0, 0)];
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

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

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(4); // 2/1, 2/2, 2/3, 2/4
            expect(result.get("2024-02-01")!.length).toBe(1);
            expect(result.get("2024-02-02")!.length).toBe(1);
            expect(result.get("2024-02-03")!.length).toBe(1);
            expect(result.get("2024-02-04")!.length).toBe(1);
        });

        it("ASED08: 空のイベントマップ", () => {
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(0);
        });

        it("ASED09: 日付キーに空配列", () => {
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", []);

            const result = algorithm.addStartToEndDate(eventMap);

            // 空配列の日付キーは結果に含まれない
            expect(result.size).toBe(0);
        });

        it("ASED10: 丸め単位(30分)が終了時刻に反映される", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 20, 0), new Date(2024, 1, 2, 4, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

            // 1日目の終了時刻は23:30 (roundingTimeUnit=30)
            const day1Event = result.get("2024-02-01")![0];
            expect(day1Event.schedule.end!.getMinutes()).toBe(30);
        });

        it("ASED11: 月をまたぐイベント", () => {
            const event = createTestEvent("e1", new Date(2024, 0, 31, 22, 0), new Date(2024, 1, 1, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-01-31", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-01-31")!.length).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
        });

        it("ASED12: 年をまたぐイベント", () => {
            const event = createTestEvent("e1", new Date(2023, 11, 31, 22, 0), new Date(2024, 0, 1, 2, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2023-12-31", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2023-12-31")!.length).toBe(1);
            expect(result.get("2024-01-01")!.length).toBe(1);
        });

        it("ASED13: 5日間にまたがる長時間イベント", () => {
            const event = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 5, 14, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event]);

            const result = algorithm.addStartToEndDate(eventMap);

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

            const result = algorithm.addStartToEndDate(eventMap);

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

            const result = algorithm.addStartToEndDate(eventMap);

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

    describe("margedScheduleEvents", () => {
        const createTestEvent = (uuid: string, start: Date, end: Date, workingType?: WorkingEventType): Event => {
            return {
                uuid,
                name: workingType ? `勤務${workingType}` : `Event ${uuid}`,
                organizer: "",
                isPrivate: false,
                isCancelled: false,
                location: "",
                schedule: { start, end },
                workingEventType: workingType,
            };
        };

        it("MSE01: 勤務時間イベントが2つ未満の場合はスキップ", () => {
            const scheduleEvent = createTestEvent(
                "s1",
                new Date(2024, 1, 1, 9, 0),
                new Date(2024, 1, 1, 9, 30),
                "start",
            );
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [scheduleEvent]);
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(0);
        });

        it("MSE02: 勤務開始・終了イベントのみの場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(2);
            expect(result.get("2024-02-01")![0].workingEventType).toBe("start");
            expect(result.get("2024-02-01")![1].workingEventType).toBe("end");
        });

        it("MSE03: 通常イベントが勤務時間外の場合は削除", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 8, 0), new Date(2024, 1, 1, 8, 30));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            // 勤務時間外のイベントは削除されるので勤務開始・終了のみ
            expect(result.get("2024-02-01")!.length).toBe(2);
        });

        it("MSE04: 通常イベントが勤務開始と重複する場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 9, 15), new Date(2024, 1, 1, 10, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(2);
            // 通常イベント + 勤務終了(勤務開始は重複のため削除)
            const events = result.get("2024-02-01")!;
            expect(events[0].workingEventType).toBeUndefined();
            expect(events[0].schedule.start.getHours()).toBe(9);
            expect(events[0].schedule.start.getMinutes()).toBe(0); // 勤務開始時刻に調整
            expect(events[1].workingEventType).toBe("end");
        });

        it("MSE05: 通常イベントが勤務終了と重複する場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 17, 0), new Date(2024, 1, 1, 17, 45));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(2);
            const events = result.get("2024-02-01")!;
            expect(events[0].workingEventType).toBe("start");
            expect(events[1].workingEventType).toBeUndefined();
            expect(events[1].schedule.end!.getHours()).toBe(18);
            expect(events[1].schedule.end!.getMinutes()).toBe(0); // 勤務終了時刻に調整
        });

        it("MSE06: 通常イベントが勤務時間内にあり重複なし", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 12, 0), new Date(2024, 1, 1, 13, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(3);
            const events = result.get("2024-02-01")!;
            expect(events[0].workingEventType).toBe("start");
            expect(events[1].workingEventType).toBeUndefined();
            expect(events[2].workingEventType).toBe("end");
        });

        it("MSE07: 中間イベント(middle)が存在する場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const middleEvent = createTestEvent(
                "s2",
                new Date(2024, 1, 1, 12, 0),
                new Date(2024, 1, 1, 13, 0),
                "middle",
            );
            const endEvent = createTestEvent("s3", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, middleEvent, endEvent]);
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(3);
            const events = result.get("2024-02-01")!;
            expect(events[0].workingEventType).toBe("start");
            expect(events[1].workingEventType).toBe("middle");
            expect(events[2].workingEventType).toBe("end");
        });

        it("MSE08: 複数の通常イベントが存在する場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const event1 = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const event2 = createTestEvent("e2", new Date(2024, 1, 1, 14, 0), new Date(2024, 1, 1, 15, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [event1, event2]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(4);
        });

        it("MSE09: 勤務時間イベントが時系列順でない場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            // 逆順で追加
            scheduleEventMap.set("2024-02-01", [endEvent, startEvent]);
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(2);
            // ソートされていることを確認
            const events = result.get("2024-02-01")!;
            expect(events[0].schedule.start.getTime()).toBeLessThan(events[1].schedule.start.getTime());
        });

        it("MSE10: 複数日のイベントマップ", () => {
            const start1 = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const end1 = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const start2 = createTestEvent("s3", new Date(2024, 1, 2, 9, 0), new Date(2024, 1, 2, 9, 30), "start");
            const end2 = createTestEvent("s4", new Date(2024, 1, 2, 17, 30), new Date(2024, 1, 2, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [start1, end1]);
            scheduleEventMap.set("2024-02-02", [start2, end2]);
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(2);
            expect(result.get("2024-02-01")!.length).toBe(2);
            expect(result.get("2024-02-02")!.length).toBe(2);
        });

        it("MSE11: 通常イベントマップに存在しない日付", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 2, 10, 0), new Date(2024, 1, 2, 11, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-02", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            // 2/1のみ存在(eventMapの2/2は処理されない)
            expect(result.get("2024-02-01")!.length).toBe(2);
            expect(result.get("2024-02-02")).toBeUndefined();
        });

        it("MSE12: 空のスケジュールイベントマップ", () => {
            const scheduleEventMap = new Map<string, Event[]>();
            const eventMap = new Map<string, Event[]>();

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(0);
        });

        it("MSE13: 通常イベントが勤務開始と勤務終了の両方と重複", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 9, 15), new Date(2024, 1, 1, 17, 45));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            expect(result.get("2024-02-01")!.length).toBe(1);
            // 通常イベントのみ(勤務開始・終了は重複のため削除)
            const event = result.get("2024-02-01")![0];
            expect(event.workingEventType).toBeUndefined();
            expect(event.schedule.start.getHours()).toBe(9);
            expect(event.schedule.start.getMinutes()).toBe(0);
            expect(event.schedule.end!.getHours()).toBe(18);
            expect(event.schedule.end!.getMinutes()).toBe(0);
        });

        it("MSE14: 勤務終了時刻がundefinedの場合は処理しない", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 17, 30), "end");
            endEvent.schedule.end = undefined;
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            // 通常イベントは勤務時間チェックで除外される
            expect(result.get("2024-02-01")!.length).toBe(2);
        });

        it("MSE15: 通常イベントの終了時刻がundefinedの場合", () => {
            const startEvent = createTestEvent("s1", new Date(2024, 1, 1, 9, 0), new Date(2024, 1, 1, 9, 30), "start");
            const endEvent = createTestEvent("s2", new Date(2024, 1, 1, 17, 30), new Date(2024, 1, 1, 18, 0), "end");
            const scheduleEventMap = new Map<string, Event[]>();
            scheduleEventMap.set("2024-02-01", [startEvent, endEvent]);

            const normalEvent = createTestEvent("e1", new Date(2024, 1, 1, 10, 0), new Date(2024, 1, 1, 11, 0));
            normalEvent.schedule.end = undefined;
            const eventMap = new Map<string, Event[]>();
            eventMap.set("2024-02-01", [normalEvent]);

            const result = algorithm.margedScheduleEvents(scheduleEventMap, eventMap);

            expect(result.size).toBe(1);
            // 終了時刻がundefinedのイベントは勤務時間内チェックで除外される
            expect(result.get("2024-02-01")!.length).toBe(2);
        });
    });
});
