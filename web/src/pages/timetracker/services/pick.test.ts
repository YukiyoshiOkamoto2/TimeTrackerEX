import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickEvents, EventState } from "./pick";
import { Event, Schedule } from "@/types";
import { AdjustedEventInfo } from "../models";
import { TimeTrackerAlgorithmCore } from "@/core/algorithm/TimeTrackerAlgorithmCore";

// TimeTrackerAlgorithmCoreのモック
vi.mock("@/core/algorithm/TimeTrackerAlgorithmCore", () => ({
    TimeTrackerAlgorithmCore: {
        isDuplicateEventOrSchedule: vi.fn(),
    },
}));

describe("pickEvents", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ヘルパー関数: テスト用のEventを作成
    const createEvent = (uuid: string, name: string, start: Date, end: Date): Event => ({
        uuid,
        name,
        schedule: {
            start,
            end,
        },
        organizer: "",
        isPrivate: false,
        isCancelled: false,
        location: ""
    });

    // ヘルパー関数: テスト用のScheduleを作成
    const createSchedule = (start: Date, end: Date): Schedule => ({
        start,
        end,
    });

    // ヘルパー関数: テスト用のAdjustedEventInfoを作成
    const createAdjustedEventInfo = (
        uuid: string,
        name: string,
        start: Date,
        end: Date,
        oldStart: Date,
        oldEnd: Date,
    ): AdjustedEventInfo => ({
        event: createEvent(uuid, name, start, end),
        oldSchdule: createSchedule(oldStart, oldEnd),
        mesage: "時間調整",
    });

    // ヘルパー関数: 空のEventStateを作成
    const createEmptyState = (): EventState => ({
        enableSchedules: [],
        enableEvents: [],
        scheduleEvents: [],
        adjustedEvents: [],
        paidLeaveDayEvents: [],
        excludedSchedules: [],
        excludedEvents: [],
    });

    describe("基本的なイベント収集", () => {
        it("空のステートの場合、空配列を返す", () => {
            const state = createEmptyState();
            const result = pickEvents(state);

            expect(result).toEqual([]);
        });

        it("enableEventsのみの場合、そのまま返す", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 10, 0), new Date(2024, 0, 1, 11, 0));

            const state = createEmptyState();
            state.enableEvents = [event1, event2];

            // 重複なしのモック
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(event1);
            expect(result[1]).toEqual(event2);
        });

        it("scheduleEventsのみの場合、そのまま返す", () => {
            const event = createEvent("uuid1", "Schedule Event", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 18, 0));

            const state = createEmptyState();
            state.scheduleEvents = [event];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(event);
        });

        it("paidLeaveDayEventsのみの場合、そのまま返す", () => {
            const event = createEvent("uuid1", "有給休暇", new Date(2024, 0, 1, 0, 0), new Date(2024, 0, 1, 23, 59));

            const state = createEmptyState();
            state.paidLeaveDayEvents = [event];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(event);
        });

        it("adjustedEventsの場合、oldScheduleを付与して返す", () => {
            const adjustedInfo = createAdjustedEventInfo(
                "uuid1",
                "Adjusted Event",
                new Date(2024, 0, 1, 9, 0),
                new Date(2024, 0, 1, 10, 0),
                new Date(2024, 0, 1, 8, 30),
                new Date(2024, 0, 1, 9, 30),
            );

            const state = createEmptyState();
            state.adjustedEvents = [adjustedInfo];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(1);
            expect(result[0].uuid).toBe("uuid1");
            expect(result[0].oldSchedule).toEqual(adjustedInfo.oldSchdule);
        });

        it("すべてのイベントタイプを結合する", () => {
            const enableEvent = createEvent("uuid1", "Enable Event", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const scheduleEvent = createEvent("uuid2", "Schedule Event", new Date(2024, 0, 1, 10, 0), new Date(2024, 0, 1, 11, 0));
            const paidLeaveEvent = createEvent("uuid3", "有給休暇", new Date(2024, 0, 1, 0, 0), new Date(2024, 0, 1, 23, 59));
            const adjustedInfo = createAdjustedEventInfo(
                "uuid4",
                "Adjusted Event",
                new Date(2024, 0, 1, 11, 0),
                new Date(2024, 0, 1, 12, 0),
                new Date(2024, 0, 1, 10, 30),
                new Date(2024, 0, 1, 11, 30),
            );

            const state = createEmptyState();
            state.enableEvents = [enableEvent];
            state.scheduleEvents = [scheduleEvent];
            state.paidLeaveDayEvents = [paidLeaveEvent];
            state.adjustedEvents = [adjustedInfo];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(4);
            expect(result.map((e) => e.uuid)).toEqual(["uuid1", "uuid4", "uuid3", "uuid2"]);
        });
    });

    describe("重複検出機能", () => {
        it("重複がない場合、duplicationUUIDは付与されない", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 10, 0), new Date(2024, 0, 1, 11, 0));

            const state = createEmptyState();
            state.enableEvents = [event1, event2];

            // 重複なしのモック
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(2);
            expect(result[0].duplicationUUID).toBeUndefined();
            expect(result[1].duplicationUUID).toBeUndefined();
        });

        it("重複がある場合、duplicationUUIDが付与される", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 9, 30), new Date(2024, 0, 1, 10, 30));

            const state = createEmptyState();
            state.enableEvents = [event1, event2];

            // event1とevent2が重複しているとモック
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockImplementation(
                (event, otherEvents) => {
                    const target = event as Event;
                    const other = otherEvents[0] as Event;
                    
                    // 自分自身との比較はスキップ（実際の実装では自動的に除外される）
                    if (target.uuid === other.uuid) return false;
                    
                    // event1とevent2は重複
                    if ((target.uuid === "uuid1" && other.uuid === "uuid2") || 
                        (target.uuid === "uuid2" && other.uuid === "uuid1")) {
                        return true;
                    }
                    return false;
                },
            );

            const result = pickEvents(state);

            expect(result).toHaveLength(2);
            expect(result[0].duplicationUUID).toEqual(["uuid2"]);
            expect(result[1].duplicationUUID).toEqual(["uuid1"]);
        });

        it("3つ以上のイベントが重複している場合", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 9, 30), new Date(2024, 0, 1, 10, 30));
            const event3 = createEvent("uuid3", "Event3", new Date(2024, 0, 1, 9, 45), new Date(2024, 0, 1, 10, 15));

            const state = createEmptyState();
            state.enableEvents = [event1, event2, event3];

            // すべてが重複しているとモック
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockImplementation(
                (event, otherEvents) => {
                    const target = event as Event;
                    const other = otherEvents[0] as Event;
                    
                    // 自分自身との比較はスキップ
                    if (target.uuid === other.uuid) return false;
                    
                    // すべて重複
                    return true;
                },
            );

            const result = pickEvents(state);

            expect(result).toHaveLength(3);
            expect(result[0].duplicationUUID).toEqual(["uuid2", "uuid3"]);
            expect(result[1].duplicationUUID).toEqual(["uuid1", "uuid3"]);
            expect(result[2].duplicationUUID).toEqual(["uuid1", "uuid2"]);
        });

        it("一部のイベントのみ重複している場合", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 9, 30), new Date(2024, 0, 1, 10, 30));
            const event3 = createEvent("uuid3", "Event3", new Date(2024, 0, 1, 11, 0), new Date(2024, 0, 1, 12, 0));

            const state = createEmptyState();
            state.enableEvents = [event1, event2, event3];

            // event1とevent2のみ重複
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockImplementation(
                (event, otherEvents) => {
                    const target = event as Event;
                    const other = otherEvents[0] as Event;
                    
                    if (target.uuid === other.uuid) return false;
                    
                    if ((target.uuid === "uuid1" && other.uuid === "uuid2") || 
                        (target.uuid === "uuid2" && other.uuid === "uuid1")) {
                        return true;
                    }
                    return false;
                },
            );

            const result = pickEvents(state);

            expect(result).toHaveLength(3);
            expect(result[0].duplicationUUID).toEqual(["uuid2"]);
            expect(result[1].duplicationUUID).toEqual(["uuid1"]);
            expect(result[2].duplicationUUID).toBeUndefined();
        });

        it("異なるタイプのイベント間で重複を検出する", () => {
            const enableEvent = createEvent("uuid1", "Enable Event", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const scheduleEvent = createEvent("uuid2", "Schedule Event", new Date(2024, 0, 1, 9, 30), new Date(2024, 0, 1, 10, 30));

            const state = createEmptyState();
            state.enableEvents = [enableEvent];
            state.scheduleEvents = [scheduleEvent];

            // 異なるタイプ間でも重複検出
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockImplementation(
                (event, otherEvents) => {
                    const target = event as Event;
                    const other = otherEvents[0] as Event;
                    
                    if (target.uuid === other.uuid) return false;
                    
                    if ((target.uuid === "uuid1" && other.uuid === "uuid2") || 
                        (target.uuid === "uuid2" && other.uuid === "uuid1")) {
                        return true;
                    }
                    return false;
                },
            );

            const result = pickEvents(state);

            expect(result).toHaveLength(2);
            expect(result[0].duplicationUUID).toEqual(["uuid2"]);
            expect(result[1].duplicationUUID).toEqual(["uuid1"]);
        });
    });

    describe("エッジケース", () => {
        it("undefinedやnullのイベント配列を扱う", () => {
            const state = createEmptyState();
            // TypeScriptの型システムを回避するためのテスト
            state.enableEvents = undefined as any;
            state.scheduleEvents = null as any;

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toEqual([]);
        });

        it("空のduplicationUUID配列は作成されない", () => {
            const event = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));

            const state = createEmptyState();
            state.enableEvents = [event];

            // 重複なし
            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(1);
            expect(result[0].duplicationUUID).toBeUndefined();
            expect(Object.keys(result[0])).not.toContain("duplicationUUID");
        });

        it("adjustedEventsのoldScheduleが正しくマッピングされる", () => {
            const oldSchedule = createSchedule(new Date(2024, 0, 1, 8, 0), new Date(2024, 0, 1, 9, 0));
            const adjustedInfo = createAdjustedEventInfo(
                "uuid1",
                "Adjusted",
                new Date(2024, 0, 1, 9, 0),
                new Date(2024, 0, 1, 10, 0),
                oldSchedule.start,
                oldSchedule.end!,
            );

            const state = createEmptyState();
            state.adjustedEvents = [adjustedInfo];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            const result = pickEvents(state);

            expect(result).toHaveLength(1);
            expect(result[0].oldSchedule?.start).toEqual(oldSchedule.start);
            expect(result[0].oldSchedule?.end).toEqual(oldSchedule.end);
        });
    });

    describe("TimeTrackerAlgorithmCoreとの統合", () => {
        it("isDuplicateEventOrScheduleが正しい引数で呼ばれる", () => {
            const event1 = createEvent("uuid1", "Event1", new Date(2024, 0, 1, 9, 0), new Date(2024, 0, 1, 10, 0));
            const event2 = createEvent("uuid2", "Event2", new Date(2024, 0, 1, 10, 0), new Date(2024, 0, 1, 11, 0));

            const state = createEmptyState();
            state.enableEvents = [event1, event2];

            vi.mocked(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).mockReturnValue(false);

            pickEvents(state);

            // event1に対してevent1とevent2をチェック
            expect(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).toHaveBeenCalledWith(event1, [event1]);
            expect(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).toHaveBeenCalledWith(event1, [event2]);
            
            // event2に対してevent1とevent2をチェック
            expect(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).toHaveBeenCalledWith(event2, [event1]);
            expect(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).toHaveBeenCalledWith(event2, [event2]);
            
            // 合計4回呼ばれる（2イベント × 2回チェック）
            expect(TimeTrackerAlgorithmCore.isDuplicateEventOrSchedule).toHaveBeenCalledTimes(4);
        });
    });
});
