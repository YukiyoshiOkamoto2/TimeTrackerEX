import { appMessageDialogRef, MessageLevel } from "@/components/message-dialog";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Project, Schedule, TimeTrackerSettings, WorkItem } from "@/types";
import { getMostNestChildren } from "@/types/utils";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Sparkle24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { AiLinkingSection } from "../components/AiLinkingSection";
import { EventTable, type EventTableRow } from "../components/EventTable";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { PageHeader } from "@/components/page-header";
import { StatisticsCards } from "../components/StatisticsCards";
import { UploadInfo } from "../models";
import { AutoLinkingResult, ExcludedEventInfo, LinkingEventWorkItemPair } from "../models/linking";
import { calculateLinkingStatistics, performAutoLinking } from "../services/logic";
import { ViewHeader, ViewSection } from "../components/ViewLayout";


const logger = getLogger("LinkingProcessView");

const useStyles = makeStyles({
    // ボタンコンテナ
    buttonContainer: {
        paddingTop: tokens.spacingVerticalS,
        display: "flex",
        justifyContent: "flex-end",
    },
});

function cresteAutoLinkedMessage(result: AutoLinkingResult) {
    const title = "😎 自動紐付け完了";
    if (result.linked.length === 0 && result.unlinked.length === 0) {
        return {
            title,
            message: `紐づけ対象がありません。\n\n` + `❌ 対象外: ${result.excluded.length}件\n`,
            type: "ERROR",
        };
    }

    const hasUnlinked = result.unlinked.length > 0;
    return {
        title,
        message:
            `紐づけ処理が完了しました。\n\n` +
            `✅ 紐づけ済み: ${result.linked.length}件\n` +
            `${hasUnlinked ? `❌ 未紐づけ: ${result.unlinked.length}件\n（手動で紐づけしてください）` : ""}`,
        type: hasUnlinked ? "WARN" : "INFO",
    };
}

async function runAutoLinkingAsync(
    events: Event[],
    schedules: Schedule[],
    project: Project | undefined,
    workItems: WorkItem[],
    timetracker: TimeTrackerSettings | undefined,
) {
    if (!timetracker) {
        throw new Error("");
    }

    if (!project || workItems.length === 0) {
        throw new Error("");
    }

    if (events.length === 0 && schedules.length === 0) {
        throw new Error("");
    }

    // 自動紐付けサービスを実行
    const workItemChirdren = workItems.flatMap((w) => getMostNestChildren(w));
    return await performAutoLinking({
        events,
        schedules,
        project,
        workItemChirdren,
        timetracker,
    });
}

export type LinkingProcessViewProps = {
    uploadInfo?: UploadInfo;
    setIsLoading: (isLoading: boolean) => void;
    onBack: () => void;
    onSubmit?: (linkingEventWorkItemPair: LinkingEventWorkItemPair[]) => void;
};

