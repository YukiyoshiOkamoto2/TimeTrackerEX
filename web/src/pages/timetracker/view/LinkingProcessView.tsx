import { appMessageDialogRef } from "@/components/message-dialog";
import {
    Button,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    Dropdown,
    Option,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    CheckmarkCircle24Regular,
    Dismiss24Regular,
    History24Regular,
    Link24Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/card";
import { InteractiveCard } from "@/components/interactive-card";
import type { AutoLinkingResult, UploadInfo } from "../models";
import { PageHeader } from "../components/PageHeader";
import {
    autoLinkEvents,
    createPaidLeaveDayTasks,
    getEnableEvents,
    getEnableSchedules,
    getPaidLeaveSchedules,
    splitEventsByDay,
} from "../services";
import { useSettings } from "@/store";
import { HistoryManager } from "@/core/history";
import { getLogger } from "@/lib/logger";
import type { DayTask, EventWorkItemPair } from "@/types";

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
    drawer: {
        width: "480px",
        maxWidth: "90vw",
    },
    historyItem: {
        padding: "12px 16px",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    historyTime: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginBottom: "4px",
    },
    historyAction: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "500",
    },
    historyDetails: {
        fontSize: "13px",
        color: tokens.colorNeutralForeground2,
        marginTop: "4px",
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
    optionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    optionLabel: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    optionControl: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    optionIcon: {
        fontSize: "18px",
        color: tokens.colorNeutralForeground2,
    },
    submitButtonIcon: {
        fontSize: "20px",
    },
    infoCard: {
        padding: tokens.spacingVerticalL,
    },
    optionInput: {
        width: "200px",
    },
    autoLinkButton: {
        minWidth: "120px",
    },
    autoLinkButtonContainer: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: tokens.spacingVerticalL,
        paddingTop: tokens.spacingVerticalL,
    },
    scheduleIcon: {
        marginRight: tokens.spacingHorizontalXS,
        verticalAlign: "middle",
    },
    // 統計表示用スタイル
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        marginTop: "16px",
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    statLabel: {
        fontSize: "13px",
        color: tokens.colorNeutralForeground2,
        fontWeight: "500",
    },
    statValue: {
        fontSize: "24px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "600",
    },
    statValueSuccess: {
        color: tokens.colorPaletteGreenForeground1,
    },
    statValueWarning: {
        color: tokens.colorPaletteYellowForeground1,
    },
    statSubText: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginTop: "4px",
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

    // 統計データの計算
    const stats = useMemo(() => {
        const linkedCount = linkingResult?.linked.length || 0;
        const timeOffCount = linkingResult?.timeOffCount || 0;
        const historyCount = linkingResult?.historyCount || 0;
        const unlinkedCount = linkingResult?.unlinked.length || 0;
        const manualCount = manuallyLinkedPairs.length;
        
        // 有給休暇タスクの日数
        const paidLeaveDays = dayTasks.filter(task => 
            task.events.some(e => e.name?.includes("有給") || e.name?.includes("休暇"))
        ).length;
        
        // 通常タスクの日数
        const normalTaskDays = dayTasks.filter(task =>
            !task.events.some(e => e.name?.includes("有給") || e.name?.includes("休暇"))
        ).length;

        return {
            linkedCount,
            timeOffCount,
            historyCount,
            unlinkedCount,
            manualCount,
            totalLinked: linkedCount + manualCount,
            paidLeaveDays,
            normalTaskDays,
            totalDays: dayTasks.length,
        };
    }, [linkingResult, manuallyLinkedPairs, dayTasks]);

    // 紐付け済みイベントテーブルの列定義
    type LinkedEventRow = {
        id: string;
        eventName: string;
        startTime: string;
        endTime: string;
        workItemName: string;
        source: string;
    };

    const linkedEventsColumns: TableColumnDefinition<LinkedEventRow>[] = [
        createTableColumn<LinkedEventRow>({
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.eventName}
                </TableCellLayout>
            ),
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.startTime}
                </TableCellLayout>
            ),
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.endTime}
                </TableCellLayout>
            ),
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "作業項目",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.workItemName}
                </TableCellLayout>
            ),
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "source",
            compare: (a, b) => a.source.localeCompare(b.source),
            renderHeaderCell: () => "紐付けソース",
            renderCell: (item) => (
                <TableCellLayout
                    media={<Link24Regular />}
                >
                    {item.source}
                </TableCellLayout>
            ),
        }),
    ];

    // 紐付け済みイベントのデータ変換
    const linkedEventsRows = useMemo<LinkedEventRow[]>(() => {
        if (!linkingResult) return [];
        
        const rows: LinkedEventRow[] = [];
        
        // 自動紐付けイベント（timeOffCountとhistoryCountを使って判定）
        let historyCount = 0;
        for (const pair of linkingResult.linked) {
            // 有給・休暇イベントかどうかを判定
            const isTimeOff = pair.event.name?.includes("有給") || pair.event.name?.includes("休暇");
            
            // 履歴からの紐付けかどうかを判定（timeOffでない場合で、historyCountがまだ残っている場合）
            let source: string;
            if (isTimeOff) {
                source = "休暇";
            } else if (historyCount < linkingResult.historyCount) {
                source = "履歴";
                historyCount++;
            } else {
                source = "自動";
            }
            
            rows.push({
                id: `auto-${pair.event.uuid}`,
                eventName: pair.event.name || "無題",
                startTime: new Date(pair.event.schedule.start).toLocaleString("ja-JP"),
                endTime: pair.event.schedule.end 
                    ? new Date(pair.event.schedule.end).toLocaleString("ja-JP")
                    : "-",
                workItemName: pair.workItem.name,
                source,
            });
        }
        
        // 手動紐付けイベント
        for (const pair of manuallyLinkedPairs) {
            rows.push({
                id: `manual-${pair.event.uuid}`,
                eventName: pair.event.name || "無題",
                startTime: new Date(pair.event.schedule.start).toLocaleString("ja-JP"),
                endTime: pair.event.schedule.end
                    ? new Date(pair.event.schedule.end).toLocaleString("ja-JP")
                    : "-",
                workItemName: pair.workItem.name,
                source: "手動",
            });
        }
        
        return rows;
    }, [linkingResult, manuallyLinkedPairs]);

    // 未紐付けイベントテーブルの列定義
    type UnlinkedEventRow = {
        id: string;
        eventName: string;
        startTime: string;
        endTime: string;
        selectedWorkItemId?: string;
    };

    const unlinkedEventsColumns: TableColumnDefinition<UnlinkedEventRow>[] = [
        createTableColumn<UnlinkedEventRow>({
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.eventName}
                </TableCellLayout>
            ),
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.startTime}
                </TableCellLayout>
            ),
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.endTime}
                </TableCellLayout>
            ),
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "workItem",
            renderHeaderCell: () => "作業項目を選択",
            renderCell: (item) => {
                const selectedWorkItemId = item.selectedWorkItemId;
                const selectedWorkItem = workItems.find(w => w.id === selectedWorkItemId);
                
                return (
                    <TableCellLayout>
                        <Dropdown
                            placeholder="作業項目を選択..."
                            value={selectedWorkItem?.name || ""}
                            selectedOptions={selectedWorkItemId ? [selectedWorkItemId] : []}
                            onOptionSelect={(_, data) => {
                                if (data.optionValue) {
                                    handleWorkItemSelect(item.id, data.optionValue);
                                }
                            }}
                        >
                            {workItems.map(workItem => (
                                <Option key={workItem.id} value={workItem.id}>
                                    {workItem.name}
                                </Option>
                            ))}
                        </Dropdown>
                    </TableCellLayout>
                );
            },
        }),
    ];

    // 未紐付けイベントのデータ変換
    const unlinkedEventsRows = useMemo<UnlinkedEventRow[]>(() => {
        if (!linkingResult) return [];
        
        return linkingResult.unlinked.map(event => ({
            id: event.uuid,
            eventName: event.name || "無題",
            startTime: new Date(event.schedule.start).toLocaleString("ja-JP"),
            endTime: event.schedule.end
                ? new Date(event.schedule.end).toLocaleString("ja-JP")
                : "-",
            selectedWorkItemId: selectedWorkItems.get(event.uuid),
        }));
    }, [linkingResult, selectedWorkItems]);

    // WorkItemリストの取得
    const workItems = useMemo(() => {
        return uploadInfo?.workItems || [];
    }, [uploadInfo]);

    // 手動紐付けハンドラー
    const handleWorkItemSelect = async (eventId: string, workItemId: string) => {
        if (!linkingResult) return;

        // 選択状態を更新
        setSelectedWorkItems(prev => {
            const newMap = new Map(prev);
            newMap.set(eventId, workItemId);
            return newMap;
        });

        // イベントとWorkItemを取得
        const event = linkingResult.unlinked.find(e => e.uuid === eventId);
        const workItem = workItems.find(w => w.id === workItemId);

        if (!event || !workItem) return;

        // 手動紐付けペアを追加
        const newPair: EventWorkItemPair = { event, workItem };
        setManuallyLinkedPairs(prev => [...prev, newPair]);

        // 履歴に保存
        try {
            const historyManager = new HistoryManager();
            historyManager.setHistory(event, workItem);
            historyManager.dump();
            logger.info(`手動紐付けを履歴に保存しました: ${event.name} -> ${workItem.name}`);
        } catch (error) {
            logger.error("履歴保存エラー:", error);
        }

        // linkingResultから該当イベントを削除し、linkedに追加
        setLinkingResult(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                linked: [...prev.linked, newPair],
                unlinked: prev.unlinked.filter(e => e.uuid !== eventId),
            };
        });

        appMessageDialogRef.showMessageAsync(
            "紐付け完了",
            `「${event.name}」を「${workItem.name}」に紐付けました`,
            "INFO"
        );
    };

    // 自動紐付け処理
    useEffect(() => {
        const performAutoLinking = async () => {
            // イベントとスケジュールの存在チェック
            const hasEvents = uploadInfo?.ics?.event && uploadInfo.ics.event.length > 0;
            const hasSchedules = uploadInfo?.pdf?.schedule && uploadInfo.pdf.schedule.length > 0;

            if (!hasEvents && !hasSchedules) {
                logger.warn("イベントもスケジュールも存在しません");
                return;
            }

            if (!settings.timetracker) {
                logger.warn("TimeTracker設定が未設定です");
                return;
            }

            setIsLoading(true);
            try {
                logger.info("自動紐付け開始");

                // 無視リストを適用
                const ignorableEvents = settings.timetracker.ignorableEvents || [];
                const enableEvents = hasEvents 
                    ? getEnableEvents(uploadInfo.ics!.event, ignorableEvents)
                    : [];
                logger.debug(`有効なイベント数: ${enableEvents.length}`);

                // スケジュールを取得
                const allSchedules = uploadInfo.pdf?.schedule || [];

                // 有効なスケジュール（休日・エラーを除く）を取得
                const enableSchedules = getEnableSchedules(allSchedules);
                logger.debug(`有効なスケジュール数: ${enableSchedules.length}`);

                // Project情報とWorkItem一覧をuploadInfoから取得
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

                // ★1日ごとのタスク分割を実行（algorithm.ts使用）
                logger.info("日ごとのタスク分割を開始");
                const dayTasksResult = splitEventsByDay(enableEvents, enableSchedules, project, settings.timetracker);
                logger.info(`分割結果: ${dayTasksResult.length}日分のタスク`);

                // ★有給休暇の日別タスクを生成
                const paidLeaveSchedules = getPaidLeaveSchedules(allSchedules);
                const paidLeaveDayTasks = createPaidLeaveDayTasks(
                    paidLeaveSchedules,
                    settings.timetracker,
                    project,
                    workItems,
                );
                logger.info(`有給休暇タスク: ${paidLeaveDayTasks.length}日分`);

                // 通常のタスクと有給休暇タスクを結合
                const allDayTasks = [...paidLeaveDayTasks, ...dayTasksResult];
                allDayTasks.sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());
                setDayTasks(allDayTasks);

                // 分割後のイベントを抽出（有給休暇を含む）
                const processedEvents = allDayTasks.flatMap((dayTask) => dayTask.events);
                logger.debug(`分割後のイベント数（有給休暇含む）: ${processedEvents.length}`);

                // HistoryManagerのインスタンスを作成
                const historyManager = new HistoryManager();
                historyManager.load();

                // 自動紐付けを実行（分割後のイベントを使用）
                const result = autoLinkEvents(processedEvents, workItems, settings.timetracker, historyManager);

                setLinkingResult(result);

                // 結果をユーザーに通知（統計情報を表示）
                if (result.linked.length > 0 || result.unlinked.length > 0) {
                    await appMessageDialogRef?.showMessageAsync(
                        "自動紐付け完了",
                        `紐づけ処理が完了しました:\n\n` +
                            `✅ 紐づけ済み: ${result.linked.length}件\n` +
                            `   • 休暇イベント: ${result.timeOffCount}件\n` +
                            `   • 履歴から: ${result.historyCount}件\n\n` +
                            `${result.unlinked.length > 0 ? `❌ 未紐づけ: ${result.unlinked.length}件\n（手動で紐づけしてください）` : ""}`,
                        result.unlinked.length > 0 ? "WARN" : "INFO",
                    );
                }

                logger.info(`自動紐付け完了: 紐付け済み=${result.linked.length}, 未紐付け=${result.unlinked.length}`);
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

        performAutoLinking();
    }, [uploadInfo, settings.timetracker, setIsLoading]);

    const handleSubmit = () => {
        // TODO: Task 4 - 全イベントが紐づけられているかチェック
        if (stats.unlinkedCount > 0) {
            appMessageDialogRef.showMessageAsync(
                "未紐づけイベントがあります",
                `${stats.unlinkedCount}件のイベントがまだ紐づけられていません。\n全てのイベントを紐づけてから次へ進んでください。`,
                "WARN"
            );
            return;
        }

        // CompletionViewへ遷移（dayTasksを渡す）
        if (onSubmit && dayTasks.length > 0) {
            logger.info(`CompletionViewへ遷移: ${dayTasks.length}日分のタスクを渡します`);
            onSubmit(dayTasks);
        }
    };

    return (
        <>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <PageHeader onBack={onBack} breadcrumbs={["TimeTracker", "紐づけ処理"]} />
                </div>
                <Button
                    appearance="secondary"
                    icon={<History24Regular />}
                    onClick={() => setIsDrawerOpen(true)}
                    className={styles.historyButton}
                >
                    履歴
                </Button>
            </div>

            <div className={styles.section}>
                <Card className={styles.infoCard}>
                    <div className={styles.infoContent}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📄</span>
                            <span className={styles.infoLabel}>勤怠情報:</span>
                            <span>{uploadInfo?.pdf?.name || "未選択"}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📅</span>
                            <span className={styles.infoLabel}>スケジュール情報:</span>
                            <span>{uploadInfo?.ics?.name || "未選択"}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 統計表示カード */}
            {linkingResult && (
                <div className={styles.section}>
                    <InteractiveCard
                        title="📊 自動紐づけ結果"
                        description="イベントとWorkItemの紐づけ状況"
                        variant="expandable"
                        defaultExpanded={true}
                    >
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>✅ 紐づけ済み</span>
                                <span className={`${styles.statValue} ${styles.statValueSuccess}`}>
                                    {stats.totalLinked}件
                                </span>
                                <span className={styles.statSubText}>
                                    休暇: {stats.timeOffCount}件 / 履歴: {stats.historyCount}件
                                    {stats.manualCount > 0 && ` / 手動: ${stats.manualCount}件`}
                                </span>
                            </div>

                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>❌ 未紐づけ</span>
                                <span className={`${styles.statValue} ${stats.unlinkedCount > 0 ? styles.statValueWarning : ""}`}>
                                    {stats.unlinkedCount}件
                                </span>
                                <span className={styles.statSubText}>
                                    {stats.unlinkedCount > 0 ? "手動で紐づけしてください" : "すべて紐づけ完了"}
                                </span>
                            </div>

                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>📅 有給休暇タスク</span>
                                <span className={styles.statValue}>{stats.paidLeaveDays}日分</span>
                            </div>

                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>📅 通常タスク</span>
                                <span className={styles.statValue}>{stats.totalDays}日分</span>
                                <span className={styles.statSubText}>
                                    合計イベント数: {stats.linkedCount + stats.unlinkedCount}件
                                </span>
                            </div>
                        </div>
                    </InteractiveCard>
                </div>
            )}

            {/* 紐付け済みイベント一覧テーブル (Task 2) */}
            {linkingResult && linkedEventsRows.length > 0 && (
                <div className={styles.tableContainer}>
                    <InteractiveCard
                        title="✅ 紐付け済みイベント一覧"
                        defaultExpanded={true}
                    >
                        <DataGrid
                            items={linkedEventsRows}
                            columns={linkedEventsColumns}
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
                            <DataGridBody<LinkedEventRow>>
                                {({ item, rowId }) => (
                                    <DataGridRow<LinkedEventRow> key={rowId}>
                                        {({ renderCell }) => (
                                            <DataGridCell>{renderCell(item)}</DataGridCell>
                                        )}
                                    </DataGridRow>
                                )}
                            </DataGridBody>
                        </DataGrid>
                    </InteractiveCard>
                </div>
            )}
            
            {/* 未紐付けイベント一覧テーブル (Task 3) */}
            {linkingResult && unlinkedEventsRows.length > 0 && (
                <div className={styles.tableContainer}>
                    <InteractiveCard
                        title="❌ 未紐付けイベント一覧"
                        defaultExpanded={true}
                    >
                        <div style={{ 
                            marginBottom: "16px",
                            fontSize: "13px",
                            color: tokens.colorNeutralForeground3 
                        }}>
                            以下のイベントは自動紐付けできませんでした。
                            作業項目を手動で選択してください。
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
                                        {({ renderCell }) => (
                                            <DataGridCell>{renderCell(item)}</DataGridCell>
                                        )}
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

            {/* TODO: 履歴機能は将来実装 */}
            <Drawer
                type="overlay"
                position="end"
                open={isDrawerOpen}
                onOpenChange={(_, { open }) => setIsDrawerOpen(open)}
                className={styles.drawer}
            >
                <DrawerHeader>
                    <DrawerHeaderTitle
                        action={
                            <Button
                                appearance="subtle"
                                aria-label="閉じる"
                                icon={<Dismiss24Regular />}
                                onClick={() => setIsDrawerOpen(false)}
                            />
                        }
                    >
                        処理履歴
                    </DrawerHeaderTitle>
                </DrawerHeader>

                <DrawerBody>
                    <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                        処理履歴機能は開発中です
                    </div>
                </DrawerBody>
            </Drawer>
        </>
    );
}
