import { themeHandler } from "@/main";
import { APPEARANCE_SETTINGS_DEFINITION } from "@/schema/settings";
import { useSettings } from "@/store/settings/SettingsProvider";
import type { AppearanceSettings as AppearanceSettingsType } from "@/types/settings";
import { useMemo } from "react";
import { AutoSettingItem, SettingSection, type SettingError } from "../../ui";

const appearanceDef = APPEARANCE_SETTINGS_DEFINITION.children!;

export function AppearanceSettings() {
    const { settings, updateSettings } = useSettings();
    const appearance = settings.appearance as AppearanceSettingsType;

    // バリデーションエラーを収集
    const errors = useMemo(() => {
        const errorList: SettingError[] = [];
        const result = APPEARANCE_SETTINGS_DEFINITION.validatePartial(appearance as unknown as Record<string, unknown>);

        if (result.isError && result.errorMessage) {
            const lines = result.errorMessage.split("\n").filter((line) => line.trim());
            lines.forEach((line, index) => {
                const match = line.match(/^(.+?):\s*(.+)$/);
                if (match) {
                    errorList.push({
                        id: `error-${index}`,
                        label: match[1].trim(),
                        message: match[2].trim(),
                    });
                } else {
                    errorList.push({
                        id: `error-${index}`,
                        label: "設定エラー",
                        message: line.trim(),
                    });
                }
            });
        }

        return errorList;
    }, [appearance]);

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
            <SettingSection
                title="テーマ設定"
                description="アプリケーションの外観をカスタマイズ"
                required={false}
                errors={errors}
            >
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
