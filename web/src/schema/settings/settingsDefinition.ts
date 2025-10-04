/**
 * Settings Definition
 *
 * 設定項目の定義を一元管理します。
 * この定義から型とスキーマが自動生成されます。
 */

import { z } from "zod";

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
    itemType: "string" | "number";
    /** 最小要素数 */
    minItems?: number;
    /** デフォルト値 */
    default?: string[] | number[];
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
} as const;

/**
 * 設定値情報からZodスキーマを生成
 */
export function createZodSchemaFromDefinition(info: SettingValueInfo): z.ZodTypeAny {
    switch (info.type) {
        case "string": {
            let schema = z.string();

            if (info.minLength !== undefined) {
                schema = schema.min(info.minLength, `${info.name}は最低${info.minLength}文字必要です`);
            }

            if (info.isUrl) {
                schema = schema.url(`${info.name}は有効なURLである必要があります`);
            }

            if (info.pattern) {
                schema = schema.regex(info.pattern, info.patternMessage || `${info.name}の形式が不正です`);
            }

            if (info.literals && info.literals.length > 0) {
                return z.enum(info.literals as [string, ...string[]]);
            }

            return schema;
        }

        case "boolean":
            return z.boolean();

        case "number": {
            let schema = z.number();

            if (info.integer) {
                schema = schema.int(`${info.name}は整数である必要があります`);
            }

            if (info.positive) {
                schema = schema.positive(`${info.name}は正の数である必要があります`);
            }

            if (info.literals && info.literals.length > 0) {
                return z.union(
                    info.literals.map((lit) => z.literal(lit)) as [
                        z.ZodLiteral<number>,
                        z.ZodLiteral<number>,
                        ...z.ZodLiteral<number>[],
                    ],
                );
            }

            return schema;
        }

        case "array": {
            const itemSchema = info.itemType === "string" ? z.string() : z.number();
            let schema = z.array(itemSchema);

            if (info.minItems !== undefined) {
                schema = schema.min(info.minItems, `${info.name}は最低${info.minItems}個必要です`);
            }

            return schema;
        }

        case "object": {
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const [key, childInfo] of Object.entries(info.children)) {
                let childSchema = createZodSchemaFromDefinition(childInfo);
                if (!childInfo.required) {
                    childSchema = childSchema.optional();
                }
                shape[key] = childSchema;
            }
            return z.object(shape);
        }
    }
}

/**
 * 設定定義全体からZodスキーマを生成
 */
export function createAppSettingsSchema() {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, info] of Object.entries(SETTINGS_DEFINITION)) {
        let schema = createZodSchemaFromDefinition(info);
        if (!info.required) {
            schema = schema.optional();
        }
        shape[key] = schema;
    }

    return z.object(shape);
}

/**
 * 自動生成されたスキーマ
 */
export const GeneratedAppSettingsSchema = createAppSettingsSchema();

/**
 * 設定のヘルプテキストを生成
 */
export function generateHelpText(): string {
    const lines: string[] = [];

    for (const [key, info] of Object.entries(SETTINGS_DEFINITION)) {
        lines.push(`\n${info.name} (${key})`);
        lines.push(`  必須: ${info.required ? "はい" : "いいえ"}`);

        if (info.description) {
            lines.push(`  説明: ${info.description}`);
        }

        // 型ごとの追加情報
        if (info.type === "string" && info.literals) {
            lines.push(`  選択肢: ${info.literals.join(", ")}`);
        } else if (info.type === "number" && info.literals) {
            lines.push(`  選択肢: ${info.literals.join(", ")}`);
        }

        if ("default" in info && info.default !== undefined) {
            lines.push(`  デフォルト: ${JSON.stringify(info.default)}`);
        }

        if (info.type === "object") {
            lines.push("  子要素:");
            for (const [childKey, childInfo] of Object.entries(info.children)) {
                lines.push(`    - ${childInfo.name} (${childKey})`);
            }
        }
    }

    return lines.join("\n");
}

/**
 * デフォルト値を取得
 */
export function getDefaultValues(): Partial<Record<keyof typeof SETTINGS_DEFINITION, unknown>> {
    const defaults: Record<string, unknown> = {};

    for (const [key, info] of Object.entries(SETTINGS_DEFINITION)) {
        if ("default" in info && info.default !== undefined) {
            defaults[key] = info.default;
        } else if (info.type === "object") {
            const childDefaults: Record<string, unknown> = {};
            for (const [childKey, childInfo] of Object.entries(info.children)) {
                if ("default" in childInfo && childInfo.default !== undefined) {
                    childDefaults[childKey] = childInfo.default;
                }
            }
            if (Object.keys(childDefaults).length > 0) {
                defaults[key] = childDefaults;
            }
        }
    }

    return defaults;
}
