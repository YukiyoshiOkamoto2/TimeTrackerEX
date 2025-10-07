/**
 * 一般設定のスキーマ定義
 */

import { ObjectSettingValueInfo, StringSettingValueInfo } from "../settingsDefinition";

/**
 * 一般設定のスキーマ定義
 */
export const GENERAL_SETTINGS_DEFINITION = new ObjectSettingValueInfo({
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
