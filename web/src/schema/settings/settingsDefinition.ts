/**
 * Settings Definition
 *
 * 設定項目の定義を一元管理します。
 * この定義からバリデーションとJSON変換処理を提供します。
 */

import { getLogger } from "@/lib";

const logger = getLogger("IgnoreManager");

/**
 * 設定値の型
 */
export type SettingValueType = "string" | "boolean" | "number" | "array" | "object";
export type ObjectType = Record<string, unknown>;
/**
 * 設定値の型Map
 */
export type SettingValueTypeMap = {
    string: string;
    boolean: boolean;
    number: number;
    array: [];
    object: ObjectType;
};

export interface SettingValue<T extends SettingValueType> {
    /** 設定値の型 */
    readonly type: T;
    /** 表示名 */
    readonly name: string;
    /** 説明 */
    readonly description: string;
    /** 必須かどうか */
    readonly required: boolean;
    /** デフォルト値 */
    readonly defaultValue?: SettingValueTypeMap[T];

    validate(value: unknown): ValidationResult;
}

/**
 * バリデーション結果: 成功
 */
export interface ValidationSuccess {
    isError: false;
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
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * 設定値情報の基底クラス
 */
abstract class BaseSettingValueInfo<T extends SettingValueType> implements SettingValue<T> {
    constructor(
        readonly type: T,
        readonly name: string,
        readonly description: string,
        readonly required: boolean,
        readonly defaultValue?: SettingValueTypeMap[T],
    ) {
        // デフォルト値の型チェック
        if (defaultValue !== undefined) {
            if (type === "array") {
                if (!Array.isArray(defaultValue)) {
                    throw new Error(`[${name}] defaultValue must be array, but got ${typeof defaultValue}`);
                }
            } else if (type === "object") {
                if (typeof defaultValue !== "object" || Array.isArray(defaultValue)) {
                    throw new Error(`[${name}] defaultValue must be object, but got ${typeof defaultValue}`);
                }
            } else if (typeof defaultValue !== type) {
                throw new Error(`[${name}] defaultValue must be ${type}, but got ${typeof defaultValue}`);
            }
        }

        // 必須項目にデフォルト値がない場合は警告(設計上は許容)
        if (required && defaultValue === undefined) {
            console.warn(`[${name}] Required field should have defaultValue`);
        }
    }

    validate(value: unknown): ValidationResult {
        try {
            const result = this.validateInternal(value);
            if (result.isError) {
                return result;
            }
            // オプションフィールドでundefined/nullの場合はvalidateSubをスキップ
            if (value === undefined || value === null) {
                return { isError: false };
            }
            return this.validateSub(value as SettingValueTypeMap[T]);
        } catch (err) {
            const errorMessage = `Faild validate. ${err instanceof Error ? err.message : String(err)}`;
            logger.error(errorMessage);
            return {
                isError: true,
                errorMessage,
            };
        }
    }

    protected validateInternal(value: unknown): ValidationResult {
        // 必須チェック
        if (this.required && (value === undefined || value === null)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`必須です`),
            };
        }
        // オプションでundefinedの場合はOK
        if (!this.required && (value === undefined || value === null)) {
            return { isError: false };
        }
        // 型チェック
        if (this.type === "array") {
            if (!Array.isArray(value)) {
                return {
                    isError: true,
                    errorMessage: this.createErrorMessage(`配列である必要があります`, typeof value),
                };
            }
        } else if (this.type === "object") {
            if (typeof value !== "object" || Array.isArray(value)) {
                return {
                    isError: true,
                    errorMessage: this.createErrorMessage(`オブジェクトである必要があります`, typeof value),
                };
            }
        } else if (typeof value !== this.type) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`${this.type}である必要があります`, typeof value),
            };
        }

        return { isError: false };
    }

    protected createErrorMessage(msg: string, value?: string): string {
        return `${this.name}-> ${msg}${value ? ` (input: ${value})` : ""}`;
    }

    protected abstract validateSub(value: SettingValueTypeMap[T]): ValidationResult;
}

/**
 * 文字列型の設定値情報
 */
