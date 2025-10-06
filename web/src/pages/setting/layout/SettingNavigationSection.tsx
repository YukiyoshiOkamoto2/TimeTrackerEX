import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
    },
    header: {
        paddingLeft: tokens.spacingHorizontalS,
        paddingBottom: tokens.spacingVerticalXXS,
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    sectionDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
        lineHeight: tokens.lineHeightBase200,
    },
});

export type SettingNavigationSectionProps = {
    title: string;
    description?: string;
    children: ReactNode;
};

/**
 * ナビゲーション項目用のセクション
 * タイトルと説明を持ち、内側に枠線のないナビゲーション項目を配置
 */
export function SettingNavigationSection({ title, description, children }: SettingNavigationSectionProps) {
    const styles = useStyles();

    return (
        <div className={styles.section}>
            <div className={styles.header}>
                <div className={styles.sectionTitle}>{title}</div>
                {description && <div className={styles.sectionDescription}>{description}</div>}
            </div>
            {children}
        </div>
    );
}
