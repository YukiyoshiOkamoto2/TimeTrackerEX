/**
 * Setting Item Component
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useMemo でラベル表示をメモ化
 */

import { makeStyles, tokens } from "@fluentui/react-components";
import { memo, useMemo, type ReactNode } from "react";

const useStyles = makeStyles({
    item: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
        borderBottomWidth: tokens.strokeWidthThin,
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    itemContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
        flex: 1,
    },
    itemLabel: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
    },
    itemLabelRequired: {
        color: tokens.colorPaletteRedForeground1,
        marginLeft: tokens.spacingHorizontalXXS,
    },
    itemDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    itemControl: {
        marginLeft: tokens.spacingHorizontalL,
    },
});

export type SettingItemProps = {
    label: string;
    description?: string;
    control?: ReactNode;
    required?: boolean;
};

export const SettingItem = memo(function SettingItem({ label, description, control, required }: SettingItemProps) {
    const styles = useStyles();

    // ラベルコンテンツをメモ化
    const labelContent = useMemo(
        () => (
            <>
                {label}
                {required && <span className={styles.itemLabelRequired}>*</span>}
            </>
        ),
        [label, required, styles.itemLabelRequired],
    );

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <div className={styles.itemLabel}>{labelContent}</div>
                {description && <div className={styles.itemDescription}>{description}</div>}
            </div>
            {control && <div className={styles.itemControl}>{control}</div>}
        </div>
    );
});
