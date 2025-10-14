/**
 * LinkingProcessView用の統計表示カードコンポーネント
 *
 * 自動紐づけの結果を視覚的に表示するカード群を提供します。
 * - 対象日数（有給休暇日の一覧ダイアログ付き）
 * - 対象イベント数（除外イベントの一覧ダイアログ付き）
 * - 紐づけ済み件数（未実装）
 * - 未紐づけ件数（未実装）
 */

import { Card } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { formatDateTime } from "@/lib/dateUtil";
import type { Event, Schedule } from "@/types";
import {
    Button,
    createTableColumn,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    makeStyles,
    mergeClasses,
    TableCellLayout,
    TableColumnDefinition,
    tokens,
} from "@fluentui/react-components";
import {
    Calendar24Regular,
    CalendarCancel24Filled,
    CalendarLtr24Regular,
    Checkmark24Filled,
    CheckmarkCircle24Filled,
    Delete24Regular,
    Dismiss24Regular,
    DismissCircle24Filled,
    ErrorCircle24Filled,
    Link24Regular,
    PersonCircle24Regular,
    Search24Regular,
    Warning24Filled,
} from "@fluentui/react-icons";
import { useCallback, useMemo, useState } from "react";
import type { AdjustedEventInfo, ExcludedEventInfo, ExcludedScheduleInfo, LinkingEventWorkItemPair } from "../models";

/** ダイアログの種類 */
type DetailDialogType = "targetDays" | "targetEvents";

/** 除外イベントのテーブル行 */
type ExcludedEventRow = {
    event: Event;
    excludeReasons: ExcludedEventInfo["details"];
};

/** 有給休暇日のテーブル行 */
type PaidLeaveDayRow = {
    id: string;
    date: string;
    displayDate: string;
};

/** ダイアログ情報 */
type DialogInfo = {
    title: string;
    icon: JSX.Element;
    color: string;
};

/** 統計カードの設定 */
type StatCardConfig = {
    cardStyle: string;
    iconStyle: string;
    icon: JSX.Element;
    label: string;
    getValue: (stats: StatisticsData) => string | number;
    getSubTexts: (stats: StatisticsData) => (string | React.ReactNode)[];
    clickable: boolean;
    dialogType?: DetailDialogType;
};

/** 統計情報 */
interface StatisticsData {
    targetDays: number;
    fromStr: string;
    endStr: string;
    totalLinked: number;
    totalEvents: number;
    adjustedCount: number;
    excludedCount: number;
    unlinkedCount: number;
    paidLeaveDays: number;
    linkedByTimeOff: number;
    linkedByHistory: number;
    linkedByAI: number;
    linkedByWorkSchedule: number;
    linkedByManual: number;
}

/** 統計カードのデータソース */
export interface StatisticsCardsData {
    enableSchedules: Schedule[];
    enableEvents: Event[];
    scheduleEvents: Event[];
    adjustedEvents: AdjustedEventInfo[];
    paidLeaveDayEvents: Event[];
    excludedSchedules: ExcludedScheduleInfo[];
    excludedEvents: ExcludedEventInfo[];
}

/** コンポーネントのProps */
export interface StatisticsCardsProps {
    data: StatisticsCardsData;
    linkingEventWorkItemPair: LinkingEventWorkItemPair[];
}

// ============================================================================
// スタイル定義
// ============================================================================