export class StringSettingValueInfo extends BaseSettingValueInfo<"string"> {
    /** 許可される値のリスト */
    readonly literals?: string[];
    /** 正規表現パターン */
    readonly pattern?: RegExp;
    /** 最小文字数 */
    readonly minLength?: number;
    /** 最大文字数 */
    readonly maxLength?: number;
    /** URL形式かどうか */
    readonly isUrl?: boolean;
    /** 空文字を許容しない (デフォルト: false) */
    readonly disableEmpty?: boolean;

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: string;
        literals?: string[];
        pattern?: RegExp;
        minLength?: number;
        maxLength?: number;
        isUrl?: boolean;
        disableEmpty?: boolean;
    }) {
        super("string", props.name, props.description, props.required, props.defaultValue);
        this.literals = props.literals;
        this.pattern = props.pattern;
        this.minLength = props.minLength;
        this.maxLength = props.maxLength;
        this.isUrl = props.isUrl;
        this.disableEmpty = props.disableEmpty ?? false;

        // コンストラクタでの妥当性確認
        // disableEmptyとliteralsの相関チェック
        if (this.disableEmpty && this.literals && this.literals.includes("")) {
            throw new Error(`[${props.name}] literals cannot contain empty string when disableEmpty is true`);
        }

        if (props.defaultValue !== undefined) {
            // 空文字を許容しない場合、デフォルト値が空文字ならエラー
            if (this.disableEmpty && props.defaultValue === "") {
                throw new Error(`[${props.name}] defaultValue cannot be empty string when disableEmpty is true`);
            }

            // literalsが設定されている場合、デフォルト値がリストに含まれるか確認
            if (this.literals && this.literals.length > 0 && !this.literals.includes(props.defaultValue)) {
                throw new Error(`[${props.name}] defaultValue must be one of [${this.literals.join(", ")}]`);
            }

            // minLengthチェック
            if (this.minLength !== undefined && props.defaultValue.length < this.minLength) {
                throw new Error(`[${props.name}] defaultValue length must be at least ${this.minLength}`);
            }

            // maxLengthチェック
            if (this.maxLength !== undefined && props.defaultValue.length > this.maxLength) {
                throw new Error(`[${props.name}] defaultValue length must be at most ${this.maxLength}`);
            }

            // URL形式チェック
            if (this.isUrl) {
                try {
                    new URL(props.defaultValue);
                } catch {
                    throw new Error(`[${props.name}] defaultValue must be a valid URL`);
                }
            }

            // 正規表現チェック
            if (this.pattern && !this.pattern.test(props.defaultValue)) {
                throw new Error(`[${props.name}] defaultValue does not match pattern ${this.pattern}`);
            }
        }

        // minLength/maxLengthの相関チェック
        if (this.minLength !== undefined && this.maxLength !== undefined && this.minLength > this.maxLength) {
            throw new Error(
                `[${props.name}] minLength (${this.minLength}) cannot be greater than maxLength (${this.maxLength})`,
            );
        }
    }

    protected validateSub(value: string): ValidationResult {
        // 空文字チェック
        if (this.disableEmpty && value === "") {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`空文字は許可されていません`),
            };
        }

        // 許可される値のチェック
        if (this.literals && this.literals.length > 0 && !this.literals.includes(value)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(
                    `${this.literals.join(", ")} のいずれかである必要があります`,
                    value,
                ),
            };
        }

        // 最小文字数チェック
        if (this.minLength !== undefined && value.length < this.minLength) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`最低${this.minLength}文字必要です`, value),
            };
        }

        // 最大文字数チェック
        if (this.maxLength !== undefined && value.length > this.maxLength) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`最大${this.maxLength}文字までです`, value),
            };
        }

        // URL形式チェック
        if (this.isUrl) {
            try {
                new URL(value);
            } catch {
                return {
                    isError: true,
                    errorMessage: this.createErrorMessage(`有効なURLである必要があります`, value),
                };
            }
        }

        // 正規表現チェック
        if (this.pattern && !this.pattern.test(value)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`形式が不正です`, value),
            };
        }

        return { isError: false };
    }
}

/**
 * ブール型の設定値情報
 */
export class BooleanSettingValueInfo extends BaseSettingValueInfo<"boolean"> {
    constructor(props: { name: string; description: string; required: boolean; defaultValue?: boolean }) {
        super("boolean", props.name, props.description, props.required, props.defaultValue);
    }

    protected validateSub(_value: boolean): ValidationResult {
        // ブール型は型チェックのみで特別な検証は不要
        return { isError: false };
    }
}

/**
 * 数値型の設定値情報
 */
