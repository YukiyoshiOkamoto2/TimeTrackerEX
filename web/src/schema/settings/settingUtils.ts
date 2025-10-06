/**
 * Setting Utils
 *
 * 設定定義に関するユーティリティ関数を提供します。
 */

import type {
    ArraySettingValueInfo,
    BooleanSettingValueInfo,
    NumberSettingValueInfo,
    ObjectSettingValueInfo,
    SettingValueInfo,
    StringSettingValueInfo,
} from "./settingsDefinition";

/**
 * SettingValueInfoがStringSettingValueInfoかどうかをチェックする型ガード
 *
 * @param info - チェックする設定値情報
 * @returns StringSettingValueInfoの場合はtrue
 */
export function isStringSettingValueInfo(info: SettingValueInfo): info is StringSettingValueInfo {
    return info.type === "string";
}

/**
 * SettingValueInfoがBooleanSettingValueInfoかどうかをチェックする型ガード
 *
 * @param info - チェックする設定値情報
 * @returns BooleanSettingValueInfoの場合はtrue
 */
export function isBooleanSettingValueInfo(info: SettingValueInfo): info is BooleanSettingValueInfo {
    return info.type === "boolean";
}

/**
 * SettingValueInfoがNumberSettingValueInfoかどうかをチェックする型ガード
 *
 * @param info - チェックする設定値情報
 * @returns NumberSettingValueInfoの場合はtrue
 */
export function isNumberSettingValueInfo(info: SettingValueInfo): info is NumberSettingValueInfo {
    return info.type === "number";
}

/**
 * SettingValueInfoがArraySettingValueInfoかどうかをチェックする型ガード
 *
 * @param info - チェックする設定値情報
 * @returns ArraySettingValueInfoの場合はtrue
 */
export function isArraySettingValueInfo(info: SettingValueInfo): info is ArraySettingValueInfo {
    return info.type === "array";
}

/**
 * SettingValueInfoがObjectSettingValueInfoかどうかをチェックする型ガード
 *
 * @param info - チェックする設定値情報
 * @returns ObjectSettingValueInfoの場合はtrue
 */
export function isObjectSettingValueInfo(info: SettingValueInfo): info is ObjectSettingValueInfo {
    return info.type === "object";
}

/**
 * ネストされたオブジェクト型定義を安全に取得する
 *
 * @param parent - 親の設定値情報のRecord
 * @param key - 取得するキー
 * @returns オブジェクト型の場合はそのchildren、それ以外は空のRecord
 *
 * @example
 * ```typescript
 * const ttDef = (SETTINGS_DEFINITION.timetracker as ObjectSettingValueInfo).children;
 * const scheduleAutoInputInfoDef = getObjectChildren(ttDef, "scheduleAutoInputInfo");
 * // => { startEndType: {...}, roundingTimeTypeOfSchedule: {...}, ... }
 * ```
 */
export function getObjectChildren(
    parent: Record<string, SettingValueInfo>,
    key: string,
): Record<string, SettingValueInfo> {
    const def = parent[key];
    return isObjectSettingValueInfo(def) ? def.children : {};
}

/**
 * ネストされた設定オブジェクトを安全に更新するためのヘルパー
 *
 * @param parentValue - 親オブジェクトの現在の値
 * @param field - 更新するフィールド名
 * @param value - 新しい値
 * @returns 更新されたオブジェクト
 *
 * @example
 * ```typescript
 * const parentValue = tt?.scheduleAutoInputInfo;
 * const updated = updateNestedObject(parentValue, "startEndType", "both");
 * // => { ...existing fields, startEndType: "both" }
 * ```
 */
export function updateNestedObject<T extends Record<string, unknown>>(
    parentValue: T | undefined | null,
    field: string,
    value: string | number | boolean,
): T {
    const base = typeof parentValue === "object" && parentValue !== null ? parentValue : ({} as T);
    return {
        ...base,
        [field]: value,
    };
}
