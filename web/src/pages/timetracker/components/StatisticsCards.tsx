/**
 * LinkingProcessView用の統計表示カードコンポーネント
 */

import { Card } from "@/components/card";
import type { DayTask, Schedule } from "@/types";
import { makeStyles, tokens } from "@fluentui/react-components";
import {
    Calendar24Regular,
    CalendarLtr24Regular,
    Checkmark24Filled,
    CheckmarkCircle24Filled,
    Delete24Regular,
    Link24Regular,
    Warning24Filled,
} from "@fluentui/react-icons";
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
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginTop: "16px",
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
    stats: StatisticsData;
    excludedStats: ExcludedStatistics;
    schedules?: Schedule[];
    dayTasks: DayTask[];
    onCardClick: (dialogType: DetailDialogType) => void;
}

export function StatisticsCards({
    stats,
    excludedStats,
    schedules,
    dayTasks,
    onCardClick,
}: StatisticsCardsProps) {
    const styles = useStyles();

    return (
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
                            {schedules && schedules.length > 0
                                ? `${schedules[0].start.toLocaleDateString("ja-JP")}～${schedules[schedules.length - 1].start.toLocaleDateString("ja-JP")}`
                                : dayTasks.length > 0
                                  ? `${dayTasks[0].baseDate.toLocaleDateString("ja-JP")}～${dayTasks[dayTasks.length - 1].baseDate.toLocaleDateString("ja-JP")}`
                                  : "日付範囲なし"}
                        </div>
                    </div>
                </Card>

                {/* 有給休暇 */}
                <Card
                    className={styles.statCardSuccess}
                    onClick={() => onCardClick("paidLeave")}
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
                        <div className={styles.statValue}>
                            {stats.normalEventCount + stats.convertedEventCount}件
                        </div>
                        <div className={styles.statSubText}>
                            通常イベント：{stats.normalEventCount}件/ 勤務時間変換イベント：
                            {stats.convertedEventCount}件
                        </div>
                    </div>
                </Card>

                {/* 削除対象イベント */}
                <Card
                    className={styles.statCardNeutral}
                    onClick={() => onCardClick("deleteEvents")}
                    style={{ cursor: "pointer" }}
                >
                    <div className={styles.statCardContent}>
                        <div className={styles.statCardHeader}>
                            <div className={`${styles.statIcon} ${styles.statIconNeutral}`}>
                                <Delete24Regular />
                            </div>
                            <div className={styles.statLabel}>削除対象イベント</div>
                        </div>
                        <div className={styles.statValue}>{stats.excludedCount}件</div>
                        <div className={styles.statSubText}>
                            無視：{excludedStats.ignored}件 / 勤務日範囲外：{excludedStats.outOfSchedule}件 /
                            不正：{excludedStats.invalid}件
                        </div>
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
                        <div className={styles.statValue}>{stats.totalLinked}件</div>
                        <div className={styles.statSubText}>
                            休暇：{stats.timeOffCount}件/ 履歴：{stats.historyCount}件
                        </div>
                    </div>
                </Card>

                {/* 未紐づけ */}
                <Card
                    className={stats.unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess}
                    onClick={() => onCardClick("unlinked")}
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
    );
}
