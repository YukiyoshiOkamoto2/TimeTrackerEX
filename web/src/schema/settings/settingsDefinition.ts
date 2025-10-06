/**
 * Settings Definition
 *
 * 設定項目の定義を一元管理します。
 * この定義からバリデーションとJSON変換処理を提供します。
 */

import type { TimeTrackerSettings } from "../../types";

/**
 * 設定値の型
 */
export type SettingValueType = "string" | "boolean" | "number" | "array" | "object";

/**
 * 設定値情報の基底インターフェース
 */
interface BaseSettingValueInfo<T extends SettingValueType> {
    /** 設定値の型 */
    type: T;
    /** 表示名 */
    name: string;
    /** 説明 */
    description?: string;
    /** 必須かどうか */
    required: boolean;
}

/**
 * 文字列型の設定値情報
 */
export interface StringSettingValueInfo extends BaseSettingValueInfo<"string"> {
    type: "string";
    /** デフォルト値 */
    default?: string;
    /** 許可される値のリスト */
    literals?: string[];
    /** 正規表現パターン */
    pattern?: RegExp;
    /** パターンのエラーメッセージ */
    patternMessage?: string;
    /** 最小文字数 */
    minLength?: number;
    /** URL形式かどうか */
    isUrl?: boolean;
}

/**
 * ブール型の設定値情報
 */
export interface BooleanSettingValueInfo extends BaseSettingValueInfo<"boolean"> {
    type: "boolean";
    /** デフォルト値 */
    default?: boolean;
}

/**
 * 数値型の設定値情報
 */
export interface NumberSettingValueInfo extends BaseSettingValueInfo<"number"> {
    type: "number";
    /** デフォルト値 */
    default?: number;
    /** 許可される値のリスト */
    literals?: number[];
    /** 整数のみ許可 */
    integer?: boolean;
    /** 正の数のみ許可 */
    positive?: boolean;
}

/**
 * 配列型の設定値情報
 */
export interface ArraySettingValueInfo extends BaseSettingValueInfo<"array"> {
    type: "array";
    /** 配列要素の型 */
    itemType: "string" | "number" | "object";
    /** オブジェクト型の場合の子要素定義 */
    itemSchema?: Record<string, SettingValueInfo>;
    /** 最小要素数 */
    minItems?: number;
    /** デフォルト値 */
    default?: string[] | number[] | Record<string, unknown>[];
}

/**
 * オブジェクト型の設定値情報
 */
export interface ObjectSettingValueInfo extends BaseSettingValueInfo<"object"> {
    type: "object";
    /** 子要素の定義 */
    children: Record<string, SettingValueInfo>;
}

/**
 * 設定値情報の型
 */
export type SettingValueInfo =
    | StringSettingValueInfo
    | BooleanSettingValueInfo
    | NumberSettingValueInfo
    | ArraySettingValueInfo
    | ObjectSettingValueInfo;

/**
 * 設定項目のマップ
 */