export class NumberSettingValueInfo extends BaseSettingValueInfo<"number"> {
    /** 許可される値のリスト */
    readonly literals?: number[];
    /** 整数のみ許可 */
    readonly integer?: boolean;
    /** 正の数のみ許可 */
    readonly positive?: boolean;
    /** 最小値 */
    readonly min?: number;
    /** 最大値 */
    readonly max?: number;

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: number;
        literals?: number[];
        integer?: boolean;
        positive?: boolean;
        min?: number;
        max?: number;
    }) {
        super("number", props.name, props.description, props.required, props.defaultValue);
        this.literals = props.literals;
        this.integer = props.integer;
        this.positive = props.positive;
        this.min = props.min;
        this.max = props.max;

        // コンストラクタでの妥当性確認
        // min/maxの相関チェック
        if (this.min !== undefined && this.max !== undefined && this.min > this.max) {
            throw new Error(`[${props.name}] min (${this.min}) cannot be greater than max (${this.max})`);
        }

        if (props.defaultValue !== undefined) {
            // NaNチェック
            if (isNaN(props.defaultValue)) {
                throw new Error(`[${props.name}] defaultValue cannot be NaN`);
            }

            // literalsチェック
            if (this.literals && this.literals.length > 0 && !this.literals.includes(props.defaultValue)) {
                throw new Error(`[${props.name}] defaultValue must be one of [${this.literals.join(", ")}]`);
            }

            // 整数チェック
            if (this.integer && !Number.isInteger(props.defaultValue)) {
                throw new Error(`[${props.name}] defaultValue must be an integer`);
            }

            // 正の数チェック
            if (this.positive && props.defaultValue <= 0) {
                throw new Error(`[${props.name}] defaultValue must be positive`);
            }

            // 最小値チェック
            if (this.min !== undefined && props.defaultValue < this.min) {
                throw new Error(`[${props.name}] defaultValue must be at least ${this.min}`);
            }

            // 最大値チェック
            if (this.max !== undefined && props.defaultValue > this.max) {
                throw new Error(`[${props.name}] defaultValue must be at most ${this.max}`);
            }
        }
    }

    protected validateSub(value: number): ValidationResult {
        // NaNチェック
        if (isNaN(value)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`数値である必要があります`, String(value)),
            };
        }

        // 整数チェック
        if (this.integer && !Number.isInteger(value)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`整数である必要があります`, String(value)),
            };
        }

        // 正の数チェック
        if (this.positive && value <= 0) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`正の数である必要があります`, String(value)),
            };
        }

        // 最小値チェック
        if (this.min !== undefined && value < this.min) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`${this.min}以上である必要があります`, String(value)),
            };
        }

        // 最大値チェック
        if (this.max !== undefined && value > this.max) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`${this.max}以下である必要があります`, String(value)),
            };
        }

        // 許可される値のチェック
        if (this.literals && this.literals.length > 0 && !this.literals.includes(value)) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(
                    `${this.literals.join(", ")} のいずれかである必要があります`,
                    String(value),
                ),
            };
        }

        return { isError: false };
    }
}

export type ArraySettingValueType = "string" | "number" | "object";

/**
 * 配列型の設定値情報
 */
