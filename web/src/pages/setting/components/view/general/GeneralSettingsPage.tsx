import { GENERAL_SETTINGS_DEFINITION } from "@/schema/settings";
import { useSettings } from "@/store/settings/SettingsProvider";
import type { Language } from "@/types/settings";
import { Field, makeStyles, Radio, RadioGroup, tokens } from "@fluentui/react-components";
import { useMemo } from "react";
import { SettingPageLayout, SettingSection } from "../../layout";
import { type SettingError } from "../../ui";

const useStyles = makeStyles({
    field: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
});

export function GeneralSettingsPage() {
    const styles = useStyles();
    const { settings, updateSettings } = useSettings();

    // デフォルト値を設定
    const currentLanguage = settings.general?.language ?? "ja";

    // バリデーションエラーを収集
    const errors = useMemo(() => {
        const errorList: SettingError[] = [];

        // 言語設定のバリデーション
        if (GENERAL_SETTINGS_DEFINITION.children) {
            const languageValidation = GENERAL_SETTINGS_DEFINITION.children.language.validate(currentLanguage);
            if (languageValidation.isError) {
                errorList.push({
                    id: "language",
                    label: "言語",
                    message: languageValidation.errorMessage,
                });
            }
        }

        return errorList;
    }, [currentLanguage]);

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
                    <RadioGroup value={currentLanguage} onChange={handleLanguageChange}>
                        <Radio value="ja" label="日本語" disabled />
                    </RadioGroup>
                </Field>
            </SettingSection>
        </SettingPageLayout>
    );
}
