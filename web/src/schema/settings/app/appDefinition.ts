/**
 * App Settings Definition
 *
 * アプリケーション全体の設定項目定義です。
 */

import { APPEARANCE_SETTINGS_DEFINITION } from "../appearance";
import { ObjectSettingValueInfo } from "../settingsDefinition";
import { TIMETRACKER_SETTINGS_DEFINITION } from "../timetracker";

/**
 * アプリケーション設定定義
 */
export const APP_SETTINGS_DEFINITION = new ObjectSettingValueInfo({
    name: "アプリケーション設定",
    description: "アプリケーション全体の設定",
    required: true,
    disableUnknownField: true,
    children: {
        timetracker: TIMETRACKER_SETTINGS_DEFINITION,
        appearance: APPEARANCE_SETTINGS_DEFINITION,
    },
});