const useStyles = makeStyles({
    // 統計セクション
    statsSection: {
        width: "100%",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: tokens.spacingVerticalM,
        marginTop: tokens.spacingVerticalM,
    },

    // 統計カードの基本スタイル（共通部分を統合）
    statCardInfo: {
        padding: "12px 16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorBrandBackground,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorBrandBackground2Hover,
        },
    },
    statCardSuccess: {
        padding: "12px 16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "3px",
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
        padding: "12px 16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteYellowBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
            backgroundColor: tokens.colorPaletteYellowBackground1,
        },
    },

    // カード内要素
    statCardContent: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    statCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "2px",
    },
    statIcon: {
        fontSize: "20px",
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
    statLabel: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground2,
        fontWeight: "600",
        flex: 1,
    },
    statValue: {
        fontSize: "28px",
        fontWeight: "700",
        color: tokens.colorNeutralForeground1,
        lineHeight: "1.2",
    },
    // statDateとstatSubTextを統合（同じスタイル）
    statText: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginTop: "2px",
        lineHeight: "1.3",
    },
    clickableCard: {
        cursor: "pointer",
    },

    // ダイアログ
    dialogSurface: {
        width: "90vw",
        maxWidth: "1200px",
        height: "80vh",
        maxHeight: "800px",
        display: "flex",
        flexDirection: "column",
    },
    dialogTitle: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        paddingBottom: tokens.spacingVerticalM,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    dialogTitleIcon: {
        fontSize: "28px",
        display: "flex",
        alignItems: "center",
    },
    dialogBody: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0",
    },
    searchContainer: {
        padding: tokens.spacingVerticalM,
    },
    searchInput: {
        width: "100%",
    },
    tableContainer: {
        flex: 1,
        overflow: "auto",
        padding: tokens.spacingVerticalM,
    },

    // テーブルセル
    eventCell: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
    },
    eventName: {
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    eventDetail: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    dateTimeRange: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
    },
    reasonList: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        fontSize: "13px",
        lineHeight: "1.5",
    },
    reasonItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        "&::before": {
            content: '"●"',
            color: tokens.colorNeutralForeground3,
            fontSize: "16px",
            fontWeight: "bold",
            lineHeight: "1.5",
        },
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.spacingVerticalXXXL,
        gap: tokens.spacingVerticalL,
        color: tokens.colorNeutralForeground3,
    },
    emptyStateIcon: {
        fontSize: "64px",
        opacity: 0.5,
    },
    emptyStateText: {
        fontSize: "16px",
        fontWeight: "600",
    },
    excludeReasonIcons: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
});

/**
 * 日付範囲を文字列形式で取得
 * @param schedules スケジュールの配列
 * @returns 開始日と終了日の文字列
 */
const getDateRangeString = (schedules: Schedule[]): { fromStr: string; endStr: string } => {
    if (schedules.length === 0) {
        return { fromStr: "", endStr: "" };
    }

    const dates = schedules.map((s) => new Date(s.start)).sort((a, b) => a.getTime() - b.getTime());
    return {
        fromStr: dates[0].toLocaleDateString(),
        endStr: dates[dates.length - 1].toLocaleDateString(),
    };
};

/**
 * 除外理由のメッセージをカンマ区切りで分割し、ユニークな理由のリストを作成
 * @param details 除外理由の詳細情報の配列
 * @returns ユニークな理由のテキスト配列
 */
const parseExcludeReasons = (details: ExcludedEventInfo["details"]): string[] => {
    const allReasons = details
        .flatMap((d) => d.message.split(",").map((msg) => msg.trim()))
        .filter((msg) => msg.length > 0);
    return Array.from(new Set(allReasons));
};

/** 除外イベントテーブルの列幅設定 */
const EXCLUDED_EVENTS_COLUMN_SIZING = {
    eventName: { minWidth: 350, idealWidth: 400 },
    date: { minWidth: 250, idealWidth: 250 },
    excludeReasonIcons: { minWidth: 120, idealWidth: 150 },
    excludeReasonDetails: { minWidth: 350, idealWidth: 400 },
} as const;

/** 有給休暇日テーブルの列幅設定 */
const PAID_LEAVE_DAYS_COLUMN_SIZING = {
    displayDate: { minWidth: 200, idealWidth: 300 },
} as const;

