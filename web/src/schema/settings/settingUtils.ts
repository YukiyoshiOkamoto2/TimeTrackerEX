import { EventPattern } from "@/types";
import { ObjectSettingValueInfo, SettingValueInfo } from "./settingsDefinition";

/**
 * 設定エラーの型定義
 */
export interface SettingError {
    id: string;
    label: string;
    message: string;
}

/**
 * 設定のバリデーションエラーを取得する
 * @param setting - 検証する設定値
 * @param definition - 設定のスキーマ定義
 * @returns エラーのリスト
 */
export function getSettingErrors(setting: unknown, definition: ObjectSettingValueInfo): SettingError[] {
    const errorList: SettingError[] = [];
    const result = definition.validate(setting as Record<string, unknown>);

    if (result.isError) {
        const paths = result.errorPathInfo.path.split("\n");
        const messages = result.errorPathInfo.message?.split("\n") ?? [];
        paths.forEach((path, index) => {
            errorList.push({
                id: `error-${index}`,
                label: path,
                message: messages[index] ?? "",
            });
        });
    }

    return errorList;
}

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

            // フィールドの型がarrayの場合はエラーの項目を削除
        } else if (childInfo.type === "array") {
            // 配列の場合、各要素をバリデーションし、エラーのない要素のみを残す
            const cleanedArray = cleanArrayValue(fieldValue, childInfo);

            if (cleanedArray) {
                result[key] = cleanedArray;
            } else {
                // 配列の修正に失敗した場合はデフォルト値を使用
                const defaultValue = getFieldDefaultValue(childInfo);
                if (defaultValue !== undefined) {
                    result[key] = defaultValue;
                }
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
 * 配列値をクリーニング（不正な要素を削除）
 * @returns クリーニングされた配列、または修正不可能な場合はundefined
 */
function cleanArrayValue(fieldValue: unknown, childInfo: SettingValueInfo): unknown[] | undefined {
    // 配列でない場合は修正不可能
    if (!Array.isArray(fieldValue)) {
        return undefined;
    }

    // itemSchemaが設定されている場合は各要素をバリデーション
    let cleanedArray: unknown[];
    if (childInfo.type === "array" && "itemSchema" in childInfo && childInfo.itemSchema) {
        cleanedArray = fieldValue.filter((item) => {
            const itemValidation = childInfo.itemSchema!.validate(item);
            return !itemValidation.isError;
        });
    } else {
        cleanedArray = fieldValue;
    }

    // クリーニング後の配列が制約を満たすか検証
    const validationResult = childInfo.validate(cleanedArray);
    if (validationResult.isError) {
        return undefined;
    }

    return cleanedArray;
}

/**
 * フィールドのデフォルト値を取得(再帰的)
 */
export function getFieldDefaultValue(info: SettingValueInfo): unknown {
    if ("defaultValue" in info && info.defaultValue !== undefined) {
        return info.defaultValue;
    }

    if (info.type === "object" && info.required && info.children) {
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

/**
 * イベントパターンリストから重複を除去する
 * @template T - EventPatternを継承した型（IgnorableEventPatternやTimeOffEventPatternなど）
 * @param patterns - イベントパターンの配列
 * @returns 重複を除去したイベントパターンの配列
 */
export function removeDuplicateEventPatterns<T extends EventPattern>(patterns: T[]): T[] {
    return patterns.filter(
        (pattern, index) =>
            patterns.findIndex((p) => p.pattern === pattern.pattern && p.matchMode === pattern.matchMode) === index,
    );
}

/**
 * 設定JSONの成功結果型
 */
export type SettingJSONResultOK<T extends Record<string, unknown>> = {
    isError: false;
    value: T;
};

/**
 * 設定JSONのエラー結果型
 */
export type SettingJSONResultNG = {
    isError: true;
    errorMessage: string;
};

/**
 * 設定JSONの結果型
 */
export type SettingJSONResult<T extends Record<string, unknown>> = SettingJSONResultOK<T> | SettingJSONResultNG;

/**
 * 設定のJSON変換ユーティリティ
 */
export const SettingJSON = {
    /**
     * 設定オブジェクトをJSON文字列に変換
     * @param setting 変換する設定オブジェクト
     * @param format 整形するかどうか（デフォルト: true）
     * @returns JSON文字列
     */
    json: (setting: Record<string, unknown>, format: boolean = true): string => {
        if (format) {
            return JSON.stringify(setting, null, 2);
        } else {
            return JSON.stringify(setting);
        }
    },

    /**
     * JSON文字列を設定オブジェクトに変換
     * @param json 解析するJSON文字列
     * @returns 解析結果（成功時は設定オブジェクト、失敗時はエラーメッセージ）
     */
    parse: <T extends Record<string, unknown>>(json: string): SettingJSONResult<T> => {
        try {
            return {
                isError: false,
                value: JSON.parse(json),
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            return {
                isError: true,
                errorMessage,
            };
        }
    },
};

/**
 * 設定をJSONファイルとしてエクスポート
 * @param settings エクスポートする設定
 * @returns ダウンロード用のBlobオブジェクト
 */
export function exportSettingsToJson(settings: Record<string, unknown>): Blob {
    const jsonString = JSON.stringify(settings, null, 2);
    return new Blob([jsonString], { type: "application/json" });
}

/**
 * JSONファイルから設定をインポート
 * @param file インポートするJSONファイル
 * @returns パースされた設定オブジェクト
 */
export async function importSettingsFromJson(file: File): Promise<Record<string, unknown>> {
    const text = await file.text();
    try {
        const settings = JSON.parse(text);
        if (typeof settings !== "object" || settings === null || Array.isArray(settings)) {
            throw new Error("無効な設定ファイルです");
        }
        return settings as Record<string, unknown>;
    } catch (e) {
        throw new Error("設定ファイルの解析に失敗しました");
    }
}
