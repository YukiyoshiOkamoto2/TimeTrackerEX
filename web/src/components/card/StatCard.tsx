/**
 * StatCard Component
 *
 * 統計情報を表示するカードコンポーネント
 */

import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

export interface StatCardProps {
    /** アイコン要素 */
    icon: ReactNode;
    /** ラベルテキスト */
    label: string;
    /** 値 */
    value: string | number;
    /** 単位（オプション） */
    unit?: string;
    /** カスタムクラス名（オプション） */
    className?: string;
}

const useStyles = makeStyles({
    statCard: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        transition: "all 0.2s ease",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            transform: "translateY(-2px)",
            boxShadow: tokens.shadow8,
        },
    },
    statHeader: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    statIcon: {
        fontSize: "20px",
        color: tokens.colorBrandForeground1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    statLabel: {
        fontSize: "12px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground2,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    statValue: {
        fontSize: "28px",
        fontWeight: "700",
        color: tokens.colorBrandForeground1,
        lineHeight: "1",
    },
});

/**
 * 統計情報カードコンポーネント
 */
export function StatCard({ icon, label, value, unit, className }: StatCardProps) {
    const styles = useStyles();

    return (
        <div className={`${styles.statCard} ${className || ""}`}>
            <div className={styles.statHeader}>
                <div className={styles.statIcon}>{icon}</div>
                <div className={styles.statLabel}>{label}</div>
            </div>
            <div className={styles.statValue}>
                {value}
                {unit}
            </div>
        </div>
    );
}
