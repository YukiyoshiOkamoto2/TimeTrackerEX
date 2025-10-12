import { PageHeader } from "@/components/page";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { getMostNestChildren } from "@/types/utils";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Sparkle24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { AutoLinkingResultDialog } from "../components/AutoLinkingResultDialog";
import { EventTable, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { StatisticsCards } from "../components/StatisticsCards";
import { ViewHeader, ViewSection } from "../components/ViewLayout";
import { UploadInfo } from "../models";
import { ExcludedEventInfo, ExcludedScheduleInfo, LinkingEventWorkItemPair } from "../models/linking";
import { getAllEvents } from "../services/converter";

const logger = getLogger("LinkingProcessView");

const useStyles = makeStyles({
    // ボタンコンテナ
    buttonContainer: {
        paddingTop: tokens.spacingVerticalS,
        display: "flex",
        justifyContent: "flex-end",
    },
});

type LinkingProcessViewState = {
    schedules: Schedule[];
    events: Event[];
    scheduleEvents: Event[];
    paidLeaveDayEvents: Event[];
    excludedSchedules: ExcludedScheduleInfo[];
    excludedEvents: ExcludedEventInfo[];
};

const historyManager = new HistoryManager();
const setHistrory = (event: Event, workItem: WorkItem) => {
    historyManager.load();
    historyManager.setHistory(event, workItem);
    historyManager.dump();
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

    const [state, setState] = useState<LinkingProcessViewState>();
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>([]);

    const allEvents = [
        ...(state?.events ?? []),
        ...(state?.paidLeaveDayEvents ?? []),
        ...(state?.scheduleEvents ?? []),
    ];
    const linkingEventUUID = linkingEventWorkItemPair.map((l) => l.event.uuid);

    // 履歴から最近使用したWorkItemのIDを取得（設定から件数を取得）
    const recentWorkItemIds = useMemo(() => {
        historyManager.load();
        const allEntries = historyManager.getAllEntries();
        const maxCount = settings.timetracker?.appearance?.historyDisplayCount ?? 3;
        return allEntries.slice(0, maxCount).map((entry) => entry.itemId);
    }, [settings.timetracker?.appearance?.historyDisplayCount]);

    // イベントリストを取得（紐づけ済み + 未紐づけ）
    const allEventTableRow = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair) => ({
            id: pair.event.uuid,
            item: pair,
        }));

        const unlinked = allEvents
            .filter((event) => !linkingEventUUID.includes(event.uuid))
            .map((event) => ({
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
    const handleWorkItemChange = (eventId: string, workItemId: string) => {
        const workItems = uploadInfo?.workItems || [];
        const allWorkItems = getMostNestChildren(workItems);
        const selectedWorkItem = allWorkItems.find((w) => w.id === workItemId);

        if (!selectedWorkItem) {
            logger.error("Selected Unkown WorkItem Id -> " + workItemId);
            return;
        }

        // eventIdから実際のイベントを取得
        const eventIndex = linkingEventWorkItemPair.findIndex((pair) => pair.event.uuid === eventId);
        if (eventIndex >= 0) {
            // 既存の紐づけを更新
            const updatedPairs = [...linkingEventWorkItemPair];
            const event = updatedPairs[eventIndex].event;

            updatedPairs[eventIndex] = {
                ...updatedPairs[eventIndex],
                linkingWorkItem: {
                    workItem: selectedWorkItem,
                    type: "manual",
                    autoMethod: "none",
                },
            };
            setLinkingEventWorkItemPair(updatedPairs);
            setHistrory(event, selectedWorkItem);
            return;
        }

        // 未紐づけから紐づけ済みに移動
        const event = allEvents.find((event) => event.uuid === eventId);
        if (event) {
            setLinkingEventWorkItemPair([
                ...linkingEventWorkItemPair,
                {
                    event,
                    linkingWorkItem: {
                        workItem: selectedWorkItem,
                        type: "manual",
                        autoMethod: "none",
                    },
                },
            ]);
            setHistrory(event, selectedWorkItem);
            return;
        }

        logger.error("Not found event -> id: " + eventId);
    };

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
        const timetracker = settings.timetracker!;
        const events = uploadInfo?.ics?.event ?? [];
        const schedules = uploadInfo?.pdf?.schedule ?? [];
        setState(getAllEvents(timetracker, schedules, events));
    }, [uploadInfo, settings.timetracker, setState]);

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
                <StatisticsCards />

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
                    recentWorkItemIds={recentWorkItemIds}
                />

                {/* 登録実行ボタン */}
                <div className={styles.buttonContainer}>
                    <Button
                        appearance="primary"
                        size="large"
                        onClick={handleSubmit}
                        icon={<Sparkle24Regular />}
                        style={{
                            minWidth: "200px",
                            height: "48px",
                        }}
                    >
                        登録実行
                    </Button>
                </div>
            </ViewSection>

            {/* 履歴管理Drawer */}
            <HistoryDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} workItems={uploadInfo?.workItems ?? []} />

            {/* 自動紐付け結果ダイアログ */}
            <AutoLinkingResultDialog open={isResultDialogOpen} onClose={() => setIsResultDialogOpen(false)} />
        </>
    );
}
