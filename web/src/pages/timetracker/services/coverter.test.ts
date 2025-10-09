import type { DayTask, Event, EventWorkItemPair, WorkItem } from "@/types";
import { describe, expect, it } from "vitest";
import type { AutoLinkingResult } from "../models";
import {
    calculateExcludedStats,
    convertDayTasksToScheduleItems,
    convertLinkedEventsToRows,
    convertTargetEventsToRows,
    convertUnlinkedEventsToRows,
    generateItemCodeOptions,
} from "./coverter";

describe("DataTransform", () => {
    describe("convertDayTasksToScheduleItems", () => {
        it("DayTaskをScheduleItemに変換", () => {
            const mockDayTasks: DayTask[] = [
                {
                    baseDate: new Date("2024-01-10"),
                    project: {
                        id: "project-1",
                        name: "テストプロジェクト",
                        projectId: "1",
                        projectName: "テストプロジェクト",
                        projectCode: "TEST",
                    },
                    events: [
                        {
                            uuid: "event-1",
                            name: "会議",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T10:00:00"),
                                end: new Date("2024-01-10T11:00:00"),
                            },
                        },
                    ],
                    scheduleEvents: [],
                },
            ];

            const result = convertDayTasksToScheduleItems(mockDayTasks);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe("会議");
            expect(result[0].date).toBe("2024/01/10");
            expect(result[0].time).toBe("10:00-11:00");
        });
    });

    describe("generateItemCodeOptions", () => {
        it("WorkItemからItemCodeOptionを生成", () => {
            const mockWorkItems: WorkItem[] = [
                {
                    id: "wi-1",
                    name: "開発作業",
                    folderName: "開発",
                    folderPath: "/開発",
                },
                {
                    id: "wi-2",
                    name: "会議",
                    folderName: "会議",
                    folderPath: "/会議",
                },
            ];

            const result = generateItemCodeOptions(mockWorkItems);

            expect(result.length).toBe(2);
            expect(result[0].code).toBe("wi-1");
            expect(result[0].name).toBe("開発作業");
            expect(result[1].code).toBe("wi-2");
            expect(result[1].name).toBe("会議");
        });
    });

    describe("convertTargetEventsToRows", () => {
        it("対象イベントを行データに変換", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "会議",
                        } as Event,
                        workItem: {
                            id: "wi-1",
                            name: "作業項目1",
                        } as WorkItem,
                    },
                ],
                unlinked: [
                    {
                        uuid: "event-2",
                        name: "未紐づけイベント",
                        schedule: {
                            start: new Date("2024-01-10T14:00:00"),
                            end: new Date("2024-01-10T15:00:00"),
                        },
                    } as Event,
                ],
                excluded: [],
                timeOffCount: 0,
                historyCount: 0,
            };

            const mockDayTasks: DayTask[] = [
                {
                    baseDate: new Date("2024-01-10"),
                    project: {
                        id: "project-1",
                        name: "テストプロジェクト",
                        projectId: "1",
                        projectName: "テストプロジェクト",
                        projectCode: "TEST",
                    },
                    events: [
                        {
                            uuid: "event-1",
                            name: "会議",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T10:00:00"),
                                end: new Date("2024-01-10T11:00:00"),
                            },
                        },
                        {
                            uuid: "event-2",
                            name: "未紐づけイベント",
                            organizer: "test@example.com",
                            isPrivate: false,
                            isCancelled: false,
                            location: "",
                            schedule: {
                                start: new Date("2024-01-10T14:00:00"),
                                end: new Date("2024-01-10T15:00:00"),
                            },
                        },
                    ],
                    scheduleEvents: [],
                },
            ];

            const result = convertTargetEventsToRows(mockLinkingResult, mockDayTasks);

            expect(result.length).toBe(2);
            expect(result[0].name).toBe("会議");
            expect(result[0].status).toBe("紐づけ済み");
            expect(result[1].name).toBe("未紐づけイベント");
            expect(result[1].status).toBe("未紐づけ");
        });
    });

    describe("convertLinkedEventsToRows", () => {
        it("紐付け済みイベントを行データに変換", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "会議",
                            schedule: {
                                start: new Date("2024-01-10T10:00:00"),
                                end: new Date("2024-01-10T11:00:00"),
                            },
                        } as Event,
                        workItem: {
                            id: "wi-1",
                            name: "作業項目1",
                        } as WorkItem,
                    },
                ],
                unlinked: [],
                excluded: [],
                timeOffCount: 0,
                historyCount: 1,
            };

            const mockManuallyLinked: EventWorkItemPair[] = [
                {
                    event: {
                        uuid: "event-2",
                        name: "手動紐付けイベント",
                        schedule: {
                            start: new Date("2024-01-10T14:00:00"),
                            end: new Date("2024-01-10T15:00:00"),
                        },
                    } as Event,
                    workItem: {
                        id: "wi-2",
                        name: "作業項目2",
                    } as WorkItem,
                },
            ];

            const result = convertLinkedEventsToRows(mockLinkingResult, mockManuallyLinked);

            expect(result.length).toBe(2);
            expect(result[0].eventName).toBe("会議");
            expect(result[0].source).toBe("履歴");
            expect(result[0].workItemName).toBe("作業項目1");
            expect(result[1].eventName).toBe("手動紐付けイベント");
            expect(result[1].source).toBe("手動");
            expect(result[1].workItemName).toBe("作業項目2");
        });
    });

    describe("convertUnlinkedEventsToRows", () => {
        it("未紐付けイベントを行データに変換", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [],
                unlinked: [
                    {
                        uuid: "event-1",
                        name: "未紐づけイベント",
                        schedule: {
                            start: new Date("2024-01-10T10:00:00"),
                            end: new Date("2024-01-10T11:00:00"),
                        },
                    } as Event,
                ],
                excluded: [],
                timeOffCount: 0,
                historyCount: 0,
            };

            const selectedWorkItems = new Map<string, string>([["event-1", "wi-1"]]);

            const result = convertUnlinkedEventsToRows(mockLinkingResult, selectedWorkItems);

            expect(result.length).toBe(1);
            expect(result[0].eventName).toBe("未紐づけイベント");
            expect(result[0].selectedWorkItemId).toBe("wi-1");
        });
    });

    describe("calculateExcludedStats", () => {
        it("除外イベントの統計を計算", () => {
            const mockLinkingResult: AutoLinkingResult = {
                linked: [],
                unlinked: [],
                excluded: [
                    {
                        event: {
                            uuid: "event-1",
                            name: "ランチ",
                        } as Event,
                        reason: "ignored",
                    },
                    {
                        event: {
                            uuid: "event-2",
                            name: "範囲外イベント",
                        } as Event,
                        reason: "outOfSchedule",
                    },
                    {
                        event: {
                            uuid: "event-3",
                            name: "無効イベント",
                        } as Event,
                        reason: "invalid",
                    },
                ],
                timeOffCount: 0,
                historyCount: 0,
            };

            const result = calculateExcludedStats(mockLinkingResult);

            expect(result.ignored).toBe(1);
            expect(result.outOfSchedule).toBe(1);
            expect(result.invalid).toBe(1);
        });

        it("linkingResultがnullの場合は全て0を返す", () => {
            const result = calculateExcludedStats(null);

            expect(result.ignored).toBe(0);
            expect(result.outOfSchedule).toBe(0);
            expect(result.invalid).toBe(0);
        });
    });
});
