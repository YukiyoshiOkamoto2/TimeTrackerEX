/**
 * Models Schema Tests
 *
 * modelsSchema.tsのZodスキーマ定義のテストです。
 */

import { describe, expect, it } from "vitest";
import {
    WorkingEventTypeSchema,
    ScheduleSchema,
    EventSchema,
    ProjectSchema,
    WorkItemChildrenSchema,
    WorkItemSchema,
    DayTaskSchema,
    RoundingMethodSchema,
    TimeCompareSchema,
    EventInputInfoSchema,
    EventWorkItemPairSchema,
    TimeTrackerDayTaskSchema,
} from "./modelsSchema";

describe("WorkingEventTypeSchema", () => {
    it("WET01: 有効な値を受け入れる", () => {
        expect(WorkingEventTypeSchema.parse("start")).toBe("start");
        expect(WorkingEventTypeSchema.parse("middle")).toBe("middle");
        expect(WorkingEventTypeSchema.parse("end")).toBe("end");
    });

    it("WET02: 無効な値を拒否する", () => {
        expect(() => WorkingEventTypeSchema.parse("invalid")).toThrow();
        expect(() => WorkingEventTypeSchema.parse("")).toThrow();
        expect(() => WorkingEventTypeSchema.parse(null)).toThrow();
    });
});

