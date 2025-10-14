import { useSettings } from "@/store/settings/SettingsProvider";
import type { Language } from "@/types/settings";
import { Field, makeStyles, Radio, RadioGroup, tokens } from "@fluentui/react-components";
import { useCallback, useMemo } from "react";
import { SettingPageLayout, SettingSection } from "../../components";

const useStyles = makeStyles({
    field: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
});

/**
 * 一般設定ページ
 *
 * パフォーマンス最適化:
 * - useCallback でハンドラーをメモ化
 * - useMemo で設定とエラーをメモ化
 */
export function GeneralSettingsPage() {
    const styles = useStyles();
    const { settings, updateSettings, validationErrors } = useSettings();

    // 設定とエラーをメモ化
    const general = useMemo(() => settings.general, [settings.general]);
    const errors = useMemo(() => validationErrors.general, [validationErrors.general]);

    // 言語変更ハンドラー（メモ化）
    const handleLanguageChange = useCallback(
        (_e: unknown, data: { value: string }) => {
            updateSettings({
                general: { language: data.value as Language },
            });
        },
        [updateSettings],
    );

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