export const SETTINGS_DEFINITION = {
    timetracker: {
        type: "object",
        name: "TimeTracker設定",
        description: "TimeTrackerに関する設定",
        required: true,
        children: {
            userName: {
                type: "string",
                name: "ユーザー名(ログイン名)",
                description: "TimeTrackerにログインするためのユーザー名",
                required: true,
                minLength: 1,
            } as StringSettingValueInfo,

            baseUrl: {
                type: "string",
                name: "TimeTrackerのベースURL",
                description: "TimeTrackerのベースURL（例: https://timetracker.example.com）",
                required: true,
                isUrl: true,
            } as StringSettingValueInfo,

            baseProjectId: {
                type: "number",
                name: "プロジェクトID",
                description: "作業を登録するプロジェクトのID",
                required: true,
                integer: true,
                positive: true,
            } as NumberSettingValueInfo,

            enableAutoUpdate: {
                type: "boolean",
                name: "自動更新の有効",
                description: "アプリケーションの自動更新を有効にするかどうか",
                required: false,
                default: true,
            } as BooleanSettingValueInfo,

            isHistoryAutoInput: {
                type: "boolean",
                name: "履歴からのスケジュール自動入力",
                description: "過去の履歴から自動的にスケジュールを入力するかどうか",
                required: false,
                default: true,
            } as BooleanSettingValueInfo,

            roundingTimeTypeOfEvent: {
                type: "string",
                name: "イベント時間の丸め方法",
                description: `30分単位でのイベント時間の丸め方法を設定します。
- backward: 開始終了時間を切り上げる
- forward: 開始終了時間を切り捨て
- round: 短くなるように丸める
- half: 15分未満は0分に、15分以上は30分に
- stretch: 長くなるように丸める
- nonduplicate: 重複しない場合は長く、重複する場合は短く`,
                required: true,
                default: "nonduplicate",
                literals: ["backward", "forward", "round", "half", "stretch", "nonduplicate"],
            } as StringSettingValueInfo,

            timeOffEvent: {
                type: "object",
                name: "休暇イベントの設定",
                description: "休暇イベントとして扱うイベント名とWorkItemIDの設定",
                required: false,
                children: {
                    nameOfEvent: {
                        type: "array",
                        name: "イベント名",
                        description: "休暇イベントとして扱うイベント名のリスト",
                        required: true,
                        itemType: "string",
                        minItems: 1,
                    } as ArraySettingValueInfo,
                    workItemId: {
                        type: "number",
                        name: "休暇WorkItemID",
                        description: "休暇として登録するWorkItemのID",
                        required: true,
                        integer: true,
                        positive: true,
                    } as NumberSettingValueInfo,
                },
            } as ObjectSettingValueInfo,

            ignorableEvents: {
                type: "array",
                name: "無視可能イベント",
                description: "処理から除外するイベント名のパターンとマッチモードのリスト",
                required: false,
                itemType: "object",
                itemSchema: {
                    pattern: {
                        type: "string",
                        name: "パターン",
                        description: "イベント名のパターン",
                        required: true,
                        minLength: 1,
                    } as StringSettingValueInfo,
                    matchMode: {
                        type: "string",
                        name: "一致モード",
                        description: "パターンの一致モード（partial: 部分一致, prefix: 前方一致, suffix: 後方一致）",
                        required: true,
                        default: "partial",
                        literals: ["partial", "prefix", "suffix"],
                    } as StringSettingValueInfo,
                },
                default: [],
            } as ArraySettingValueInfo,

            eventDuplicatePriority: {
                type: "object",
                name: "イベント重複時の優先判定",
                description: "イベントが重複した場合の優先度判定方法",
                required: true,
                children: {
                    timeCompare: {
                        type: "string",
                        name: "時間の比較による優先度判定",
                        description: `イベントの時間の比較による優先度判定
- small: 時間が短いイベントを優先（より細かく登録）
- large: 時間が長いイベントを優先（より大きく登録）`,
                        required: true,
                        default: "small",
                        literals: ["small", "large"],
                    } as StringSettingValueInfo,
                },
            } as ObjectSettingValueInfo,

            scheduleAutoInputInfo: {
                type: "object",
                name: "勤務時間の自動入力設定",
                description: "勤務開始・終了時間を自動入力する設定",
                required: true,
                children: {
                    startEndType: {
                        type: "string",
                        name: "開始終了時間の自動入力タイプ",
                        description: `勤務時間の開始終了時間の自動入力タイプ
- both: 開始・終了時間を自動入力
- start: 開始時間のみ自動入力
- end: 終了時間のみ自動入力
- fill: 開始・終了時間の間でイベントと重複しない時間を自動入力`,
                        required: true,
                        default: "both",
                        literals: ["both", "start", "end", "fill"],
                    } as StringSettingValueInfo,
                    roundingTimeTypeOfSchedule: {
                        type: "string",
                        name: "勤務時間の丸め方法",
                        description: `30分単位での勤務時間の丸め方法
- backward: 切り上げ
- forward: 切り捨て
- round: 短くなるように丸める
- half: 15分未満は0分に、15分以上は30分に
- stretch: 長くなるように丸める`,
                        required: true,
                        default: "half",
                        literals: ["backward", "forward", "round", "half", "stretch"],
                    } as StringSettingValueInfo,
                    startEndTime: {
                        type: "number",
                        name: "自動入力時間（分）",
                        description: "勤務開始・終了時間として自動入力する時間（分）",
                        required: true,
                        default: 30,
                        literals: [30, 60, 90],
                    } as NumberSettingValueInfo,
                    workItemId: {
                        type: "number",
                        name: "自動入力WorkItemID",
                        description: "勤務時間として登録するWorkItemのID",
                        required: true,
                        integer: true,
                        positive: true,
                    } as NumberSettingValueInfo,
                },
            } as ObjectSettingValueInfo,

            paidLeaveInputInfo: {
                type: "object",
                name: "有給休暇の自動入力設定",
                description: "有給休暇を自動入力する設定",
                required: false,
                children: {
                    workItemId: {
                        type: "number",
                        name: "有給休暇のWorkItemID",
                        description: "有給休暇として登録するWorkItemのID",
                        required: true,
                        integer: true,
                        positive: true,
                    } as NumberSettingValueInfo,
                    startTime: {
                        type: "string",
                        name: "有給休暇の開始時間",
                        description: "有給休暇の開始時間（HH:MM形式）",
                        required: true,
                        default: "09:00",
                        pattern: /^\d{2}:\d{2}$/,
                        patternMessage: "時間はHH:MM形式である必要があります",
                    } as StringSettingValueInfo,
                    endTime: {
                        type: "string",
                        name: "有給休暇の終了時間",
                        description: "有給休暇の終了時間（HH:MM形式）",
                        required: true,
                        default: "17:30",
                        pattern: /^\d{2}:\d{2}$/,
                        patternMessage: "時間はHH:MM形式である必要があります",
                    } as StringSettingValueInfo,
                },
            } as ObjectSettingValueInfo,
        },
    } as ObjectSettingValueInfo,
} as const;

