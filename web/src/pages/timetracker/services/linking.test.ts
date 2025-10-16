import { HistoryManager } from "@/core";
import { createEvent, Event, TimeTrackerSettings, WorkItem, WorkItemChldren } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";
import { autoLinkEvents } from "./linking";

describe("linking.ts", () => {
    let workItems: WorkItemChldren[];
    let historyManager: HistoryManager;
    let settings: TimeTrackerSettings;

    beforeEach(() => {
        // テスト用のWorkItem
        workItems = [
            {
                id: "1001",
                name: "休暇",
                folderName: "管理",
                folderPath: "/管理",
            },
            {
                id: "2001",
                name: "プロジェクトA",
                folderName: "開発",
                folderPath: "/開発",
            },
            {
                id: "3001",
                name: "勤務時間",
                folderName: "管理",
                folderPath: "/管理",
            },
            {
                id: "4001",
                name: "プロジェクトB",
                folderName: "開発",
                folderPath: "/開発",
            },
        ];

        // HistoryManager
        historyManager = new HistoryManager();

        // デフォルト設定
        settings = {
            scheduleAutoInputInfo: {
                workItemId: 3001,
                startEndType: "both",
                startEndTime: 30,
                roundingTimeType: "stretch",
            },
            timeOffEvent: {
                workItemId: 1001,
                namePatterns: [
                    { pattern: "有給", matchMode: "partial" },
                    { pattern: "休暇", matchMode: "partial" },
                ],
            },
            isHistoryAutoInput: true,
            eventInputInfo: {
                roundingTimeType: "stretch",
                eventDuplicateTimeCompare: "small",
            },
        } as unknown as TimeTrackerSettings;
    });

    describe("autoLinkEvents", () => {
        describe("休暇イベントの自動紐付け", () => {
            it("LINK01: 休暇イベント設定にマッチするイベントを紐付ける", () => {
                const events: Event[] = [
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                    createEvent("ミーティング", {
                        start: new Date(2025, 0, 15, 10, 0),
                        end: new Date(2025, 0, 15, 11, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked).toHaveLength(1);
                expect(result.linked[0].event.name).toBe("有給休暇");
                expect(result.linked[0].linkingWorkItem.workItem.id).toBe("1001");
                expect(result.linked[0].linkingWorkItem.autoMethod).toBe("timeOff");
                expect(result.unlinked).toHaveLength(1);
                expect(result.unlinked[0].name).toBe("ミーティング");
            });

            it("LINK02: 部分一致パターンで複数のイベントを紐付ける", () => {
                const events: Event[] = [
                    createEvent("有給", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                    createEvent("夏季休暇", {
                        start: new Date(2025, 0, 16, 9, 0),
                        end: new Date(2025, 0, 16, 18, 0),
                    }),
                    createEvent("会議", {
                        start: new Date(2025, 0, 17, 10, 0),
                        end: new Date(2025, 0, 17, 11, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(2);
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK03: 前方一致パターンで紐付ける", () => {
                settings.timeOffEvent = {
                    workItemId: 1001,
                    namePatterns: [{ pattern: "休暇:", matchMode: "prefix" }],
                };

                const events: Event[] = [
                    createEvent("休暇:有給", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 16, 9, 0),
                        end: new Date(2025, 0, 16, 18, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(1);
                expect(result.linked[0].event.name).toBe("休暇:有給");
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK04: 後方一致パターンで紐付ける", () => {
                settings.timeOffEvent = {
                    workItemId: 1001,
                    namePatterns: [{ pattern: "(休暇)", matchMode: "suffix" }],
                };

                const events: Event[] = [
                    createEvent("有給(休暇)", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                    createEvent("(休暇)有給", {
                        start: new Date(2025, 0, 16, 9, 0),
                        end: new Date(2025, 0, 16, 18, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(1);
                expect(result.linked[0].event.name).toBe("有給(休暇)");
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK05: 休暇設定が未設定の場合は紐付けない", () => {
                settings.timeOffEvent = undefined;

                const events: Event[] = [
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK06: パターンが空配列の場合は紐付けない", () => {
                settings.timeOffEvent = {
                    workItemId: 1001,
                    namePatterns: [],
                };

                const events: Event[] = [
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                ];
                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK07: WorkItemが見つからない場合は紐付けない", () => {
                settings.timeOffEvent = {
                    workItemId: 9999,
                    namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                };

                const events: Event[] = [
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });
        });

        describe("履歴からの自動紐付け", () => {
            it("LINK08: 履歴にあるイベントを紐付ける", () => {
                const event1 = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });
                const event2 = createEvent("開発作業", {
                    start: new Date(2025, 0, 15, 14, 0),
                    end: new Date(2025, 0, 15, 16, 0),
                });

                // 履歴に登録
                const workItem1 = workItems.find((w) => w.id === "2001")!;
                const workItem2 = workItems.find((w) => w.id === "4001")!;
                historyManager.setHistory(event1, workItem1);
                historyManager.setHistory(event2, workItem2);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [event1, event2];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                const historyLinked = result.linked.filter((l) => l.linkingWorkItem.autoMethod === "history");
                expect(historyLinked).toHaveLength(2);
                expect(historyLinked[0].linkingWorkItem.workItem.id).toBe("2001");
                expect(historyLinked[1].linkingWorkItem.workItem.id).toBe("4001");
                expect(result.unlinked).toHaveLength(0);
            });

            it("LINK09: 履歴にあるが、WorkItemが削除されている場合は紐付けない", () => {
                const event1 = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });

                // 存在しないWorkItemの履歴を登録（手動で履歴Mapを操作）
                const nonExistentWorkItem: WorkItem = {
                    id: "9999",
                    name: "削除されたWorkItem",
                    folderName: "テスト",
                    folderPath: "/テスト",
                };
                historyManager.setHistory(event1, nonExistentWorkItem);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [event1];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "history")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK10: 履歴自動入力が無効の場合は履歴から紐付けない", () => {
                settings.isHistoryAutoInput = false;

                const event1 = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });

                const workItem1 = workItems.find((w) => w.id === "2001")!;
                historyManager.setHistory(event1, workItem1);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [event1];
                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "history")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });

            it("LINK11: 履歴がない場合は紐付けない", () => {
                const event1 = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });

                const events: Event[] = [event1];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "history")).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });
        });

        describe("勤務時間イベントの自動紐付け", () => {
            it("LINK12: 勤務時間イベントを紐付ける", () => {
                const events: Event[] = [
                    createEvent(
                        "勤務開始",
                        {
                            start: new Date(2025, 0, 15, 9, 0),
                            end: new Date(2025, 0, 15, 9, 30),
                        },
                        "Automatic",
                        "",
                        false,
                        false,
                        "start",
                    ),
                    createEvent(
                        "勤務終了",
                        {
                            start: new Date(2025, 0, 15, 17, 30),
                            end: new Date(2025, 0, 15, 18, 0),
                        },
                        "Automatic",
                        "",
                        false,
                        false,
                        "end",
                    ),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                const workScheduleLinked = result.linked.filter((l) => l.linkingWorkItem.autoMethod === "workShedule");
                expect(workScheduleLinked).toHaveLength(2);
                expect(workScheduleLinked[0].linkingWorkItem.workItem.id).toBe("3001");
                expect(workScheduleLinked[1].linkingWorkItem.workItem.id).toBe("3001");
            });

            it("LINK13: WorkItemが見つからない場合は空配列を返す", () => {
                settings.scheduleAutoInputInfo.workItemId = 9999;

                const events: Event[] = [
                    createEvent(
                        "勤務開始",
                        {
                            start: new Date(2025, 0, 15, 9, 0),
                            end: new Date(2025, 0, 15, 9, 30),
                        },
                        "Automatic",
                        "",
                        false,
                        false,
                        "start",
                    ),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "workShedule")).toHaveLength(0);
            });

            it("LINK14: 勤務時間イベントがない場合は空配列", () => {
                const events: Event[] = [];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "workShedule")).toHaveLength(0);
            });
        });

        describe("複合的な自動紐付け", () => {
            it("LINK15: 休暇、履歴、勤務時間すべての自動紐付けが動作する", () => {
                const normalEvent = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });
                const workItem1 = workItems.find((w) => w.id === "2001")!;
                historyManager.setHistory(normalEvent, workItem1);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [
                    createEvent("有給休暇", {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 18, 0),
                    }),
                    normalEvent,
                    createEvent("新規タスク", {
                        start: new Date(2025, 0, 15, 14, 0),
                        end: new Date(2025, 0, 15, 15, 0),
                    }),
                    createEvent(
                        "勤務開始",
                        {
                            start: new Date(2025, 0, 15, 9, 0),
                            end: new Date(2025, 0, 15, 9, 30),
                        },
                        "Automatic",
                        "",
                        false,
                        false,
                        "start",
                    ),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                // 休暇イベント: 1件
                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "timeOff")).toHaveLength(1);
                // 履歴: 1件
                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "history")).toHaveLength(1);
                // 勤務時間: 1件
                expect(result.linked.filter((l) => l.linkingWorkItem.autoMethod === "workShedule")).toHaveLength(1);
                // 未紐付け: 1件(新規タスク)
                expect(result.unlinked).toHaveLength(1);
                expect(result.unlinked[0].name).toBe("新規タスク");
            });

            it("LINK16: 優先順位が正しい(休暇 > 履歴)", () => {
                // 休暇パターンにマッチし、履歴もあるイベント
                const event = createEvent("有給休暇", {
                    start: new Date(2025, 0, 15, 9, 0),
                    end: new Date(2025, 0, 15, 18, 0),
                });
                const workItem1 = workItems.find((w) => w.id === "2001")!;
                historyManager.setHistory(event, workItem1);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [event];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                // 休暇イベントとして紐付けられる(優先度が高い)
                expect(result.linked).toHaveLength(1);
                expect(result.linked[0].linkingWorkItem.autoMethod).toBe("timeOff");
                expect(result.linked[0].linkingWorkItem.workItem.id).toBe("1001");
                expect(result.unlinked).toHaveLength(0);
            });

            it("LINK17: 全イベントが未紐付けの場合", () => {
                const events: Event[] = [
                    createEvent("タスクA", {
                        start: new Date(2025, 0, 15, 10, 0),
                        end: new Date(2025, 0, 15, 11, 0),
                    }),
                    createEvent("タスクB", {
                        start: new Date(2025, 0, 15, 14, 0),
                        end: new Date(2025, 0, 15, 15, 0),
                    }),
                ];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked).toHaveLength(0);
                expect(result.unlinked).toHaveLength(2);
            });

            it("LINK18: 全イベントが紐付けられる場合", () => {
                const event1 = createEvent("有給休暇", {
                    start: new Date(2025, 0, 15, 9, 0),
                    end: new Date(2025, 0, 15, 18, 0),
                });
                const event2 = createEvent("ミーティング", {
                    start: new Date(2025, 0, 15, 10, 0),
                    end: new Date(2025, 0, 15, 11, 0),
                });
                const event3 = createEvent(
                    "勤務開始",
                    {
                        start: new Date(2025, 0, 15, 9, 0),
                        end: new Date(2025, 0, 15, 9, 30),
                    },
                    "Automatic",
                    "",
                    false,
                    false,
                    "start",
                );
                const workItem1 = workItems.find((w) => w.id === "2001")!;
                historyManager.setHistory(event2, workItem1);
                historyManager.dump(); // LocalStorageに保存

                const events: Event[] = [event1, event2, event3];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked).toHaveLength(3);
                expect(result.unlinked).toHaveLength(0);
            });

            it("LINK19: 空の入力でも正常動作", () => {
                const events: Event[] = [];

                const result = autoLinkEvents(events, workItems, settings, historyManager);

                expect(result.linked).toHaveLength(0);
                expect(result.unlinked).toHaveLength(0);
            });

            it("LINK20: WorkItemが空配列でも正常動作", () => {
                const events: Event[] = [
                    createEvent("タスクA", {
                        start: new Date(2025, 0, 15, 10, 0),
                        end: new Date(2025, 0, 15, 11, 0),
                    }),
                ];

                const result = autoLinkEvents(events, [], settings, historyManager);

                expect(result.linked).toHaveLength(0);
                expect(result.unlinked).toHaveLength(1);
            });
        });
    });
});
