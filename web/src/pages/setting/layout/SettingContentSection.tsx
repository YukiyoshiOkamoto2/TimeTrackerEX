import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    section: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusLarge,
        padding: tokens.spacingVerticalXXL,
        boxShadow: tokens.shadow4,
    },
    header: {
        marginBottom: tokens.spacingVerticalL,
    },
    title: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXS,
    },
    description: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase300,
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
    },
});

export interface SettingContentSectionProps {
    title?: string;
    description?: string;
    children: ReactNode;
}

/**
 * 設定コンテンツのセクションコンポーネント
 * カードスタイルのコンテナを提供します
 *
 * @example
 * ```tsx
 * <SettingContentSection
 *   title="イベントパターン"
 *   description="一致モードを選択してパターンを設定できます"
 * >
 *   <IgnorableEventsEditor />
 * </SettingContentSection>
 * ```
 */
export function SettingContentSection({ title, description, children }: SettingContentSectionProps) {
    const styles = useStyles();

    return (
        <div className={styles.section}>
            {(title || description) && (
                <div className={styles.header}>
                    {title && <h2 className={styles.title}>{title}</h2>}
                    {description && <p className={styles.description}>{description}</p>}
                </div>
            )}
            <div className={styles.content}>{children}</div>
        </div>
    );
}
