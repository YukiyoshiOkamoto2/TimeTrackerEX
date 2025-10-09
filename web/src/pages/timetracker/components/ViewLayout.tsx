import type { ReactNode } from "react";
import { useCommonViewStyles } from "../view/styles/commonStyles";

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
 * ViewヘッダーコンテナのProps
 */
export interface ViewHeaderProps {
    left: ReactNode;
    right?: ReactNode;
}

/**
 * Viewヘッダーコンテナ（左右2カラム）
 */
export function ViewHeader({ left, right }: ViewHeaderProps) {
    const styles = useCommonViewStyles();

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
    const styles = useCommonViewStyles();

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
    const styles = useCommonViewStyles();

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
    const styles = useCommonViewStyles();

    return (
        <div
            className={styles.actionButtonContainer}
            style={{ justifyContent: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end" }}
        >
            {children}
        </div>
    );
}