/**
 * バリデーション結果: 成功
 */
export interface ValidationSuccess<T> {
    isError: false;
    value: T;
}

/**
 * バリデーション結果: 失敗
 */
export interface ValidationFailure {
    isError: true;
    errorMessage: string;
}

/**
 * バリデーション結果の型
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * 値のバリデーション
 */
function validateValue(value: unknown, info: SettingValueInfo, fieldPath: string): ValidationResult<unknown> {
    // 必須チェック
    if (info.required && (value === undefined || value === null)) {
        return {
            isError: true,
            errorMessage: `${fieldPath} (${info.name}) は必須です`,
        };
    }

    // オプションでundefinedの場合はOK
    if (!info.required && (value === undefined || value === null)) {
        return { isError: false, value: undefined };
    }

    switch (info.type) {
        case "string": {
            if (typeof value !== "string") {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は文字列である必要があります`,
                };
            }

            if (info.minLength !== undefined && value.length < info.minLength) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は最低${info.minLength}文字必要です`,
                };
            }

            if (info.isUrl) {
                try {
                    new URL(value);
                } catch {
                    return {
                        isError: true,
                        errorMessage: `${fieldPath} (${info.name}) は有効なURLである必要があります`,
                    };
                }
            }

            if (info.pattern && !info.pattern.test(value)) {
                return {
                    isError: true,
                    errorMessage: info.patternMessage || `${fieldPath} (${info.name}) の形式が不正です`,
                };
            }

            if (info.literals && info.literals.length > 0 && !info.literals.includes(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は ${info.literals.join(", ")} のいずれかである必要があります`,
                };
            }

            return { isError: false, value };
        }

        case "boolean": {
            if (typeof value !== "boolean") {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) はブール値である必要があります`,
                };
            }
            return { isError: false, value };
        }

        case "number": {
            if (typeof value !== "number" || isNaN(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は数値である必要があります`,
                };
            }

            if (info.integer && !Number.isInteger(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は整数である必要があります`,
                };
            }

            if (info.positive && value <= 0) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は正の数である必要があります`,
                };
            }

            if (info.literals && info.literals.length > 0 && !info.literals.includes(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は ${info.literals.join(", ")} のいずれかである必要があります`,
                };
            }

            return { isError: false, value };
        }

        case "array": {
            if (!Array.isArray(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は配列である必要があります`,
                };
            }

            if (info.minItems !== undefined && value.length < info.minItems) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) は最低${info.minItems}個必要です`,
                };
            }

            // 配列要素の型チェック
            const validatedArray: unknown[] = [];
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                const itemPath = `${fieldPath}[${i}]`;

                if (info.itemType === "string" && typeof item !== "string") {
                    return {
                        isError: true,
                        errorMessage: `${itemPath} は文字列である必要があります`,
                    };
                }
                if (info.itemType === "number" && typeof item !== "number") {
                    return {
                        isError: true,
                        errorMessage: `${itemPath} は数値である必要があります`,
                    };
                }
                if (info.itemType === "object") {
                    if (typeof item !== "object" || item === null || Array.isArray(item)) {
                        return {
                            isError: true,
                            errorMessage: `${itemPath} はオブジェクトである必要があります`,
                        };
                    }

                    if (!info.itemSchema) {
                        return {
                            isError: true,
                            errorMessage: `${fieldPath} のitemSchemaが定義されていません`,
                        };
                    }

                    // オブジェクトの各プロパティを検証
                    const obj = item as Record<string, unknown>;
                    const validatedObj: Record<string, unknown> = {};
                    const errors: string[] = [];

                    for (const [key, propInfo] of Object.entries(info.itemSchema)) {
                        const propValue = obj[key];
                        const propPath = `${itemPath}.${key}`;
                        const result = validateValue(propValue, propInfo, propPath);

                        if (result.isError) {
                            errors.push(result.errorMessage);
                        } else {
                            validatedObj[key] = result.value;
                        }
                    }

                    if (errors.length > 0) {
                        return {
                            isError: true,
                            errorMessage: errors.join("\n"),
                        };
                    }

                    validatedArray.push(validatedObj);
                } else {
                    validatedArray.push(item);
                }
            }

            return { isError: false, value: validatedArray };
        }

        case "object": {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
                return {
                    isError: true,
                    errorMessage: `${fieldPath} (${info.name}) はオブジェクトである必要があります`,
                };
            }

            const obj = value as Record<string, unknown>;
            const validated: Record<string, unknown> = {};
            const errors: string[] = [];

            for (const [key, childInfo] of Object.entries(info.children)) {
                const childValue = obj[key];
                const childPath = `${fieldPath}.${key}`;
                const result = validateValue(childValue, childInfo, childPath);

                if (result.isError) {
                    errors.push(result.errorMessage);
                } else {
                    validated[key] = result.value;
                }
            }

            if (errors.length > 0) {
                return {
                    isError: true,
                    errorMessage: errors.join("\n"),
                };
            }

            return { isError: false, value: validated };
        }
    }
}

