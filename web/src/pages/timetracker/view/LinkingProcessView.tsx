import { InteractiveCard } from "@/components/card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { PageHeader } from "@/components/page";
import { TimeTrackerAlgorithmEvent } from "@/core/algorithm/TimeTrackerAlgorithmEvent";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { IgnorableEventPattern } from "@/types";
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
    const { settings, updateSettings } = useSettings();
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
    const { linkingEventWorkItemPair, setLinkingEventWorkItemPair, handleLinking } = useLinkingManager({
        historyManager,
    });

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

    // WorkItemの変更ハンドラー（単一紐づけ）
    const handleWorkItemChange = useCallback(
        (eventId: string, workItemId: string) => {
            handleLinking({ eventId, workItemId }, linkingInfo?.workItems ?? [], unLinkedEvents);
        },
        [handleLinking, linkingInfo?.workItems, unLinkedEvents],
    );

    // 一括紐づけハンドラー
    const handleBulkWorkItemChange = useCallback(
        (linkings: Array<{ eventId: string; workItemId: string }>) => {
            handleLinking(linkings, linkingInfo?.workItems ?? [], unLinkedEvents);
        },
        [handleLinking, linkingInfo?.workItems, unLinkedEvents],
    );

    // AI紐づけ専用ハンドラー（履歴に保存しない、バッチ処理）
    const handleAiLinkingChange = useCallback(
        (suggestions: Array<{ eventId: string; workItemId: string; confidence: number }>) => {
            // type=auto, autoMethod=aiで紐づけ（履歴に保存しない）
            const linkings = suggestions.map((s) => ({
                eventId: s.eventId,
                workItemId: s.workItemId,
                type: "auto" as const,
                autoMethod: "ai" as const,
                confidence: s.confidence,
            }));
            handleLinking(linkings, linkingInfo?.workItems ?? [], unLinkedEvents);
        },
        [handleLinking, linkingInfo?.workItems, unLinkedEvents],
    );

    // イベント削除ハンドラー
    const handleDeleteEvents = useCallback(
        (eventIds: string[]) => {
            logger.info(`イベント削除: ${eventIds.length}件`);

            // 紐づけ済みイベントから削除
            setLinkingEventWorkItemPair((prev) => prev.filter((pair) => !eventIds.includes(pair.event.uuid)));

            // 状態から未紐づけイベントを削除（すべてのイベント配列から除外）
            setState((prevState) => ({
                ...prevState,
                adjustedEvents: prevState.adjustedEvents.filter((info) => !eventIds.includes(info.event.uuid)),
                enableEvents: prevState.enableEvents.filter((event) => !eventIds.includes(event.uuid)),
                scheduleEvents: prevState.scheduleEvents.filter((event) => !eventIds.includes(event.uuid)),
                paidLeaveDayEvents: prevState.paidLeaveDayEvents.filter((event) => !eventIds.includes(event.uuid)),
            }));

            logger.info(`削除完了: ${eventIds.length}件のイベントを削除しました`);
        },
        [setLinkingEventWorkItemPair],
    );

    // 無視リスト追加ハンドラー
    const handleAddToIgnoreList = useCallback(
        async (eventIds: string[]) => {
            logger.info(`無視リストへ追加: ${eventIds.length}件`);

            // イベントIDからイベント名を取得
            const eventNames = eventIds
                .map((id) => {
                    const row = allEventTableRow.find((row) => {
                        const event = "event" in row.item ? row.item.event : row.item;
                        return event.uuid === id;
                    });
                    if (!row) return null;
                    const event = "event" in row.item ? row.item.event : row.item;
                    return event.name;
                })
                .filter((name): name is string => name !== null);

            if (eventNames.length === 0) {
                logger.warn("無視リストに追加するイベントが見つかりません");
                return;
            }

            // 完全一致の無視パターンを作成
            const newPatterns: IgnorableEventPattern[] = eventNames.map((name) => ({
                pattern: name,
                matchMode: "partial" as const, // 完全一致として部分一致を使用（名前全体が一致）
            }));

            // 既存の無視パターンを取得
            const existingPatterns = settings.timetracker?.ignorableEvents ?? [];

            // 重複を除いて新しいパターンを追加
            const existingPatternStrings = existingPatterns.map((p) => p.pattern);
            const uniqueNewPatterns = newPatterns.filter((p) => !existingPatternStrings.includes(p.pattern));

            if (uniqueNewPatterns.length === 0) {
                await appMessageDialogRef.showMessageAsync(
                    "無視リスト追加",
                    "選択したイベントはすでに無視リストに登録されています",
                    "INFO",
                );
                return;
            }

            // 設定を更新
            const updatedPatterns = [...existingPatterns, ...uniqueNewPatterns];
            if (settings.timetracker) {
                updateSettings({
                    timetracker: {
                        ...settings.timetracker,
                        ignorableEvents: updatedPatterns,
                    },
                });
            }

            logger.info(`無視リスト追加完了: ${uniqueNewPatterns.length}件の新規パターンを追加`);

            // イベントを削除（無視リストに追加されたイベントは表示から除外）
            handleDeleteEvents(eventIds);

            await appMessageDialogRef.showMessageAsync(
                "無視リスト追加完了",
                `${uniqueNewPatterns.length}件のイベントパターンを無視リストに追加しました`,
                "INFO",
            );
        },
        [allEventTableRow, settings.timetracker, handleDeleteEvents],
    );

    // 登録実行可能かどうかを判定（メモ化）
    const canSubmit = useMemo(() => linkingEventWorkItemPair.length > 0, [linkingEventWorkItemPair.length]);

    // 登録実行ハンドラー
    const handleSubmit = useCallback(async () => {
        const linkedCount = linkingEventWorkItemPair.length;
        const unlinkedCount = unLinkedEvents.length;

        logger.info(`登録実行: ${linkedCount}件の紐づけを処理`);

        const message =
            unlinkedCount > 0
                ? `${unlinkedCount}件のイベントがまだ紐づけられていません。\n\n` +
                  `未紐づけのイベントは登録されませんが、このまま進みますか？\n\n` +
                  `✅ 紐づけ済み: ${linkedCount}件\n` +
                  `❌ 未紐づけ: ${unlinkedCount}件`
                : `${linkedCount}件のイベントを登録します。`;
        // 実行確認ダイアログ
        const proceed = await appMessageDialogRef.showConfirmAsync(
            "登録処理を実行します。",
            message,
            unlinkedCount > 0 ? "WARN" : "INFO",
        );
        if (!proceed) return;

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
                    onBulkWorkItemChange={handleBulkWorkItemChange}
                    onDeleteEvents={handleDeleteEvents}
                    onAddToIgnoreList={handleAddToIgnoreList}
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
