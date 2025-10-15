import { InteractiveCard } from "@/components/card";
import { PageHeader } from "@/components/page";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import { Button, makeStyles } from "@fluentui/react-components";
import { CheckmarkCircle24Regular } from "@fluentui/react-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { EventTable, EventWithOption, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { StatisticsCards } from "../components/StatisticsCards";
import { ViewHeader, ViewSection } from "../components/ViewLayout";
import { LinkingEventWorkItemPair, LinkingWorkItem, UploadInfo } from "../models";
import { getAllEvents } from "../services/converter";
import { autoLinkEvents } from "../services/linking";
import { EventState, pickEvents } from "../services/pick";

const logger = getLogger("LinkingProcessView");

const useStyles = makeStyles({
    actionSection: {
        display: "flex",
        flexDirection: "column",
    },
});

type LinkingProcessViewState = EventState;

const historyManager = new HistoryManager();

// 履歴に保存
const saveToHistory = (event: Event, workItem: WorkItem) => {
    historyManager.setHistory(event, workItem);
    historyManager.dump();
};

/**
 * 紐づけを削除する
 */
const removeLinking = (
    eventId: string,
    linkingEventWorkItemPair: LinkingEventWorkItemPair[],
): LinkingEventWorkItemPair[] | null => {
    const linkedEventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
    if (linkedEventIndex >= 0) {
        logger.info(`イベント (${eventId}) の紐づけを削除しました`);
        return linkingEventWorkItemPair.filter((pair) => pair.event.uuid !== eventId);
    }
    return null;
};

/**
 * WorkItemを検索して、LinkingWorkItemを作成する
 */
const findAndCreateLinkingWorkItem = (workItemId: string, workItems: WorkItem[]): LinkingWorkItem | null => {
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
};

/**
 * 既存の紐づけを更新する
 */
const updateExistingLinking = (
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
};

/**
 * 新規に紐づけを作成する（同名イベントも一括紐づけ）
 */
const createNewLinking = (
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
};

/**
 * 紐づけの変更・追加・削除を処理する
 */
const changeLinkingEventWorkItemPair = (
    eventId: string,
    workItemId: string,
    workItems: WorkItem[],
    unLinkedEvents: EventWithOption[],
    linkingEventWorkItemPair: LinkingEventWorkItemPair[],
): LinkingEventWorkItemPair[] | null => {
    // WorkItemIdが空の場合は紐づけを削除
    if (!workItemId) {
        return removeLinking(eventId, linkingEventWorkItemPair);
    }

    // WorkItemを検索してLinkingWorkItemを作成
    const linkingWorkItem = findAndCreateLinkingWorkItem(workItemId, workItems);
    if (!linkingWorkItem) {
        return null;
    }

    // 既存の紐づけを更新
    const updatedPairs = updateExistingLinking(eventId, linkingWorkItem, linkingEventWorkItemPair);
    if (updatedPairs) {
        return updatedPairs;
    }

    // 新規に紐づけを作成
    return createNewLinking(eventId, linkingWorkItem, unLinkedEvents, linkingEventWorkItemPair);
};

export type LinkingProcessViewProps = {
    uploadInfo?: UploadInfo;
    setIsLoading: (isLoading: boolean) => void;
    onBack: () => void;
    onSubmit?: (linkingEventWorkItemPair: LinkingEventWorkItemPair[]) => void;
};

/**
 * 紐づけ処理ビューコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - ハンドラーをuseCallbackでメモ化
 * - 計算値をuseMemoで最適化
 */
