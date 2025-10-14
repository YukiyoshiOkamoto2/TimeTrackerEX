import { Badge, makeStyles, Switch, tokens } from "@fluentui/react-components";
import {
    CheckmarkCircle20Filled,
    ChevronDown20Regular,
    ChevronRight20Regular,
    Info20Regular,
} from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { useState } from "react";
import { Card } from "../../../../components/card";

const useStyles = makeStyles({
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    requiredBadge: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXXS,
    },
    optionalBadge: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXXS,
    },
    sectionDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
    },
    collapsibleCard: {
        cursor: "pointer",
        transition: `background-color ${tokens.durationNormal} ${tokens.curveEasyEase}`,
    },
    collapsibleHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: tokens.spacingVerticalL,
        userSelect: "none",
    },
    collapsibleLeft: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
    },
    collapsibleTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    collapsibleDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
    },
    collapsibleRight: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    chevron: {
        color: tokens.colorNeutralForeground3,
    },
    collapsibleContent: {
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(-10px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
});

export type SettingSectionProps = {
    title: string;
    description?: string;
    /** 必須項目の場合true、省略可能の場合false、指定なしの場合はバッジを表示しない */
    required?: boolean;
    /** 折りたたみ可能にする場合true */
    collapsible?: boolean;
    /** 折りたたみ時の有効/無効スイッチの状態 */
    enabled?: boolean;
    /** 有効/無効スイッチの変更イベント */
    onEnabledChange?: (enabled: boolean) => void;
    /** デフォルトで展開するか */
    defaultExpanded?: boolean;
    children: ReactNode;
};

export function SettingSection({
    title,
    description,
    required,
    collapsible = false,
    enabled = false,
    onEnabledChange,
    defaultExpanded = false,
    children,
}: SettingSectionProps) {
    const styles = useStyles();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded || enabled);

    const handleHeaderClick = (e: React.MouseEvent) => {
        if (!collapsible) return;
        // スイッチ領域のクリック時はトグルしない
        const target = e.target as HTMLElement;
        const switchElement = target.closest('[role="switch"]') || target.closest(".fui-Switch");
        if (switchElement) {
            return;
        }
        setIsExpanded(!isExpanded);
    };

    const handleSwitchClick = (e: React.MouseEvent) => {
        // ヘッダーのクリックイベントが発火しないようにする
        e.stopPropagation();
    };

    const handleSwitchChange = (_ev: React.ChangeEvent<HTMLInputElement>, data: { checked: boolean }) => {
        onEnabledChange?.(data.checked);
        if (data.checked) {
            setIsExpanded(true);
        }
    };

    if (collapsible) {
        return (
            <div className={styles.section}>
                <div>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>{title}</div>
                        {required === true && (
                            <Badge
                                appearance="filled"
                                color="danger"
                                icon={<CheckmarkCircle20Filled />}
                                className={styles.requiredBadge}
                            >
                                必須
                            </Badge>
                        )}
                        {required === false && (
                            <Badge
                                appearance="outline"
                                color="informative"
                                icon={<Info20Regular />}
                                className={styles.optionalBadge}
                            >
                                省略可
                            </Badge>
                        )}
                    </div>
                </div>
                <Card className={styles.collapsibleCard}>
                    <div className={styles.collapsibleHeader} onClick={handleHeaderClick}>
                        <div className={styles.collapsibleLeft}>
                            <div className={styles.collapsibleTitle}>{title}の設定</div>
                            {description && <div className={styles.collapsibleDescription}>{description}</div>}
                        </div>
                        <div className={styles.collapsibleRight}>
                            <div onClick={handleSwitchClick}>
                                <Switch checked={enabled} onChange={handleSwitchChange} />
                            </div>
                            <div className={styles.chevron}>
                                {isExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                            </div>
                        </div>
                    </div>
                    {isExpanded && <div className={styles.collapsibleContent}>{children}</div>}
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <div>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>{title}</div>
                    {required === true && (
                        <Badge
                            appearance="filled"
                            color="danger"
                            icon={<CheckmarkCircle20Filled />}
                            className={styles.requiredBadge}
                        >
                            必須
                        </Badge>
                    )}
                    {required === false && (
                        <Badge
                            appearance="outline"
                            color="informative"
                            icon={<Info20Regular />}
                            className={styles.optionalBadge}
                        >
                            省略可
                        </Badge>
                    )}
                </div>
                {description && <div className={styles.sectionDescription}>{description}</div>}
            </div>
            <Card>{children}</Card>
        </div>
    );
}
