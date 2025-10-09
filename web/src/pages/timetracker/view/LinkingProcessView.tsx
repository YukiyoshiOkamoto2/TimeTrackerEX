import { DataTable } from "@/components/data-table";
import { InteractiveCard } from "@/components/interactive-card";
import { appMessageDialogRef, MessageLevel } from "@/components/message-dialog";
import { getLogger } from "@/lib/logger";
import { useSettings } from "@/store";
import type { Event, Project, Schedule, TimeTrackerSettings, WorkItem } from "@/types";
import { getMostNestChildren } from "@/types/utils";
import {
    Button,
    Input,
    makeStyles,
    Switch,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    tokens,
    Combobox,
    Option,
} from "@fluentui/react-components";
import { 
    Sparkle24Regular, 
    Key24Regular, 
    History24Regular,
    Calendar20Regular,
    CircleSmall20Filled,
    Checkmark20Filled,
    Warning20Filled,
    Bot20Regular,
    PersonEdit20Regular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { PageHeader } from "../components/PageHeader";
import { StatisticsCards } from "../components/StatisticsCards";
import { UploadInfo } from "../models";
import { AutoLinkingResult, ExcludedEventInfo, LinkingEventWorkItemPair } from "../models/linking";
import { calculateLinkingStatistics, performAutoLinking } from "../services/logic";
import { ViewHeader, ViewSection } from "../components/ViewLayout";


const logger = getLogger("LinkingProcessView");

// イベントテーブル用の型定義
type EventTableRow = {
    id: string;
    event: Event;
    workItemId: string;
    workItemName: string;
    inputType: string;
};

// テーブル列定義を関数内に移動（stylesを使用するため）
function createEventColumns(
    styles: ReturnType<typeof useStyles>,
    workItems: WorkItem[],
    onWorkItemChange: (eventId: string, workItemId: string) => void,
): TableColumnDefinition<EventTableRow>[] {
    // 最下層のWorkItemを取得
    const workItemOptions = workItems.flatMap((w) => getMostNestChildren(w));

    return [
        createTableColumn<EventTableRow>({
            columnId: "dateTime",
            compare: (a, b) => a.event.schedule.start.getTime() - b.event.schedule.start.getTime(),
            renderHeaderCell: () => "日時",
            renderCell: (item) => (
                <TableCellLayout>
                    <div className={styles.dateTimeCell}>
                        <Calendar20Regular />
                        <div>
                            {item.event.schedule.start.toLocaleDateString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                                weekday: "short",
                            })}{" "}
                            {item.event.schedule.start.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            ~
                            {item.event.schedule.end?.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </TableCellLayout>
            ),
        }),
        createTableColumn<EventTableRow>({
            columnId: "eventName",
            compare: (a, b) => a.event.name.localeCompare(b.event.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => (
                <TableCellLayout>
                    <div className={styles.eventNameCell}>{item.event.name}</div>
                </TableCellLayout>
            ),
        }),
        createTableColumn<EventTableRow>({
            columnId: "inputType",
            compare: (a, b) => a.inputType.localeCompare(b.inputType),
            renderHeaderCell: () => "入力依存",
            renderCell: (item) => {
                const isAuto = item.inputType !== "手動入力" && item.inputType !== "-";
                const isManual = item.inputType === "手動入力";
                const badgeClass = isAuto
                    ? styles.badgeAuto
                    : isManual
                      ? styles.badgeManual
                      : styles.badgeUnlinked;

                return (
                    <TableCellLayout>
                        <span className={`${styles.inputTypeBadge} ${badgeClass}`}>
                            {isAuto ? <Bot20Regular /> : isManual ? <PersonEdit20Regular /> : <CircleSmall20Filled />}
                            {item.inputType}
                        </span>
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<EventTableRow>({
            columnId: "workItemId",
            compare: (a, b) => a.workItemId.localeCompare(b.workItemId),
            renderHeaderCell: () => "WorkItemId",
            renderCell: (item) => {
                const selectedOption = workItemOptions.find((w) => w.id === item.workItemId);
                
                return (
                    <TableCellLayout>
                        <Combobox
                            placeholder="WorkItemを選択"
                            value={selectedOption ? `${selectedOption.id} - ${selectedOption.name}` : ""}
                            selectedOptions={item.workItemId ? [item.workItemId] : []}
                            onOptionSelect={(_, data) => {
                                if (data.optionValue) {
                                    onWorkItemChange(item.id, data.optionValue);
                                }
                            }}
                            style={{ minWidth: "200px" }}
                        >
                            {workItemOptions.map((workItem) => (
                                <Option key={workItem.id} value={workItem.id} text={`${workItem.id} - ${workItem.name}`}>
                                    <div className={styles.workItemCell}>
                                        <Checkmark20Filled className={styles.linkedIcon} />
                                        {workItem.id} - {workItem.name}
                                    </div>
                                </Option>
                            ))}
                        </Combobox>
                    </TableCellLayout>
                );
            },
        }),
        createTableColumn<EventTableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "WorkItem名",
            renderCell: (item) => (
                <TableCellLayout>
                    <div
                        style={{
                            color: item.workItemName === "未紐づけ" ? tokens.colorNeutralForeground3 : undefined,
                            fontWeight: item.workItemName === "未紐づけ" ? undefined : tokens.fontWeightSemibold,
                        }}
                    >
                        {item.workItemName}
                    </div>
                </TableCellLayout>
            ),
        }),
    ];
}

const useStyles = makeStyles({
    aiSection: {
        marginBottom: tokens.spacingVerticalS,
    },
    settingRow: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottom: "none",
        },
    },
    settingInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        flex: 1,
    },
    settingTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    settingDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: "1.3",
    },
    settingControl: {
        display: "flex",
        alignItems: "center",
        marginLeft: tokens.spacingHorizontalL,
    },
    settingIcon: {
        fontSize: "18px",
        color: tokens.colorBrandForeground1,
    },
    tokenInput: {
        minWidth: "300px",
    },
    tableWrapper: {
        marginTop: tokens.spacingVerticalM,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 520px)",
        minHeight: "300px",
    },
    tableContainer: {
        flex: 1,
        overflow: "auto",
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    submitButtonContainer: {
        marginTop: tokens.spacingVerticalS,
        paddingTop: tokens.spacingVerticalS,
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: tokens.colorNeutralStroke2,
        display: "flex",
        justifyContent: "flex-end",
    },
    submitButton: {
        minWidth: "200px",
        height: "48px",
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        boxShadow: tokens.shadow8,
        backgroundColor: tokens.colorBrandBackground,
        "&:hover": {
            boxShadow: tokens.shadow16,
            backgroundColor: tokens.colorBrandBackgroundHover,
        },
    },
    historyButton: {
        minWidth: "100px",
    },
    // テーブルセルのスタイル
    dateTimeCell: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        fontSize: tokens.fontSizeBase200,
    },
    eventNameCell: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    inputTypeBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: tokens.borderRadiusSmall,
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
    },
    badgeAuto: {
        backgroundColor: tokens.colorPaletteBlueBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeManual: {
        backgroundColor: tokens.colorPaletteGreenBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    badgeUnlinked: {
        backgroundColor: tokens.colorNeutralBackground5,
        color: tokens.colorNeutralForeground3,
    },
    workItemCell: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    linkedIcon: {
        color: tokens.colorPaletteGreenForeground2,
        fontSize: "16px",
    },
    unlinkedIcon: {
        color: tokens.colorPaletteYellowForeground2,
        fontSize: "16px",
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

    // WorkItemの変更ハンドラー
    const handleWorkItemChange = (eventId: string, workItemId: string) => {
        const workItems = uploadInfo?.workItems || [];
        const allWorkItems = workItems.flatMap((w) => getMostNestChildren(w));
        const selectedWorkItem = allWorkItems.find((w) => w.id === workItemId);

        if (!selectedWorkItem) return;

        // eventIdから実際のイベントを取得
        const eventIndex = linkingEventWorkItemPair.findIndex((pair, idx) => `linked-${idx}` === eventId);
        
        if (eventIndex >= 0) {
            // 既存の紐づけを更新
            const updatedPairs = [...linkingEventWorkItemPair];
            updatedPairs[eventIndex] = {
                ...updatedPairs[eventIndex],
                linkingWorkItem: {
                    workItem: selectedWorkItem,
                    type: "manual",
                },
            };
            setLinkingEventWorkItemPair(updatedPairs);
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
                        },
                    },
                ]);
                setUnlinkedEvents(unlinkedEvents.filter((_, idx) => idx !== unlinkedIndex));
            }
        }
    };

    // テーブル列定義を生成
    const eventColumns = useMemo(
        () => createEventColumns(styles, uploadInfo?.workItems || [], handleWorkItemChange),
        [styles, uploadInfo?.workItems, linkingEventWorkItemPair, unlinkedEvents],
    );

    // 統計データの計算
    const taskStatistics = useMemo(() => {
        return calculateLinkingStatistics(unlinkedEvents, linkingEventWorkItemPair, excludedEvents);
    }, [unlinkedEvents, linkingEventWorkItemPair, excludedEvents]);

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
                        className={styles.historyButton}
                    >
                        履歴
                    </Button>
                }
            />

            <ViewSection>
                {/* サマリーカード */}
                <StatisticsCards taskStatistics={taskStatistics} />

                {/* AIによる自動紐づけセクション */}
                <div className={styles.aiSection}>
                    <InteractiveCard
                        title="AIによる自動紐づけ"
                        description="AIを使用して未紐づけのイベントを自動的にWorkItemに紐づけます"
                        icon={<Sparkle24Regular />}
                        variant="expandable"
                    >
                        {/* トークン設定 */}
                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingTitle}>
                                    <Key24Regular className={styles.settingIcon} />
                                    APIトークン
                                </div>
                                <div className={styles.settingDescription}>
                                    OpenAI APIトークンを入力してください。AIによる自動紐づけに使用されます。
                                </div>
                            </div>
                            <div className={styles.settingControl}>
                                <Input
                                    placeholder="トークンを入力"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className={styles.tokenInput}
                                />
                            </div>
                        </div>

                        {/* 履歴の参照設定 */}
                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingTitle}>
                                    <History24Regular className={styles.settingIcon} />
                                    履歴の参照
                                </div>
                                <div className={styles.settingDescription}>
                                    過去の紐づけ履歴を参照してAIの精度を向上させます。履歴データが使用されます。
                                </div>
                            </div>
                            <div className={styles.settingControl}>
                                <Switch checked={useHistory} onChange={(e) => setUseHistory(e.currentTarget.checked)} />
                            </div>
                        </div>
                    </InteractiveCard>
                </div>

                {/* イベントテーブル */}
                <div className={styles.tableWrapper}>
                    <div className={styles.tableContainer}>
                        <DataTable
                            items={allEvents}
                            columns={eventColumns}
                            getRowId={(item) => item.id}
                            sortable
                        />
                    </div>
                </div>

                {/* 登録実行ボタン */}
                <div className={styles.submitButtonContainer}>
                    <Button
                        appearance="primary"
                        size="large"
                        className={styles.submitButton}
                        onClick={handleSubmit}
                        icon={<Sparkle24Regular />}
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
