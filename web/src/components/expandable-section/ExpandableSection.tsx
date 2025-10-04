import { makeStyles, tokens } from "@fluentui/react-components";
import { ChevronDown20Regular, ChevronUp20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useState } from "react";

const useStyles = makeStyles({
    container: {
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
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground2Hover,
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
        cursor: "pointer",
        userSelect: "none",
        minHeight: "64px",
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
    },
    description: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
    },
    chevronIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorNeutralForeground2,
        transitionDuration: tokens.durationNormal,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "transform",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        overflow: "hidden",
        transitionDuration: tokens.durationSlow,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "max-height, opacity",
    },
    contentInner: {
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalXL,
        paddingLeft: tokens.spacingHorizontalXL,
        paddingRight: tokens.spacingHorizontalXL,
        borderTopWidth: tokens.strokeWidthThin,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorNeutralStroke2,
    },
    collapsed: {
        maxHeight: "0",
        opacity: 0,
    },
    expanded: {
        maxHeight: "2000px",
        opacity: 1,
    },
});

export type ExpandableSectionProps = {
    title: string;
    description?: string;
    children: ReactNode;
    defaultExpanded?: boolean;
    disabled?: boolean;
    onExpandChange?: (expanded: boolean) => void;
};

export function ExpandableSection({
    title,
    description,
    children,
    defaultExpanded = false,
    disabled = false,
    onExpandChange,
}: ExpandableSectionProps) {
    const styles = useStyles();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = () => {
        if (disabled) return;

        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);

        if (onExpandChange) {
            onExpandChange(newExpanded);
        }
    };

    return (
        <div className={styles.container}>
            <div
                className={styles.header}
                onClick={handleToggle}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-expanded={isExpanded}
                aria-disabled={disabled}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
            >
                <div className={styles.headerContent}>
                    <div className={styles.title}>{title}</div>
                    {description && <div className={styles.description}>{description}</div>}
                </div>
                <div className={styles.chevronIcon}>
                    {isExpanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                </div>
            </div>
            <div className={`${styles.content} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                {isExpanded && <div className={styles.contentInner}>{children}</div>}
            </div>
        </div>
    );
}
