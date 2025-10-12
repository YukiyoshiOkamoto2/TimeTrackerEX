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

type DetailDialogType = "targetEvents" | "linked" | "unlinked" | "excluded";

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
});

export interface StatisticsCardsProps {
    // schedules: Schedule[];
    // events: Event[];
    // paidLeaveDayEvents: Event[];
    // excludedSchedules: ExcludedScheduleInfo[];
    // excludedEvents: ExcludedEventInfo[];
    // linkingEventWorkItemPair: LinkingEventWorkItemPair[];
}

export function StatisticsCards({}: StatisticsCardsProps) {
    const styles = useStyles();

    const targetDays = 0;
    const fromStr = "";
    const endStr = "";

    const totalLinked = 0;
    const totalEvents = 0;
    const excludedCount = 0;
    const unlinkedCount = 0;

    const handleCardClick = (_type: DetailDialogType) => {};

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
                        <div className={styles.statSubText}>有給休暇：{0}日</div>
                    </div>
                </Card>

                {/* 対象イベント（削除対象を含む） */}
                <Card
                    className={styles.statCardInfo}
                    onClick={() => handleCardClick("targetEvents")}
                    style={{ cursor: "pointer" }}
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
                    onClick={() => handleCardClick("linked")}
                    style={{ cursor: "pointer" }}
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
                            休暇：{0}件 / 履歴：{0}件 / AI：{0}件
                        </div>
                        <div className={styles.statSubText}>
                            勤務時間：{0}件 / 手動：
                            {0}件
                        </div>
                    </div>
                </Card>

                {/* 未紐づけ */}
                <Card
                    className={unlinkedCount > 0 ? styles.statCardWarning : styles.statCardSuccess}
                    onClick={() => handleCardClick("unlinked")}
                    style={{ cursor: "pointer" }}
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
                            {unlinkedCount > 0
                                ? "手動紐づけ/AIによる自動紐づけを実施してください。"
                                : "すべて紐づけ完了"}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
