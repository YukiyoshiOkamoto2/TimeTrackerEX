import { TIMETRACKER_TIME_OFF_EVNT_SETTINGS_DEFINITION } from "@/schema/settings";
import { makeStyles, tokens } from "@fluentui/react-components";
import type { TimeOffEventPattern } from "../../../../../types/settings";
import { SettingNavigationPageLayout, SettingSection } from "../../layout";
import { AutoSettingItem } from "../../ui";
import { EventPatternEditor } from "../../ui/EventPatternEditor";

const timeOffEventDef = TIMETRACKER_TIME_OFF_EVNT_SETTINGS_DEFINITION.getTypedChildren()!;
const patternDefinition = timeOffEventDef.namePatterns;

const useStyles = makeStyles({
    helpText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginBottom: tokens.spacingVerticalL,
        lineHeight: tokens.lineHeightBase300,
    },
});

interface TimeOffEventsNavigationPageProps {
    patterns?: TimeOffEventPattern[];
    workItemId?: number;
    onChange: (patterns: TimeOffEventPattern[], workItemId: number) => void;
    onBack: () => void;
}

export function TimeOffEventsNavigationPage({
    patterns,
    workItemId,
    onChange,
    onBack,
}: TimeOffEventsNavigationPageProps) {
    const styles = useStyles();

    const handlePatternsChange = (newPatterns: TimeOffEventPattern[]) => {
        onChange(newPatterns, workItemId ?? 0);
    };

    const handleWorkItemIdChange = (newWorkItemId: number) => {
        onChange(patterns ?? [], newWorkItemId);
    };

    return (
        <SettingNavigationPageLayout
            title="休暇イベント設定"
            subtitle="休暇イベントとして扱うイベント名のパターンとWorkItemIDを設定します。"
            onBack={onBack}
        >
            <SettingSection title="休暇イベント名パターン">
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
                    patternDefinition={patternDefinition}
                    patterns={patterns ?? []}
                    onChange={handlePatternsChange}
                    placeholder="パターン（例: 有給, 休暇）"
                    addButtonText="パターンを追加"
                />
            </SettingSection>

            <SettingSection title="WorkItem設定">
                <AutoSettingItem
                    definition={timeOffEventDef.workItemId}
                    value={workItemId}
                    onChange={(value: unknown) => handleWorkItemIdChange(value as number)}
                    maxWidth="150px"
                    placeholder="WorkItemID"
                />
            </SettingSection>
        </SettingNavigationPageLayout>
    );
}
