/**
 * TimeTracker 外観設定ページ
 */

import { AutoSettingItem, SettingNavigationPageLayout, SettingSection } from "@/pages/setting/components";
import { TIMETRACKER_APPEARANCE_SETTINGS } from "@/schema";
import { makeStyles, tokens } from "@fluentui/react-components";
import { useTimeTrackerSettings } from "./hooks/useTimeTrackerSettings";

const appearanceDef = TIMETRACKER_APPEARANCE_SETTINGS.getTypedChildren()!;

const useStyles = makeStyles({
    helpText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginBottom: tokens.spacingVerticalM,
        lineHeight: tokens.lineHeightBase300,
    },
});

interface AppearanceNavigationPageProps {
    onBack: () => void;
}

export function AppearanceNavigationPage({ onBack }: AppearanceNavigationPageProps) {
    const styles = useStyles();
    const { settings, updateSettings } = useTimeTrackerSettings();

    // 履歴表示件数のデフォルト値
    const historyDisplayCount = settings?.appearance?.historyDisplayCount ?? 3;

    const handleHistoryDisplayCountChange = (value: unknown) => {
        if (value === null || value === undefined || !settings) return;
        const numValue = value as number;

        // 1-10の範囲に制限
        const clampedValue = Math.max(1, Math.min(10, numValue));

        updateSettings({
            timetracker: {
                ...settings,
                appearance: {
                    ...settings.appearance,
                    historyDisplayCount: clampedValue,
                },
            },
        });
    };

    return (
        <SettingNavigationPageLayout
            title="外観設定"
            subtitle="TimeTrackerの表示に関する設定を管理します"
            onBack={onBack}
        >
            <SettingSection title="履歴表示">
                <div className={styles.helpText}>
                    イベントとWorkItemの紐づけ時に表示する履歴の件数を設定します。
                    最近使用した項目が表示されるため、よく使う項目を素早く選択できます。
                </div>

                <AutoSettingItem
                    definition={appearanceDef.historyDisplayCount}
                    value={historyDisplayCount}
                    onChange={handleHistoryDisplayCountChange}
                    maxWidth="150px"
                />
            </SettingSection>

            <SettingSection title="テーブル表示">
                <div className={styles.helpText}>
                    今後、テーブルの表示オプション(カラムの表示/非表示、デフォルトソートなど)を追加予定です。
                </div>
            </SettingSection>
        </SettingNavigationPageLayout>
    );
}
