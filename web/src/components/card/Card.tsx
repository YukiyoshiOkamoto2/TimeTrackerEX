import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    card: {
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        padding: tokens.spacingVerticalXXL,
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
    },
    hoverable: {
        cursor: "pointer",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground2Hover,
            borderTopColor: tokens.colorNeutralStroke2,
            borderBottomColor: tokens.colorNeutralStroke2,
            borderLeftColor: tokens.colorNeutralStroke2,
            borderRightColor: tokens.colorNeutralStroke2,
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
        },
    },
    clickable: {
        cursor: "pointer",
    },
});

export type CardProps = {
    children: ReactNode;
    hoverable?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
};

export function Card({ children, hoverable = false, onClick, className, style }: CardProps) {
    const styles = useStyles();

    const cardClassName = mergeClasses(
        styles.card,
        hoverable && styles.hoverable,
        onClick && styles.clickable,
        className,
    );

    return (
        <div className={cardClassName} onClick={onClick} style={style}>
            {children}
        </div>
    );
}
