/**
 * イベントとWorkItemの紐づけ管理カスタムフック
 */

import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import type { Event, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import { useCallback, useState } from "react";
import type { EventWithOption } from "../components/EventTable";
import type { LinkingEventWorkItemPair, LinkingWorkItem } from "../models";

const logger = getLogger("useLinkingManager");

export interface UseLinkingManagerOptions {
    /** 履歴マネージャーインスタンス */
    historyManager: HistoryManager;
    /** 初期の紐づけペア（オプション） */
    initialPairs?: LinkingEventWorkItemPair[];
}

/**
 * 紐づけ管理のカスタムフック
 */
export function useLinkingManager({ historyManager, initialPairs = [] }: UseLinkingManagerOptions) {
    // 紐づけペアの状態管理
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>(initialPairs);

    /**
     * 履歴に保存
     */
    const saveToHistory = useCallback(
        (event: Event, workItem: WorkItem) => {
            historyManager.setHistory(event, workItem);
            historyManager.dump();
        },
        [historyManager],
    );

    /**
     * 紐づけを削除する
     */
    const removeLinking = useCallback(
        (eventId: string, linkingEventWorkItemPair: LinkingEventWorkItemPair[]): LinkingEventWorkItemPair[] | null => {
            const linkedEventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
            if (linkedEventIndex >= 0) {
                logger.info(`イベント (${eventId}) の紐づけを削除しました`);
                return linkingEventWorkItemPair.filter((pair) => pair.event.uuid !== eventId);
            }
            return null;
        },
        [],
    );

    /**
     * WorkItemを検索して、LinkingWorkItemを作成する
     */
    const findAndCreateLinkingWorkItem = useCallback(
        (workItemId: string, workItems: WorkItem[]): LinkingWorkItem | null => {
            const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find((w) => w.id === workItemId);
            if (!selectedWorkItem) {
                logger.error(`Unknown WorkItem ID: ${workItemId}`);
                return null;
            }

            return {
                workItem: selectedWorkItem,
                type: "manual",
                autoMethod: "none",
            };
        },
        [],
    );

    /**
     * 既存の紐づけを更新する
     */
    const updateExistingLinking = useCallback(
        (
            eventId: string,
            linkingWorkItem: LinkingWorkItem,
            linkingEventWorkItemPair: LinkingEventWorkItemPair[],
        ): LinkingEventWorkItemPair[] | null => {
            const linkedEventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
            if (linkedEventIndex < 0) {
                return null;
            }

            const updatedPairs = [...linkingEventWorkItemPair];
            updatedPairs[linkedEventIndex] = {
                ...updatedPairs[linkedEventIndex],
                linkingWorkItem,
            };

            saveToHistory(updatedPairs[linkedEventIndex].event, linkingWorkItem.workItem);
            return updatedPairs;
        },
        [saveToHistory],
    );

    /**
     * 新規に紐づけを作成する（同名イベントも一括紐づけ）
     */
    const createNewLinking = useCallback(
        (
            eventId: string,
            linkingWorkItem: LinkingWorkItem,
            unLinkedEvents: EventWithOption[],
            linkingEventWorkItemPair: LinkingEventWorkItemPair[],
        ): LinkingEventWorkItemPair[] | null => {
            const selectedEvent = unLinkedEvents.find((event) => event.uuid === eventId);
            if (!selectedEvent) {
                logger.error(`Event not found: ${eventId}`);
                return null;
            }

            // 同名のイベントも一括で紐づける
            const sameNameEvents = unLinkedEvents.filter(
                (e) => e.uuid !== selectedEvent.uuid && EventUtils.isSame(e, selectedEvent),
            );

            const newLinkings: LinkingEventWorkItemPair[] = [
                { event: selectedEvent, linkingWorkItem },
                ...sameNameEvents.map((e) => ({ event: e, linkingWorkItem })),
            ];

            saveToHistory(selectedEvent, linkingWorkItem.workItem);
            return [...linkingEventWorkItemPair, ...newLinkings];
        },
        [saveToHistory],
    );

    /**
     * 紐づけの変更・追加・削除を処理する（手動紐づけ）
     */
    const handleManualLinking = useCallback(
        (eventId: string, workItemId: string, workItems: WorkItem[], unLinkedEvents: EventWithOption[]) => {
            // WorkItemIdが空の場合は紐づけを削除
            if (!workItemId) {
                const result = removeLinking(eventId, linkingEventWorkItemPair);
                if (result) {
                    setLinkingEventWorkItemPair(result);
                }
                return;
            }

            // WorkItemを検索してLinkingWorkItemを作成
            const linkingWorkItem = findAndCreateLinkingWorkItem(workItemId, workItems);
            if (!linkingWorkItem) {
                return;
            }

            // 既存の紐づけを更新
            const updatedPairs = updateExistingLinking(eventId, linkingWorkItem, linkingEventWorkItemPair);
            if (updatedPairs) {
                setLinkingEventWorkItemPair(updatedPairs);
                return;
            }

            // 新規に紐づけを作成
            const newPairs = createNewLinking(eventId, linkingWorkItem, unLinkedEvents, linkingEventWorkItemPair);
            if (newPairs) {
                setLinkingEventWorkItemPair(newPairs);
            }
        },
        [
            linkingEventWorkItemPair,
            removeLinking,
            findAndCreateLinkingWorkItem,
            updateExistingLinking,
            createNewLinking,
        ],
    );

    /**
     * AI紐づけ専用（バッチ処理）：複数の紐づけをまとめて処理
     * 履歴に保存せず、type=auto, autoMethod=aiで紐づけを作成
     */
    const handleAiLinking = useCallback(
        (
            suggestions: Array<{ eventId: string; workItemId: string; confidence: number }>,
            workItems: WorkItem[],
            unLinkedEvents: EventWithOption[],
        ) => {
            const allNewLinkings: LinkingEventWorkItemPair[] = [];
            const processedEventIds = new Set<string>();

            for (const suggestion of suggestions) {
                const { eventId, workItemId } = suggestion;

                // 既に処理済みのイベントはスキップ（同名イベントで重複する可能性がある）
                if (processedEventIds.has(eventId)) {
                    continue;
                }

                // WorkItemを検索
                const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find((w) => w.id === workItemId);
                if (!selectedWorkItem) {
                    logger.error(`Unknown WorkItem ID: ${workItemId}`);
                    continue;
                }

                // 新規に紐づけを作成
                const selectedEvent = unLinkedEvents.find((event) => event.uuid === eventId);
                if (!selectedEvent) {
                    logger.error(`Event not found: ${eventId}`);
                    continue;
                }

                // AI紐づけ用のLinkingWorkItem（履歴に保存しない）
                const linkingWorkItem: LinkingWorkItem = {
                    workItem: selectedWorkItem,
                    type: "auto",
                    autoMethod: "ai",
                };

                // 選択されたイベントを紐づけ
                allNewLinkings.push({ event: selectedEvent, linkingWorkItem });

                // 処理済みとしてマーク
                processedEventIds.add(selectedEvent.uuid);
            }

            if (allNewLinkings.length === 0) {
                logger.warn("AI紐づけ: 有効な紐づけが作成されませんでした");
                return;
            }

            // 履歴には保存せず、状態を更新
            setLinkingEventWorkItemPair([...linkingEventWorkItemPair, ...allNewLinkings]);
        },
        [linkingEventWorkItemPair],
    );

    return {
        // 状態
        linkingEventWorkItemPair,
        setLinkingEventWorkItemPair,
        // ハンドラー
        handleManualLinking,
        handleAiLinking,
    };
}