export class ArraySettingValueInfo extends BaseSettingValueInfo<"array"> {
    /** 配列要素の型 */
    readonly itemType?: ArraySettingValueType;
    /** 配列要素のスキーマ定義 */
    readonly itemSchema?: StringSettingValueInfo | NumberSettingValueInfo | ObjectSettingValueInfo;
    /** 最小要素数 */
    readonly minItems?: number;
    /** 最大要素数 */
    readonly maxItems?: number;

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: [] | undefined;
        itemType?: ArraySettingValueType;
        itemSchema?: StringSettingValueInfo | NumberSettingValueInfo | ObjectSettingValueInfo;
        minItems?: number;
        maxItems?: number;
    }) {
        super("array", props.name, props.description, props.required, props.defaultValue as [] | undefined);
        this.itemType = props.itemType;
        this.itemSchema = props.itemSchema;
        this.minItems = props.minItems;
        this.maxItems = props.maxItems;

        // コンストラクタでの妥当性確認
        // minItems/maxItemsの相関チェック
        if (this.minItems !== undefined && this.maxItems !== undefined && this.minItems > this.maxItems) {
            throw new Error(
                `[${props.name}] minItems (${this.minItems}) cannot be greater than maxItems (${this.maxItems})`,
            );
        }

        // itemTypeとitemSchemaの型が一致しているか確認
        if (this.itemType && this.itemSchema) {
            if (this.itemType === "string" && !(this.itemSchema instanceof StringSettingValueInfo)) {
                throw new Error(`[${props.name}] itemSchema must be StringSettingValueInfo when itemType is 'string'`);
            }
            if (this.itemType === "number" && !(this.itemSchema instanceof NumberSettingValueInfo)) {
                throw new Error(`[${props.name}] itemSchema must be NumberSettingValueInfo when itemType is 'number'`);
            }
            if (this.itemType === "object" && !(this.itemSchema instanceof ObjectSettingValueInfo)) {
                throw new Error(`[${props.name}] itemSchema must be ObjectSettingValueInfo when itemType is 'object'`);
            }
        }

        if (props.defaultValue !== undefined) {
            // minItemsチェック
            if (this.minItems !== undefined && props.defaultValue.length < this.minItems) {
                throw new Error(`[${props.name}] defaultValue length must be at least ${this.minItems}`);
            }

            // maxItemsチェック
            if (this.maxItems !== undefined && props.defaultValue.length > this.maxItems) {
                throw new Error(`[${props.name}] defaultValue length must be at most ${this.maxItems}`);
            }

            // 配列要素の型と内容の再帰的チェック
            if (this.itemType) {
                for (let i = 0; i < props.defaultValue.length; i++) {
                    const item = props.defaultValue[i];
                    const itemPath = `[${i}]`;

                    // 型チェック
                    if (this.itemType !== typeof item) {
                        throw new Error(
                            `[${props.name}] defaultValue${itemPath} must be ${this.itemType}, but got ${typeof item}`,
                        );
                    }

                    // itemSchemaが設定されている場合はスキーマバリデーションを実行
                    if (this.itemSchema) {
                        const result = this.itemSchema.validate(item);
                        if (result.isError) {
                            throw new Error(
                                `[${props.name}] defaultValue${itemPath} validation failed: ${result.errorMessage}`,
                            );
                        }
                    }
                }
            }
        }
    }

    protected validateSub(value: unknown[]): ValidationResult {
        // 最小要素数チェック
        if (this.minItems !== undefined && value.length < this.minItems) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`最低${this.minItems}個必要です`, `length: ${value.length}`),
            };
        }

        // 最大要素数チェック
        if (this.maxItems !== undefined && value.length > this.maxItems) {
            return {
                isError: true,
                errorMessage: this.createErrorMessage(`最大${this.maxItems}個までです`, `length: ${value.length}`),
            };
        }

        // 配列要素の型チェック
        if (this.itemType) {
            const errors: string[] = [];
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                const itemPath = `[${i}]`;
                if (this.itemType !== typeof item) {
                    errors.push(
                        this.createErrorMessage(`${itemPath}-> ${this.itemType}である必要があります`, typeof item),
                    );
                    continue;
                }
                // itemSchemaが設定されている場合はスキーマバリデーションを実行
                if (this.itemSchema) {
                    const result = this.itemSchema.validate(item);
                    if (result.isError) {
                        errors.push(this.createErrorMessage(`${itemPath}-> ${result.errorMessage}`));
                    }
                }
            }

            if (errors.length > 0) {
                return {
                    isError: true,
                    errorMessage: errors.join("\n"),
                };
            }
        }

        return { isError: false };
    }
}

/**
 * 配列型の設定値情報
 */
export type ArraySettingValueTypeTyped =
    | StringSettingValueInfo
    | NumberSettingValueInfo
    | ObjectSettingValueInfo
    | ObjectSettingValueInfoTyped<Record<string, unknown>>;

/**
 * 配列型の設定値情報()
 */
export class ArraySettingValueInfoTyped<T extends ArraySettingValueTypeTyped> extends ArraySettingValueInfo {
    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: [] | undefined;
        itemType?: ArraySettingValueType;
        itemSchema?: T;
        minItems?: number;
        maxItems?: number;
    }) {
        super({
            ...props,
            itemSchema: props.itemSchema,
        });
    }

    // Type-safe accessor for itemSchema
    getTypedItemSchema(): T | undefined {
        return this.itemSchema as T | undefined;
    }
}

/**
 * オブジェクト型の設定値情報
 */