/**
 * 紐づけ方法別の件数をカウント
 * @param pairs 紐づけペアの配列
 * @param type 紐づけタイプ（auto | manual）
 * @param autoMethod 自動紐づけの方法
 * @returns マッチするペアの件数
 */
const countLinkingsByMethod = (
    pairs: LinkingEventWorkItemPair[],
    type?: "auto" | "manual",
    autoMethod?: "ai" | "history" | "workShedule" | "timeOff",
): number => {
    return pairs.filter((pair) => {
        if (type && pair.linkingWorkItem.type !== type) return false;
        if (autoMethod && pair.linkingWorkItem.autoMethod !== autoMethod) return false;
        return true;
    }).length;
};

/**
 * 統計カードの設定を生成
 * @param statistics 統計データ
 * @param styles スタイルオブジェクト
 * @returns 統計カード設定の配列
 */
const createStatCardConfigs = (statistics: StatisticsData, styles: ReturnType<typeof useStyles>): StatCardConfig[] => {
    return [
        {
            cardStyle: styles.statCardInfo,
            iconStyle: styles.statIconInfo,
            icon: <Calendar24Regular />,
            label: "対象日数",
            getValue: (stats) => `${stats.targetDays}日分`,
            getSubTexts: (stats) => [`${stats.fromStr}～${stats.endStr}`, `有給休暇：${stats.paidLeaveDays}日`],
            clickable: true,
            dialogType: "targetDays" as const,
        },
        {
            cardStyle: styles.statCardInfo,
            iconStyle: styles.statIconInfo,
            icon: <Link24Regular />,
            label: "対象イベント",
            getValue: (stats) => `${stats.totalEvents}件`,
            getSubTexts: (stats) => [`除外：${stats.excludedCount}件`, `時間調整：${stats.adjustedCount}件`],
            clickable: true,
            dialogType: "targetEvents" as const,
        },
        {
            cardStyle: styles.statCardSuccess,
            iconStyle: styles.statIconSuccess,
            icon: <CheckmarkCircle24Filled />,
            label: "紐づけ済み",
            getValue: (stats) => `${stats.totalLinked}件`,
            getSubTexts: (stats) => [
                `休暇：${stats.linkedByTimeOff}件 / 履歴：${stats.linkedByHistory}件 / AI：${stats.linkedByAI}件`,
                `勤務時間：${stats.linkedByWorkSchedule}件 / 手動：${stats.linkedByManual}件`,
            ],
            clickable: false,
        },
        {
            cardStyle: statistics.unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess,
            iconStyle: statistics.unlinkedCount > 0 ? styles.statIconWarning : styles.statIconSuccess,
            icon: statistics.unlinkedCount > 0 ? <Warning24Filled /> : <Checkmark24Filled />,
            label: "未紐づけ",
            getValue: (stats) => `${stats.unlinkedCount}件`,
            getSubTexts: (stats) => [
                stats.unlinkedCount > 0 ? "手動紐づけ/AIによる自動紐づけを実施してください。" : "すべて紐づけ完了",
            ],
            clickable: false,
        },
    ];
};

/**
 * 統計情報を算出
 */
