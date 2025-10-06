/**
 * Settings Definition
 *
 * 設定項目の定義を一元管理します。
 * この定義からバリデーションとJSON変換処理を提供します。
 */

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
        if (defaultValue && typeof defaultValue !== type) {
            throw new Error("defaultValue is invalid type: " + typeof defaultValue + ", type: " + type);
        }
    }
    validate(value: unknown): ValidationResult {
        const result = this.validateInternal(value);
        if (result.isError) {
            return result;
        }
        // オプションフィールドでundefined/nullの場合はvalidateSubをスキップ
        if (value === undefined || value === null) {
            return { isError: false };
        }
        return this.validateSub(value as SettingValueTypeMap[T]);
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
    }) {
        super("string", props.name, props.description, props.required, props.defaultValue);
        this.literals = props.literals;
        this.pattern = props.pattern;
        this.minLength = props.minLength;
        this.maxLength = props.maxLength;
        this.isUrl = props.isUrl;
    }

    protected validateSub(value: string): ValidationResult {
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

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: number;
        literals?: number[];
        integer?: boolean;
        positive?: boolean;
    }) {
        super("number", props.name, props.description, props.required, props.defaultValue);
        this.literals = props.literals;
        this.integer = props.integer;
        this.positive = props.positive;
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

/**
 * 配列型の設定値情報
 */
export class ArraySettingValueInfo extends BaseSettingValueInfo<"array"> {
    /** 配列要素の型 */
    readonly itemType?: "string" | "number" | "object";
    /** オブジェクト型の場合の子要素定義 */
    readonly itemSchema?: ObjectSettingValueInfo;
    /** 最小要素数 */
    readonly minItems?: number;
    /** 最大要素数 */
    readonly maxItems?: number;

    constructor(props: {
        name: string;
        description: string;
        required: boolean;
        defaultValue?: [] | undefined;
        itemType?: "string" | "number" | "object";
        itemSchema?: ObjectSettingValueInfo;
        minItems?: number;
        maxItems?: number;
    }) {
        super("array", props.name, props.description, props.required, props.defaultValue as [] | undefined);
        this.itemType = props.itemType;
        this.itemSchema = props.itemSchema;
        this.minItems = props.minItems;
        this.maxItems = props.maxItems;
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
                if (this.itemType === "object") {
                    if (this.itemSchema) {
                        // オブジェクト要素のバリデーション
                        const result = this.itemSchema.validate(item);
                        if (result.isError) {
                            errors.push(this.createErrorMessage(`${result.errorMessage}`));
                        }
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
 * 設定値情報の型
 */
export type SettingValueInfo =
    | StringSettingValueInfo
    | BooleanSettingValueInfo
    | NumberSettingValueInfo
    | ArraySettingValueInfo
    | ObjectSettingValueInfo;
