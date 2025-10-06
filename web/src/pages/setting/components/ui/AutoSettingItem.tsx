/**
 * Auto Setting Item Component
 *
 * settingsDefinitionの定義から自動的にSettingItemを生成するヘルパーコンポーネント
 * 設定値の型に応じて適切なUIコントロールを自動生成します
 */

import { ValidatedInput } from "@/components/validated-input";
import type {
    ArraySettingValueInfo,
    BooleanSettingValueInfo,
    NumberSettingValueInfo,
    ObjectSettingValueInfo,
    SettingValueInfo,
    StringSettingValueInfo,
} from "@/schema/settings/settingsDefinition";
import { Dropdown, Input, Option, Switch } from "@fluentui/react-components";
import { SettingItem } from "./SettingItem";

export type AutoSettingItemProps = {
    /** 設定値の定義情報 */
    definition: SettingValueInfo;
    /** 現在の値 */
    value: unknown;
    /** 値が変更されたときのコールバック */
    onChange: (value: unknown) => void;
    /** ラベルのオーバーライド（指定しない場合はdefinition.nameを使用） */
    label?: string;
    /** 説明のオーバーライド（指定しない場合はdefinition.descriptionを使用） */
    description?: string;
    /** コントロールの最小幅 */
    minWidth?: string;
    /** コントロールの最大幅 */
    maxWidth?: string;
    /** プレースホルダー */
    placeholder?: string;
    /** 無効化 */
    disabled?: boolean;
};

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
                    value={value as string}
                    onChange={onChange}
                    style={style}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            );

        case "boolean":
            return (
                <BooleanControl
                    definition={definition as BooleanSettingValueInfo}
                    value={value as boolean}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case "number":
            return (
                <NumberControl
                    definition={definition as NumberSettingValueInfo}
                    value={value as number}
                    onChange={onChange}
                    style={style}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            );

        case "array":
            return (
                <ArrayControl
                    definition={definition as ArraySettingValueInfo}
                    value={value as unknown[]}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case "object":
            return (
                <ObjectControl
                    definition={definition as ObjectSettingValueInfo}
                    value={value as Record<string, unknown>}
                    onChange={onChange}
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

type StringControlProps = {
    definition: StringSettingValueInfo;
    value: string;
    onChange: (value: string) => void;
    style?: React.CSSProperties;
    placeholder?: string;
    disabled?: boolean;
};

function StringControl({ definition, value, onChange, style, placeholder, disabled }: StringControlProps) {
    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={value || definition.defaultValue || ""}
                selectedOptions={[value || definition.defaultValue || ""]}
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

    // URL形式の場合はValidatedInput
    if (definition.isUrl) {
        return (
            <ValidatedInput
                type="url"
                value={value || definition.defaultValue || ""}
                onCommit={(val: string) => onChange(val)}
                placeholder={placeholder || definition.description}
                style={style}
                disabled={disabled}
            />
        );
    }

    // パターン指定がある場合はValidatedInput
    if (definition.pattern) {
        return (
            <ValidatedInput
                value={value || definition.defaultValue || ""}
                onCommit={(val: string) => onChange(val)}
                placeholder={placeholder || definition.description}
                style={style}
                disabled={disabled}
            />
        );
    }

    // 通常の文字列入力
    return (
        <Input
            value={value || definition.defaultValue || ""}
            onChange={(_, data) => onChange(data.value)}
            placeholder={placeholder || definition.description}
            style={style}
            disabled={disabled}
        />
    );
}

// ========================================
// ブール型コントロール
// ========================================

type BooleanControlProps = {
    definition: BooleanSettingValueInfo;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
};

function BooleanControl({ definition, value, onChange, disabled }: BooleanControlProps) {
    return (
        <Switch
            checked={value ?? definition.defaultValue ?? false}
            onChange={(_, data) => onChange(data.checked)}
            disabled={disabled}
        />
    );
}

// ========================================
// 数値型コントロール
// ========================================

type NumberControlProps = {
    definition: NumberSettingValueInfo;
    value: number;
    onChange: (value: number) => void;
    style?: React.CSSProperties;
    placeholder?: string;
    disabled?: boolean;
};

function NumberControl({ definition, value, onChange, style, placeholder, disabled }: NumberControlProps) {
    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={value?.toString() || definition.defaultValue?.toString() || ""}
                selectedOptions={[value?.toString() || definition.defaultValue?.toString() || ""]}
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

    // 通常の数値入力
    return (
        <Input
            type="number"
            value={value?.toString() || definition.defaultValue?.toString() || ""}
            onChange={(_, data) => {
                const num = Number(data.value);
                if (!isNaN(num)) {
                    onChange(num);
                }
            }}
            placeholder={placeholder || definition.description}
            style={style}
            disabled={disabled}
        />
    );
}

// ========================================
// 配列型コントロール
// ========================================

type ArrayControlProps = {
    definition: ArraySettingValueInfo;
    value: unknown[];
    onChange: (value: unknown[]) => void;
    disabled?: boolean;
};

function ArrayControl({ value, disabled }: ArrayControlProps) {
    // 配列型は複雑なので専用のエディターが必要
    // ここでは簡易的な表示のみ
    return (
        <div style={{ opacity: disabled ? 0.5 : 1 }}>
            配列型: {value?.length || 0}個の要素 (専用エディターで編集してください)
        </div>
    );
}

// ========================================
// オブジェクト型コントロール
// ========================================

type ObjectControlProps = {
    definition: ObjectSettingValueInfo;
    value: Record<string, unknown>;
    onChange: (value: Record<string, unknown>) => void;
    disabled?: boolean;
};

function ObjectControl({ value, disabled }: ObjectControlProps) {
    // オブジェクト型は複雑なので専用のエディターが必要
    // ここでは簡易的な表示のみ
    const fieldCount = Object.keys(value || {}).length;
    return (
        <div style={{ opacity: disabled ? 0.5 : 1 }}>
            オブジェクト型: {fieldCount}個のフィールド (専用エディターで編集してください)
        </div>
    );
}
