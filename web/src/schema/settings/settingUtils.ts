import { ObjectSettingValueInfo, SettingValueInfo } from "./settingsDefinition";

/**
 * 不正なフィールドのみデフォルト値に置き換え（再帰的）
 */
export function updateErrorValue(
    value: Record<string, unknown>,
    info: ObjectSettingValueInfo,
): Record<string, unknown> {
    // 値がオブジェクトでない場合は空オブジェクトを返す
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {};
    }

    // 子要素の定義がない場合はそのまま返す
    if (!info.children) {
        return value;
    }

    const result: Record<string, unknown> = {};

    // すべての定義されたフィールドを処理
    for (const [key, childInfo] of Object.entries(info.children)) {
        const fieldValue = value[key];

        // フィールドが存在しない場合
        if (fieldValue === undefined || fieldValue === null) {
            // 必須フィールドの場合はデフォルト値を設定
            if (childInfo.required) {
                const defaultValue = getFieldDefaultValue(childInfo);
                if (defaultValue !== undefined) {
                    result[key] = defaultValue;
                }
            }
            continue;
        }

        // フィールドの型がobjectの場合は再帰的に処理
        if (childInfo.type === "object") {
            const objectInfo = childInfo as ObjectSettingValueInfo;

            // バリデーションを実行
            const validationResult = childInfo.validate(fieldValue);
            if (validationResult.isError) {
                // エラーがある場合は再帰的に修正
                if (typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
                    result[key] = updateErrorValue(fieldValue as Record<string, unknown>, objectInfo);
                } else {
                    // 型が完全に違う場合はデフォルト値を使用
                    const defaultValue = getFieldDefaultValue(childInfo);
                    if (defaultValue !== undefined) {
                        result[key] = defaultValue;
                    }
                }
            } else {
                // エラーがない場合はそのまま使用
                result[key] = fieldValue;
            }
        } else {
            // オブジェクト以外の型の場合
            const validationResult = childInfo.validate(fieldValue);

            if (validationResult.isError) {
                // バリデーションエラーの場合はデフォルト値を使用
                const defaultValue = getFieldDefaultValue(childInfo);
                if (defaultValue !== undefined) {
                    result[key] = defaultValue;
                }
            } else {
                // エラーがない場合はそのまま使用
                result[key] = fieldValue;
            }
        }
    }

    // 未定義のフィールドは無視（disableUnknownFieldの設定に関わらず）
    // 定義されたフィールドのみを結果に含める

    return result;
}

/**
 * フィールドのデフォルト値を取得(再帰的)
 */
export function getFieldDefaultValue(info: SettingValueInfo): unknown {
    if ("defaultValue" in info && info.defaultValue !== undefined) {
        return info.defaultValue;
    }

    if (info.type === "object" && info.children) {
        const obj: Record<string, unknown> = {};
        for (const [key, childInfo] of Object.entries(info.children)) {
            const defaultValue = getFieldDefaultValue(childInfo);
            if (defaultValue !== undefined) {
                obj[key] = defaultValue;
            }
        }
        return Object.keys(obj).length > 0 ? obj : undefined;
    }

    return undefined;
}
