import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import { IgnorableEventPattern } from "../../../types/settings";
import { SettingContentSection, SettingPageLayout } from "../layout";
import { IgnorableEventsEditor } from "../layout/IgnorableEventsEditor";

const useStyles = makeStyles({
    header: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingVerticalL,
    },
    helpText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginBottom: tokens.spacingVerticalL,
        lineHeight: tokens.lineHeightBase300,
    },
});

interface IgnorableEventsSettingsProps {
    patterns: IgnorableEventPattern[];
    onChange: (patterns: IgnorableEventPattern[]) => void;
    onBack: () => void;
}

export function IgnorableEventsSettings({ patterns, onChange, onBack }: IgnorableEventsSettingsProps) {
    const styles = useStyles();

    return (
        <SettingPageLayout
            title="無視可能イベント設定"
            subtitle="処理から除外するイベント名のパターンと一致モードを設定します。"
        >
            <div className={styles.header}>
                <Button
                    appearance="subtle"
                    icon={<ArrowLeft20Regular />}
                    onClick={onBack}
                    size="large"
                    aria-label="戻る"
                >
                    戻る
                </Button>
            </div>

            <SettingContentSection title="イベントパターン">
                <div className={styles.helpText}>
                    <strong>一致モードについて:</strong>
                    <br />• <strong>部分一致</strong>: パターンがイベント名のどこかに含まれていればマッチ
                    <br />
                    　例: パターン"MTG" → "朝会MTG", "定例MTG", "MTG資料作成"すべてマッチ
                    <br />• <strong>前方一致</strong>: イベント名がパターンで始まる場合のみマッチ
                    <br />
                    　例: パターン"MTG" → "MTG資料作成"はマッチ、"朝会MTG"はマッチしない
                    <br />• <strong>後方一致</strong>: イベント名がパターンで終わる場合のみマッチ
                    <br />
                    　例: パターン"MTG" → "朝会MTG"はマッチ、"MTG資料作成"はマッチしない
                </div>
                <IgnorableEventsEditor patterns={patterns} onChange={onChange} />
            </SettingContentSection>
        </SettingPageLayout>
    );
}
