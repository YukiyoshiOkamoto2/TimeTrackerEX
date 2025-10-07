import { EventPattern } from "@/types";
import { ObjectSettingValueInfo, SettingValue, SettingValueInfo } from "./settingsDefinition";

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

            if (cleanedArray !== null) {
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
 * @returns クリーニングされた配列、または修正不可能な場合はnull
 */
function cleanArrayValue(fieldValue: unknown, childInfo: SettingValueInfo): unknown[] | null {
    // 配列でない場合は修正不可能
    if (!Array.isArray(fieldValue)) {
        return null;
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
        return null;
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
    return patterns.filter((pattern, index) => 
        patterns.findIndex(p => 
            p.pattern === pattern.pattern && 
            p.matchMode === pattern.matchMode
        ) === index
    );
}

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

/**
 * 設定定義から子要素の定義を取得する
 * @param def - 親の設定定義
 * @param path - 子要素へのパス（ドット区切り）
 * @returns 子要素の定義
 * @throws 子要素が見つからない、または型が異なる場合
 */
export function getSettingDefinitionChild(def: ObjectSettingValueInfo, parts: string[]): SettingValueInfo {

    let current = def;

    for (const part of parts) {
        if (!current.children) {
            throw new Error(`${part}の親定義に子要素が存在しません`);
        }

        const child = current.children[part];
        if (!child) {
            throw new Error(`定義${part}が見つかりません`);
        }

        if (child.type !== "object") {
            throw new Error(`${part}はオブジェクト型ではありません`);
        }

        current = child as ObjectSettingValueInfo;
    }

    return current;
}
