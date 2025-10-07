import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

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

export function SettingItem({ label, description, control, required }: SettingItemProps) {
    const styles = useStyles();

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <div className={styles.itemLabel}>
                    {label}
                    {required && <span className={styles.itemLabelRequired}>*</span>}
                </div>
                {description && <div className={styles.itemDescription}>{description}</div>}
            </div>
            {control && <div className={styles.itemControl}>{control}</div>}
        </div>
    );
}
