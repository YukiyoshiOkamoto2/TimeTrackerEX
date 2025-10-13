/**
 * Models Schema Utilities
 *
 * Zodスキーマのユーティリティ関数です。
 */

import { z } from "zod";

/**
 * Zodスキーマを使用して型チェックを行う
 *
 * @param schema - Zodスキーマ
 * @param value - チェックする値
 * @returns 値がスキーマに適合する場合はtrue、そうでない場合はfalse
 *
 * @example
 * ```typescript
 * import { EventSchema } from "@/schema/models";
 * import { isType } from "@/schema/models/modelsSchemaUtils";
 *
 * const data = { uuid: "test", name: "Test Event", ... };
 * if (isType(EventSchema, data)) {
 *     // dataはEvent型として扱える
 *     console.log("Valid event:", data);
 * }
 * ```
 */
export function isType<T>(schema: z.ZodType<T>, value: unknown): value is T {
    return schema.safeParse(value).success;
}
