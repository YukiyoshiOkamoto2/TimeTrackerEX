/**
 * Auto Setting Item Component
 *
 * settingsDefinitionの定義から自動的にSettingItemを生成するヘルパーコンポーネント
 * 設定値の型に応じて適切なUIコントロールを自動生成します
 */

import type { NumberSettingValueInfo, SettingValueInfo, StringSettingValueInfo } from "@/schema";
import { Dropdown, Option, Switch } from "@fluentui/react-components";
import { SettingItem } from "./SettingItem";
import { SettingValidatedInput } from "./SettingValidatedInput";

// ========================================
// 共通型定義
// ========================================

/**
 * 基本的なコントロールプロパティ（ジェネリック）
 *
 * @template TValue - 設定値の型
 * @template TDefinition - 設定定義の型（SettingValueInfoを継承）
 *
 * @example
 * ```typescript
 * // 文字列型のコントロール
 * type StringControlProps = BaseControlProps<string, StringSettingValueInfo>;
 *
 * // 数値型のコントロール
 * type NumberControlProps = BaseControlProps<number, NumberSettingValueInfo>;
 * ```
 */
type BaseControlProps<TValue, TDefinition extends SettingValueInfo = SettingValueInfo> = {
    /** 設定値の定義情報 */
    definition: TDefinition;
    /** 現在の値 */
    value: TValue | undefined;
    /** 値が変更されたときのコールバック */
    onChange: (value: TValue) => void;
    /** スタイル */
    style?: React.CSSProperties;
    /** プレースホルダー */
    placeholder?: string;
    /** 無効化 */
    disabled?: boolean;
};

/**
 * スタイル関連のプロパティ
 *
 * AutoSettingItemで使用され、内部でReact.CSSPropertiesに変換されます。
 */
type StyleProps = {
    /** コントロールの最小幅 */
    minWidth?: string;
    /** コントロールの最大幅 */
    maxWidth?: string;
};

/**
 * オーバーライド可能なプロパティ
 *
 * 設定定義のnameとdescriptionをUI表示時にオーバーライドできます。
 */
type OverrideProps = {
    /** ラベルのオーバーライド（指定しない場合はdefinition.nameを使用） */
    label?: string;
    /** 説明のオーバーライド（指定しない場合はdefinition.descriptionを使用） */
    description?: string;
};

export type AutoSettingItemProps = {
    /** 設定値の定義情報 */
    definition: SettingValueInfo;
    /** 現在の値 */
    value: unknown;
    /** 値が変更されたときのコールバック */
    onChange: (value: unknown) => void;
    /** プレースホルダー */
    placeholder?: string;
    /** 無効化 */
    disabled?: boolean;
} & StyleProps &
    OverrideProps;

/**
 * 設定定義から自動的にSettingItemを生成する
 */
export function AutoSettingItem({
    definition,
    value,
    onChange,
    label,
    description,
    minWidth,
    maxWidth,
    placeholder,
    disabled,
}: AutoSettingItemProps) {
    const style = {
        minWidth: minWidth,
        maxWidth: maxWidth,
    };

    const control = renderControl(definition, value, onChange, style, placeholder, disabled);

    return (
        <SettingItem
            label={label || definition.name}
            description={description || definition.description}
            control={control}
            required={definition.required}
        />
    );
}

/**
 * 設定値の型に応じて適切なUIコントロールを返す
 */
function renderControl(
    definition: SettingValueInfo,
    value: unknown,
    onChange: (value: unknown) => void,
    style?: React.CSSProperties,
    placeholder?: string,
    disabled?: boolean,
): React.ReactNode {
    switch (definition.type) {
        case "string":
            return (
                <StringControl
                    definition={definition as StringSettingValueInfo}
                    value={value as string | undefined}
                    onChange={(val) => onChange(val)}
                    style={style}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            );

        case "boolean":
            return (
                <BooleanControl
                    value={value as boolean | undefined}
                    onChange={(val) => onChange(val)}
                    disabled={disabled}
                />
            );

        case "number":
            return (
                <NumberControl
                    definition={definition as NumberSettingValueInfo}
                    value={value as number | undefined}
                    onChange={(val) => onChange(val)}
                    style={style}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            );

        default:
            // TypeScriptの型チェックで到達不可能
            return <div>Unsupported type</div>;
    }
}

// ========================================
// 文字列型コントロール
// ========================================

/**
 * 文字列型コントロールのプロパティ
 * BaseControlPropsを使用して型安全に定義
 */
type StringControlProps = BaseControlProps<string, StringSettingValueInfo>;

function StringControl({ definition, value, onChange, style, placeholder, disabled }: StringControlProps) {
    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={value ?? ""}
                selectedOptions={[value ?? ""]}
                onOptionSelect={(_, data) => onChange(data.optionValue as string)}
                style={style}
                disabled={disabled}
                placeholder={placeholder || `${definition.name}を選択`}
            >
                {definition.literals.map((literal) => (
                    <Option key={literal} value={literal}>
                        {literal}
                    </Option>
                ))}
            </Dropdown>
        );
    }

    // すべての文字列入力でSettingValidatedInputを使用（URL、パターン、通常入力）
    return (
        <SettingValidatedInput
            type={definition.isUrl ? "url" : "text"}
            value={value}
            onCommit={(val) => onChange(val as string)}
            definition={definition}
            placeholder={placeholder || definition.description}
            style={style}
            disabled={disabled}
        />
    );
}

// ========================================
// ブール型コントロール
// ========================================

/**
 * ブール型コントロールのプロパティ
 * BaseControlPropsから不要なプロパティを除外（Switchコントロールには不要）
 */
type BooleanControlProps = Omit<BaseControlProps<boolean>, "definition" | "style" | "placeholder">;

function BooleanControl({ value, onChange, disabled }: BooleanControlProps) {
    return <Switch checked={value ?? false} onChange={(_, data) => onChange(data.checked)} disabled={disabled} />;
}

// ========================================
// 数値型コントロール
// ========================================

/**
 * 数値型コントロールのプロパティ
 * BaseControlPropsを使用して型安全に定義
 */
type NumberControlProps = BaseControlProps<number, NumberSettingValueInfo>;

function NumberControl({ definition, value, onChange, style, placeholder, disabled }: NumberControlProps) {
    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={value?.toString() ?? ""}
                selectedOptions={[value?.toString() ?? ""]}
                onOptionSelect={(_, data) => onChange(Number(data.optionValue))}
                style={style}
                disabled={disabled}
                placeholder={placeholder || `${definition.name}を選択`}
            >
                {definition.literals.map((literal) => (
                    <Option key={literal} value={literal.toString()} text={literal.toString()}>
                        {literal}
                    </Option>
                ))}
            </Dropdown>
        );
    }

    // すべての数値入力でSettingValidatedInputを使用
    return (
        <SettingValidatedInput
            type="number"
            value={value}
            onCommit={(val) => onChange(val as number)}
            definition={definition}
            placeholder={placeholder || definition.description}
            style={style}
            disabled={disabled}
        />
    );
}
