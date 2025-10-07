/**
 * Appearance Settings Definition
 *
 * 外観設定の設定項目定義です。
 */

import { AppearanceSettings } from "@/types";
import { ObjectSettingValueInfoTyped, StringSettingValueInfo } from "../settingsDefinition";

/**
 * 外観設定定義
 */
export const APPEARANCE_SETTINGS_DEFINITION = new ObjectSettingValueInfoTyped<AppearanceSettings>({
    name: "外観設定",
    description: "アプリケーションの外観に関する設定",
    required: true,
    disableUnknownField: true,
    children: {
        theme: new StringSettingValueInfo({
            name: "テーマモード",
            description: "アプリケーションのテーマ(light: ライトモード, dark: ダークモード, system: システム設定)",
            required: true,
            defaultValue: "system",
            literals: ["light", "dark", "system"],
        }),
    },
});
