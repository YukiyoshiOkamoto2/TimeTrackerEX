import { Card } from "@/components/card";
import { InteractiveCard } from "@/components/interactive-card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { HistoryManager } from "@/core/history";
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
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Dropdown,
    Option,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    Calendar24Regular,
    CalendarLtr24Regular,
    Checkmark24Filled,
    CheckmarkCircle24Filled,
    CheckmarkCircle24Regular,
    Delete24Regular,
    History24Regular,
    Link24Regular,
    Warning24Filled,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { PageHeader } from "../components/PageHeader";
import type { AutoLinkingResult, UploadInfo } from "../models";
import { calculateLinkingStatistics, createAutoLinkingResultMessage, performAutoLinking } from "../services";
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
    statsSection: {
        width: "100%",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginTop: "16px",
    },
    statCard: {
        padding: "20px",
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
        },
    },
    statCardInfo: {
        padding: "20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorBrandBackground,
    },
    statCardSuccess: {
        padding: "20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteGreenBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorPaletteGreenBackground1,
        },
    },
    statCardWarning: {
        padding: "20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteYellowBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorPaletteYellowBackground1,
        },
    },
    statCardError: {
        padding: "20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteRedBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorPaletteRedBackground1,
        },
    },
    statCardNeutral: {
        padding: "20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorNeutralStroke1,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorNeutralBackground2,
        },
    },
    statCardContent: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    statCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "4px",
    },
    statIcon: {
        fontSize: "24px",
        display: "flex",
        alignItems: "center",
    },
    statIconInfo: {
        color: tokens.colorBrandForeground1,
    },
    statIconSuccess: {
        color: tokens.colorPaletteGreenForeground2,
    },
    statIconWarning: {
        color: tokens.colorPaletteYellowForeground2,
    },
    statIconError: {
        color: tokens.colorPaletteRedForeground2,
    },
    statIconNeutral: {
        color: tokens.colorNeutralForeground3,
    },
    statLabel: {
        fontSize: "13px",
        color: tokens.colorNeutralForeground2,
        fontWeight: "500",
        flex: 1,
    },
    statValue: {
        fontSize: "32px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "600",
        lineHeight: "1.2",
    },
    statDate: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginTop: "4px",
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
    // ダイアログ用スタイル
    dialogContent: {
        minHeight: "300px",
        maxHeight: "500px",
        overflowY: "auto",
    },
    dialogDescription: {
        marginBottom: "16px",
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
    },
    dialogStats: {
        display: "flex",
        gap: "16px",
        marginBottom: "16px",
        padding: "12px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    dialogStatItem: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    dialogStatLabel: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
    },
    dialogStatValue: {
        fontSize: "20px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
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
    type DetailDialogType = "paidLeave" | "targetEvents" | "deleteEvents" | "linked" | "unlinked" | null;
    const [detailDialogType, setDetailDialogType] = useState<DetailDialogType>(null);

    // 統計データの計算
    const stats = useMemo(() => {
        const allSchedules = uploadInfo?.pdf?.schedule || [];
        return calculateLinkingStatistics(linkingResult, manuallyLinkedPairs, allSchedules, dayTasks);
    }, [linkingResult, manuallyLinkedPairs, uploadInfo, dayTasks]);

    // 有給休暇の詳細データ
    type PaidLeaveRow = {
        id: string;
        date: string;
        dayOfWeek: string;
    };

    const paidLeaveRows = useMemo<PaidLeaveRow[]>(() => {
        return (uploadInfo?.pdf?.schedule || [])
            .filter((s) => s.isPaidLeave)
            .map((s, index) => {
                const date = new Date(s.start);
                const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
                return {
                    id: `paid-${index}`,
                    date: date.toLocaleDateString("ja-JP"),
                    dayOfWeek: `(${dayOfWeek})`,
                };
            });
    }, [uploadInfo]);

    // 対象イベントの詳細データ
    type TargetEventRow = {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        status: string;
    };

    const targetEventRows = useMemo<TargetEventRow[]>(() => {
        if (!linkingResult) return [];

        const allEvents = [
            ...linkingResult.linked.map((pair) => ({ ...pair.event, status: "紐づけ済み" })),
            ...linkingResult.unlinked.map((event) => ({ ...event, status: "未紐づけ" })),
        ];

        return allEvents.map((event) => ({
            id: event.uuid,
            name: event.name || "無題",
            startTime: new Date(event.schedule.start).toLocaleString("ja-JP", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            endTime: event.schedule.end
                ? new Date(event.schedule.end).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : "-",
            status: event.status,
        }));
    }, [linkingResult]);

    // ダイアログ用のテーブル列定義
    const paidLeaveColumns: TableColumnDefinition<PaidLeaveRow>[] = [
        createTableColumn<PaidLeaveRow>({
            columnId: "date",
            renderHeaderCell: () => "日付",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.date} {item.dayOfWeek}
                </TableCellLayout>
            ),
        }),
    ];

    const targetEventColumns: TableColumnDefinition<TargetEventRow>[] = [
        createTableColumn<TargetEventRow>({
            columnId: "name",
            compare: (a, b) => a.name.localeCompare(b.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "status",
            compare: (a, b) => a.status.localeCompare(b.status),
            renderHeaderCell: () => "ステータス",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.status === "紐づけ済み" ? "✅ " : "❌ "}
                    {item.status}
                </TableCellLayout>
            ),
        }),
    ];

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
            renderCell: (item) => <TableCellLayout>{item.eventName}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "作業項目",
            renderCell: (item) => <TableCellLayout>{item.workItemName}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "source",
            compare: (a, b) => a.source.localeCompare(b.source),
            renderHeaderCell: () => "紐付けソース",
            renderCell: (item) => <TableCellLayout media={<Link24Regular />}>{item.source}</TableCellLayout>,
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
                endTime: pair.event.schedule.end ? new Date(pair.event.schedule.end).toLocaleString("ja-JP") : "-",
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
                endTime: pair.event.schedule.end ? new Date(pair.event.schedule.end).toLocaleString("ja-JP") : "-",
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
            renderCell: (item) => <TableCellLayout>{item.eventName}</TableCellLayout>,
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "workItem",
            renderHeaderCell: () => "作業項目を選択",
            renderCell: (item) => {
                const selectedWorkItemId = item.selectedWorkItemId;
                const selectedWorkItem = workItems.find((w) => w.id === selectedWorkItemId);

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
                            {workItems.map((workItem) => (
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

    // 除外されたイベントのカラム定義
    const excludedEventsColumns: TableColumnDefinition<ExcludedEventRow>[] = [
        createTableColumn<ExcludedEventRow>({
            columnId: "name",
            compare: (a, b) => a.name.localeCompare(b.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "reason",
            compare: (a, b) => a.reason.localeCompare(b.reason),
            renderHeaderCell: () => "除外理由",
            renderCell: (item) => <TableCellLayout>{item.reason}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "reasonDetail",
            compare: (a, b) => a.reasonDetail.localeCompare(b.reasonDetail),
            renderHeaderCell: () => "詳細",
            renderCell: (item) => <TableCellLayout>{item.reasonDetail}</TableCellLayout>,
        }),
    ];

    // 未紐付けイベントのデータ変換
    const unlinkedEventsRows = useMemo<UnlinkedEventRow[]>(() => {
        if (!linkingResult) return [];

        return linkingResult.unlinked.map((event) => ({
            id: event.uuid,
            eventName: event.name || "無題",
            startTime: new Date(event.schedule.start).toLocaleString("ja-JP"),
            endTime: event.schedule.end ? new Date(event.schedule.end).toLocaleString("ja-JP") : "-",
            selectedWorkItemId: selectedWorkItems.get(event.uuid),
        }));
    }, [linkingResult, selectedWorkItems]);

    // 除外されたイベントの詳細データ
    type ExcludedEventRow = {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        reason: string;
        reasonDetail: string;
    };

    const excludedEventRows = useMemo<ExcludedEventRow[]>(() => {
        if (!linkingResult) return [];

        return linkingResult.excluded.map((info) => ({
            id: info.event.uuid,
            name: info.event.name || "無題",
            startTime: new Date(info.event.schedule.start).toLocaleString("ja-JP", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            endTime: info.event.schedule.end
                ? new Date(info.event.schedule.end).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : "-",
            reason: info.reason === "ignored" ? "無視" : info.reason === "outOfSchedule" ? "勤務日範囲外" : "不正",
            reasonDetail: info.reasonDetail || "",
        }));
    }, [linkingResult]);

    // 除外されたイベントの統計
    const excludedStats = useMemo(() => {
        if (!linkingResult) return { ignored: 0, outOfSchedule: 0, invalid: 0 };

        const stats = linkingResult.excluded.reduce(
            (acc, info) => {
                if (info.reason === "ignored") acc.ignored++;
                else if (info.reason === "outOfSchedule") acc.outOfSchedule++;
                else if (info.reason === "invalid") acc.invalid++;
                return acc;
            },
            { ignored: 0, outOfSchedule: 0, invalid: 0 },
        );

        return stats;
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

        // イベントとWorkItemを取得
        const event = linkingResult.unlinked.find((e) => e.uuid === eventId);
        const workItem = workItems.find((w) => w.id === workItemId);

        if (!event || !workItem) return;

        // 手動紐付けペアを追加
        const newPair: EventWorkItemPair = { event, workItem };
        setManuallyLinkedPairs((prev) => [...prev, newPair]);

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

    // 自動紐付け処理
    useEffect(() => {
        const runAutoLinking = async () => {
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
            logger.info(
                `CompletionViewへ遷移: ${dayTasks.length}日分のタスクを渡します（未紐づけ: ${stats.unlinkedCount}件）`,
            );
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
                    <div className={styles.statsSection}>
                        <h3 className={styles.sectionTitle}>自動紐づけ結果</h3>
                        <div className={styles.statsGrid}>
                            {/* 対象日数 */}
                            <Card className={styles.statCardInfo}>
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
                                            <Calendar24Regular />
                                        </div>
                                        <div className={styles.statLabel}>対象日数</div>
                                    </div>
                                    <div className={styles.statValue}>{stats.totalDays}日分</div>
                                    <div className={styles.statDate}>
                                        {uploadInfo?.pdf?.schedule && uploadInfo.pdf.schedule.length > 0
                                            ? `${uploadInfo.pdf.schedule[0].start.toLocaleDateString("ja-JP")}～${uploadInfo.pdf.schedule[uploadInfo.pdf.schedule.length - 1].start.toLocaleDateString("ja-JP")}`
                                            : dayTasks.length > 0
                                              ? `${dayTasks[0].baseDate.toLocaleDateString("ja-JP")}～${dayTasks[dayTasks.length - 1].baseDate.toLocaleDateString("ja-JP")}`
                                              : "日付範囲なし"}
                                    </div>
                                </div>
                            </Card>

                            {/* 有給休暇 */}
                            <Card
                                className={styles.statCardSuccess}
                                onClick={() => setDetailDialogType("paidLeave")}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                                            <CalendarLtr24Regular />
                                        </div>
                                        <div className={styles.statLabel}>有給休暇</div>
                                    </div>
                                    <div className={styles.statValue}>{stats.paidLeaveDays}日</div>
                                </div>
                            </Card>

                            {/* 対象イベント */}
                            <Card
                                className={styles.statCardInfo}
                                onClick={() => setDetailDialogType("targetEvents")}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
                                            <Link24Regular />
                                        </div>
                                        <div className={styles.statLabel}>対象イベント</div>
                                    </div>
                                    <div className={styles.statValue}>{stats.linkedCount + stats.unlinkedCount}件</div>
                                    <div className={styles.statSubText}>
                                        通常イベント：{stats.normalEventCount}件/ 勤務時間変換イベント：
                                        {stats.convertedEventCount}件
                                    </div>
                                </div>
                            </Card>

                            {/* 削除対象イベント */}
                            <Card
                                className={styles.statCardNeutral}
                                onClick={() => setDetailDialogType("deleteEvents")}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div className={`${styles.statIcon} ${styles.statIconNeutral}`}>
                                            <Delete24Regular />
                                        </div>
                                        <div className={styles.statLabel}>削除対象イベント</div>
                                    </div>
                                    <div className={styles.statValue}>
                                        {linkingResult ? linkingResult.excluded.length : 0}件
                                    </div>
                                    <div className={styles.statSubText}>
                                        無視：{excludedStats.ignored}件 / 勤務日範囲外：{excludedStats.outOfSchedule}件
                                        / 不正：{excludedStats.invalid}件
                                    </div>
                                </div>
                            </Card>

                            {/* 紐づけ済み */}
                            <Card
                                className={styles.statCardSuccess}
                                onClick={() => setDetailDialogType("linked")}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                                            <CheckmarkCircle24Filled />
                                        </div>
                                        <div className={styles.statLabel}>紐づけ済み</div>
                                    </div>
                                    <div className={styles.statValue}>{stats.totalLinked}件</div>
                                    <div className={styles.statSubText}>
                                        休暇：{stats.timeOffCount}件/ 履歴：{stats.historyCount}件
                                    </div>
                                </div>
                            </Card>

                            {/* 未紐づけ */}
                            <Card
                                className={stats.unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess}
                                onClick={() => setDetailDialogType("unlinked")}
                                style={{ cursor: "pointer" }}
                            >
                                <div className={styles.statCardContent}>
                                    <div className={styles.statCardHeader}>
                                        <div
                                            className={`${styles.statIcon} ${stats.unlinkedCount > 0 ? styles.statIconWarning : styles.statIconSuccess}`}
                                        >
                                            {stats.unlinkedCount > 0 ? <Warning24Filled /> : <Checkmark24Filled />}
                                        </div>
                                        <div className={styles.statLabel}>未紐づけ</div>
                                    </div>
                                    <div className={styles.statValue}>{stats.unlinkedCount}件</div>
                                    <div className={styles.statSubText}>
                                        {stats.unlinkedCount > 0
                                            ? "手動紐づけ/AIによる自動紐づけを実施してください。"
                                            : "すべて紐づけ完了"}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </ViewSection>
            )}

            {/* 紐付け済みイベント一覧テーブル (Task 2) */}
            {linkingResult && linkedEventsRows.length > 0 && (
                <div className={styles.tableContainer}>
                    <InteractiveCard title="✅ 紐付け済みイベント一覧" defaultExpanded={true}>
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
                                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
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
            <Dialog
                open={detailDialogType !== null}
                onOpenChange={(_, data) => !data.open && setDetailDialogType(null)}
            >
                <DialogSurface style={{ maxWidth: "800px" }}>
                    <DialogBody>
                        <DialogTitle>
                            {detailDialogType === "paidLeave" && "📅 有給休暇の詳細"}
                            {detailDialogType === "targetEvents" && "🔗 対象イベントの詳細"}
                            {detailDialogType === "deleteEvents" && "🗑️ 削除対象イベントの詳細"}
                            {detailDialogType === "linked" && "✅ 紐づけ済みイベントの詳細"}
                            {detailDialogType === "unlinked" && "❌ 未紐づけイベントの詳細"}
                        </DialogTitle>
                        <DialogContent className={styles.dialogContent}>
                            {/* 有給休暇の詳細 */}
                            {detailDialogType === "paidLeave" && (
                                <div>
                                    <div className={styles.dialogDescription}>
                                        有給休暇として認識された日付の一覧です。これらの日は勤務実績として扱われます。
                                    </div>
                                    <div className={styles.dialogStats}>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>有給日数</div>
                                            <div className={styles.dialogStatValue}>{stats.paidLeaveDays}日</div>
                                        </div>
                                    </div>
                                    {paidLeaveRows.length > 0 ? (
                                        <DataGrid
                                            items={paidLeaveRows}
                                            columns={paidLeaveColumns}
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
                                            <DataGridBody<PaidLeaveRow>>
                                                {({ item, rowId }) => (
                                                    <DataGridRow<PaidLeaveRow> key={rowId}>
                                                        {({ renderCell }) => (
                                                            <DataGridCell>{renderCell(item)}</DataGridCell>
                                                        )}
                                                    </DataGridRow>
                                                )}
                                            </DataGridBody>
                                        </DataGrid>
                                    ) : (
                                        <p style={{ textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                                            有給休暇として認識された日付はありません
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 対象イベントの詳細 */}
                            {detailDialogType === "targetEvents" && (
                                <div>
                                    <div className={styles.dialogDescription}>
                                        処理対象となったイベントの一覧です。無視設定や勤務時間外のイベントは含まれません。
                                    </div>
                                    <div className={styles.dialogStats}>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>合計イベント数</div>
                                            <div className={styles.dialogStatValue}>
                                                {stats.linkedCount + stats.unlinkedCount}件
                                            </div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>紐づけ済み</div>
                                            <div
                                                className={styles.dialogStatValue}
                                                style={{ color: tokens.colorPaletteGreenForeground2 }}
                                            >
                                                {stats.linkedCount}件
                                            </div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>未紐づけ</div>
                                            <div
                                                className={styles.dialogStatValue}
                                                style={{
                                                    color:
                                                        stats.unlinkedCount > 0
                                                            ? tokens.colorPaletteYellowForeground2
                                                            : tokens.colorNeutralForeground3,
                                                }}
                                            >
                                                {stats.unlinkedCount}件
                                            </div>
                                        </div>
                                    </div>
                                    {targetEventRows.length > 0 ? (
                                        <DataGrid
                                            items={targetEventRows}
                                            columns={targetEventColumns}
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
                                            <DataGridBody<TargetEventRow>>
                                                {({ item, rowId }) => (
                                                    <DataGridRow<TargetEventRow> key={rowId}>
                                                        {({ renderCell }) => (
                                                            <DataGridCell>{renderCell(item)}</DataGridCell>
                                                        )}
                                                    </DataGridRow>
                                                )}
                                            </DataGridBody>
                                        </DataGrid>
                                    ) : (
                                        <p style={{ textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                                            処理対象のイベントはありません
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 削除対象イベントの詳細 */}
                            {detailDialogType === "deleteEvents" && (
                                <div>
                                    <div className={styles.dialogDescription}>
                                        以下の理由により処理から除外されたイベントです。
                                    </div>
                                    <div className={styles.dialogStats}>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>無視イベント</div>
                                            <div className={styles.dialogStatValue}>{excludedStats.ignored}件</div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>勤務日範囲外</div>
                                            <div className={styles.dialogStatValue}>
                                                {excludedStats.outOfSchedule}件
                                            </div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>不正イベント</div>
                                            <div className={styles.dialogStatValue}>{excludedStats.invalid}件</div>
                                        </div>
                                    </div>
                                    {excludedEventRows.length > 0 ? (
                                        <DataGrid
                                            items={excludedEventRows}
                                            columns={excludedEventsColumns}
                                            sortable
                                            resizableColumns
                                            style={{ marginTop: "16px" }}
                                            getRowId={(item) => item.id}
                                        >
                                            <DataGridHeader>
                                                <DataGridRow>
                                                    {({ renderHeaderCell }) => (
                                                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                    )}
                                                </DataGridRow>
                                            </DataGridHeader>
                                            <DataGridBody<ExcludedEventRow>>
                                                {({ item, rowId }) => (
                                                    <DataGridRow<ExcludedEventRow> key={rowId}>
                                                        {({ renderCell }) => (
                                                            <DataGridCell>{renderCell(item)}</DataGridCell>
                                                        )}
                                                    </DataGridRow>
                                                )}
                                            </DataGridBody>
                                        </DataGrid>
                                    ) : (
                                        <p
                                            style={{
                                                textAlign: "center",
                                                color: tokens.colorNeutralForeground3,
                                                marginTop: "16px",
                                            }}
                                        >
                                            除外されたイベントはありません
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 紐づけ済みイベントの詳細 */}
                            {detailDialogType === "linked" && (
                                <div>
                                    <div className={styles.dialogDescription}>
                                        WorkItemに紐づけ済みのイベント一覧です。これらは登録実行時に勤務実績として記録されます。
                                    </div>
                                    <div className={styles.dialogStats}>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>合計</div>
                                            <div className={styles.dialogStatValue}>{stats.totalLinked}件</div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>休暇</div>
                                            <div className={styles.dialogStatValue}>{stats.timeOffCount}件</div>
                                        </div>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>履歴</div>
                                            <div className={styles.dialogStatValue}>{stats.historyCount}件</div>
                                        </div>
                                        {stats.manualCount > 0 && (
                                            <div className={styles.dialogStatItem}>
                                                <div className={styles.dialogStatLabel}>手動</div>
                                                <div className={styles.dialogStatValue}>{stats.manualCount}件</div>
                                            </div>
                                        )}
                                    </div>
                                    {linkedEventsRows.length > 0 ? (
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
                                    ) : (
                                        <p style={{ textAlign: "center", color: tokens.colorNeutralForeground3 }}>
                                            紐づけ済みのイベントはありません
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 未紐づけイベントの詳細 */}
                            {detailDialogType === "unlinked" && (
                                <div>
                                    <div className={styles.dialogDescription}>
                                        まだWorkItemに紐づけされていないイベントです。手動紐づけまたはAIによる自動紐づけを実施してください。
                                    </div>
                                    <div className={styles.dialogStats}>
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>未紐づけ件数</div>
                                            <div
                                                className={styles.dialogStatValue}
                                                style={{ color: tokens.colorPaletteYellowForeground2 }}
                                            >
                                                {stats.unlinkedCount}件
                                            </div>
                                        </div>
                                    </div>
                                    {unlinkedEventsRows.length > 0 ? (
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
                                    ) : (
                                        <p
                                            style={{
                                                textAlign: "center",
                                                color: tokens.colorPaletteGreenForeground2,
                                                fontWeight: 600,
                                            }}
                                        >
                                            🎉 すべて紐づけ完了しました！
                                        </p>
                                    )}
                                </div>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={() => setDetailDialogType(null)}>
                                閉じる
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </>
    );
}
