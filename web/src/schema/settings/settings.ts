/**
 * Settings Schema
 *
 * Zodを使用した設定のスキーマ定義です。
 * ランタイムでの型安全なバリデーションを提供します。
 *
 * 設定定義(settingsDefinition.ts)から自動生成されたスキーマを使用します。
 */

import { z } from "zod";
import {
    GeneratedAppSettingsSchema,
    SETTINGS_DEFINITION,
    createZodSchemaFromDefinition,
    getDefaultValues,
} from "./settingsDefinition";

/**
 * アプリケーション設定のスキーマ（完全版）
 * settingsDefinition.tsの定義から自動生成されます
 */
export const AppSettingsSchema = GeneratedAppSettingsSchema;

/**
 * 個別のスキーマ（後方互換性のため）
 * これらはSETTINGS_DEFINITIONから自動生成されます
 */

// 丸め方法のスキーマ
export const RoundingMethodSchema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.roundingTimeTypeOfEvent);

// 開始終了タイプのスキーマ
const scheduleInfo = SETTINGS_DEFINITION.scheduleAutoInputInfo;
export const StartEndTypeSchema =
    scheduleInfo.type === "object" ? createZodSchemaFromDefinition(scheduleInfo.children.startEndType) : z.never();

// 時間比較タイプのスキーマ
const eventDupInfo = SETTINGS_DEFINITION.eventDuplicatePriority;
export const TimeCompareSchema =
    eventDupInfo.type === "object" ? createZodSchemaFromDefinition(eventDupInfo.children.timeCompare) : z.never();

// 休暇イベント設定のスキーマ
export const TimeOffEventConfigSchema =
    SETTINGS_DEFINITION.timeOffEvent.type === "object"
        ? z.object({
              nameOfEvent: createZodSchemaFromDefinition(SETTINGS_DEFINITION.timeOffEvent.children.nameOfEvent),
              workItemId: createZodSchemaFromDefinition(SETTINGS_DEFINITION.timeOffEvent.children.workItemId),
          })
        : z.never();

// イベント重複時の優先判定のスキーマ
export const EventDuplicatePrioritySchema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.eventDuplicatePriority);

// 勤務時間の自動入力設定のスキーマ
export const ScheduleAutoInputInfoSchema = createZodSchemaFromDefinition(SETTINGS_DEFINITION.scheduleAutoInputInfo);

// 有給休暇の自動入力設定のスキーマ
export const PaidLeaveInputInfoSchema =
    SETTINGS_DEFINITION.paidLeaveInputInfo.type === "object"
        ? z.object({
              workItemId: createZodSchemaFromDefinition(SETTINGS_DEFINITION.paidLeaveInputInfo.children.workItemId),
              startTime: createZodSchemaFromDefinition(SETTINGS_DEFINITION.paidLeaveInputInfo.children.startTime),
              endTime: createZodSchemaFromDefinition(SETTINGS_DEFINITION.paidLeaveInputInfo.children.endTime),
          })
        : z.never();

/**
 * アプリケーション設定のスキーマ（部分版）
 */
export const PartialAppSettingsSchema = AppSettingsSchema.partial();

/**
 * スキーマから推論された型
 */
export type AppSettingsInput = z.input<typeof AppSettingsSchema>;
export type AppSettingsOutput = z.output<typeof AppSettingsSchema>;
export type PartialAppSettingsInput = z.input<typeof PartialAppSettingsSchema>;

/**
 * アプリケーション設定の型（メイン）
 * スキーマから自動的に推論されます
 */
export type AppSettings = z.infer<typeof AppSettingsSchema>;

/**
 * 個別の型定義（スキーマから推論）
 */
export type RoundingMethod = z.infer<typeof RoundingMethodSchema>;
export type StartEndType = z.infer<typeof StartEndTypeSchema>;
export type TimeCompare = z.infer<typeof TimeCompareSchema>;
export type TimeOffEventConfig = z.infer<typeof TimeOffEventConfigSchema>;
export type EventDuplicatePriority = z.infer<typeof EventDuplicatePrioritySchema>;
export type ScheduleAutoInputInfo = z.infer<typeof ScheduleAutoInputInfoSchema>;
export type PaidLeaveInputInfo = z.infer<typeof PaidLeaveInputInfoSchema>;

