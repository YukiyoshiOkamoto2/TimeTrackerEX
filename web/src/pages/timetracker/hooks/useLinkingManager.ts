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
     * 紐づけ処理：単一または複数のイベントをWorkItemに紐づける（統合版）
     * - 手動紐づけ（type=manual, デフォルト）: 履歴に保存し、同じイベント（EventUtils.getKey）も紐づけ
     * - 自動紐づけ（type=auto）: 履歴に保存せず、指定されたイベントのみ紐づけ
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

                // 既に処理済みのイベントはスキップ（同名イベントで重複する可能性がある）
                if (processedEventIds.has(eventId)) {
                    continue;
                }

                // WorkItemIdが空の場合は紐づけを削除
                if (!workItemId) {
                    const index = updatedPairs.findIndex((pair) => pair.event.uuid === eventId);
                    if (index >= 0) {
                        updatedPairs.splice(index, 1);
                        logger.info(`イベント (${eventId}) の紐づけを削除しました`);
                    }
                    continue;
                }

                // WorkItemを検索
                const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find((w) => w.id === workItemId);
                if (!selectedWorkItem) {
                    logger.error(`Unknown WorkItem ID: ${workItemId}`);
                    continue;
                }

                // LinkingWorkItemを作成
                const linkingWorkItem: LinkingWorkItem = {
                    workItem: selectedWorkItem,
                    type,
                    autoMethod,
                };

                // 対象イベントを取得
                const targetEvent = unLinkedEvents.find((event) => event.uuid === eventId);
                if (!targetEvent) {
                    logger.error(`Event not found: ${eventId}`);
                    continue;
                }

                // 手動紐づけの場合、同じイベント（EventUtils.getKey）も紐づけ
                const targetEvents: EventWithOption[] = [];
                if (type === "manual") {
                    const eventKey = EventUtils.getKey(targetEvent);
                    // 同じキーを持つすべてのイベントを取得
                    for (const event of unLinkedEvents) {
                        if (EventUtils.getKey(event) === eventKey) {
                            targetEvents.push(event);
                        }
                    }
                    logger.info(`手動紐づけ: ${targetEvents.length}件の同じイベントを紐づけます（キー: ${eventKey}）`);
                } else {
                    // 自動紐づけの場合は指定されたイベントのみ
                    targetEvents.push(targetEvent);
                }

                // 各イベントを紐づけ
                for (const event of targetEvents) {
                    // 既に処理済みのイベントはスキップ
                    if (processedEventIds.has(event.uuid)) {
                        continue;
                    }

                    // 既存の紐づけを更新
                    const linkedEventIndex = updatedPairs.findIndex((pair) => pair.event.uuid === event.uuid);
                    if (linkedEventIndex >= 0) {
                        updatedPairs[linkedEventIndex] = {
                            ...updatedPairs[linkedEventIndex],
                            linkingWorkItem,
                        };
                        // 手動紐づけの場合のみ履歴に保存
                        if (type === "manual") {
                            saveToHistory(updatedPairs[linkedEventIndex].event, linkingWorkItem.workItem);
                        }
                    } else {
                        // 新規に紐づけを作成
                        newLinkings.push({ event, linkingWorkItem });
                        // 手動紐づけの場合のみ履歴に保存
                        if (type === "manual") {
                            saveToHistory(event, linkingWorkItem.workItem);
                        }
                    }

                    // 処理済みとしてマーク
                    processedEventIds.add(event.uuid);
                }
            }

            // 一括で状態を更新
            setLinkingEventWorkItemPair([...updatedPairs, ...newLinkings]);
        },
        [linkingEventWorkItemPair, saveToHistory],
    );

    return {
        // 状態
        linkingEventWorkItemPair,
        setLinkingEventWorkItemPair,
        // ハンドラー
        handleLinking,
    };
}
