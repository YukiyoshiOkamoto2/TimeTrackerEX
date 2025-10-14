/**
 * LinkingProcessView用の統計表示カードコンポーネント
 *
 * 自動紐づけの結果を視覚的に表示するカード群を提供します。
 * - 対象日数
 * - 対象イベント数
 * - 紐づけ済み件数
 * - 未紐づけ件数
 */

import { Card } from "@/components/card";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import {
    Calendar24Regular,
    Checkmark24Filled,
    CheckmarkCircle24Filled,
    Link24Regular,
    Warning24Filled,
} from "@fluentui/react-icons";

type DetailDialogType = "targetEvents" | "linked" | "unlinked" | "excluded";

// 統計情報の型定義
interface StatisticsData {
    targetDays: number;
    fromStr: string;
    endStr: string;
    totalLinked: number;
    totalEvents: number;
    excludedCount: number;
    unlinkedCount: number;
    paidLeaveDays: number;
    linkedByTimeOff: number;
    linkedByHistory: number;
    linkedByAI: number;
    linkedByWorkSchedule: number;
    linkedByManual: number;
}

const useStyles = makeStyles({
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
    statCardNeutral: {
        padding: "12px 16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "3px",
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
    statIconNeutral: {
        color: tokens.colorNeutralForeground3,
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
    statDate: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginTop: "2px",
        lineHeight: "1.3",
    },
    statSubText: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginTop: "2px",
        lineHeight: "1.3",
    },
    clickableCard: {
        cursor: "pointer",
    },
});

export interface StatisticsCardsProps {
    /** 統計データ（将来的に親コンポーネントから受け取る） */
    data?: Partial<StatisticsData>;
    /** カードクリック時のハンドラー */
    onCardClick?: (type: DetailDialogType) => void;
}

export function StatisticsCards({ data, onCardClick }: StatisticsCardsProps) {
    const styles = useStyles();

    // デフォルト値を設定
    const statistics: StatisticsData = {
        targetDays: data?.targetDays ?? 0,
        fromStr: data?.fromStr ?? "",
        endStr: data?.endStr ?? "",
        totalLinked: data?.totalLinked ?? 0,
        totalEvents: data?.totalEvents ?? 0,
        excludedCount: data?.excludedCount ?? 0,
        unlinkedCount: data?.unlinkedCount ?? 0,
        paidLeaveDays: data?.paidLeaveDays ?? 0,
        linkedByTimeOff: data?.linkedByTimeOff ?? 0,
        linkedByHistory: data?.linkedByHistory ?? 0,
        linkedByAI: data?.linkedByAI ?? 0,
        linkedByWorkSchedule: data?.linkedByWorkSchedule ?? 0,
        linkedByManual: data?.linkedByManual ?? 0,
    };

    const handleCardClick = (type: DetailDialogType) => {
        onCardClick?.(type);
    };

    // 統計カードのレンダリング関数
    const renderStatCard = (
        cardStyle: string,
        iconStyle: string,
        icon: React.ReactNode,
        label: string,
        value: string | number,
        subTexts: (string | React.ReactNode)[],
        clickable: boolean = false,
        onClick?: () => void,
    ) => (
        <Card className={clickable ? mergeClasses(cardStyle, styles.clickableCard) : cardStyle} onClick={onClick}>
            <div className={styles.statCardContent}>
                <div className={styles.statCardHeader}>
                    <div className={mergeClasses(styles.statIcon, iconStyle)}>{icon}</div>
                    <div className={styles.statLabel}>{label}</div>
                </div>
                <div className={styles.statValue}>{value}</div>
                {subTexts.map((text, index) =>
                    typeof text === "string" ? (
                        <div key={index} className={index === 0 ? styles.statDate : styles.statSubText}>
                            {text}
                        </div>
                    ) : (
                        <div key={index} className={styles.statSubText}>
                            {text}
                        </div>
                    ),
                )}
            </div>
        </Card>
    );

    return (
        <div className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>自動紐づけ結果</h3>
            <div className={styles.statsGrid}>
                {/* 対象日数（有給日数を含む） */}
                {renderStatCard(
                    styles.statCardInfo,
                    styles.statIconInfo,
                    <Calendar24Regular />,
                    "対象日数",
                    `${statistics.targetDays}日分`,
                    [`${statistics.fromStr}～${statistics.endStr}`, `有給休暇：${statistics.paidLeaveDays}日`],
                )}

                {/* 対象イベント（削除対象を含む） */}
                {renderStatCard(
                    styles.statCardInfo,
                    styles.statIconInfo,
                    <Link24Regular />,
                    "対象イベント",
                    `${statistics.totalEvents}件`,
                    [`除外：${statistics.excludedCount}件`],
                    true,
                    () => handleCardClick("targetEvents"),
                )}

                {/* 紐づけ済み */}
                {renderStatCard(
                    styles.statCardSuccess,
                    styles.statIconSuccess,
                    <CheckmarkCircle24Filled />,
                    "紐づけ済み",
                    `${statistics.totalLinked}件`,
                    [
                        `休暇：${statistics.linkedByTimeOff}件 / 履歴：${statistics.linkedByHistory}件 / AI：${statistics.linkedByAI}件`,
                        `勤務時間：${statistics.linkedByWorkSchedule}件 / 手動：${statistics.linkedByManual}件`,
                    ],
                    true,
                    () => handleCardClick("linked"),
                )}

                {/* 未紐づけ */}
                {renderStatCard(
                    statistics.unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess,
                    statistics.unlinkedCount > 0 ? styles.statIconWarning : styles.statIconSuccess,
                    statistics.unlinkedCount > 0 ? <Warning24Filled /> : <Checkmark24Filled />,
                    "未紐づけ",
                    `${statistics.unlinkedCount}件`,
                    [
                        statistics.unlinkedCount > 0
                            ? "手動紐づけ/AIによる自動紐づけを実施してください。"
                            : "すべて紐づけ完了",
                    ],
                    true,
                    () => handleCardClick("unlinked"),
                )}
            </div>
        </div>
    );
}
