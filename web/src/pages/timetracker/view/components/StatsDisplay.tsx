import type { ReactNode } from "react";
import { useCommonViewStyles } from "../styles/commonStyles";

/**
 * 統計項目のProps
 */
export interface StatItemProps {
    label: string;
    value: string | number;
    subText?: string;
    variant?: "default" | "success" | "warning" | "error";
}

/**
 * 統計項目コンポーネント
 */
export function StatItem({ label, value, subText, variant = "default" }: StatItemProps) {
    const styles = useCommonViewStyles();

    const getValueClass = () => {
        switch (variant) {
            case "success":
                return `${styles.statValue} ${styles.statValueSuccess}`;
            case "warning":
                return `${styles.statValue} ${styles.statValueWarning}`;
            case "error":
                return `${styles.statValue} ${styles.statValueError}`;
            default:
                return styles.statValue;
        }
    };

    return (
        <div className={styles.statItem}>
            <span className={styles.statLabel}>{label}</span>
            <span className={getValueClass()}>{value}</span>
            {subText && <span className={styles.statSubText}>{subText}</span>}
        </div>
    );
}

/**
 * 統計グリッドのProps
 */
export interface StatsGridProps {
    children: ReactNode;
}

/**
 * 統計グリッドコンテナ
 */
export function StatsGrid({ children }: StatsGridProps) {
    const styles = useCommonViewStyles();

    return <div className={styles.statsGrid}>{children}</div>;
}
