/**
 * AI自動紐づけセクションコンポーネント
 */

import { InteractiveCard } from "@/components/card";
import { Button, Input, makeStyles, Switch, tokens } from "@fluentui/react-components";
import { History24Regular, Key24Regular, Sparkle24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    section: {
        marginBottom: tokens.spacingVerticalS,
    },
    settingRow: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottom: "none",
        },
    },
    settingInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        flex: 1,
    },
    settingTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    settingDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: "1.3",
    },
    settingControl: {
        display: "flex",
        alignItems: "center",
        marginLeft: tokens.spacingHorizontalL,
    },
    settingIcon: {
        fontSize: "18px",
        color: tokens.colorBrandForeground1,
    },
    tokenInput: {
        minWidth: "300px",
    },
});

export interface AiLinkingSectionProps {
    token: string;
    onTokenChange: (token: string) => void;
    useHistory: boolean;
    onUseHistoryChange: (useHistory: boolean) => void;
    onStartLinking: () => void;
}

/**
 * AI自動紐づけセクション
 */
export function AiLinkingSection({
    token,
    onTokenChange,
    useHistory,
    onUseHistoryChange,
    onStartLinking,
}: AiLinkingSectionProps) {
    const styles = useStyles();

    return (
        <div className={styles.section}>
            <InteractiveCard
                title="AIによる自動紐づけ"
                description="AIを使用して未紐づけのイベントを自動的にWorkItemに紐づけます"
                icon={<Sparkle24Regular />}
                variant="expandable"
            >
                {/* トークン設定 */}
                <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingTitle}>
                            <Key24Regular className={styles.settingIcon} />
                            APIトークン
                        </div>
                        <div className={styles.settingDescription}>
                            OpenAI APIトークンを入力してください。AIによる自動紐づけに使用されます。
                        </div>
                    </div>
                    <div className={styles.settingControl}>
                        <Input
                            placeholder="トークンを入力"
                            value={token}
                            onChange={(e) => onTokenChange(e.target.value)}
                            className={styles.tokenInput}
                        />
                    </div>
                </div>

                {/* 履歴の参照設定 */}
                <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingTitle}>
                            <History24Regular className={styles.settingIcon} />
                            履歴の参照
                        </div>
                        <div className={styles.settingDescription}>
                            過去の紐づけ履歴を参照してAIの精度を向上させます。履歴データが使用されます。
                        </div>
                    </div>
                    <div className={styles.settingControl}>
                        <Switch checked={useHistory} onChange={(e) => onUseHistoryChange(e.currentTarget.checked)} />
                    </div>
                </div>

                {/* AI開始ボタン */}
                <div className={styles.settingRow}>
                    <Button
                        appearance="primary"
                        icon={<Sparkle24Regular />}
                        onClick={onStartLinking}
                        style={{ margin: "12px 0 0 auto" }}
                    >
                        AI自動紐づけを開始
                    </Button>
                </div>
            </InteractiveCard>
        </div>
    );
}
