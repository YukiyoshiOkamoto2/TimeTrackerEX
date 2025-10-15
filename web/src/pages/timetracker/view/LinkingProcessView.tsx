import { InteractiveCard } from "@/components/card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { PageHeader } from "@/components/page";
import { TimeTrackerAlgorithmEvent } from "@/core/algorithm/TimeTrackerAlgorithmEvent";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import { Button, makeStyles } from "@fluentui/react-components";
import { CheckmarkCircle24Regular } from "@fluentui/react-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { EventTable, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { StatisticsCards } from "../components/StatisticsCards";
import { ViewHeader, ViewSection } from "../components/ViewLayout";
import { useLinkingManager } from "../hooks";
import { LinkingEventWorkItemPair, LinkingInfo } from "../models";
import { getAllEvents } from "../services/converter";
import { autoLinkEvents } from "../services/linking";
import { EventState, pickEvents } from "../services/pick";

const logger = getLogger("LinkingProcessView");

// ============================================================================
// スタイル定義
// ============================================================================

const useStyles = makeStyles({
    actionSection: {
        display: "flex",
        flexDirection: "column",
    },
});

// ============================================================================
// 型定義とシングルトン
// ============================================================================

type LinkingProcessViewState = EventState;

const historyManager = new HistoryManager();
historyManager.load();

export type LinkingProcessViewProps = {
    linkingInfo?: LinkingInfo;
    onBack: () => void;
    onRegisterEvents: (linkingEventWorkItemPair: LinkingEventWorkItemPair[]) => void;
};

/**
 * 紐づけ処理ビューコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - ハンドラーをuseCallbackでメモ化
 * - 計算値をuseMemoで最適化
 */
