import { makeStyles, tokens } from "@fluentui/react-components";
import { IgnorableEventPattern } from "../../../../../types/settings";
import { SettingSection, SettingNavigationPageLayout } from "../../layout";
import { EventPatternEditor, type SettingError } from "../../ui";

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
    onShowJson: () => void;
}

export function IgnorableEventsNavigationPage({ patterns, onChange, onBack, onShowJson }: IgnorableEventsNavigationPageProps) {
    const styles = useStyles();

    // TODO: 実際のバリデーションエラーを収集する
    const errors: SettingError[] = [];

    return (
        <SettingNavigationPageLayout
            title="無視可能イベント設定"
            subtitle="処理から除外するイベント名のパターンと一致モードを設定します。"
            onBack={onBack}
            onShowJson={onShowJson}
        >
            <SettingSection title="イベントパターン" errors={errors}>
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
                    patterns={patterns}
                    onChange={onChange}
                    placeholder="パターン(例: MTG, 個人作業)"
                    addButtonText="パターンを追加"
                />
            </SettingSection>
        </SettingNavigationPageLayout>
    );
}
