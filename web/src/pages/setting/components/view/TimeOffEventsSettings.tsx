import { Button, Input, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import type { TimeOffEventPattern } from "../../../../types/settings";
import { SettingContentSection, SettingPageLayout } from "../layout";
import { SettingItem } from "../ui";
import { EventPatternEditor } from "../ui/EventPatternEditor";

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

interface TimeOffEventsSettingsProps {
    patterns: TimeOffEventPattern[];
    workItemId: number;
    onChange: (patterns: TimeOffEventPattern[], workItemId: number) => void;
    onBack: () => void;
}

export function TimeOffEventsSettings({ patterns, workItemId, onChange, onBack }: TimeOffEventsSettingsProps) {
    const styles = useStyles();

    const handlePatternsChange = (newPatterns: TimeOffEventPattern[]) => {
        onChange(newPatterns, workItemId);
    };

    const handleWorkItemIdChange = (newWorkItemId: number) => {
        onChange(patterns, newWorkItemId);
    };

    return (
        <SettingPageLayout
            title="休暇イベント設定"
            subtitle="休暇イベントとして扱うイベント名のパターンとWorkItemIDを設定します。"
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

            <SettingContentSection title="休暇イベント名パターン">
                <div className={styles.helpText}>
                    <strong>一致モードについて:</strong>
                    <br />• <strong>部分一致</strong>: パターンがイベント名のどこかに含まれていればマッチ
                    <br />
                    例: パターン"有給" → "有給休暇", "午前有給", "有給取得"すべてマッチ
                    <br />• <strong>前方一致</strong>: イベント名がパターンで始まる場合のみマッチ
                    <br />
                    例: パターン"有給" → "有給休暇"はマッチ、"午前有給"はマッチしない
                    <br />• <strong>後方一致</strong>: イベント名がパターンで終わる場合のみマッチ
                    <br />
                    例: パターン"有給" → "午前有給"はマッチ、"有給休暇"はマッチしない
                </div>
                <EventPatternEditor
                    patterns={patterns}
                    onChange={handlePatternsChange}
                    placeholder="パターン（例: 有給, 休暇）"
                    addButtonText="パターンを追加"
                />
            </SettingContentSection>

            <SettingContentSection title="WorkItem設定">
                <SettingItem
                    label="休暇WorkItemID"
                    description="休暇として登録するWorkItemのID"
                    control={
                        <Input
                            type="number"
                            value={workItemId?.toString() || ""}
                            onChange={(_, data) => handleWorkItemIdChange(parseInt(data.value) || 0)}
                            placeholder="WorkItemID"
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
            </SettingContentSection>
        </SettingPageLayout>
    );
}
