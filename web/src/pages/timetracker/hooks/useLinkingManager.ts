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

/** 紐づけ情報の型 */
export type LinkingInfo = {
    eventId: string;
    workItemId: string;
    /** 紐づけのタイプ（デフォルト: manual） */
    type?: "manual" | "auto";
    /** 自動紐づけの方法（type=autoの場合のみ） */
    autoMethod?: "ai" | "history" | "workShedule" | "timeOff" | "none";
    /** AIの信頼度（autoMethod=aiの場合のみ） */
    confidence?: number;
};

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
     * 対象イベントを収集する
     * @param eventId 起点となるイベントID
     * @param type 紐づけタイプ
     * @param unLinkedEvents 未紐づけイベント一覧
     * @param linkedPairs 紐づけ済みペア一覧
     * @returns 紐づけ対象のイベント配列
     */
    const collectTargetEvents = useCallback(
        (
            eventId: string,
            type: "manual" | "auto",
            unLinkedEvents: EventWithOption[],
            linkedPairs: LinkingEventWorkItemPair[],
        ): EventWithOption[] => {
            const targetEventIds = new Set<string>();
            const targetEvents: EventWithOption[] = [];

            // 未紐づけイベントから検索
            const unLinkedEvent = unLinkedEvents.find((event) => event.uuid === eventId);
            if (unLinkedEvent) {
                if (type === "manual") {
                    // 手動紐づけ: 同じキーのイベントをすべて収集
                    const eventKey = EventUtils.getKey(unLinkedEvent);
                    for (const event of unLinkedEvents) {
                        if (EventUtils.getKey(event) === eventKey && !targetEventIds.has(event.uuid)) {
                            targetEvents.push(event);
                            targetEventIds.add(event.uuid);
                        }
                    }
                    logger.info(`手動紐づけ: ${targetEvents.length}件の同じイベントを紐づけます（キー: ${eventKey}）`);
                } else {
                    // 自動紐づけ: 指定されたイベントのみ
                    targetEvents.push(unLinkedEvent);
                    targetEventIds.add(unLinkedEvent.uuid);
                }
                return targetEvents;
            }

            // 紐づけ済みイベントから検索（そのイベントのみ更新）
            const linkedPair = linkedPairs.find((pair) => pair.event.uuid === eventId);
            if (linkedPair) {
                targetEvents.push(linkedPair.event);
                targetEventIds.add(linkedPair.event.uuid);
                return targetEvents;
            }

            // イベントが見つからない場合は空配列を返す
            return [];
        },
        [],
    );

    /**
     * 紐づけを削除する
     * @param eventId 削除対象のイベントID
     * @param linkedPairs 紐づけ済みペア一覧（更新される）
     */
    const removeLinking = useCallback((eventId: string, linkedPairs: LinkingEventWorkItemPair[]): void => {
        const index = linkedPairs.findIndex((pair) => pair.event.uuid === eventId);
        if (index >= 0) {
            linkedPairs.splice(index, 1);
            logger.info(`イベント (${eventId}) の紐づけを削除しました`);
        } else {
            logger.warn(`紐づけが見つかりません: ${eventId}`);
        }
    }, []);

    /**
     * イベントに紐づけを適用する
     * @param event 対象イベント
     * @param linkingWorkItem 紐づける作業項目
     * @param linkedPairs 紐づけ済みペア一覧（更新される）
     * @param newLinkings 新規紐づけ一覧（更新される）
     * @param processedEventIds 処理済みイベントID（更新される）
     * @param shouldSaveHistory 履歴に保存するかどうか
     */
    const applyLinking = useCallback(
        (
            event: EventWithOption,
            linkingWorkItem: LinkingWorkItem,
            linkedPairs: LinkingEventWorkItemPair[],
            newLinkings: LinkingEventWorkItemPair[],
            processedEventIds: Set<string>,
            shouldSaveHistory: boolean,
        ): void => {
            // 既に処理済みのイベントはスキップ
            if (processedEventIds.has(event.uuid)) {
                return;
            }

            // 既存の紐づけを更新
            const linkedEventIndex = linkedPairs.findIndex((pair) => pair.event.uuid === event.uuid);
            if (linkedEventIndex >= 0) {
                linkedPairs[linkedEventIndex] = {
                    ...linkedPairs[linkedEventIndex],
                    linkingWorkItem,
                };
                if (shouldSaveHistory) {
                    saveToHistory(linkedPairs[linkedEventIndex].event, linkingWorkItem.workItem);
                }
            } else {
                // 新規に紐づけを作成
                newLinkings.push({ event, linkingWorkItem });
                if (shouldSaveHistory) {
                    saveToHistory(event, linkingWorkItem.workItem);
                }
            }

            // 処理済みとしてマーク
            processedEventIds.add(event.uuid);
        },
        [saveToHistory],
    );

    /**
     * 紐づけ処理：単一または複数のイベントをWorkItemに紐づける
     *
     * 【動作仕様】
     * 1. 紐づけ削除（workItemIdが空）: 指定されたイベントの紐づけを削除
     * 2. 未紐づけイベントの場合:
     *    - 手動紐づけ: 同じキー（EventUtils.getKey）のイベントをすべて紐づけ、履歴に保存
     *    - 自動紐づけ: 指定されたイベントのみ紐づけ、履歴には保存しない
     * 3. 紐づけ済みイベントの場合:
     *    - そのイベントのみ紐づけを更新（同じキーのイベントは検索しない）
     *    - 手動紐づけの場合のみ履歴に保存
     */
    const handleLinking = useCallback(
        (linkings: LinkingInfo | LinkingInfo[], workItems: WorkItem[], unLinkedEvents: EventWithOption[]) => {
            // 単一の場合は配列に変換
            const linkingArray = Array.isArray(linkings) ? linkings : [linkings];

            const updatedPairs = [...linkingEventWorkItemPair];
            const newLinkings: LinkingEventWorkItemPair[] = [];
            const processedEventIds = new Set<string>();

            for (const linking of linkingArray) {
                const { eventId, workItemId, type = "manual", autoMethod = "none" } = linking;

                // 既に処理済みのイベントはスキップ
                if (processedEventIds.has(eventId)) {
                    continue;
                }

                // 1. 紐づけ削除処理
                if (!workItemId) {
                    removeLinking(eventId, updatedPairs);
                    continue;
                }

                // 2. WorkItem検証
                const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find((w) => w.id === workItemId);
                if (!selectedWorkItem) {
                    logger.error(`Unknown WorkItem ID: ${workItemId}`);
                    continue;
                }

                // 3. LinkingWorkItemを作成
                const linkingWorkItem: LinkingWorkItem = {
                    workItem: selectedWorkItem,
                    type,
                    autoMethod,
                };

                // 4. 対象イベントを収集
                const targetEvents = collectTargetEvents(eventId, type, unLinkedEvents, updatedPairs);
                if (targetEvents.length === 0) {
                    logger.error(`Event not found: ${eventId}`);
                    continue;
                }

                // 5. 各イベントに紐づけを適用
                const shouldSaveHistory = type === "manual";
                for (const event of targetEvents) {
                    applyLinking(
                        event,
                        linkingWorkItem,
                        updatedPairs,
                        newLinkings,
                        processedEventIds,
                        shouldSaveHistory,
                    );
                }
            }

            // 6. 状態を一括更新
            setLinkingEventWorkItemPair([...updatedPairs, ...newLinkings]);
        },
        [linkingEventWorkItemPair, collectTargetEvents, removeLinking, applyLinking],
    );

    return {
        // 状態
        linkingEventWorkItemPair,
        setLinkingEventWorkItemPair,
        // ハンドラー
        handleLinking,
    };
}