export function LinkingProcessView({ uploadInfo, onBack, setIsLoading }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [token, setToken] = useState<string>("");
    const [useHistory, setUseHistory] = useState<boolean>(false);

    const [excludedEvents, setExcludedEvents] = useState<ExcludedEventInfo[]>([]);
    const [unlinkedEvents, setUnlinkedEvents] = useState<Event[]>([]);
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>([]);

    // 履歴マネージャーの初期化
    const historyManager = useMemo(() => new HistoryManager(), []);

    // WorkItemの変更ハンドラー
    const handleWorkItemChange = (eventId: string, workItemId: string) => {
        const workItems = uploadInfo?.workItems || [];
        const allWorkItems = workItems.flatMap((w) => getMostNestChildren(w));
        const selectedWorkItem = allWorkItems.find((w) => w.id === workItemId);

        if (!selectedWorkItem) return;

        // eventIdから実際のイベントを取得
        const eventIndex = linkingEventWorkItemPair.findIndex((_, idx) => `linked-${idx}` === eventId);

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

            // 履歴に追加
            historyManager.setHistory(event, selectedWorkItem);
            historyManager.dump();
            logger.info(`履歴に追加: ${event.name} -> ${selectedWorkItem.name}`);
        } else {
            // 未紐づけから紐づけ済みに移動
            const unlinkedIndex = Number.parseInt(eventId.replace("unlinked-", ""));
            const event = unlinkedEvents[unlinkedIndex];

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
                setUnlinkedEvents(unlinkedEvents.filter((_, idx) => idx !== unlinkedIndex));

                // 履歴に追加
                historyManager.setHistory(event, selectedWorkItem);
                historyManager.dump();
                logger.info(`履歴に追加: ${event.name} -> ${selectedWorkItem.name}`);
            }
        }
    };

    // 統計データの計算
    const taskStatistics = useMemo(() => {
        return calculateLinkingStatistics(unlinkedEvents, linkingEventWorkItemPair, excludedEvents);
    }, [unlinkedEvents, linkingEventWorkItemPair, excludedEvents]);

    // 履歴マネージャーの初期化
    useEffect(() => {
        historyManager.load();
        logger.info("履歴マネージャーを初期化しました");
    }, [historyManager]);

    // 自動紐付け処理
    useEffect(() => {
        const runAutoLinking = async () => {
            const timetracker = settings.timetracker;
            const project = uploadInfo?.project;
            const workItems = uploadInfo?.workItems || [];
            const events = uploadInfo?.ics?.event ?? [];
            const schedules = uploadInfo?.pdf?.schedule ?? [];

            setIsLoading(true);
            try {
                const result = await runAutoLinkingAsync(events, schedules, project, workItems, timetracker);

                // 結果を状態に保存
                setExcludedEvents(result.excluded);
                setUnlinkedEvents(result.unlinked);
                setLinkingEventWorkItemPair(result.linked);

                // ユーザーに結果を通知
                const message = cresteAutoLinkedMessage(result);
                await appMessageDialogRef?.showMessageAsync(
                    message.title,
                    message.message,
                    message.type as MessageLevel,
                );
            } catch (error) {
                logger.error("自動紐付けエラー:", error);
                await appMessageDialogRef?.showMessageAsync(
                    "自動紐付けエラー",
                    `自動紐付け処理中にエラーが発生しました。\n\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
                    "ERROR",
                );
            } finally {
                setIsLoading(false);
            }
        };

        runAutoLinking();
    }, [uploadInfo, settings.timetracker, setIsLoading]);

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

    // イベントリストを取得（紐づけ済み + 未紐づけ）
    const allEvents = useMemo((): EventTableRow[] => {
        const linked = linkingEventWorkItemPair.map((pair, index) => ({
            id: `linked-${index}`,
            event: pair.event,
            workItemId: pair.linkingWorkItem.workItem.id,
            workItemName: pair.linkingWorkItem.workItem.name,
            inputType: pair.linkingWorkItem.type === "auto" ? pair.linkingWorkItem.autoMethod : "手動入力",
        }));
        const unlinked = unlinkedEvents.map((event, index) => ({
            id: `unlinked-${index}`,
            event,
            workItemId: "",
            workItemName: "未紐づけ",
            inputType: "-",
        }));
        return [...linked, ...unlinked].sort(
            (a, b) => a.event.schedule.start.getTime() - b.event.schedule.start.getTime(),
        );
    }, [linkingEventWorkItemPair, unlinkedEvents]);

    return (
        <>
            <ViewHeader
                left={<PageHeader onBack={onBack} breadcrumbs={["TimeTracker", "紐づけ処理"]} />}
                right={
                    <Button
                        appearance="secondary"
                        onClick={() => setIsDrawerOpen(true)}
                        style={{ minWidth: "100px" }}
                    >
                        履歴
                    </Button>
                }
            />

            <ViewSection>
                {/* サマリーカード */}
                <StatisticsCards taskStatistics={taskStatistics} />

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
                    events={allEvents}
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
        </>
    );
}