export class ObjectSettingValueInfo extends BaseSettingValueInfo<"object"> {
    /** 子要素の定義 */
    readonly children?: Record<string, SettingValueInfo>;
    /** 未定義 フィールドチェック*/
    readonly disableUnknownField?: boolean;

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: ObjectType;
        children?: Record<string, SettingValueInfo>;
        disableUnknownField?: boolean;
    }) {
        super("object", props.name, props.description, props.required, props.defaultValue);
        this.children = props.children;
        this.disableUnknownField = props.disableUnknownField;

        // コンストラクタでの妥当性確認
        if (props.defaultValue !== undefined && this.children) {
            // defaultValueのフィールドが定義されているか確認
            if (this.disableUnknownField) {
                for (const key of Object.keys(props.defaultValue)) {
                    if (!this.children[key]) {
                        throw new Error(`[${props.name}] Unknown field '${key}' in defaultValue`);
                    }
                }
            }

            // 子要素のデフォルト値を再帰的に検証
            for (const [key, childInfo] of Object.entries(this.children)) {
                const childValue = props.defaultValue[key];

                // 子要素が必須かつdefaultValueに含まれていない場合、子要素自身のdefaultValueをチェック
                if (childValue === undefined) {
                    if (childInfo.required && childInfo.defaultValue === undefined) {
                        console.warn(
                            `[${props.name}.${key}] Required field is missing in parent's defaultValue and has no defaultValue`,
                        );
                    }
                    continue;
                }

                // 子要素の値を検証
                const result = childInfo.validate(childValue as never);
                if (result.isError) {
                    throw new Error(`[${props.name}.${key}] defaultValue validation failed: ${result.errorMessage}`);
                }
            }
        }
    }

    protected validateSub(value: ObjectType): ValidationResult {
        if (!this.children) {
            return { isError: false };
        }

        const errors: string[] = [];

        // 子要素のバリデーション
        for (const [key, childInfo] of Object.entries(this.children)) {
            const childValue = value[key];
            const result = childInfo.validate(childValue as never);
            if (result.isError) {
                errors.push(this.createErrorMessage(`${key}-> ${result.errorMessage}`));
            }
        }

        // 未定義のフィールドチェック
        if (this.disableUnknownField) {
            for (const key of Object.keys(value)) {
                if (!this.children[key]) {
                    errors.push(this.createErrorMessage(`不明なフィールドです`, key));
                }
            }
        }

        if (errors.length > 0) {
            return {
                isError: true,
                errorMessage: errors.join("\n"),
            };
        }

        return { isError: false };
    }

    validatePartial(value: ObjectType): ValidationResult {
        // オプションでundefinedの場合はOK
        if (!this.required && (value === undefined || value === null)) {
            return { isError: false };
        }

        const baseCheck = this.validateInternal(value);
        if (baseCheck.isError) {
            return baseCheck;
        }

        const fullCheck = this.validate(value);
        if (!fullCheck.isError) {
            return { isError: false };
        }

        // 子要素がない場合
        if (!this.children) {
            return { isError: false };
        }

        const errors = [];

        // 提供された項目のみをバリデーション
        for (const [k, v] of Object.entries(value)) {
            const fieldDef = this.children[k];
            if (!fieldDef) {
                if (this.disableUnknownField) {
                    errors.push(this.createErrorMessage(`不明なフィールドです`, k));
                }
                continue;
            }
            if (fieldDef.type !== "object") {
                const result = fieldDef.validate(v);
                if (result.isError) {
                    errors.push(this.createErrorMessage(result.errorMessage, k));
                }
            } else {
                const result = fieldDef.validatePartial(v as ObjectType);
                if (result.isError) {
                    errors.push(this.createErrorMessage(result.errorMessage, k));
                }
            }
        }

        if (errors.length > 0) {
            return {
                isError: true,
                errorMessage: errors.join("\n"),
            };
        }

        return { isError: false };
    }
}

/**
 * オブジェクト型の設定値情報
 */
export class ObjectSettingValueInfoTyped<T> extends ObjectSettingValueInfo {
    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: ObjectType;
        children?: Record<keyof T, SettingValueInfo>;
        disableUnknownField?: boolean;
    }) {
        super({
            ...props,
            children: props.children,
        });
    }

    // Type-safe accessor for children
    getTypedChildren(): Record<keyof T, SettingValueInfo> | undefined {
        return this.children as Record<keyof T, SettingValueInfo> | undefined;
    }
}

/**
 * 設定値情報の型
 */
export type SettingValueInfo =
    | StringSettingValueInfo
    | BooleanSettingValueInfo
    | NumberSettingValueInfo
    | ArraySettingValueInfo
    | ArraySettingValueInfoTyped<ArraySettingValueTypeTyped>
    | ObjectSettingValueInfo
    | ObjectSettingValueInfoTyped<Record<string, SettingValueInfo>>;
