import { PageHeader } from "@/components/page";
import { TimeTrackerAlgorithmCore } from "@/core/algorithm/TimeTrackerAlgorithmCore";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Sparkle24Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { EventTable, EventWithOption, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { StatisticsCards } from "../components/StatisticsCards";
import { ViewHeader, ViewSection } from "../components/ViewLayout";
import {
    AdjustedEventInfo,
    ExcludedEventInfo,
    ExcludedScheduleInfo,
    LinkingEventWorkItemPair,
    LinkingWorkItem,
    UploadInfo,
} from "../models";
import { getAllEvents } from "../services/converter";
import { autoLinkEvents } from "../services/linking";
import { EventState, pickEvents } from "../services/pick";

const logger = getLogger("LinkingProcessView");

const useStyles = makeStyles({
    // ボタンコンテナ
    buttonContainer: {
        paddingTop: tokens.spacingVerticalS,
        display: "flex",
        justifyContent: "flex-end",
    },
    // 登録実行ボタン
    submitButton: {
        minWidth: "200px",
        height: "48px",
        transitionDuration: tokens.durationNormal,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "transform, box-shadow",
        // ホバー時のアニメーション
        ":hover": {
            transform: "translateY(-2px)",
            boxShadow: tokens.shadow16,
        },
        // アクティブ時（クリック時）のアニメーション
        ":active": {
            transform: "translateY(0px)",
            boxShadow: tokens.shadow8,
        },
        // アイコンの回転アニメーション
        "& svg": {
            transitionDuration: tokens.durationSlow,
            transitionTimingFunction: tokens.curveEasyEase,
            transitionProperty: "transform",
        },
        ":hover svg": {
            transform: "rotate(15deg) scale(1.1)",
        },
    },
});

type LinkingProcessViewState = EventState;

const historyManager = new HistoryManager();

// 履歴に保存
const saveToHistory = (event: Event, workItem: WorkItem) => {
    historyManager.setHistory(event, workItem);
    historyManager.dump();
};

// 紐づけの変更・追加・削除を処理
const changeLinkingEventWorkItemPair = (
    eventId: string,
    workItemId: string,
    workItems: WorkItem[],
    unLinlinkingEvents: EventWithOption[],
    linkingEventWorkItemPair: LinkingEventWorkItemPair[],
): LinkingEventWorkItemPair[] | null => {
    // WorkItemIdが空の場合は紐づけを削除
    if (!workItemId) {
        const linkedEventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
        if (linkedEventIndex >= 0) {
            logger.info(`イベント (${eventId}) の紐づけを削除しました`);
            return linkingEventWorkItemPair.filter((pair) => pair.event.uuid !== eventId);
        }
        return null;
    }

    // WorkItemを検索
    const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find((w) => w.id === workItemId);
    if (!selectedWorkItem) {
        logger.error(`Unknown WorkItem ID: ${workItemId}`);
        return null;
    }

    const linkingWorkItem: LinkingWorkItem = {
        workItem: selectedWorkItem,
        type: "manual",
        autoMethod: "none",
    };

    // 既存の紐づけを更新
    const linkedEventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
    if (linkedEventIndex >= 0) {
        const updatedPairs = [...linkingEventWorkItemPair];
        updatedPairs[linkedEventIndex] = {
            ...updatedPairs[linkedEventIndex],
            linkingWorkItem,
        };
        saveToHistory(updatedPairs[linkedEventIndex].event, selectedWorkItem);
        return updatedPairs;
    }

    // 未紐づけから紐づけ済みに移動
    const selected = unLinlinkingEvents.find((event) => event.uuid === eventId);
    if (selected) {
        // 同名のイベントも一括で紐づける
        const sameNameEvents = unLinlinkingEvents.filter(
            (e) => e.uuid !== selected.uuid && EventUtils.isSame(e, selected),
        );
        const newLinkings: LinkingEventWorkItemPair[] = [
            { event: selected, linkingWorkItem },
            ...sameNameEvents.map((e) => ({ event: e, linkingWorkItem })),
        ];

        saveToHistory(selected, selectedWorkItem);
        return [...linkingEventWorkItemPair, ...newLinkings];
    }

    logger.error(`Event not found: ${eventId}`);
    return null;
};

export type LinkingProcessViewProps = {
    uploadInfo?: UploadInfo;
    setIsLoading: (isLoading: boolean) => void;
    onBack: () => void;
    onSubmit?: (linkingEventWorkItemPair: LinkingEventWorkItemPair[]) => void;
};

export function LinkingProcessView({ uploadInfo, onBack }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();

    // AI
    const [token, setToken] = useState<string>("");
    const [useHistory, setUseHistory] = useState<boolean>(false);

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
    const unLinlinkingEvents = useMemo(
        () => pickEvents(state).filter((event) => !linkingEventUUID.includes(event.uuid)),
        [state, linkingEventUUID],
    );

    // イベントリストを取得（紐づけ済み + 未紐づけ）
    const allEventTableRow = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair) => ({
            id: pair.event.uuid,
            item: pair,
        }));
        const unlinked = unLinlinkingEvents.map((event) => ({
            id: event.uuid,
            item: event,
        }));
        return [...linked, ...unlinked].sort((a, b) => {
            const aEvent = "event" in a.item ? a.item.event : a.item;
            const bEvent = "event" in b.item ? b.item.event : b.item;
            return aEvent.schedule.start.getTime() - bEvent.schedule.start.getTime();
        });
    }, [linkingEventWorkItemPair, state]);

    // WorkItemの変更ハンドラー
    const handleWorkItemChange = useCallback(
        (eventId: string, workItemId: string) => {
            const newItemPair = changeLinkingEventWorkItemPair(
                eventId,
                workItemId,
                uploadInfo?.workItems ?? [],
                unLinlinkingEvents,
                linkingEventWorkItemPair,
            );
            if (newItemPair) {
                setLinkingEventWorkItemPair(newItemPair);
            }
        },
        [uploadInfo, unLinlinkingEvents, linkingEventWorkItemPair],
    );

    const handleSubmit = async () => {
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
    };

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

                {/* AIによる自動紐づけセクション */}
                <AiLinkingSection
                    token={token}
                    onTokenChange={setToken}
                    useHistory={useHistory}
                    onUseHistoryChange={setUseHistory}
                    onStartLinking={async () => {
                        // TODO: AI自動紐づけ処理を実装
                        logger.info("AI自動紐づけを開始します");
                    }}
                />

                {/* イベントテーブル */}
                <EventTable
                    events={allEventTableRow}
                    workItems={uploadInfo?.workItems || []}
                    onWorkItemChange={handleWorkItemChange}
                />

                {/* 登録実行ボタン */}
                <div className={styles.buttonContainer}>
                    <Button
                        appearance="primary"
                        size="large"
                        onClick={handleSubmit}
                        icon={<Sparkle24Regular />}
                        className={styles.submitButton}
                    >
                        登録実行
                    </Button>
                </div>
            </ViewSection>

            {/* 履歴管理Drawer */}
            <HistoryDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} workItems={uploadInfo?.workItems ?? []} />
        </>
    );
}
