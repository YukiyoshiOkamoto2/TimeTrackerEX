import { useSettings } from "@/store/settings/SettingsProvider";
import type { Language } from "@/types/settings";
import { Field, makeStyles, Radio, RadioGroup, tokens } from "@fluentui/react-components";
import { SettingPageLayout, SettingSection } from "../../layout";

const useStyles = makeStyles({
    field: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
});

export function GeneralSettingsPage() {
    const styles = useStyles();
    const { settings, updateSettings, validationErrors } = useSettings();
    const general = settings.general;
    const errors = validationErrors.general;

    // 言語変更ハンドラー
    const handleLanguageChange = (_e: unknown, data: { value: string }) => {
        updateSettings({
            general: { language: data.value as Language },
        });
    };

    return (
        <SettingPageLayout errors={errors}>
            <SettingSection title="基本設定" description="言語などの基本的な設定" required={true}>
                <Field label="言語" className={styles.field}>
                    <RadioGroup value={general?.language} onChange={handleLanguageChange}>
                        <Radio value="ja" label="日本語" disabled />
                    </RadioGroup>
                </Field>
            </SettingSection>
        </SettingPageLayout>
    );
}
