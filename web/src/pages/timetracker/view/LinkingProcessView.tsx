import { Card } from "@/components/card";
import { appMessageDialogRef, MessageLevel } from "@/components/message-dialog";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Project, Schedule, TimeTrackerSettings, WorkItem } from "@/types";
import { getMostNestChildren } from "@/types/utils";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { CheckmarkCircle24Regular, History24Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { DetailDialog, type DetailDialogType } from "../components/DetailDialog";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { PageHeader } from "../components/PageHeader";
import { StatisticsCards } from "../components/StatisticsCards";
import { UploadInfo } from "../models";
import { AutoLinkingResult, ExcludedEventInfo, LinkingEventWorkItemPair } from "../models/linking";
import { calculateLinkingStatistics, performAutoLinking } from "../services/logic";
import { InfoItem, ViewHeader, ViewSection } from "./components";

const logger = getLogger("LinkingProcessView");

const useStyles = makeStyles({
    headerContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
    },
    headerLeft: {
        flex: 1,
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        margin: "8px 0px",
    },
    infoContent: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    infoItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
    },
    infoIcon: {
        fontSize: "18px",
    },
    infoLabel: {
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        minWidth: "120px",
    },
    historyButton: {
        minWidth: "100px",
    },
    submitButtonContainer: {
        marginTop: "24px",
        display: "flex",
        justifyContent: "flex-end",
    },
    submitButton: {
        minWidth: "200px",
        height: "48px",
        fontSize: "16px",
        fontWeight: "600",
    },
    submitButtonIcon: {
        fontSize: "20px",
    },
    infoCard: {
        padding: tokens.spacingVerticalL,
    },
    scheduleIcon: {
        marginRight: tokens.spacingHorizontalXS,
        verticalAlign: "middle",
    },
    // テーブルコンテナ用スタイル
    tableContainer: {
        marginTop: "24px",
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

export function LinkingProcessView({ uploadInfo, onBack, onSubmit, setIsLoading }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [detailDialogType, setDetailDialogType] = useState<DetailDialogType>();

    const [excludedEvents, setExcludedEvents] = useState<ExcludedEventInfo[]>([]);
    const [unlinkedEvents, setUnlinkedEvents] = useState<Event[]>([]);
    const [linkingEventWorkItemPair, setLinkingEventWorkItemPair] = useState<LinkingEventWorkItemPair[]>([]);
    const deps = [linkingEventWorkItemPair, excludedEvents, unlinkedEvents];

    // 統計データの計算
    const taskStatistics = useMemo(() => {
        return calculateLinkingStatistics(unlinkedEvents, linkingEventWorkItemPair, excludedEvents);
    }, [deps]);

    const handleCardClick = (type: DetailDialogType) => {
        setDetailDialogType(type);
        setOpenDialog(true);
    };

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

    return (
        <>
            <ViewHeader
                left={<PageHeader onBack={onBack} breadcrumbs={["TimeTracker", "紐づけ処理"]} />}
                right={
                    <Button
                        appearance="secondary"
                        icon={<History24Regular />}
                        onClick={() => setIsDrawerOpen(true)}
                        className={styles.historyButton}
                    >
                        履歴
                    </Button>
                }
            />

            <ViewSection>
                <Card className={styles.infoCard}>
                    <div className={styles.infoContent}>
                        <InfoItem icon="📄" label="勤怠情報" value={uploadInfo?.pdf?.name || "未選択"} />
                        <InfoItem icon="📅" label="スケジュール情報" value={uploadInfo?.ics?.name || "未選択"} />
                    </div>
                </Card>
            </ViewSection>

            {/* 統計表示カード */}
            {taskStatistics && (
                <ViewSection>
                    <StatisticsCards taskStatistics={taskStatistics} onCardClick={handleCardClick} />
                </ViewSection>
            )}

            <div className={styles.submitButtonContainer}>
                <Button
                    appearance="primary"
                    className={styles.submitButton}
                    icon={<CheckmarkCircle24Regular className={styles.submitButtonIcon} />}
                    onClick={handleSubmit}
                >
                    登録実行
                </Button>
            </div>

            {/* 履歴管理Drawer */}
            <HistoryDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} workItems={uploadInfo?.workItems ?? []} />

            {/* 詳細表示ダイアログ */}
            <DetailDialog
                dialogType={detailDialogType}
                openDialog={openDialog}
                taskStatistics={taskStatistics}
                onClose={() => setOpenDialog(false)}
            />
        </>
    );
}
