import { Card } from "@/components/card";
import { InteractiveCard } from "@/components/interactive-card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { DayTask, EventWorkItemPair } from "@/types";
import {
    Button,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    CheckmarkCircle24Regular,
    History24Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { DetailDialog, type DetailDialogType } from "../components/DetailDialog";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { PageHeader } from "../components/PageHeader";
import { StatisticsCards } from "../components/StatisticsCards";
import type { AutoLinkingResult, UploadInfo } from "../models";
import { calculateLinkingStatistics, createAutoLinkingResultMessage, performAutoLinking } from "../services";
import {
    processWorkItemSelect,
    saveManualLinkingToHistory,
    validateLinkingData,
} from "../services/linkingViewLogic";
import { InfoItem, ViewHeader, ViewSection } from "./components";
import { createUnlinkedEventsColumns } from "../components/UnlinkedEventsColumns";
import type { UnlinkedEventRow } from "../models";
import {
    calculateExcludedStats,
    convertExcludedEventsToRows,
    convertLinkedEventsToRows,
    convertPaidLeaveToRows,
    convertTargetEventsToRows,
    convertUnlinkedEventsToRows,
} from "../services/linkingViewDataTransform";

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

export type LinkingProcessViewProps = {
    uploadInfo?: UploadInfo;
    setIsLoading: (isLoading: boolean) => void;
    onBack: () => void;
    onSubmit?: (dayTasks: DayTask[]) => void;
};

export function LinkingProcessView({ uploadInfo, onBack, onSubmit, setIsLoading }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // 自動紐付け結果の状態
    const [linkingResult, setLinkingResult] = useState<AutoLinkingResult | null>(null);

    // 手動紐づけ結果の状態
    const [manuallyLinkedPairs, setManuallyLinkedPairs] = useState<EventWorkItemPair[]>([]);

    // 未紐付けイベントの選択状態
    const [selectedWorkItems, setSelectedWorkItems] = useState<Map<string, string>>(new Map());

    // 日ごとのタスク分割結果の状態
    const [dayTasks, setDayTasks] = useState<DayTask[]>([]);

    // 詳細表示用のダイアログステート
    const [detailDialogType, setDetailDialogType] = useState<DetailDialogType>(null);

    // 統計データの計算
    const stats = useMemo(() => {
        const allSchedules = uploadInfo?.pdf?.schedule || [];
        return calculateLinkingStatistics(linkingResult, manuallyLinkedPairs, allSchedules, dayTasks);
    }, [linkingResult, manuallyLinkedPairs, uploadInfo, dayTasks]);

    // 有給休暇の詳細データ
    const paidLeaveRows = useMemo(() => {
        return convertPaidLeaveToRows(uploadInfo?.pdf?.schedule || []);
    }, [uploadInfo]);

    // 対象イベントの詳細データ
    const targetEventRows = useMemo(() => {
        return convertTargetEventsToRows(linkingResult, dayTasks);
    }, [linkingResult, dayTasks]);

    // 紐付け済みイベントのデータ変換
    const linkedEventsRows = useMemo(() => {
        return convertLinkedEventsToRows(linkingResult, manuallyLinkedPairs);
    }, [linkingResult, manuallyLinkedPairs]);

    // 未紐付けイベントのデータ変換
    const unlinkedEventsRows = useMemo(() => {
        return convertUnlinkedEventsToRows(linkingResult, selectedWorkItems);
    }, [linkingResult, selectedWorkItems]);

    // 除外されたイベントの詳細データ
    const excludedEventRows = useMemo(() => {
        return convertExcludedEventsToRows(linkingResult);
    }, [linkingResult]);

    // 除外されたイベントの統計
    const excludedStats = useMemo(() => {
        return calculateExcludedStats(linkingResult);
    }, [linkingResult]);

    // WorkItemリストの取得
    const workItems = useMemo(() => {
        return uploadInfo?.workItems || [];
    }, [uploadInfo]);

    // 手動紐付けハンドラー
    const handleWorkItemSelect = async (eventId: string, workItemId: string) => {
        if (!linkingResult) return;

        // 選択状態を更新
        setSelectedWorkItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(eventId, workItemId);
            return newMap;
        });

        // サービス層を使用して紐付け処理
        const result = processWorkItemSelect(eventId, workItemId, linkingResult.unlinked, workItems);

        if (!result.success) {
            logger.error("手動紐付けエラー:", result.error);
            return;
        }

        const { event, workItem } = result;

        // 手動紐付けペアを追加
        const newPair: EventWorkItemPair = { event, workItem };
        setManuallyLinkedPairs((prev) => [...prev, newPair]);

        // 履歴に保存
        try {
            saveManualLinkingToHistory(event, workItem);
        } catch (error) {
            logger.error("履歴保存エラー:", error);
        }

        // linkingResultから該当イベントを削除し、linkedに追加
        setLinkingResult((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                linked: [...prev.linked, newPair],
                unlinked: prev.unlinked.filter((e) => e.uuid !== eventId),
            };
        });

        appMessageDialogRef.showMessageAsync(
            "紐付け完了",
            `「${event.name}」を「${workItem.name}」に紐付けました`,
            "INFO",
        );
    };

    // 未紐付けイベントテーブルの列定義（インタラクティブ用）
    const unlinkedEventsColumns = useMemo(() => {
        return createUnlinkedEventsColumns(workItems, handleWorkItemSelect);
    }, [workItems]);

    // 自動紐付け処理
    useEffect(() => {
        const runAutoLinking = async () => {
            // uploadInfoとsettings.timetrackerのnullチェック
            if (!uploadInfo || !settings.timetracker) {
                return;
            }

            // データ検証をサービス層で実施
            const hasEvents: boolean = !!(uploadInfo.ics?.event && uploadInfo.ics.event.length > 0);
            const hasSchedules: boolean = !!(uploadInfo.pdf?.schedule && uploadInfo.pdf.schedule.length > 0);
            const validationResult = validateLinkingData(hasEvents, hasSchedules, true);

            if (!validationResult.valid) {
                return;
            }

            const project = uploadInfo.project;
            const workItems = uploadInfo.workItems || [];

            if (!project) {
                logger.error("プロジェクト情報がuploadInfoに含まれていません");
                await appMessageDialogRef.showMessageAsync(
                    "データエラー",
                    "プロジェクト情報が取得できていません。\nファイルアップロード画面に戻ってください。",
                    "ERROR",
                );
                return;
            }

            setIsLoading(true);
            try {
                // 自動紐付けサービスを実行
                const result = await performAutoLinking({
                    events: uploadInfo.ics?.event || [],
                    schedules: uploadInfo.pdf?.schedule || [],
                    project,
                    workItems,
                    settings: settings.timetracker,
                });

                // 結果を状態に保存
                setDayTasks(result.dayTasks);
                setLinkingResult(result.linkingResult);

                // ユーザーに結果を通知
                const message = createAutoLinkingResultMessage(result.linkingResult);
                if (result.linkingResult.linked.length > 0 || result.linkingResult.unlinked.length > 0) {
                    await appMessageDialogRef?.showMessageAsync(message.title, message.message, message.type);
                }
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
        // すべてのイベントが未処理の場合は進めない
        if (stats.totalLinked === 0) {
            await appMessageDialogRef.showMessageAsync(
                "紐づけが必要です",
                "少なくとも1件以上のイベントを紐づけてから次へ進んでください。",
                "ERROR",
            );
            return;
        }

        // 未紐づけイベントがある場合は確認ダイアログを表示
        if (stats.unlinkedCount > 0) {
            const proceed = await appMessageDialogRef.showConfirmAsync(
                "未紐づけイベントがあります",
                `${stats.unlinkedCount}件のイベントがまだ紐づけられていません。\n\n` +
                    `未紐づけのイベントは登録されませんが、このまま進みますか？\n\n` +
                    `✅ 紐づけ済み: ${stats.totalLinked}件\n` +
                    `❌ 未紐づけ: ${stats.unlinkedCount}件`,
                "WARN",
            );

            if (!proceed) {
                return;
            }
        }

        // CompletionViewへ遷移（dayTasksを渡す）
        if (onSubmit && dayTasks.length > 0) {
            onSubmit(dayTasks);
        }
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
            {linkingResult && (
                <ViewSection>
                    <StatisticsCards
                        stats={{
                            totalDays: stats.totalDays,
                            paidLeaveDays: stats.paidLeaveDays,
                            normalEventCount: stats.normalEventCount,
                            convertedEventCount: stats.convertedEventCount,
                            excludedCount: linkingResult.excluded.length,
                            totalLinked: stats.totalLinked,
                            timeOffCount: stats.timeOffCount,
                            historyCount: stats.historyCount,
                            unlinkedCount: stats.unlinkedCount,
                        }}
                        excludedStats={excludedStats}
                        schedules={uploadInfo?.pdf?.schedule}
                        dayTasks={dayTasks}
                        onCardClick={setDetailDialogType}
                    />
                </ViewSection>
            )}

            {/* 未紐付けイベント一覧テーブル (Task 3) */}
            {linkingResult && unlinkedEventsRows.length > 0 && (
                <div className={styles.tableContainer}>
                    <InteractiveCard title="❌ 未紐付けイベント一覧" defaultExpanded={true}>
                        <div
                            style={{
                                marginBottom: "16px",
                                fontSize: "13px",
                                color: tokens.colorNeutralForeground3,
                            }}
                        >
                            以下のイベントは自動紐付けできませんでした。 作業項目を手動で選択してください。
                        </div>
                        <DataGrid
                            items={unlinkedEventsRows}
                            columns={unlinkedEventsColumns}
                            sortable
                            getRowId={(item) => item.id}
                        >
                            <DataGridHeader>
                                <DataGridRow>
                                    {({ renderHeaderCell }) => (
                                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                    )}
                                </DataGridRow>
                            </DataGridHeader>
                            <DataGridBody<UnlinkedEventRow>>
                                {({ item, rowId }) => (
                                    <DataGridRow<UnlinkedEventRow> key={rowId}>
                                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                    </DataGridRow>
                                )}
                            </DataGridBody>
                        </DataGrid>
                    </InteractiveCard>
                </div>
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
            <HistoryDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} workItems={workItems} />

            {/* 詳細表示ダイアログ */}
            <DetailDialog
                dialogType={detailDialogType}
                onClose={() => setDetailDialogType(null)}
                stats={{
                    paidLeaveDays: stats.paidLeaveDays,
                    normalEventCount: stats.normalEventCount,
                    convertedEventCount: stats.convertedEventCount,
                    totalLinked: stats.totalLinked,
                    timeOffCount: stats.timeOffCount,
                    historyCount: stats.historyCount,
                    manualCount: stats.manualCount,
                }}
                excludedStats={excludedStats}
                paidLeaveRows={paidLeaveRows}
                targetEventRows={targetEventRows}
                excludedEventRows={excludedEventRows}
                linkedEventsRows={linkedEventsRows}
                unlinkedEventsRows={unlinkedEventsRows}
            />
        </>
    );
}
