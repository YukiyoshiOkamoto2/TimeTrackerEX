import { appMessageDialogRef } from "@/components/message-dialog";
import {
    Button,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    Input,
    makeStyles,
    Switch,
    tokens,
} from "@fluentui/react-components";
import {
    CheckmarkCircle24Regular,
    Dismiss24Regular,
    DocumentBulletList24Regular,
    History24Regular,
    Settings24Regular,
    Sparkle24Regular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { InteractiveCard } from "@/components/interactive-card";
import type { AutoLinkingResult, UploadInfo } from "../models";
import { PageHeader } from "../components/PageHeader";
import { ItemCodeOption, ScheduleItem, ScheduleTable } from "../components/index";
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
import type { DayTask, Event, EventWorkItemPair, Project, WorkItem } from "@/types";

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
});

export type LinkingProcessViewProps = {
    uploadInfo?: UploadInfo;
    setIsLoading: (isLoading: boolean) => void;
    onBack: () => void;
    onSubmit?: (schedules: ScheduleItem[]) => void;
};

// Mock history data
const historyData = [
    {
        time: "2025年10月4日 14:30",
        action: "自動紐づけ実行",
        details: "59件のスケジュールを処理完了",
    },
    {
        time: "2025年10月3日 16:45",
        action: "手動紐づけ",
        details: "15件のスケジュールを手動で紐づけ",
    },
    {
        time: "2025年10月2日 10:20",
        action: "自動紐づけ実行",
        details: "42件のスケジュールを処理完了",
    },
    {
        time: "2025年10月1日 09:15",
        action: "詳細設定変更",
        details: "マッチング精度を80%に設定",
    },
];

// Mock item code options
const itemCodeOptions: ItemCodeOption[] = [
    { code: "001", name: "会議" },
    { code: "002", name: "開発作業" },
    { code: "003", name: "レビュー" },
    { code: "004", name: "打ち合わせ" },
    { code: "005", name: "調査" },
];

// Mock schedule data
const schedules: ScheduleItem[] = [
    { date: "10月20日", time: "10:00 30分", name: "スケジュール名", organizer: "a" },
    { date: "10月21日", time: "10:00 30分", name: "スケジュール名", organizer: "b" },
    { date: "10月22日", time: "10:00 30分", name: "スケジュール名", organizer: "c" },
    { date: "10月23日", time: "10:00 30分", name: "スケジュール名", organizer: "d" },
];

export function LinkingProcessView({ uploadInfo, onBack, onSubmit, setIsLoading }: LinkingProcessViewProps) {
    const styles = useStyles();
    const { settings } = useSettings();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [option1Value, setOption1Value] = useState("");
    const [option2Enabled, setOption2Enabled] = useState(true);
    const [currentSchedules, setCurrentSchedules] = useState<ScheduleItem[]>(schedules);
    
    // 自動紐付け結果の状態
    const [linkingResult, setLinkingResult] = useState<AutoLinkingResult | null>(null);
    const [linkedPairs, setLinkedPairs] = useState<EventWorkItemPair[]>([]);
    const [unlinkedEvents, setUnlinkedEvents] = useState<Event[]>([]);

    // 日ごとのタスク分割結果の状態
    const [dayTasks, setDayTasks] = useState<DayTask[]>([]);

    // 自動紐付け処理
    useEffect(() => {
        const performAutoLinking = async () => {
            if (!uploadInfo?.ics?.event || uploadInfo.ics.event.length === 0) {
                logger.debug("イベントが存在しないため自動紐付けをスキップ");
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
                const enableEvents = getEnableEvents(uploadInfo.ics.event, ignorableEvents);
                logger.debug(`有効なイベント数: ${enableEvents.length}`);

                // スケジュールを取得
                const allSchedules = uploadInfo.pdf?.schedule || [];

                // 有効なスケジュール（休日・エラーを除く）を取得
                const enableSchedules = getEnableSchedules(allSchedules);
                logger.debug(`有効なスケジュール数: ${enableSchedules.length}`);

                // TODO: Project情報とWorkItem一覧を取得（現在はモック）
                const project: Project = {
                    id: "1",
                    name: "Mock Project",
                    projectId: "MOCK001",
                    projectName: "Mock Project",
                    projectCode: "MOCK",
                };
                const workItems: WorkItem[] = [];

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
                setLinkedPairs(result.linked);
                setUnlinkedEvents(result.unlinked);

                // 結果をユーザーに通知
                if (result.timeOffCount > 0 || result.historyCount > 0) {
                    await appMessageDialogRef?.showMessageAsync(
                        "自動紐付け完了",
                        `以下のイベントを自動的に紐付けました:\n\n` +
                            `・休暇イベント: ${result.timeOffCount}件\n` +
                            `・履歴から: ${result.historyCount}件\n` +
                            `・未紐付け: ${result.unlinked.length}件`,
                        "INFO",
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

    const handleScheduleChange = (updatedSchedules: ScheduleItem[]) => {
        setCurrentSchedules(updatedSchedules);
    };

    const handleApplyAI = async () => {
        setIsLoading(true);
        await appMessageDialogRef.showMessageAsync("AI", "AI", "WARN");
        setIsLoading(false);
    };

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(currentSchedules);
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

            <div className={styles.section}>
                <InteractiveCard
                    title="✨ AIによる自動紐づけ"
                    description="スケジュールとItemコードを自動的にマッチング"
                    variant="expandable"
                    defaultExpanded={false}
                >
                    <div className={styles.optionRow}>
                        <span className={styles.optionLabel}>
                            <Sparkle24Regular className={styles.optionIcon} />
                            オプション 1
                        </span>
                        <div className={styles.optionControl}>
                            <Input
                                placeholder="入力"
                                value={option1Value}
                                onChange={(e) => setOption1Value(e.target.value)}
                                className={styles.optionInput}
                            />
                        </div>
                    </div>
                    <div className={styles.optionRow}>
                        <span className={styles.optionLabel}>
                            <Settings24Regular className={styles.optionIcon} />
                            オプション 2
                        </span>
                        <div className={styles.optionControl}>
                            <Switch checked={option2Enabled} onChange={(_, data) => setOption2Enabled(data.checked)} />
                        </div>
                    </div>
                    <div className={styles.autoLinkButtonContainer}>
                        <Button
                            appearance="primary"
                            icon={<Sparkle24Regular />}
                            className={styles.autoLinkButton}
                            onClick={handleApplyAI}
                        >
                            適用
                        </Button>
                    </div>
                </InteractiveCard>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>
                    <DocumentBulletList24Regular className={styles.scheduleIcon} />
                    スケジュール一覧
                </div>

                <ScheduleTable
                    schedules={currentSchedules}
                    itemCodeOptions={itemCodeOptions}
                    itemCodeMode="editable"
                    onScheduleChange={handleScheduleChange}
                />
            </div>

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
                    {historyData.map((item, index) => (
                        <div key={index} className={styles.historyItem}>
                            <div className={styles.historyTime}>{item.time}</div>
                            <div className={styles.historyAction}>{item.action}</div>
                            <div className={styles.historyDetails}>{item.details}</div>
                        </div>
                    ))}
                </DrawerBody>
            </Drawer>
        </>
    );
}