/**
 * TimeTracker設定のバリデーション
 *
 * @param settings - 検証する設定（部分的な設定も可）
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateTimeTrackerSettings({ userName: "test", baseUrl: "https://example.com", ... });
 * if (!result.isError) {
 *   console.log("Valid settings:", result.value);
 * } else {
 *   console.error("Validation error:", result.errorMessage);
 * }
 * ```
 */
export function validateTimeTrackerSettings(
    settings: Partial<TimeTrackerSettings>,
): ValidationResult<TimeTrackerSettings> {
    const timetrackerDef = SETTINGS_DEFINITION.timetracker;

    if (timetrackerDef.type !== "object") {
        return {
            isError: true,
            errorMessage: "TimeTracker設定の定義が不正です",
        };
    }

    const result = validateValue(settings, timetrackerDef, "timetracker");

    if (result.isError) {
        return result as ValidationFailure;
    }

    return result as ValidationSuccess<TimeTrackerSettings>;
}

/**
 * JSON文字列をパースし、不正な項目はデフォルト値で補完
 *
 * @param jsonString - パースするJSON文字列
 * @returns パース結果（エラー時はデフォルト値で補完された設定）
 *
 * @example
 * ```typescript
 * const result = parseTimeTrackerSettings('{"userName":"test",...}');
 * if (!result.isError) {
 *   console.log("Parsed settings:", result.value);
 * } else {
 *   console.log("Parsed with defaults:", result.value);
 *   console.log("Errors:", result.errorMessage);
 * }
 * ```
 */
export function parseTimeTrackerSettings(jsonString: string): ValidationResult<TimeTrackerSettings> {
    let parsed: unknown;

    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        return {
            isError: true,
            errorMessage: `JSON解析エラー: ${error instanceof Error ? error.message : String(error)}`,
        };
    }

    if (typeof parsed !== "object" || parsed === null) {
        return {
            isError: true,
            errorMessage: "JSONはオブジェクトである必要があります",
        };
    }

    return parseAndFixTimeTrackerSettings(parsed as Record<string, unknown>);
}

/**
 * オブジェクトを検証し、不正な項目はデフォルト値で補完
 *
 * @param obj - 検証するオブジェクト
 * @returns 補完された設定
 *
 * @example
 * ```typescript
 * const result = parseAndFixTimeTrackerSettings({ userName: "test", invalidField: "bad" });
 * // 不正なフィールドはデフォルト値で置き換えられる
 * ```
 */
