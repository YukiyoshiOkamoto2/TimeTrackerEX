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
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "24px",
        marginTop: "20px",
    },
    statCardInfo: {
        padding: "32px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorBrandBackground,
        "&:hover": {
            boxShadow: tokens.shadow16,
            transform: "translateY(-3px)",
            backgroundColor: tokens.colorBrandBackground2Hover,
        },
    },
    statCardSuccess: {
        padding: "32px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteGreenBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow16,
            transform: "translateY(-3px)",
            backgroundColor: tokens.colorPaletteGreenBackground1,
        },
    },
    statCardWarning: {
        padding: "32px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorPaletteYellowBackground3,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow16,
            transform: "translateY(-3px)",
            backgroundColor: tokens.colorPaletteYellowBackground1,
        },
    },
    statCardNeutral: {
        padding: "32px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorNeutralStroke1,
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: tokens.shadow16,
            transform: "translateY(-3px)",
            backgroundColor: tokens.colorNeutralBackground2,
        },
    },
    statCardContent: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    statCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
    },
    statIcon: {
        fontSize: "32px",
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
        fontSize: "16px",
        color: tokens.colorNeutralForeground2,
        fontWeight: "600",
        flex: 1,
    },
    statValue: {
        fontSize: "48px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "700",
        lineHeight: "1.1",
    },
    statDate: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground3,
        marginTop: "4px",
        lineHeight: "1.4",
    },
    statSubText: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground3,
        marginTop: "2px",
        lineHeight: "1.4",
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
    onCardClick: (dialogType: DetailDialogType) => void;
}

export function StatisticsCards({ taskStatistics, onCardClick }: StatisticsCardsProps) {
    const styles = useStyles();

    const dtargetDays = taskStatistics.day.normalDays + taskStatistics.day.paidLeaveDays;
    const fromStr = taskStatistics.day.from.toLocaleDateString("ja-JP");
    const endStr = taskStatistics.day.end.toLocaleDateString("ja-JP");
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
                        <div className={styles.statValue}>{dtargetDays}日分</div>
                        <div className={styles.statDate}>
                            `${fromStr}～${endStr}`
                        </div>
                        <div className={styles.statSubText}>有給休暇：{taskStatistics.day.paidLeaveDays}日</div>
                    </div>
                </Card>

                {/* 対象イベント（削除対象を含む） */}
                <Card
                    className={styles.statCardInfo}
                    onClick={() => onCardClick("targetEvents")}
                    style={{ cursor: "pointer" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
                                <Link24Regular />
                            </div>
                            <div className={styles.statLabel}>対象イベント</div>
                        </div>
                        <div className={styles.statValue}>{0}件</div>
                        <div className={styles.statSubText}>
                            通常：{0}件 / 変換：{0}件
                        </div>
                        <div className={styles.statSubText}>削除対象：{0}件</div>
                    </div>
                </Card>

                {/* 紐づけ済み */}
                <Card
                    className={styles.statCardSuccess}
                    onClick={() => onCardClick("linked")}
                    style={{ cursor: "pointer" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                                <CheckmarkCircle24Filled />
                            </div>
                            <div className={styles.statLabel}>紐づけ済み</div>
                        </div>
                        <div className={styles.statValue}>{0}件</div>
                        <div className={styles.statSubText}>
                            休暇：{0}件 / 履歴：{0}件
                        </div>
                    </div>
                </Card>

                {/* 未紐づけ */}
                <Card
                    className={0 > 0 ? styles.statCardWarning : styles.statCardSuccess}
                    onClick={() => onCardClick("unlinked")}
                    style={{ cursor: "pointer" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div
                                className={`${styles.statIcon} ${0 > 0 ? styles.statIconWarning : styles.statIconSuccess}`}
                            >
                                {0 > 0 ? <Warning24Filled /> : <Checkmark24Filled />}
                            </div>
                            <div className={styles.statLabel}>未紐づけ</div>
                        </div>
                        <div className={styles.statValue}>{0}件</div>
                        <div className={styles.statSubText}>
                            {0 > 0 ? "手動紐づけ/AIによる自動紐づけを実施してください。" : "すべて紐づけ完了"}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
