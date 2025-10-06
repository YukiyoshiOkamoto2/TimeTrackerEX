import { themeHandler } from "@/main";
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";
import { useSettings } from "@/store/settings/SettingsProvider";
import type { AppearanceSettings as AppearanceSettingsType } from "@/types/settings";
import { AutoSettingItem, SettingSection } from "../ui";

const appearanceDef = APPEARANCE_SETTINGS_DEFINITION.children!;

export function AppearanceSettings() {
    const { settings, updateSettings } = useSettings();
    const appearance = settings.appearance as AppearanceSettingsType;

    const handleUpdate = (field: string, value: string) => {
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
    };

    return (
        <>
            <SettingSection title="テーマ設定" description="アプリケーションの外観をカスタマイズ" required={false}>
                <AutoSettingItem
                    definition={appearanceDef.theme}
                    value={appearance?.theme || "system"}
                    onChange={(value: unknown) => handleUpdate("theme", value as string)}
                    minWidth="200px"
                />
            </SettingSection>
        </>
    );
}