export function parseAndFixTimeTrackerSettings(
    obj: Partial<Record<string, unknown>>,
): ValidationResult<TimeTrackerSettings> {
    const timetrackerDef = SETTINGS_DEFINITION.timetracker;

    if (timetrackerDef.type !== "object") {
        return {
            isError: true,
            errorMessage: "TimeTracker設定の定義が不正です",
        };
    }

    const fixed: Record<string, unknown> = {};
    const errors: string[] = [];

    // 各フィールドを検証し、エラーの場合はデフォルト値を使用
    for (const [key, fieldInfo] of Object.entries(timetrackerDef.children)) {
        const value = obj[key];
        const fieldPath = `timetracker.${key}`;

        // まず検証を試みる
        const result = validateValue(value, fieldInfo, fieldPath);

        if (!result.isError) {
            // 検証成功
            fixed[key] = result.value;
        } else {
            // 検証失敗 - デフォルト値を使用
            const defaultValue = getFieldDefaultValue(fieldInfo);

            if (defaultValue !== undefined) {
                fixed[key] = defaultValue;
                errors.push(`${result.errorMessage} (デフォルト値を使用: ${JSON.stringify(defaultValue)})`);
            } else if (fieldInfo.required) {
                // 必須フィールドでデフォルト値がない場合はエラー
                return {
                    isError: true,
                    errorMessage: `${result.errorMessage} (デフォルト値がありません)`,
                };
            } else {
                // オプションフィールドはundefinedのまま
                errors.push(`${result.errorMessage} (オプションフィールドのため省略)`);
            }
        }
    }

    if (errors.length > 0) {
        // エラーがあったが、デフォルト値で補完した
        return {
            isError: true,
            errorMessage: errors.join("\n"),
        };
    }

    return {
        isError: false,
        value: fixed as unknown as TimeTrackerSettings,
    };
}

/**
 * フィールドのデフォルト値を取得（再帰的）
 */
function getFieldDefaultValue(info: SettingValueInfo): unknown {
    if ("default" in info && info.default !== undefined) {
        return info.default;
    }

    if (info.type === "object") {
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
 * TimeTracker設定をJSON文字列に変換
 *
 * @param settings - 変換する設定
 * @param pretty - インデントを付けるか（デフォルト: false）
 * @returns JSON文字列
 */
export function stringifyTimeTrackerSettings(settings: TimeTrackerSettings, pretty = false): string {
    return JSON.stringify(settings, null, pretty ? 2 : undefined);
}

/**
 * 設定のヘルプテキストを生成
 */
export function generateHelpText(): string {
    const lines: string[] = [];

    function addSettingInfo(key: string, info: SettingValueInfo, indent = ""): void {
        lines.push(`\n${indent}${info.name} (${key})`);
        lines.push(`${indent}  必須: ${info.required ? "はい" : "いいえ"}`);

        if (info.description) {
            lines.push(`${indent}  説明: ${info.description}`);
        }

        // 型ごとの追加情報
        if (info.type === "string" && info.literals) {
            lines.push(`${indent}  選択肢: ${info.literals.join(", ")}`);
        } else if (info.type === "number" && info.literals) {
            lines.push(`${indent}  選択肢: ${info.literals.join(", ")}`);
        }

        if ("default" in info && info.default !== undefined) {
            lines.push(`${indent}  デフォルト: ${JSON.stringify(info.default)}`);
        }

        if (info.type === "object") {
            lines.push(`${indent}  子要素:`);
            for (const [childKey, childInfo] of Object.entries(info.children)) {
                addSettingInfo(childKey, childInfo, indent + "    ");
            }
        }
    }

    for (const [key, info] of Object.entries(SETTINGS_DEFINITION)) {
        addSettingInfo(key, info);
    }

    return lines.join("\n");
}

/**
 * TimeTracker設定のデフォルト値を取得
 *
 * @returns デフォルト値を持つ全フィールド
 */
export function getDefaultTimeTrackerSettings(): Partial<TimeTrackerSettings> {
    const timetrackerDef = SETTINGS_DEFINITION.timetracker;

    if (timetrackerDef.type !== "object") {
        return {};
    }

    function extractDefaults(obj: Record<string, SettingValueInfo>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, info] of Object.entries(obj)) {
            const defaultValue = getFieldDefaultValue(info);
            if (defaultValue !== undefined) {
                result[key] = defaultValue;
            }
        }
        return result;
    }

    return extractDefaults(timetrackerDef.children) as Partial<TimeTrackerSettings>;
}

/**
 * 設定が完全かどうかをチェック
 *
 * @param settings - チェックする設定
 * @returns 全ての必須フィールドが存在すればtrue
 */
export function isTimeTrackerSettingsComplete(settings: Partial<TimeTrackerSettings>): settings is TimeTrackerSettings {
    const result = validateTimeTrackerSettings(settings);
    return !result.isError;
}
