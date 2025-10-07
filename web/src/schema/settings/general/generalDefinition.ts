/**
 * 一般設定のスキーマ定義
 */

import { GeneralSettings } from "@/types";
import { ObjectSettingValueInfoTyped, StringSettingValueInfo } from "../settingsDefinition";

/**
 * 一般設定のスキーマ定義
 */
export const GENERAL_SETTINGS_DEFINITION = new ObjectSettingValueInfoTyped<GeneralSettings>({
    name: "一般設定",
    description: "アプリケーションの一般的な設定",
    required: true,
    disableUnknownField: true,
    children: {
        language: new StringSettingValueInfo({
            name: "言語",
            description: "表示言語",
            required: true,
            defaultValue: "ja",
            literals: ["ja"],
        }),
    },
});