export const LinkingProcessView = memo(function LinkingProcessView({ uploadInfo, onBack }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();

    // 履歴
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // スケジュール・イベント
    const [state, setState] = useState<LinkingProcessViewState>({
        adjustedEvents: [],
        enableEvents: [],
        enableSchedules: [],
        excludedEvents: [],
        excludedSchedules: [],
        paidLeaveDayEvents: [],
        scheduleEvents: [],
    });
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>([]);
    const linkingEventUUID = useMemo(
        () => linkingEventWorkItemPair.map((l) => l.event.uuid),
        [linkingEventWorkItemPair],
    );
    const unLinkedEvents = useMemo(
        () => pickEvents(state).filter((event) => !linkingEventUUID.includes(event.uuid)),
        [state, linkingEventUUID],
    );

    // イベントリストを取得（紐づけ済み + 未紐づけ）
    const allEventTableRow = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair) => ({
            id: pair.event.uuid,
            item: pair,
        }));
        const unlinked = unLinkedEvents.map((event) => ({
            id: event.uuid,
            item: event,
        }));
        return [...linked, ...unlinked].sort((a, b) => {
            const aEvent = "event" in a.item ? a.item.event : a.item;
            const bEvent = "event" in b.item ? b.item.event : b.item;
            return aEvent.schedule.start.getTime() - bEvent.schedule.start.getTime();
        });
    }, [linkingEventWorkItemPair, unLinkedEvents]);

    // WorkItemの変更ハンドラー
    const handleWorkItemChange = useCallback(
        (eventId: string, workItemId: string) => {
            const newItemPair = changeLinkingEventWorkItemPair(
                eventId,
                workItemId,
                uploadInfo?.workItems ?? [],
                unLinkedEvents,
                linkingEventWorkItemPair,
            );
            if (newItemPair) {
                setLinkingEventWorkItemPair(newItemPair);
            }
        },
        [uploadInfo, unLinkedEvents, linkingEventWorkItemPair],
    );

    // 登録実行可能かどうかを判定（メモ化）
    const canSubmit = useMemo(() => linkingEventWorkItemPair.length > 0, [linkingEventWorkItemPair.length]);

    const handleSubmit = useCallback(async () => {
        logger.info(`登録実行: ${linkingEventWorkItemPair.length}件の紐づけを処理`);
        // TODO: 登録実行の処理を実装
        // // すべてのイベントが未処理の場合は進めない
        // if (linkingEventWorkItemPair.length === 0) {
        //     await appMessageDialogRef.showMessageAsync(
        //         "紐づけが必要です",
        //         "少なくとも1件以上のイベントを紐づけてから次へ進んでください。",
        //         "ERROR",
        //     );
        //     return;
        // }
        // // 未紐づけイベントがある場合は確認ダイアログを表示
        // if (unlinkedEvents.length > 0) {
        //     const proceed = await appMessageDialogRef.showConfirmAsync(
        //         "未紐づけイベントがあります",
        //         `${stats.unlinkedCount}件のイベントがまだ紐づけられていません。\n\n` +
        //         `未紐づけのイベントは登録されませんが、このまま進みますか？\n\n` +
        //         `✅ 紐づけ済み: ${stats.totalLinked}件\n` +
        //         `❌ 未紐づけ: ${stats.unlinkedCount}件`,
        //         "WARN",
        //     );
        //     if (!proceed) {
        //         return;
        //     }
        // }
        // // CompletionViewへ遷移（dayTasksを渡す）
        // if (onSubmit && dayTasks.length > 0) {
        //     onSubmit(dayTasks);
        // }
    }, [linkingEventWorkItemPair]);

    // 有効イベント取得
    useEffect(() => {
        const state = getAllEvents(
            settings.timetracker!,
            uploadInfo?.pdf?.schedule ?? [],
            uploadInfo?.ics?.event ?? [],
        );
        const linling = autoLinkEvents(
            pickEvents(state),
            uploadInfo?.workItems ?? [],
            settings.timetracker!,
            historyManager,
        );
        setState(state);
        setLinkingEventWorkItemPair(linling.linked);
    }, [uploadInfo, settings.timetracker]);

    return (
        <>
            <ViewHeader
                left={<PageHeader onBack={onBack} breadcrumbs={["TimeTracker", "紐づけ処理"]} />}
                right={
                    <Button appearance="secondary" onClick={() => setIsDrawerOpen(true)} style={{ minWidth: "100px" }}>
                        履歴
                    </Button>
                }
            />

            <ViewSection>
                {/* サマリーカード */}
                <StatisticsCards data={state} linkingEventWorkItemPair={linkingEventWorkItemPair} />

                {/* イベントテーブル */}
                <EventTable
                    events={allEventTableRow}
                    workItems={uploadInfo?.workItems || []}
                    onWorkItemChange={handleWorkItemChange}
                />

                {/*操作セクション */}
                <div className={styles.actionSection}>
                    {/* AIによる自動紐づけセクション */}
                    <AiLinkingSection
                        unlinkedEvents={unLinkedEvents}
                        linkedPairs={linkingEventWorkItemPair}
                        workItems={uploadInfo?.workItems ?? []}
                        onLinkingChange={handleWorkItemChange}
                    />

                    {/* 登録実行セクション */}
                    <InteractiveCard
                        title="登録実行"
                        description={
                            canSubmit
                                ? `${linkingEventWorkItemPair.length}件の紐づけ済みイベントをTimeTrackerに登録します`
                                : "紐づけ済みイベントがありません。イベントをWorkItemに紐づけてください"
                        }
                        variant="action"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                        icon={<CheckmarkCircle24Regular />}
                    />
                </div>
            </ViewSection>

            {/* 履歴管理Drawer */}
            <HistoryDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} workItems={uploadInfo?.workItems ?? []} />
        </>
    );
});
