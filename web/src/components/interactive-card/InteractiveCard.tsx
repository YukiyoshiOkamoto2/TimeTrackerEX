import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowRight20Regular, ChevronDown20Regular, ChevronUp20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useState } from "react";

const useStyles = makeStyles({
    card: {
        backgroundColor: tokens.colorNeutralBackground2,
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
        transitionDuration: tokens.durationNormal,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "all",
        overflow: "hidden",
    },
    interactive: {
        cursor: "pointer",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground2Hover,
            borderTopColor: tokens.colorNeutralStroke2,
            borderBottomColor: tokens.colorNeutralStroke2,
            borderLeftColor: tokens.colorNeutralStroke2,
            borderRightColor: tokens.colorNeutralStroke2,
            boxShadow: tokens.shadow4,
        },
    },
    disabled: {
        opacity: 0.6,
        cursor: "not-allowed",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground2,
            borderTopColor: tokens.colorNeutralStroke1,
            borderBottomColor: tokens.colorNeutralStroke1,
            borderLeftColor: tokens.colorNeutralStroke1,
            borderRightColor: tokens.colorNeutralStroke1,
            boxShadow: "none",
        },
        "&:active": {
            backgroundColor: tokens.colorNeutralBackground2,
            transform: "none",
        },
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
        paddingLeft: tokens.spacingHorizontalXL,
        paddingRight: tokens.spacingHorizontalXL,
        minHeight: "64px",
        transitionDuration: tokens.durationFast,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "background-color",
    },
    headerClickable: {
        cursor: "pointer",
        userSelect: "none",
    },
    headerContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
        flex: 1,
    },
    title: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        lineHeight: tokens.lineHeightBase400,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    titleIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorBrandForeground1,
        display: "flex",
        alignItems: "center",
    },
    description: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
        marginTop: tokens.spacingVerticalXXS,
    },
    rightIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: tokens.colorNeutralForeground2,
        marginLeft: tokens.spacingHorizontalM,
        fontSize: tokens.fontSizeBase500,
        transitionDuration: tokens.durationFast,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "transform, color",
    },
    expandableContent: {
        overflow: "hidden",
        transitionDuration: tokens.durationGentle,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "max-height, opacity, padding",
    },
    expandableContentInner: {
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalL,
        paddingLeft: tokens.spacingHorizontalXL,
        paddingRight: tokens.spacingHorizontalXL,
        borderTopWidth: tokens.strokeWidthThin,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorNeutralStroke2,
        backgroundColor: tokens.colorNeutralBackground1,
    },
    collapsed: {
        maxHeight: "0",
        opacity: 0,
        paddingTop: "0",
        paddingBottom: "0",
    },
    expanded: {
        maxHeight: "3000px",
        opacity: 1,
    },
});

export type InteractiveCardVariant = "action" | "expandable";

export type InteractiveCardProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    variant?: InteractiveCardVariant;
    disabled?: boolean;
    defaultExpanded?: boolean;
    onClick?: () => void;
    onExpandChange?: (expanded: boolean) => void;
    children?: ReactNode;
    className?: string;
};

/**
 * 統合されたインタラクティブカードコンポーネント
 * - variant="action": クリック可能なアクションボタンとして機能
 * - variant="expandable": 展開可能なセクションとして機能
 */
export function InteractiveCard({
    title,
    description,
    icon,
    variant = "action",
    disabled = false,
    defaultExpanded = false,
    onClick,
    onExpandChange,
    children,
    className,
}: InteractiveCardProps) {
    const styles = useStyles();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleClick = () => {
        if (disabled) return;

        if (variant === "expandable") {
            const newExpanded = !isExpanded;
            setIsExpanded(newExpanded);
            onExpandChange?.(newExpanded);
        } else if (variant === "action") {
            onClick?.();
        }
    };

    const isInteractive = (variant === "action" && onClick) || variant === "expandable";
    const showChevron = variant === "expandable";
    const showArrow = variant === "action" && onClick;

    const cardClassName = mergeClasses(
        styles.card,
        isInteractive && styles.interactive,
        disabled && styles.disabled,
        className,
    );

    const headerClassName = mergeClasses(styles.header, isInteractive && styles.headerClickable);

    const contentClassName = mergeClasses(styles.expandableContent, isExpanded ? styles.expanded : styles.collapsed);

    return (
        <div className={cardClassName}>
            <div
                className={headerClassName}
                onClick={handleClick}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive && !disabled ? 0 : -1}
                aria-expanded={variant === "expandable" ? isExpanded : undefined}
                aria-disabled={disabled}
                onKeyDown={(e) => {
                    if (isInteractive && !disabled && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <div className={styles.headerContent}>
                    <div className={styles.title}>
                        {icon && <span className={styles.titleIcon}>{icon}</span>}
                        {title}
                    </div>
                    {description && <div className={styles.description}>{description}</div>}
                </div>
                {showChevron && (
                    <div className={styles.rightIcon}>
                        {isExpanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                    </div>
                )}
                {showArrow && (
                    <div className={styles.rightIcon}>
                        <ArrowRight20Regular />
                    </div>
                )}
            </div>
            {variant === "expandable" && children && (
                <div className={contentClassName}>
                    {isExpanded && <div className={styles.expandableContentInner}>{children}</div>}
                </div>
            )}
        </div>
    );
}