export const LinkingProcessView = memo(function LinkingProcessView({
    linkingInfo,
    onBack,
    onRegisterEvents,
}: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const timetracker = settings.timetracker;

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

    // 紐づけ管理フック
    const { linkingEventWorkItemPair, setLinkingEventWorkItemPair, handleManualLinking, handleAiLinking } =
        useLinkingManager({ historyManager });

    // 紐づけ済みイベントUUID（メモ化）
    const linkingEventUUID = useMemo(
        () => linkingEventWorkItemPair.map((l) => l.event.uuid),
        [linkingEventWorkItemPair],
    );

    // 未紐づけイベント（メモ化）
    const unLinkedEvents = useMemo(
        () => pickEvents(state).filter((event) => !linkingEventUUID.includes(event.uuid)),
        [state, linkingEventUUID],
    );

    // イベントテーブル行データ（紐づけ済み + 未紐づけ、日時順にソート）
    const allEventTableRow = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair) => ({ id: pair.event.uuid, item: pair }));
        const unlinked = unLinkedEvents.map((event) => ({ id: event.uuid, item: event }));

        return [...linked, ...unlinked].sort((a, b) => {
            const aEvent = "event" in a.item ? a.item.event : a.item;
            const bEvent = "event" in b.item ? b.item.event : b.item;
            return aEvent.schedule.start.getTime() - bEvent.schedule.start.getTime();
        });
    }, [linkingEventWorkItemPair, unLinkedEvents]);

    // WorkItemの変更ハンドラー（手動紐づけ）
    const handleWorkItemChange = useCallback(
        (eventId: string, workItemId: string) => {
            handleManualLinking(eventId, workItemId, linkingInfo?.workItems ?? [], unLinkedEvents);
        },
        [handleManualLinking, linkingInfo?.workItems, unLinkedEvents],
    );

    // AI紐づけ専用ハンドラー（履歴に保存しない、バッチ処理）
    const handleAiLinkingChange = useCallback(
        (suggestions: Array<{ eventId: string; workItemId: string; confidence: number }>) => {
            handleAiLinking(suggestions, linkingInfo?.workItems ?? [], unLinkedEvents);
        },
        [handleAiLinking, linkingInfo?.workItems, unLinkedEvents],
    );

    // 登録実行可能かどうかを判定（メモ化）
    const canSubmit = useMemo(() => linkingEventWorkItemPair.length > 0, [linkingEventWorkItemPair.length]);

    // 登録実行ハンドラー
    const handleSubmit = useCallback(async () => {
        const linkedCount = linkingEventWorkItemPair.length;
        const unlinkedCount = unLinkedEvents.length;

        logger.info(`登録実行: ${linkedCount}件の紐づけを処理`);

        // 未紐づけイベント確認ダイアログ
        if (unlinkedCount > 0) {
            const proceed = await appMessageDialogRef.showConfirmAsync(
                "未紐づけイベントがあります",
                `${unlinkedCount}件のイベントがまだ紐づけられていません。\n\n` +
                    `未紐づけのイベントは登録されませんが、このまま進みますか？\n\n` +
                    `✅ 紐づけ済み: ${linkedCount}件\n` +
                    `❌ 未紐づけ: ${unlinkedCount}件`,
                "WARN",
            );
            if (!proceed) return;
        }

        try {
            // イベント重複解消
            const events = linkingEventWorkItemPair.map((pair) => pair.event);
            const [cleanedEvents, excludedEvents] = TimeTrackerAlgorithmEvent.cleanDuplicateEvent(
                events,
                timetracker?.eventDuplicatePriority.timeCompare ?? "small",
            );
            logger.info(`重複解消後: ${cleanedEvents.length}件（除外: ${excludedEvents.length}件）`);

            // クリーンアップされた紐づけペアを作成
            const cleanedPairs = cleanedEvents
                .map((event) => linkingEventWorkItemPair.find((pair) => pair.event.uuid === event.uuid))
                .filter((pair): pair is LinkingEventWorkItemPair => pair !== undefined);

            // 空配列チェック
            if (cleanedPairs.length === 0) {
                await appMessageDialogRef.showMessageAsync(
                    "紐づけエラー",
                    "重複解消後、登録可能なイベントがありません。",
                    "ERROR",
                );
                return;
            }

            logger.info(`次の画面へ遷移: ${cleanedPairs.length}件の紐づけペア`);
            onRegisterEvents(cleanedPairs);
        } catch (error) {
            logger.error("登録処理エラー:", error);
            await appMessageDialogRef.showMessageAsync(
                "処理エラー",
                error instanceof Error ? error.message : "不明なエラーが発生しました。",
                "ERROR",
            );
        }
    }, [
        linkingEventWorkItemPair,
        unLinkedEvents.length,
        timetracker?.eventDuplicatePriority.timeCompare,
        onRegisterEvents,
    ]);

    // 有効イベント取得と自動紐づけ
    useEffect(() => {
        if (!settings.timetracker || !linkingInfo) return;

        const eventState = getAllEvents(settings.timetracker, linkingInfo.schedules ?? [], linkingInfo.events ?? []);

        const autoLinking = autoLinkEvents(
            pickEvents(eventState),
            linkingInfo.workItems ?? [],
            settings.timetracker,
            historyManager,
        );

        setState(eventState);
        setLinkingEventWorkItemPair(autoLinking.linked);
    }, [linkingInfo, settings.timetracker, setLinkingEventWorkItemPair]);

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
                    workItems={linkingInfo?.workItems ?? []}
                    onWorkItemChange={handleWorkItemChange}
                />

                {/*操作セクション */}
                <div className={styles.actionSection}>
                    {/* AIによる自動紐づけセクション */}
                    <AiLinkingSection
                        unlinkedEvents={unLinkedEvents}
                        linkedPairs={linkingEventWorkItemPair}
                        workItems={linkingInfo?.workItems ?? []}
                        onAiLinkingChange={handleAiLinkingChange}
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
            <HistoryDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                workItems={linkingInfo?.workItems ?? []}
            />
        </>
    );
});
