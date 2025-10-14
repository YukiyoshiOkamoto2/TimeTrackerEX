import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowRight20Regular, ChevronDown20Regular, ChevronUp20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

// アニメーション関連の定数
const ACTION_HOVER_SCALE = 0.98;
const ACTION_CLICK_SCALE = 1.02;
const ACTION_ANIMATION_DURATION_MS = 500; // tokens.durationSlowerに相当
const EXPANDABLE_SLIDE_DISTANCE = "-6px";

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
    // actionバリアント用：ホバー時に左側を固定して右側だけ縮む
    actionHover: {
        transform: `scaleX(${ACTION_HOVER_SCALE})`,
        transformOrigin: "left center",
        transitionDuration: tokens.durationFaster,
        transitionTimingFunction: tokens.curveEasyEase,
        transitionProperty: "transform",
    },
    // actionバリアント用：クリック時に右方向に伸びるアニメーション
    actionActive: {
        animationName: {
            "0%": {
                transform: `scaleX(${ACTION_HOVER_SCALE})`,
                transformOrigin: "left center",
            },
            "50%": {
                transform: `scaleX(${ACTION_CLICK_SCALE})`,
                transformOrigin: "left center",
            },
            "100%": {
                transform: "scaleX(1)",
                transformOrigin: "left center",
            },
        },
        animationDuration: tokens.durationFaster,
        animationTimingFunction: tokens.curveEasyEase,
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
        // ドロップダウンが伸びるようなアニメーション
        animationName: {
            from: {
                opacity: 0,
                transform: `translateY(${EXPANDABLE_SLIDE_DISTANCE})`,
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationSlower,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
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
    const [isActionAnimating, setIsActionAnimating] = useState(false);
    const [isActionHovering, setIsActionHovering] = useState(false);

    // バリアント関連の判定（メモ化）
    const isActionVariant = useMemo(() => variant === "action", [variant]);
    const isExpandableVariant = useMemo(() => variant === "expandable", [variant]);
    const isInteractive = useMemo(
        () => (isActionVariant && !!onClick) || isExpandableVariant,
        [isActionVariant, isExpandableVariant, onClick],
    );
    const showChevron = isExpandableVariant;
    const showArrow = isActionVariant && !!onClick;

    // クリックハンドラー（メモ化）
    const handleClick = useCallback(() => {
        if (disabled) return;

        if (isExpandableVariant) {
            const newExpanded = !isExpanded;
            setIsExpanded(newExpanded);
            onExpandChange?.(newExpanded);
        } else if (isActionVariant) {
            // クリックアニメーションをトリガー
            setIsActionHovering(false); // ホバー状態を解除
            setIsActionAnimating(true);
            // アニメーション終了後にリセット
            setTimeout(() => {
                setIsActionAnimating(false);
            }, ACTION_ANIMATION_DURATION_MS);
            onClick?.();
        }
    }, [disabled, isExpandableVariant, isActionVariant, isExpanded, onExpandChange, onClick]);

    // マウスイベントハンドラー（メモ化）
    const handleMouseEnter = useCallback(() => {
        if (isActionVariant && !disabled) {
            setIsActionHovering(true);
        }
    }, [isActionVariant, disabled]);

    const handleMouseLeave = useCallback(() => {
        if (isActionVariant) {
            setIsActionHovering(false);
        }
    }, [isActionVariant]);

    // クラス名の計算（メモ化）
    const cardClassName = useMemo(
        () =>
            mergeClasses(
                styles.card,
                isInteractive && styles.interactive,
                disabled && styles.disabled,
                isActionVariant && isActionHovering && !isActionAnimating && styles.actionHover,
                isActionVariant && isActionAnimating && styles.actionActive,
                className,
            ),
        [
            styles.card,
            styles.interactive,
            styles.disabled,
            styles.actionHover,
            styles.actionActive,
            isInteractive,
            disabled,
            isActionVariant,
            isActionHovering,
            isActionAnimating,
            className,
        ],
    );

    const headerClassName = useMemo(
        () => mergeClasses(styles.header, isInteractive && styles.headerClickable),
        [styles.header, styles.headerClickable, isInteractive],
    );

    const contentClassName = useMemo(
        () => mergeClasses(styles.expandableContent, isExpanded ? styles.expanded : styles.collapsed),
        [styles.expandableContent, styles.expanded, styles.collapsed, isExpanded],
    );

    // キーボードイベントハンドラー（メモ化）
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (isInteractive && !disabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleClick();
            }
        },
        [isInteractive, disabled, handleClick],
    );

    // ヘッダーコンテンツの描画
    const renderHeaderContent = useMemo(
        () => (
            <div className={styles.headerContent}>
                <div className={styles.title}>
                    {icon && <span className={styles.titleIcon}>{icon}</span>}
                    {title}
                </div>
                {description && <div className={styles.description}>{description}</div>}
            </div>
        ),
        [styles.headerContent, styles.title, styles.titleIcon, styles.description, icon, title, description],
    );

    // 右側アイコンの描画
    const renderRightIcon = useMemo(() => {
        if (showChevron) {
            return (
                <div className={styles.rightIcon}>{isExpanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}</div>
            );
        }
        if (showArrow) {
            return (
                <div className={styles.rightIcon}>
                    <ArrowRight20Regular />
                </div>
            );
        }
        return null;
    }, [styles.rightIcon, showChevron, showArrow, isExpanded]);

    return (
        <div className={cardClassName} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div
                className={headerClassName}
                onClick={handleClick}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive && !disabled ? 0 : -1}
                aria-expanded={isExpandableVariant ? isExpanded : undefined}
                aria-disabled={disabled}
                onKeyDown={handleKeyDown}
            >
                {renderHeaderContent}
                {renderRightIcon}
            </div>
            {isExpandableVariant && children && (
                <div className={contentClassName}>
                    {isExpanded && <div className={styles.expandableContentInner}>{children}</div>}
                </div>
            )}
        </div>
    );
}
