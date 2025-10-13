/**
 * TimeTrackerAlgorithmSchedule のテスト
 * margedScheduleEvents 関数のテスト
 */

import type { Event } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmSchedule } from "./TimeTrackerAlgorithmSchedule";

describe("TimeTrackerAlgorithmSchedule", () => {
    const createTestEvent = (
        uuid: string,
        start: Date,
        end: Date,
        workingEventType?: "start" | "end" | "middle",
    ): Event => ({
        uuid,
        name: workingEventType === "start" ? "勤務開始" : workingEventType === "end" ? "勤務終了" : `Event ${uuid}`,
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: { start, end },
        workingEventType,
    });

    describe("margedScheduleEvents", () => {
        it("MSE01: 通常イベントがない場合、すべての勤務時間イベントが返される", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            expect(result).toHaveLength(2);
            expect(result).toEqual(scheduleEvents);
        });

        it("MSE02: 勤務時間イベントが空の場合、空配列が返される", () => {
            const scheduleEvents: Event[] = [];
            const normalEvents = [createTestEvent("e1", new Date(2024, 9, 1, 10, 0), new Date(2024, 9, 1, 11, 0))];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            expect(result).toHaveLength(0);
        });

        it("MSE03: 両方とも空の場合、空配列が返される", () => {
            const scheduleEvents: Event[] = [];
            const normalEvents: Event[] = [];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            expect(result).toHaveLength(0);
        });

        it("MSE04: 通常イベントと重複しない勤務時間イベントはすべて残る", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [createTestEvent("e1", new Date(2024, 9, 1, 10, 0), new Date(2024, 9, 1, 11, 0))];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            expect(result).toHaveLength(2);
            expect(result).toEqual(scheduleEvents);
        });

        it("MSE05: 通常イベントと重複する勤務時間イベントは削除される", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [
                // 勤務開始と重複
                createTestEvent("e1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 10, 0)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // 重複する勤務開始イベントは削除され、勤務終了のみ残る
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("s2");
        });

        it("MSE06: 複数の通常イベントと複数の勤務時間イベント", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 12, 0), new Date(2024, 9, 1, 13, 0), "middle"),
                createTestEvent("s3", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [
                createTestEvent("e1", new Date(2024, 9, 1, 10, 0), new Date(2024, 9, 1, 11, 0)),
                createTestEvent("e2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 18, 0)), // 勤務終了と重複
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // s3(勤務終了)が削除され、s1とs2が残る
            expect(result).toHaveLength(2);
            expect(result.map((e) => e.uuid)).toEqual(["s1", "s2"]);
        });

        it("MSE07: 複数日にまたがる勤務時間イベントと通常イベント", () => {
            const scheduleEvents = [
                // 10/1
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
                // 10/2
                createTestEvent("s3", new Date(2024, 9, 2, 9, 0), new Date(2024, 9, 2, 9, 30), "start"),
                createTestEvent("s4", new Date(2024, 9, 2, 17, 0), new Date(2024, 9, 2, 17, 30), "end"),
            ];
            const normalEvents = [
                // 10/1に通常イベント（勤務開始と重複）
                createTestEvent("e1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 10, 0)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // 10/1の勤務開始(s1)は削除、10/1の勤務終了(s2)と10/2の両方(s3, s4)は残る
            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["s2", "s3", "s4"]);
        });

        it("MSE08: 異なる日の勤務時間イベントは独立して処理される", () => {
            const scheduleEvents = [
                // 10/1
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
                // 10/2
                createTestEvent("s3", new Date(2024, 9, 2, 9, 0), new Date(2024, 9, 2, 9, 30), "start"),
            ];
            const normalEvents = [
                // 10/2に通常イベント（勤務開始と重複）
                createTestEvent("e1", new Date(2024, 9, 2, 9, 0), new Date(2024, 9, 2, 10, 0)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // 10/1の両方は残り、10/2の勤務開始(s3)は削除
            expect(result).toHaveLength(2);
            expect(result.map((e) => e.uuid)).toEqual(["s1", "s2"]);
        });

        it("MSE09: 部分的に重複する通常イベント", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [
                // 勤務開始と部分的に重複
                createTestEvent("e1", new Date(2024, 9, 1, 9, 15), new Date(2024, 9, 1, 10, 0)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // 部分的でも重複していれば削除される
            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("s2");
        });

        it("MSE10: すべての勤務時間イベントが削除されるケース", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [
                // 両方の勤務時間イベントと重複
                createTestEvent("e1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 10, 0)),
                createTestEvent("e2", new Date(2024, 9, 1, 16, 30), new Date(2024, 9, 1, 18, 0)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // すべて削除される
            expect(result).toHaveLength(0);
        });

        it("MSE11: 勤務中イベントも正しく処理される", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 10, 0), new Date(2024, 9, 1, 12, 0), "middle"),
                createTestEvent("s3", new Date(2024, 9, 1, 13, 0), new Date(2024, 9, 1, 15, 0), "middle"),
                createTestEvent("s4", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [
                // 2つ目の勤務中イベントと重複
                createTestEvent("e1", new Date(2024, 9, 1, 13, 30), new Date(2024, 9, 1, 14, 30)),
            ];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // s3が削除され、s1, s2, s4が残る
            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["s1", "s2", "s4"]);
        });

        it("MSE12: 同じ日に複数の勤務時間セットがある場合", () => {
            const scheduleEvents = [
                createTestEvent("s1", new Date(2024, 9, 1, 9, 0), new Date(2024, 9, 1, 9, 30), "start"),
                createTestEvent("s2", new Date(2024, 9, 1, 12, 0), new Date(2024, 9, 1, 12, 30), "end"),
                createTestEvent("s3", new Date(2024, 9, 1, 13, 0), new Date(2024, 9, 1, 13, 30), "start"),
                createTestEvent("s4", new Date(2024, 9, 1, 17, 0), new Date(2024, 9, 1, 17, 30), "end"),
            ];
            const normalEvents = [createTestEvent("e1", new Date(2024, 9, 1, 13, 0), new Date(2024, 9, 1, 14, 0))];

            const result = TimeTrackerAlgorithmSchedule.margedScheduleEvents(scheduleEvents, normalEvents);

            // s3が削除され、s1, s2, s4が残る
            expect(result).toHaveLength(3);
            expect(result.map((e) => e.uuid)).toEqual(["s1", "s2", "s4"]);
        });
    });
});
