import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowRight20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    button: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalM,
        paddingLeft: tokens.spacingHorizontalL,
        paddingRight: tokens.spacingHorizontalL,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        borderTopWidth: tokens.strokeWidthThin,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorNeutralStroke1,
        borderBottomWidth: tokens.strokeWidthThin,
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke1,
        borderLeftWidth: tokens.strokeWidthThin,
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorNeutralStroke1,
        borderRightWidth: tokens.strokeWidthThin,
        borderRightStyle: "solid",
        borderRightColor: tokens.colorNeutralStroke1,
        cursor: "pointer",
        transitionDuration: tokens.durationFast,
        transitionTimingFunction: tokens.curveLinear,
        transitionProperty: "all",
        minHeight: "64px",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            borderTopColor: tokens.colorNeutralStroke1Hover,
            borderBottomColor: tokens.colorNeutralStroke1Hover,
            borderLeftColor: tokens.colorNeutralStroke1Hover,
            borderRightColor: tokens.colorNeutralStroke1Hover,
        },
        "&:active": {
            backgroundColor: tokens.colorNeutralBackground1Pressed,
        },
    },
    disabled: {
        opacity: 0.5,
        cursor: "not-allowed",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1,
            borderTopColor: tokens.colorNeutralStroke1,
            borderBottomColor: tokens.colorNeutralStroke1,
            borderLeftColor: tokens.colorNeutralStroke1,
            borderRightColor: tokens.colorNeutralStroke1,
        },
        "&:active": {
            backgroundColor: tokens.colorNeutralBackground1,
        },
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
        flex: 1,
    },
    title: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        lineHeight: tokens.lineHeightBase300,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    titleIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorBrandForeground1,
    },
    description: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
    },
    chevronIcon: {
        display: "flex",
        alignItems: "center",
        color: tokens.colorNeutralForeground3,
        marginLeft: tokens.spacingHorizontalM,
    },
});

export type ActionButtonProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
};

export function ActionButton({ title, description, icon, disabled = false, onClick, className }: ActionButtonProps) {
    const styles = useStyles();

    const handleClick = () => {
        if (!disabled && onClick) {
            onClick();
        }
    };

    return (
        <div
            className={mergeClasses(styles.button, disabled && styles.disabled, className)}
            onClick={handleClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
        >
            <div className={styles.content}>
                <div className={styles.title}>
                    {icon && <span className={styles.titleIcon}>{icon}</span>}
                    {title}
                </div>
                {description && <div className={styles.description}>{description}</div>}
            </div>
            <div className={styles.chevronIcon}>
                <ArrowRight20Regular />
            </div>
        </div>
    );
}
