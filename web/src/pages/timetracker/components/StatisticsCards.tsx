/**
 * LinkingProcessView用の統計表示カードコンポーネント
 */

import { Card } from "@/components/card";
import { makeStyles, tokens } from "@fluentui/react-components";
import {
    Calendar24Regular,
    Checkmark24Filled,
    CheckmarkCircle24Filled,
    Link24Regular,
    Warning24Filled,
} from "@fluentui/react-icons";
import { TaskStatistics } from "../models/statistics";
import type { DetailDialogType } from "./DetailDialog";

const useStyles = makeStyles({
    statsSection: {
        width: "100%",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        margin: "8px 0px",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginTop: "20px",
    },
    statCardInfo: {
        padding: "16px 20px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "4px",
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
        padding: "16px 20px",
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
        padding: "16px 20px",
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
    statCardNeutral: {
        padding: "16px 20px",
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
        gap: "6px",
    },
    statCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
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
    statIconNeutral: {
        color: tokens.colorNeutralForeground3,
    },
    statLabel: {
        fontSize: "13px",
        color: tokens.colorNeutralForeground2,
        fontWeight: "600",
        flex: 1,
    },
    statValue: {
        fontSize: "32px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "700",
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
});

export interface StatisticsData {
    totalDays: number;
    paidLeaveDays: number;
    normalEventCount: number;
    convertedEventCount: number;
    excludedCount: number;
    totalLinked: number;
    timeOffCount: number;
    historyCount: number;
    unlinkedCount: number;
}

export interface ExcludedStatistics {
    ignored: number;
    outOfSchedule: number;
    invalid: number;
}

export interface StatisticsCardsProps {
    taskStatistics: TaskStatistics;
    onCardClick?: (dialogType: DetailDialogType) => void;
}

export function StatisticsCards({ taskStatistics, onCardClick }: StatisticsCardsProps) {
    const styles = useStyles();

    const targetDays = taskStatistics.day.normalDays + taskStatistics.day.paidLeaveDays;
    const fromStr = taskStatistics.day.from.toLocaleDateString("ja-JP");
    const endStr = taskStatistics.day.end.toLocaleDateString("ja-JP");

    const totalLinked = taskStatistics.linked.historyCount + taskStatistics.linked.timeOffCount + taskStatistics.linked.manualCount + taskStatistics.linked.aiLinked;
    const totalEvents = totalLinked + taskStatistics.linked.unlinkedCount + taskStatistics.excluded.ignored + taskStatistics.excluded.outOfSchedule + taskStatistics.excluded.invalid;
    const excludedCount = taskStatistics.excluded.ignored + taskStatistics.excluded.outOfSchedule + taskStatistics.excluded.invalid;
    const unlinkedCount = taskStatistics.linked.unlinkedCount;

    return (
        <div className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>自動紐づけ結果</h3>
            <div className={styles.statsGrid}>
                {/* 対象日数（有給日数を含む） */}
                <Card className={styles.statCardInfo}>
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
                                <Calendar24Regular />
                            </div>
                            <div className={styles.statLabel}>対象日数</div>
                        </div>
                        <div className={styles.statValue}>{targetDays}日分</div>
                        <div className={styles.statDate}>
                            {fromStr}～{endStr}
                        </div>
                        <div className={styles.statSubText}>有給休暇：{taskStatistics.day.paidLeaveDays}日</div>
                    </div>
                </Card>

                {/* 対象イベント（削除対象を含む） */}
                <Card
                    className={styles.statCardInfo}
                    onClick={onCardClick ? () => onCardClick("targetEvents") : undefined}
                    style={{ cursor: onCardClick ? "pointer" : "default" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
                                <Link24Regular />
                            </div>
                            <div className={styles.statLabel}>対象イベント</div>
                        </div>
                        <div className={styles.statValue}>{totalEvents}件</div>
                        <div className={styles.statSubText}>除外：{excludedCount}件</div>
                    </div>
                </Card>

                {/* 紐づけ済み */}
                <Card
                    className={styles.statCardSuccess}
                    onClick={onCardClick ? () => onCardClick("linked") : undefined}
                    style={{ cursor: onCardClick ? "pointer" : "default" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                                <CheckmarkCircle24Filled />
                            </div>
                            <div className={styles.statLabel}>紐づけ済み</div>
                        </div>
                        <div className={styles.statValue}>{totalLinked}件</div>
                        <div className={styles.statSubText}>
                            休暇：{taskStatistics.linked.timeOffCount}件 / 履歴：{taskStatistics.linked.historyCount}件 / AI：{taskStatistics.linked.aiLinked}件
                        </div>
                        <div className={styles.statSubText}>
                            手動：{taskStatistics.linked.manualCount}件
                        </div>
                    </div>
                </Card>

                {/* 未紐づけ */}
                <Card
                    className={unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess}
                    onClick={onCardClick ? () => onCardClick("unlinked") : undefined}
                    style={{ cursor: onCardClick ? "pointer" : "default" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div
                                className={`${styles.statIcon} ${unlinkedCount > 0 ? styles.statIconWarning : styles.statIconSuccess}`}
                            >
                                {unlinkedCount > 0 ? <Warning24Filled /> : <Checkmark24Filled />}
                            </div>
                            <div className={styles.statLabel}>未紐づけ</div>
                        </div>
                        <div className={styles.statValue}>{unlinkedCount}件</div>
                        <div className={styles.statSubText}>
                            {unlinkedCount > 0 ? "手動紐づけ/AIによる自動紐づけを実施してください。" : "すべて紐づけ完了"}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