describe("ScheduleSchema", () => {
    it("SCH01: 有効な基本スケジュールを受け入れる", () => {
        const schedule = {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T17:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        };
        expect(() => ScheduleSchema.parse(schedule)).not.toThrow();
    });

    it("SCH02: 終了時間が未設定のスケジュールを受け入れる", () => {
        const schedule = {
            start: new Date("2024-01-01T09:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        };
        expect(() => ScheduleSchema.parse(schedule)).not.toThrow();
    });

    it("SCH03: 休日フラグが設定されたスケジュールを受け入れる", () => {
        const schedule = {
            start: new Date("2024-01-01T00:00:00"),
            end: new Date("2024-01-01T23:59:59"),
            isHoliday: true,
            isPaidLeave: false,
        };
        expect(() => ScheduleSchema.parse(schedule)).not.toThrow();
    });

    it("SCH04: 有給休暇フラグが設定されたスケジュールを受け入れる", () => {
        const schedule = {
            start: new Date("2024-01-01T00:00:00"),
            end: new Date("2024-01-01T23:59:59"),
            isHoliday: true,
            isPaidLeave: true,
        };
        expect(() => ScheduleSchema.parse(schedule)).not.toThrow();
    });

    it("SCH05: 有給休暇だが休日フラグがないスケジュールを拒否する", () => {
        const schedule = {
            start: new Date("2024-01-01T00:00:00"),
            end: new Date("2024-01-01T23:59:59"),
            isHoliday: false,
            isPaidLeave: true,
        };
        expect(() => ScheduleSchema.parse(schedule)).toThrow(
            "有給休暇の場合は休日フラグも設定する必要があります",
        );
    });

    it("SCH06: 終了時間が開始時間より前のスケジュールを拒否する", () => {
        const schedule = {
            start: new Date("2024-01-01T17:00:00"),
            end: new Date("2024-01-01T09:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        };
        expect(() => ScheduleSchema.parse(schedule)).toThrow(
            "終了時間は開始時間より後である必要があります",
        );
    });

    it("SCH07: 開始時間が未設定のスケジュールを拒否する", () => {
        const schedule = {
            end: new Date("2024-01-01T17:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        };
        expect(() => ScheduleSchema.parse(schedule)).toThrow();
    });

    it("SCH08: エラーメッセージを持つスケジュールを受け入れる", () => {
        const schedule = {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T17:00:00"),
            isHoliday: false,
            isPaidLeave: false,
            errorMessage: "エラーが発生しました",
        };
        expect(() => ScheduleSchema.parse(schedule)).not.toThrow();
    });
});

describe("EventSchema", () => {
    const baseEvent = {
        uuid: "test-uuid-001",
        name: "テストイベント",
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "会議室A",
        schedule: {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T10:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        },
    };

    it("EVT01: 有効な基本イベントを受け入れる", () => {
        expect(() => EventSchema.parse(baseEvent)).not.toThrow();
    });

    it("EVT02: 勤務時間タイプを持つイベントを受け入れる", () => {
        const event = {
            ...baseEvent,
            workingEventType: "start" as const,
        };
        expect(() => EventSchema.parse(event)).not.toThrow();
    });

    it("EVT03: 繰り返し日程を持つイベントを受け入れる", () => {
        const event = {
            ...baseEvent,
            recurrence: [
                new Date("2024-01-08T09:00:00"),
                new Date("2024-01-15T09:00:00"),
            ],
        };
        expect(() => EventSchema.parse(event)).not.toThrow();
    });

    it("EVT04: プライベートイベントを受け入れる", () => {
        const event = {
            ...baseEvent,
            isPrivate: true,
        };
        expect(() => EventSchema.parse(event)).not.toThrow();
    });

    it("EVT05: キャンセルされたイベントを受け入れる", () => {
        const event = {
            ...baseEvent,
            isCancelled: true,
        };
        expect(() => EventSchema.parse(event)).not.toThrow();
    });

    it("EVT06: UUID未設定のイベントを拒否する", () => {
        const event = { ...baseEvent };
        delete (event as { uuid?: string }).uuid;
        expect(() => EventSchema.parse(event)).toThrow();
    });

    it("EVT07: 名前未設定のイベントを拒否する", () => {
        const event = { ...baseEvent };
        delete (event as { name?: string }).name;
        expect(() => EventSchema.parse(event)).toThrow();
    });

    it("EVT08: 空のUUIDを持つイベントを拒否する", () => {
        const event = {
            ...baseEvent,
            uuid: "",
        };
        expect(() => EventSchema.parse(event)).toThrow();
    });
});

describe("ProjectSchema", () => {
    const baseProject = {
        id: "proj-001",
        name: "テストプロジェクト",
        projectId: "PRJ-001",
        projectName: "テストプロジェクト",
        projectCode: "TP001",
    };

    it("PRJ01: 有効なプロジェクトを受け入れる", () => {
        expect(() => ProjectSchema.parse(baseProject)).not.toThrow();
    });

    it("PRJ02: ID未設定のプロジェクトを拒否する", () => {
        const project = { ...baseProject };
        delete (project as { id?: string }).id;
        expect(() => ProjectSchema.parse(project)).toThrow();
    });

    it("PRJ03: 空のIDを持つプロジェクトを拒否する", () => {
        const project = {
            ...baseProject,
            id: "",
        };
        expect(() => ProjectSchema.parse(project)).toThrow();
    });

    it("PRJ04: 空のプロジェクト名を持つプロジェクトを拒否する", () => {
        const project = {
            ...baseProject,
            projectName: "",
        };
        expect(() => ProjectSchema.parse(project)).toThrow();
    });
});

describe("WorkItemChildrenSchema", () => {
    const baseWorkItem = {
        id: "wi-001",
        name: "作業項目1",
        folderName: "フォルダA",
        folderPath: "/projects/folder-a",
    };

    it("WIC01: 有効な作業項目子要素を受け入れる", () => {
        expect(() => WorkItemChildrenSchema.parse(baseWorkItem)).not.toThrow();
    });

    it("WIC02: ID未設定の作業項目を拒否する", () => {
        const workItem = { ...baseWorkItem };
        delete (workItem as { id?: string }).id;
        expect(() => WorkItemChildrenSchema.parse(workItem)).toThrow();
    });

    it("WIC03: 空のIDを持つ作業項目を拒否する", () => {
        const workItem = {
            ...baseWorkItem,
            id: "",
        };
        expect(() => WorkItemChildrenSchema.parse(workItem)).toThrow();
    });
});

describe("WorkItemSchema", () => {
    const baseWorkItem = {
        id: "wi-001",
        name: "作業項目1",
        folderName: "フォルダA",
        folderPath: "/projects/folder-a",
    };

    it("WIS01: サブ項目なしの作業項目を受け入れる", () => {
        expect(() => WorkItemSchema.parse(baseWorkItem)).not.toThrow();
    });

    it("WIS02: サブ項目を持つ作業項目を受け入れる", () => {
        const workItem = {
            ...baseWorkItem,
            subItems: [
                {
                    id: "wi-002",
                    name: "サブ作業項目1",
                    folderName: "フォルダA",
                    folderPath: "/projects/folder-a/sub",
                },
            ],
        };
        expect(() => WorkItemSchema.parse(workItem)).not.toThrow();
    });

    it("WIS03: 再帰的なサブ項目を持つ作業項目を受け入れる", () => {
        const workItem = {
            ...baseWorkItem,
            subItems: [
                {
                    id: "wi-002",
                    name: "サブ作業項目1",
                    folderName: "フォルダA",
                    folderPath: "/projects/folder-a/sub",
                    subItems: [
                        {
                            id: "wi-003",
                            name: "サブサブ作業項目1",
                            folderName: "フォルダA",
                            folderPath: "/projects/folder-a/sub/subsub",
                        },
                    ],
                },
            ],
        };
        expect(() => WorkItemSchema.parse(workItem)).not.toThrow();
    });
});

describe("DayTaskSchema", () => {
    const baseEvent = {
        uuid: "test-uuid-001",
        name: "テストイベント",
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "会議室A",
        schedule: {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T10:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        },
    };

    it("DT01: 有効な日次タスクを受け入れる", () => {
        const dayTask = {
            baseDate: new Date("2024-01-01"),
            events: [baseEvent],
            scheduleEvents: [],
        };
        expect(() => DayTaskSchema.parse(dayTask)).not.toThrow();
    });

    it("DT02: 空のイベントリストを持つ日次タスクを受け入れる", () => {
        const dayTask = {
            baseDate: new Date("2024-01-01"),
            events: [],
            scheduleEvents: [],
        };
        expect(() => DayTaskSchema.parse(dayTask)).not.toThrow();
    });

    it("DT03: 基準日未設定の日次タスクを拒否する", () => {
        const dayTask = {
            events: [baseEvent],
            scheduleEvents: [],
        };
        expect(() => DayTaskSchema.parse(dayTask)).toThrow();
    });
});

describe("RoundingMethodSchema", () => {
    it("RM01: 有効な丸め方法を受け入れる", () => {
        expect(RoundingMethodSchema.parse("backward")).toBe("backward");
        expect(RoundingMethodSchema.parse("forward")).toBe("forward");
        expect(RoundingMethodSchema.parse("round")).toBe("round");
        expect(RoundingMethodSchema.parse("half")).toBe("half");
        expect(RoundingMethodSchema.parse("stretch")).toBe("stretch");
        expect(RoundingMethodSchema.parse("nonduplicate")).toBe("nonduplicate");
    });

    it("RM02: 無効な丸め方法を拒否する", () => {
        expect(() => RoundingMethodSchema.parse("invalid")).toThrow();
    });
});

describe("TimeCompareSchema", () => {
    it("TC01: 有効な時間比較方法を受け入れる", () => {
        expect(TimeCompareSchema.parse("small")).toBe("small");
        expect(TimeCompareSchema.parse("large")).toBe("large");
    });

    it("TC02: 無効な時間比較方法を拒否する", () => {
        expect(() => TimeCompareSchema.parse("invalid")).toThrow();
    });
});

describe("EventInputInfoSchema", () => {
    it("EII01: 有効なイベント入力情報を受け入れる", () => {
        const info = {
            eventDuplicateTimeCompare: "small" as const,
            roundingTimeType: "forward" as const,
        };
        expect(() => EventInputInfoSchema.parse(info)).not.toThrow();
    });

    it("EII02: 無効な時間比較方法を拒否する", () => {
        const info = {
            eventDuplicateTimeCompare: "invalid",
            roundingTimeType: "forward",
        };
        expect(() => EventInputInfoSchema.parse(info)).toThrow();
    });
});

describe("EventWorkItemPairSchema", () => {
    const baseEvent = {
        uuid: "test-uuid-001",
        name: "テストイベント",
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "会議室A",
        schedule: {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T10:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        },
    };

    const baseWorkItem = {
        id: "wi-001",
        name: "作業項目1",
        folderName: "フォルダA",
        folderPath: "/projects/folder-a",
    };

    it("EWIP01: 有効なイベント作業項目ペアを受け入れる", () => {
        const pair = {
            event: baseEvent,
            workItem: baseWorkItem,
        };
        expect(() => EventWorkItemPairSchema.parse(pair)).not.toThrow();
    });

    it("EWIP02: イベント未設定のペアを拒否する", () => {
        const pair = {
            workItem: baseWorkItem,
        };
        expect(() => EventWorkItemPairSchema.parse(pair)).toThrow();
    });
});

describe("TimeTrackerDayTaskSchema", () => {
    const baseEvent = {
        uuid: "test-uuid-001",
        name: "テストイベント",
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "会議室A",
        schedule: {
            start: new Date("2024-01-01T09:00:00"),
            end: new Date("2024-01-01T10:00:00"),
            isHoliday: false,
            isPaidLeave: false,
        },
    };

    const baseWorkItem = {
        id: "wi-001",
        name: "作業項目1",
        folderName: "フォルダA",
        folderPath: "/projects/folder-a",
    };

    const baseProject = {
        id: "proj-001",
        name: "テストプロジェクト",
        projectId: "PRJ-001",
        projectName: "テストプロジェクト",
        projectCode: "TP001",
    };

    it("TTDT01: 有効なTimeTracker日次タスクを受け入れる", () => {
        const task = {
            baseDate: new Date("2024-01-01"),
            project: baseProject,
            eventWorkItemPair: [
                {
                    event: baseEvent,
                    workItem: baseWorkItem,
                },
            ],
        };
        expect(() => TimeTrackerDayTaskSchema.parse(task)).not.toThrow();
    });

    it("TTDT02: 空のペアリストを持つタスクを受け入れる", () => {
        const task = {
            baseDate: new Date("2024-01-01"),
            project: baseProject,
            eventWorkItemPair: [],
        };
        expect(() => TimeTrackerDayTaskSchema.parse(task)).not.toThrow();
    });

    it("TTDT03: プロジェクト未設定のタスクを拒否する", () => {
        const task = {
            baseDate: new Date("2024-01-01"),
            eventWorkItemPair: [
                {
                    event: baseEvent,
                    workItem: baseWorkItem,
                },
            ],
        };
        expect(() => TimeTrackerDayTaskSchema.parse(task)).toThrow();
    });
});
