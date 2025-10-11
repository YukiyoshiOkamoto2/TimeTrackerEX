import { TIMETRACKER_IGNORABLE_EVENTS } from "@/schema";
import { IgnorableEventPattern } from "@/types";
import { makeStyles, tokens } from "@fluentui/react-components";
import { EventPatternEditor, SettingNavigationPageLayout, SettingSection } from "../../components";

const ignorableEventDef = TIMETRACKER_IGNORABLE_EVENTS;
const patternDefinition = ignorableEventDef.getTypedItemSchema()!.getTypedChildren()!;

const useStyles = makeStyles({
    helpText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginBottom: tokens.spacingVerticalL,
        lineHeight: tokens.lineHeightBase300,
    },
});

interface IgnorableEventsNavigationPageProps {
    patterns: IgnorableEventPattern[];
    onChange: (patterns: IgnorableEventPattern[]) => void;
    onBack: () => void;
}

export function IgnorableEventsNavigationPage({ patterns, onChange, onBack }: IgnorableEventsNavigationPageProps) {
    const styles = useStyles();

    return (
        <SettingNavigationPageLayout
            title={ignorableEventDef.name}
            subtitle={ignorableEventDef.description}
            onBack={onBack}
        >
            <SettingSection title="イベントパターン">
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
                <EventPatternEditor
                    patternDefinition={patternDefinition.pattern}
                    patterns={patterns}
                    onChange={onChange}
                    placeholder="パターン(例: MTG, 個人作業)"
                    addButtonText="パターンを追加"
                />
            </SettingSection>
        </SettingNavigationPageLayout>
    );
}
