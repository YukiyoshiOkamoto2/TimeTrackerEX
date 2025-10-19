/**
 * useLinkingManager カスタムフックの単体テスト
 */

import { HistoryManager } from "@/core/history";
import type { WorkItem } from "@/types";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventWithOption } from "../components/EventTable";
import type { LinkingEventWorkItemPair } from "../models";
import { useLinkingManager } from "./useLinkingManager";

describe("useLinkingManager", () => {
    // テスト用のモックデータ
    const createMockEvent = (uuid: string, name?: string): EventWithOption => ({
        uuid,
        name: name || `イベント${uuid}`,
        organizer: "",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: {
            start: new Date("2025-01-01T09:00:00"),
            end: new Date("2025-01-01T17:00:00"),
        },
    });

    const createMockWorkItem = (id: string, name: string): WorkItem => ({
        id,
        name,
        folderName: "テストフォルダ",
        folderPath: "/テストフォルダ",
        subItems: [],
    });

    const mockHistoryManager = {
        setHistory: vi.fn(),
        dump: vi.fn(),
        getHistory: vi.fn(),
        clear: vi.fn(),
    } as unknown as HistoryManager;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("初期化", () => {
        it("空の初期状態で初期化できる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            expect(result.current.linkingEventWorkItemPair).toEqual([]);
        });

        it("初期ペアを指定して初期化できる", () => {
            const initialPairs: LinkingEventWorkItemPair[] = [
                {
                    event: createMockEvent("event-1", "イベント1"),
                    linkingWorkItem: {
                        workItem: createMockWorkItem("work-1", "作業1"),
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ];

            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                    initialPairs,
                }),
            );

            expect(result.current.linkingEventWorkItemPair).toEqual(initialPairs);
        });
    });

    describe("handleLinking - manual", () => {
        it("新規イベントをWorkItemに紐づけできる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event = createMockEvent("event-1");
            const workItem = createMockWorkItem("work-1", "作業1");
            const unLinkedEvents: EventWithOption[] = [event];

            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-1", type: "manual" },
                    [workItem],
                    unLinkedEvents,
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].event.uuid).toBe("event-1");
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.workItem.id).toBe("work-1");
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("manual");
            expect(mockHistoryManager.setHistory).toHaveBeenCalledWith(event, workItem);
        });

        it("同名イベントも一括で紐づけられる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            // EventUtils.getKeyで比較するため、同じKeyを持つイベントを作成
            const event1 = createMockEvent("event-1", "共通のname");
            const event2 = createMockEvent("event-2", "共通のname"); // 同じname
            const event3 = createMockEvent("event-3", "異なるname"); // 異なるname
            const workItem = createMockWorkItem("work-1", "作業1");
            const unLinkedEvents: EventWithOption[] = [event1, event2, event3];

            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-1", type: "manual" },
                    [workItem],
                    unLinkedEvents,
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(2);
            expect(result.current.linkingEventWorkItemPair[0].event.uuid).toBe("event-1");
            expect(result.current.linkingEventWorkItemPair[1].event.uuid).toBe("event-2");
            expect(mockHistoryManager.setHistory).toHaveBeenCalledTimes(2); // 2つのイベントについて履歴保存
        });

        it("既存の紐づけを更新できる", () => {
            const initialPairs: LinkingEventWorkItemPair[] = [
                {
                    event: createMockEvent("event-1"),
                    linkingWorkItem: {
                        workItem: createMockWorkItem("work-1", "作業1"),
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ];

            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                    initialPairs,
                }),
            );

            const newWorkItem = createMockWorkItem("work-2", "作業2");
            const unLinkedEvents: EventWithOption[] = [];

            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-2", type: "manual" },
                    [newWorkItem],
                    unLinkedEvents,
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.workItem.id).toBe("work-2");
            expect(mockHistoryManager.setHistory).toHaveBeenCalledWith(initialPairs[0].event, newWorkItem);
        });

        it("紐づけを削除できる（workItemIdが空）", () => {
            const initialPairs: LinkingEventWorkItemPair[] = [
                {
                    event: createMockEvent("event-1"),
                    linkingWorkItem: {
                        workItem: createMockWorkItem("work-1", "作業1"),
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ];

            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                    initialPairs,
                }),
            );

            act(() => {
                result.current.handleLinking({ eventId: "event-1", workItemId: "", type: "manual" }, [], []);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(0);
        });

        it("存在しないWorkItemを指定すると何もしない", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event = createMockEvent("event-1");
            const unLinkedEvents: EventWithOption[] = [event];

            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "invalid-work-id", type: "manual" },
                    [],
                    unLinkedEvents,
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(0);
        });

        it("存在しないイベントを指定すると何もしない", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const workItem = createMockWorkItem("work-1", "作業1");
            const unLinkedEvents: EventWithOption[] = [];

            act(() => {
                result.current.handleLinking(
                    { eventId: "invalid-event-id", workItemId: "work-1", type: "manual" },
                    [workItem],
                    unLinkedEvents,
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(0);
        });
    });

    describe("handleLinking - auto", () => {
        it("AI提案から複数の紐づけを一括作成できる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1", "イベント1");
            const event2 = createMockEvent("event-2", "イベント2");
            const workItem1 = createMockWorkItem("work-1", "作業1");
            const workItem2 = createMockWorkItem("work-2", "作業2");

            const unLinkedEvents: EventWithOption[] = [event1, event2];
            const linkings = [
                { eventId: "event-1", workItemId: "work-1", type: "auto" as const, autoMethod: "ai" as const },
                { eventId: "event-2", workItemId: "work-2", type: "auto" as const, autoMethod: "ai" as const },
            ];

            act(() => {
                result.current.handleLinking(linkings, [workItem1, workItem2], unLinkedEvents);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(2);
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("auto");
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.autoMethod).toBe("ai");
            expect(result.current.linkingEventWorkItemPair[1].linkingWorkItem.type).toBe("auto");
            expect(result.current.linkingEventWorkItemPair[1].linkingWorkItem.autoMethod).toBe("ai");
            expect(mockHistoryManager.setHistory).not.toHaveBeenCalled(); // AI紐づけは履歴に保存しない
        });

        it("重複したイベントIDは1回のみ処理される", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1");
            const workItem1 = createMockWorkItem("work-1", "作業1");

            const unLinkedEvents: EventWithOption[] = [event1];
            const linkings = [
                { eventId: "event-1", workItemId: "work-1", type: "auto" as const, autoMethod: "ai" as const },
                { eventId: "event-1", workItemId: "work-1", type: "auto" as const, autoMethod: "ai" as const }, // 重複
            ];

            act(() => {
                result.current.handleLinking(linkings, [workItem1], unLinkedEvents);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
        });

        it("存在しないWorkItemはスキップされる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1");
            const event2 = createMockEvent("event-2");
            const workItem1 = createMockWorkItem("work-1", "作業1");

            const unLinkedEvents: EventWithOption[] = [event1, event2];
            const linkings = [
                { eventId: "event-1", workItemId: "work-1", type: "auto" as const, autoMethod: "ai" as const },
                { eventId: "event-2", workItemId: "invalid-work-id", type: "auto" as const, autoMethod: "ai" as const }, // 存在しない
            ];

            act(() => {
                result.current.handleLinking(linkings, [workItem1], unLinkedEvents);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].event.uuid).toBe("event-1");
        });

        it("存在しないイベントはスキップされる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1");
            const workItem1 = createMockWorkItem("work-1", "作業1");
            const workItem2 = createMockWorkItem("work-2", "作業2");

            const unLinkedEvents: EventWithOption[] = [event1];
            const linkings = [
                { eventId: "event-1", workItemId: "work-1", type: "auto" as const, autoMethod: "ai" as const },
                { eventId: "invalid-event-id", workItemId: "work-2", type: "auto" as const, autoMethod: "ai" as const }, // 存在しない
            ];

            act(() => {
                result.current.handleLinking(linkings, [workItem1, workItem2], unLinkedEvents);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].event.uuid).toBe("event-1");
        });

        it("有効な提案が1つもない場合は何もしない", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const linkings = [
                {
                    eventId: "invalid-event-id",
                    workItemId: "invalid-work-id",
                    type: "auto" as const,
                    autoMethod: "ai" as const,
                },
            ];

            act(() => {
                result.current.handleLinking(linkings, [], []);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(0);
        });

        it("既存の紐づけに追加される（上書きしない）", () => {
            const initialPairs: LinkingEventWorkItemPair[] = [
                {
                    event: createMockEvent("event-1"),
                    linkingWorkItem: {
                        workItem: createMockWorkItem("work-1", "作業1"),
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ];

            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                    initialPairs,
                }),
            );

            const event2 = createMockEvent("event-2", "イベント2");
            const workItem2 = createMockWorkItem("work-2", "作業2");

            const unLinkedEvents: EventWithOption[] = [event2];
            const linkings = [
                { eventId: "event-2", workItemId: "work-2", type: "auto" as const, autoMethod: "ai" as const },
            ];

            act(() => {
                result.current.handleLinking(linkings, [workItem2], unLinkedEvents);
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(2);
            expect(result.current.linkingEventWorkItemPair[0].event.uuid).toBe("event-1");
            expect(result.current.linkingEventWorkItemPair[1].event.uuid).toBe("event-2");
        });
    });

    describe("setLinkingEventWorkItemPair", () => {
        it("状態を直接更新できる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const newPairs: LinkingEventWorkItemPair[] = [
                {
                    event: createMockEvent("event-1"),
                    linkingWorkItem: {
                        workItem: createMockWorkItem("work-1", "作業1"),
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ];

            act(() => {
                result.current.setLinkingEventWorkItemPair(newPairs);
            });

            expect(result.current.linkingEventWorkItemPair).toEqual(newPairs);
        });
    });

    describe("複合シナリオ", () => {
        it("手動紐づけとAI紐づけを組み合わせて使用できる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1");
            const event2 = createMockEvent("event-2");
            const workItem1 = createMockWorkItem("work-1", "作業1");
            const workItem2 = createMockWorkItem("work-2", "作業2");

            // 手動紐づけ
            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-1", type: "manual" },
                    [workItem1],
                    [event1],
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("manual");

            // AI紐づけを追加
            act(() => {
                result.current.handleLinking(
                    { eventId: "event-2", workItemId: "work-2", type: "auto", autoMethod: "ai" },
                    [workItem2],
                    [event2],
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(2);
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("manual");
            expect(result.current.linkingEventWorkItemPair[1].linkingWorkItem.type).toBe("auto");
        });

        it("手動紐づけでAI紐づけを上書きできる", () => {
            const { result } = renderHook(() =>
                useLinkingManager({
                    historyManager: mockHistoryManager,
                }),
            );

            const event1 = createMockEvent("event-1");
            const workItem1 = createMockWorkItem("work-1", "作業1");
            const workItem2 = createMockWorkItem("work-2", "作業2");

            // AI紐づけ
            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-1", type: "auto", autoMethod: "ai" },
                    [workItem1],
                    [event1],
                );
            });

            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("auto");

            // 手動で上書き
            act(() => {
                result.current.handleLinking(
                    { eventId: "event-1", workItemId: "work-2", type: "manual" },
                    [workItem2],
                    [],
                );
            });

            expect(result.current.linkingEventWorkItemPair).toHaveLength(1);
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.type).toBe("manual");
            expect(result.current.linkingEventWorkItemPair[0].linkingWorkItem.workItem.id).toBe("work-2");
        });
    });
});