/**
 * 設定を検証
 *
 * @param settings - 検証する設定
 * @returns 検証結果 { success: true, data } または { success: false, error }
 */
export function validateSettingsWithZod(settings: unknown) {
    return AppSettingsSchema.safeParse(settings);
}

/**
 * 部分的な設定を検証
 *
 * @param settings - 検証する設定
 * @returns 検証結果 { success: true, data } または { success: false, error }
 */
export function validatePartialSettingsWithZod(settings: unknown) {
    return PartialAppSettingsSchema.safeParse(settings);
}

/**
 * Zodのエラーを人間が読める形式に変換
 * SETTINGS_DEFINITIONの名前を使用して、わかりやすいエラーメッセージを生成します
 *
 * @param error - Zodのエラー
 * @returns エラーメッセージの配列
 */
export function formatZodError(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path;

        // パスが空の場合
        if (path.length === 0) {
            return issue.message;
        }

        // トップレベルのフィールド
        const topLevelKey = String(path[0]);
        const definition = SETTINGS_DEFINITION[topLevelKey as keyof typeof SETTINGS_DEFINITION];

        if (!definition) {
            // 定義が見つからない場合は元のメッセージ
            return `${path.join(".")}: ${issue.message}`;
        }

        // ネストされたフィールド（例: scheduleAutoInputInfo.startEndType）
        if (path.length > 1 && definition.type === "object") {
            const childKey = String(path[1]);
            const childDefinition = definition.children[childKey];

            if (childDefinition) {
                // 子フィールドのエラーメッセージ
                const received = (issue as any).received;
                if (issue.code === "invalid_type" && (received === "undefined" || received === undefined)) {
                    return `${childDefinition.name}は必須です`;
                }
                // invalid_union/invalid_valueで"Invalid option"メッセージの場合も必須エラーとして扱う
                if (
                    (issue.code === "invalid_union" || issue.code === "invalid_value") &&
                    issue.message.includes("Invalid option")
                ) {
                    return `${childDefinition.name}は必須です`;
                }
                return `${childDefinition.name}: ${issue.message}`;
            }
        }

        // トップレベルフィールドのエラーメッセージ
        const received = (issue as any).received;
        if (issue.code === "invalid_type" && (received === "undefined" || received === undefined)) {
            return `${definition.name}は必須です`;
        }

        // invalid_union/invalid_valueで"Invalid option"メッセージの場合も必須エラーとして扱う（列挙型フィールドの場合）
        if (
            (issue.code === "invalid_union" || issue.code === "invalid_value") &&
            issue.message.includes("Invalid option")
        ) {
            return `${definition.name}は必須です`;
        }

        // その他のエラー
        return `${definition.name}: ${issue.message}`;
    });
}

/**
 * 設定定義を取得
 * Python版のSettings._key_name_mapに相当
 */
export { SETTINGS_DEFINITION } from "./settingsDefinition";

/**
 * 設定のヘルプテキストを取得
 * Python版のSettings.get_help_text()に相当
 */
export { generateHelpText } from "./settingsDefinition";

/**
 * デフォルト値を取得
 */
export { getDefaultValues } from "./settingsDefinition";

/**
 * 個別の設定値情報の型
 */
export type { SettingValueInfo } from "./settingsDefinition";

/**
 * デフォルト設定
 * SETTINGS_DEFINITIONから自動的に生成されます
 */
export const DEFAULT_SETTINGS = getDefaultValues() as Partial<AppSettings>;

/**
 * 設定の検証エラー
 */
export class SettingsValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SettingsValidationError";
    }
}

/**
 * 設定を検証（シンプル版）
 * Zodスキーマを使用した検証結果から、エラーメッセージの配列を返します
 *
 * @param settings - 検証する設定
 * @returns エラーメッセージの配列（空の場合は検証成功）
 */
export function validateSettings(settings: Partial<AppSettings>): string[] {
    const result = AppSettingsSchema.safeParse(settings);

    if (result.success) {
        return [];
    }

    return formatZodError(result.error);
}

/**
 * 設定が完全かどうかをチェック
 *
 * @param settings - チェックする設定
 * @returns 完全な設定の場合true
 */
export function isSettingsComplete(settings: Partial<AppSettings>): settings is AppSettings {
    return validateSettings(settings).length === 0;
}
