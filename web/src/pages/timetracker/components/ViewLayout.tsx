import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";
/**
 * ViewヘッダーコンテナのProps
 */
export interface ViewHeaderProps {
    left: ReactNode;
    right?: ReactNode;
}

const useStyles = makeStyles({
    // ヘッダーコンテナ
    headerContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: tokens.spacingVerticalL,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        alignItems: "center",
    },

    // セクション
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    sectionTitle: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXXS,
    },
    sectionIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground2,
    },

    // アクションボタンコンテナ
    actionButtonContainer: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: tokens.spacingVerticalXL,
        gap: tokens.spacingHorizontalM,
    },
});
/**
 * View共通レイアウトコンポーネントのProps
 */
export interface ViewContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * Viewのメインコンテナ
 */
export function ViewContainer({ children, className }: ViewContainerProps) {
    return <div className={className}>{children}</div>;
}

/**
 * Viewヘッダーコンテナ（左右2カラム）
 */
export function ViewHeader({ left, right }: ViewHeaderProps) {
    const styles = useStyles();

    return (
        <div className={styles.headerContainer}>
            <div className={styles.headerLeft}>{left}</div>
            {right && <div className={styles.headerRight}>{right}</div>}
        </div>
    );
}

/**
 * Viewセクションコンテナ
 */
export function ViewSection({ children, className }: ViewContainerProps) {
    const styles = useStyles();

    return <div className={`${styles.section} ${className || ""}`}>{children}</div>;
}

/**
 * セクションタイトルのProps
 */
export interface SectionTitleProps {
    icon?: ReactNode;
    children: ReactNode;
}

/**
 * セクションタイトル（アイコン + テキスト）
 */
export function SectionTitle({ icon, children }: SectionTitleProps) {
    const styles = useStyles();

    return (
        <div className={styles.sectionTitle}>
            {icon && <span className={styles.sectionIcon}>{icon}</span>}
            {children}
        </div>
    );
}

/**
 * アクションボタンコンテナのProps
 */
export interface ActionButtonContainerProps {
    children: ReactNode;
    align?: "left" | "center" | "right";
}

/**
 * アクションボタンコンテナ
 */
export function ActionButtonContainer({ children, align = "right" }: ActionButtonContainerProps) {
    const styles = useStyles();

    return (
        <div
            className={styles.actionButtonContainer}
            style={{ justifyContent: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end" }}
        >
            {children}
        </div>
    );
}
