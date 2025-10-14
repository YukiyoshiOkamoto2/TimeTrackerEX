/**
 * Setting Navigation Item Component
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 */

import { makeStyles, tokens } from "@fluentui/react-components";
import { ChevronRight20Regular } from "@fluentui/react-icons";
import { memo, type ReactNode } from "react";
import { Card } from "../../../../components/card";

const useStyles = makeStyles({
    navigationItem: {
        cursor: "pointer",
        transition: `background-color ${tokens.durationNormal} ${tokens.curveEasyEase}`,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
        "&:active": {
            backgroundColor: tokens.colorNeutralBackground1Pressed,
        },
    },
    content: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: tokens.spacingVerticalL,
        paddingRight: tokens.spacingHorizontalM,
    },
    leftContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
        flex: 1,
    },
    title: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    description: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
    },
    rightContent: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        marginLeft: tokens.spacingHorizontalL,
    },
    badge: {
        fontSize: tokens.fontSizeBase200,
    },
    chevron: {
        color: tokens.colorNeutralForeground3,
    },
});

export type SettingNavigationItemProps = {
    title: string;
    description?: string;
    badge?: ReactNode;
    onClick: () => void;
};

/**
 * Windows設定画面スタイルのナビゲーション項目
 * 項目全体がクリック可能で、右側にバッジとシェブロンアイコンを表示
 */
export const SettingNavigationItem = memo(function SettingNavigationItem({
    title,
    description,
    badge,
    onClick,
}: SettingNavigationItemProps) {
    const styles = useStyles();

    return (
        <Card className={styles.navigationItem} onClick={onClick}>
            <div className={styles.content}>
                <div className={styles.leftContent}>
                    <div className={styles.title}>{title}</div>
                    {description && <div className={styles.description}>{description}</div>}
                </div>
                <div className={styles.rightContent}>
                    {badge && <div className={styles.badge}>{badge}</div>}
                    <ChevronRight20Regular className={styles.chevron} />
                </div>
            </div>
        </Card>
    );
});
