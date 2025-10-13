import { PageHeader } from "@/components/page";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Schedule, WorkItem } from "@/types";
import { getMostNestChildren } from "@/types/utils";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Sparkle24Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { AutoLinkingResultDialog } from "../components/AutoLinkingResultDialog";
import { EventTable, EventWithOption, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { StatisticsCards } from "../components/StatisticsCards";
import { ViewHeader, ViewSection } from "../components/ViewLayout";
import {
    AdjustedEventInfo,
    ExcludedEventInfo,
    ExcludedScheduleInfo,
    LinkingEventWorkItemPair,
    UploadInfo,
} from "../models";
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
    // 有効なスケジュール（休日・エラーを除く）
    enableSchedules: Schedule[];
    // 有効なイベント
    enableEvents: Event[];
    // 勤務日イベント
    scheduleEvents: Event[];
    // 時間調整されたイベント
    adjustedEvents: AdjustedEventInfo[];
    // 有給休暇の日別イベント
    paidLeaveDayEvents: Event[];
    // 除外されたスケジュール
    excludedSchedules: ExcludedScheduleInfo[];
    // 除外されたイベント
    excludedEvents: ExcludedEventInfo[];
};

const historyManager = new HistoryManager();
const setHistrory = (event: Event, workItem: WorkItem) => {
    historyManager.load();
    historyManager.setHistory(event, workItem);
    historyManager.dump();
};

const toEventWithOption = (state: LinkingProcessViewState): EventWithOption[] => {
    const allEvents = [];
    if (state?.enableEvents) {
        allEvents.push(...state.enableEvents);
    }
    if (state?.adjustedEvents) {
        const adjustedEvents = state.adjustedEvents.map((a) => {
            return {
                ...a.event,
                oldSchedule: a.oldSchdule,
            };
        });
        allEvents.push(...adjustedEvents);
    }
    if (state?.paidLeaveDayEvents) {
        allEvents.push(...state.paidLeaveDayEvents);
    }
    if (state?.scheduleEvents) {
        allEvents.push(...state.scheduleEvents);
    }
    return allEvents;
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
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>([]);

    // イベントリストを取得（紐づけ済み + 未紐づけ）
    const allEventTableRow = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair) => ({
            id: pair.event.uuid,
            item: pair,
        }));
        const linkedUUID = linked.map((l) => l.id);
        const unlinked = toEventWithOption(state)
            .filter((event) => !linkedUUID.includes(event.uuid))
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
    const handleWorkItemChange = useCallback(
        (eventId: string, workItemId: string) => {
            const selectedWorkItem = getMostNestChildren(uploadInfo?.workItems || []).find((w) => w.id === workItemId);
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
            const event = toEventWithOption(state).find((event) => event.uuid === eventId);
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
        },
        [uploadInfo, linkingEventWorkItemPair, state],
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
        const events = uploadInfo?.ics?.event ?? [];
        const schedules = uploadInfo?.pdf?.schedule ?? [];
        setState(getAllEvents(settings.timetracker!, schedules, events));
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
