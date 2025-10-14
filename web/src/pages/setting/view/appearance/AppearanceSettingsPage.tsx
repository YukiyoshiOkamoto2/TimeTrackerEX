import { themeHandler } from "@/main";
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";
import { useSettings } from "@/store/settings/SettingsProvider";
import type { AppearanceSettings as AppearanceSettingsType } from "@/types/settings";
import { useCallback, useMemo } from "react";
import { AutoSettingItem, SettingPageLayout, SettingSection } from "../../components";

const appearanceDef = APPEARANCE_SETTINGS_DEFINITION.children!;

/**
 * 外観設定ページ
 *
 * パフォーマンス最適化:
 * - useCallback でハンドラーをメモ化
 * - useMemo で設定とエラーをメモ化
 */
export function AppearanceSettingsPage() {
    const { settings, updateSettings, validationErrors } = useSettings();

    // 設定とエラーをメモ化
    const appearance = useMemo(() => settings.appearance as AppearanceSettingsType, [settings.appearance]);
    const errors = useMemo(() => validationErrors.appearance, [validationErrors.appearance]);

    // 設定更新ハンドラー（メモ化）
    const handleUpdate = useCallback(
        (field: string, value: string) => {
            updateSettings({
                appearance: {
                    ...appearance,
                    [field]: value,
                },
            });

            // テーマ変更を適用
            if (field === "theme") {
                if (value === "dark") {
                    themeHandler.setTheme(true);
                } else if (value === "light") {
                    themeHandler.setTheme(false);
                } else {
                    // system の場合はシステム設定に従う
                    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    themeHandler.setTheme(isDark);
                }
            }
        },
        [appearance, updateSettings],
    );

    // テーマ変更ハンドラー（メモ化）
    const handleThemeChange = useCallback((value: unknown) => handleUpdate("theme", value as string), [handleUpdate]);

    return (
        <SettingPageLayout errors={errors}>
            <SettingSection
                title="テーマ設定"
                description="アプリケーションの外観をカスタマイズ"
                required={appearanceDef.theme.required}
            >
                <AutoSettingItem
                    definition={appearanceDef.theme}
                    value={appearance?.theme || "system"}
                    onChange={handleThemeChange}
                    minWidth="200px"
                />
            </SettingSection>
        </SettingPageLayout>
    );
}