const calcStatisticsData = (
    data: StatisticsCardsData,
    linkingEventWorkItemPair: LinkingEventWorkItemPair[],
): StatisticsData => {
    const targetDays = data.enableSchedules.length + data.paidLeaveDayEvents.length;
    const paidLeaveDays = data.paidLeaveDayEvents.length;
    const { fromStr, endStr } = getDateRangeString(data.enableSchedules);

    // 対象イベント数 = 有効なイベント
    const totalEvents =
        data.enableEvents.length +
        data.adjustedEvents.length +
        data.paidLeaveDayEvents.length +
        data.scheduleEvents.length;
    const adjustedCount = data.adjustedEvents.length;
    const excludedCount = data.excludedEvents.length;
    const totalLinked = linkingEventWorkItemPair.length;
    const unlinkedCount = Math.max(0, totalEvents - totalLinked);

    // 紐づけ方法別の件数
    const linkedByTimeOff = countLinkingsByMethod(linkingEventWorkItemPair, undefined, "timeOff");
    const linkedByHistory = countLinkingsByMethod(linkingEventWorkItemPair, "auto", "history");
    const linkedByAI = countLinkingsByMethod(linkingEventWorkItemPair, "auto", "ai");
    const linkedByWorkSchedule = countLinkingsByMethod(linkingEventWorkItemPair, "auto", "workShedule");
    const linkedByManual = countLinkingsByMethod(linkingEventWorkItemPair, "manual");

    return {
        targetDays,
        fromStr,
        endStr,
        totalLinked,
        totalEvents,
        adjustedCount,
        excludedCount,
        unlinkedCount,
        paidLeaveDays,
        linkedByTimeOff,
        linkedByHistory,
        linkedByAI,
        linkedByWorkSchedule,
        linkedByManual,
    };
};

export interface StatisticsCardsProps {
    data: StatisticsCardsData;
    /** 紐づけ済みのイベントと作業項目のペア */
    linkingEventWorkItemPair: LinkingEventWorkItemPair[];
}

