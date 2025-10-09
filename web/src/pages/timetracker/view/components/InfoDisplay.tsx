import type { ReactNode } from "react";
import { useCommonViewStyles } from "../styles/commonStyles";

/**
 * 情報項目のProps
 */
export interface InfoItemProps {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
}

/**
 * 情報項目コンポーネント
 */
export function InfoItem({ icon, label, value }: InfoItemProps) {
    const styles = useCommonViewStyles();

    return (
        <div className={styles.infoItem}>
            {icon && <span className={styles.infoIcon}>{icon}</span>}
            <span className={styles.infoLabel}>{label}:</span>
            <span>{value}</span>
        </div>
    );
}