export function StatisticsCards({ data, linkingEventWorkItemPair }: StatisticsCardsProps) {
    const styles = useStyles();
    const statistics = useMemo(
        () => calcStatisticsData(data, linkingEventWorkItemPair),
        [data, linkingEventWorkItemPair],
    );

    // ダイアログ状態
    const [dialogType, setDialogType] = useState<DetailDialogType | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // ダイアログを開く
    const handleCardClick = useCallback((type: DetailDialogType) => {
        setDialogType(type);
        setSearchQuery("");
    }, []);

    // ダイアログを閉じる
    const handleCloseDialog = useCallback(() => {
        setDialogType(null);
    }, []);

    // 除外イベント一覧データを取得
    const excludedEventsData = useMemo((): ExcludedEventRow[] => {
        if (dialogType !== "targetEvents") return [];

        // 検索フィルター
        const filtered = data.excludedEvents.filter((e) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const event = e.event;
            const reasonTexts = e.details.map((d) => d.message).join(" ");
            return (
                event.name.toLowerCase().includes(query) ||
                event.organizer.toLowerCase().includes(query) ||
                reasonTexts.toLowerCase().includes(query)
            );
        });

        // EventDetailRow形式に変換
        return filtered.map((e) => ({
            event: e.event,
            excludeReasons: e.details,
        }));
    }, [dialogType, data.excludedEvents, searchQuery]);

    // 有給休暇日の一覧データを取得
    const paidLeaveDaysData = useMemo((): PaidLeaveDayRow[] => {
        if (dialogType !== "targetDays") return [];

        return data.paidLeaveDayEvents.map((event) => {
            const date = new Date(event.schedule.start);
            return {
                id: event.uuid,
                date: date.toISOString(),
                displayDate: date.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                }),
            };
        });
    }, [dialogType, data.paidLeaveDayEvents]);

    // 統計カードの設定をメモ化
    const statCardConfigs = useMemo(() => createStatCardConfigs(statistics, styles), [statistics, styles]);

    // 統計カードのレンダリング関数
    const renderStatCard = useCallback(
        (config: StatCardConfig) => {
            const onClick =
                config.clickable && config.dialogType ? () => handleCardClick(config.dialogType!) : undefined;

            const cardClassName = config.clickable
                ? mergeClasses(config.cardStyle, styles.clickableCard)
                : config.cardStyle;

            return (
                <Card key={config.label} className={cardClassName} onClick={onClick}>
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={mergeClasses(styles.statIcon, config.iconStyle)}>{config.icon}</div>
                            <div className={styles.statLabel}>{config.label}</div>
                        </div>
                        <div className={styles.statValue}>{config.getValue(statistics)}</div>
                        {config.getSubTexts(statistics).map((text, index) => (
                            <div key={index} className={styles.statText}>
                                {text}
                            </div>
                        ))}
                    </div>
                </Card>
            );
        },
        [handleCardClick, statistics, styles],
    );

    // 除外理由アイコンを取得
    const getExcludeReasonIcon = useCallback((reason: ExcludedEventInfo["details"][0]["reason"]) => {
        const iconStyle = { fontSize: "20px" };
        switch (reason) {
            case "ignored":
                return <DismissCircle24Filled style={{ ...iconStyle, color: tokens.colorPaletteRedForeground2 }} />;
            case "outOfSchedule":
                return <CalendarCancel24Filled style={{ ...iconStyle, color: tokens.colorPaletteYellowForeground2 }} />;
            case "invalid":
                return <ErrorCircle24Filled style={{ ...iconStyle, color: tokens.colorPaletteRedForeground2 }} />;
        }
    }, []);

    // 除外イベント用のテーブル列定義
    const excludedEventsColumns = useMemo(
        (): TableColumnDefinition<ExcludedEventRow>[] => [
            createTableColumn<ExcludedEventRow>({
                columnId: "eventName",
                compare: (a, b) => a.event.name.localeCompare(b.event.name),
                renderHeaderCell: () => "イベント名",
                renderCell: (item) => (
                    <TableCellLayout>
                        <div className={styles.eventCell}>
                            <div className={styles.eventName}>{item.event.name}</div>
                            <div className={styles.eventDetail}>
                                <PersonCircle24Regular />
                                {item.event.organizer || "不明"}
                            </div>
                        </div>
                    </TableCellLayout>
                ),
            }),
            createTableColumn<ExcludedEventRow>({
                columnId: "date",
                compare: (a, b) =>
                    new Date(a.event.schedule.start).getTime() - new Date(b.event.schedule.start).getTime(),
                renderHeaderCell: () => "日時",
                renderCell: (item) => {
                    const startDate = new Date(item.event.schedule.start);
                    const endDate = item.event.schedule.end ? new Date(item.event.schedule.end) : undefined;
                    return (
                        <TableCellLayout>
                            <div className={styles.dateTimeRange}>{formatDateTime(startDate, endDate)}</div>
                        </TableCellLayout>
                    );
                },
            }),
            createTableColumn<ExcludedEventRow>({
                columnId: "excludeReasonIcons",
                compare: (a, b) => a.excludeReasons.length - b.excludeReasons.length,
                renderHeaderCell: () => "除外理由",
                renderCell: (item) => (
                    <TableCellLayout>
                        <div className={styles.excludeReasonIcons}>
                            {item.excludeReasons.map((detail, index) => (
                                <div key={index} title={detail.message}>
                                    {getExcludeReasonIcon(detail.reason)}
                                </div>
                            ))}
                        </div>
                    </TableCellLayout>
                ),
            }),
            createTableColumn<ExcludedEventRow>({
                columnId: "excludeReasonDetails",
                compare: (a, b) => {
                    const aText = a.excludeReasons.map((d) => d.message).join(", ");
                    const bText = b.excludeReasons.map((d) => d.message).join(", ");
                    return aText.localeCompare(bText);
                },
                renderHeaderCell: () => "詳細",
                renderCell: (item) => {
                    const uniqueReasons = parseExcludeReasons(item.excludeReasons);
                    return (
                        <TableCellLayout>
                            <div className={styles.reasonList}>
                                {uniqueReasons.map((reason, index) => (
                                    <div key={index} className={styles.reasonItem}>
                                        {reason}
                                    </div>
                                ))}
                            </div>
                        </TableCellLayout>
                    );
                },
            }),
        ],
        [getExcludeReasonIcon, styles],
    );

    // 有給休暇日のテーブル列定義
    const paidLeaveDaysColumns = useMemo(
        (): TableColumnDefinition<PaidLeaveDayRow>[] => [
            createTableColumn<PaidLeaveDayRow>({
                columnId: "displayDate",
                compare: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                renderHeaderCell: () => "有給休暇日",
                renderCell: (item) => (
                    <TableCellLayout>
                        <div className={styles.eventDetail}>
                            <CalendarLtr24Regular />
                            {item.displayDate}
                        </div>
                    </TableCellLayout>
                ),
            }),
        ],
        [],
    );

    // ダイアログ情報を取得
    const getDialogInfo = (): DialogInfo | null => {
        if (!dialogType) return null;

        switch (dialogType) {
            case "targetDays":
                return {
                    title: "有給休暇日一覧",
                    icon: <Calendar24Regular />,
                    color: tokens.colorBrandForeground1,
                };
            case "targetEvents":
                return {
                    title: "除外イベント一覧",
                    icon: <Delete24Regular />,
                    color: tokens.colorPaletteRedForeground2,
                };
        }
    };

    const currentDialogInfo = getDialogInfo();

    return (
        <>
            <div className={styles.statsSection}>
                <h3 className={styles.sectionTitle}>自動紐づけ結果</h3>
                <div className={styles.statsGrid}>{statCardConfigs.map(renderStatCard)}</div>
            </div>

            {/* 詳細ダイアログ */}
            <Dialog open={dialogType !== null} onOpenChange={() => handleCloseDialog()}>
                <DialogSurface className={styles.dialogSurface}>
                    <DialogBody className={styles.dialogBody}>
                        {/* ダイアログヘッダー */}
                        <DialogTitle className={styles.dialogTitle}>
                            <div className={styles.dialogTitleIcon} style={{ color: currentDialogInfo?.color }}>
                                {currentDialogInfo?.icon}
                            </div>
                            <span>{currentDialogInfo?.title}</span>
                            <span style={{ marginLeft: "auto" }}>
                                ({dialogType === "targetDays" ? paidLeaveDaysData.length : excludedEventsData.length}件)
                            </span>
                            <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={handleCloseDialog} />
                        </DialogTitle>

                        {/* 検索ボックス（有給休暇日ダイアログでは非表示） */}
                        {dialogType !== "targetDays" && (
                            <div className={styles.searchContainer}>
                                <Input
                                    className={styles.searchInput}
                                    placeholder="イベント名、主催者、場所で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    contentBefore={<Search24Regular />}
                                />
                            </div>
                        )}

                        {/* データテーブル */}
                        <DialogContent className={styles.tableContainer}>
                            {dialogType === "targetDays" ? (
                                // 有給休暇日一覧
                                paidLeaveDaysData.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyStateIcon}>{currentDialogInfo?.icon}</div>
                                        <div className={styles.emptyStateText}>有給休暇日がありません</div>
                                    </div>
                                ) : (
                                    <DataTable
                                        items={paidLeaveDaysData}
                                        columns={paidLeaveDaysColumns}
                                        getRowId={(item) => item.id}
                                        sortable
                                        resizableColumns
                                        columnSizingOptions={PAID_LEAVE_DAYS_COLUMN_SIZING}
                                    />
                                )
                            ) : dialogType === "targetEvents" ? (
                                // 除外イベント一覧
                                excludedEventsData.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyStateIcon}>{currentDialogInfo?.icon}</div>
                                        <div className={styles.emptyStateText}>
                                            {searchQuery
                                                ? "検索条件に一致するイベントが見つかりませんでした"
                                                : "除外イベントがありません"}
                                        </div>
                                    </div>
                                ) : (
                                    <DataTable
                                        items={excludedEventsData}
                                        columns={excludedEventsColumns}
                                        getRowId={(item) => item.event.uuid}
                                        sortable
                                        resizableColumns
                                        columnSizingOptions={EXCLUDED_EVENTS_COLUMN_SIZING}
                                    />
                                )
                            ) : null}
                        </DialogContent>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </>
    );
}
