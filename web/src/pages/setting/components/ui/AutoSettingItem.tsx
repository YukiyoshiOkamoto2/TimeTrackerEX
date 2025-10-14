/**
 * Auto Setting Item Component
 *
 * settingsDefinitionの定義から自動的にSettingItemを生成するヘルパーコンポーネント
 * 設定値の型に応じて適切なUIコントロールを自動生成します
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useCallback でコントロール生成関数をメモ化
 * - useMemo でスタイルオブジェクトをメモ化
 */

import type { NumberSettingValueInfo, SettingValueInfo, StringSettingValueInfo } from "@/schema";
import { Dropdown, Option, Switch } from "@fluentui/react-components";
import { memo, useCallback, useMemo } from "react";
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
export const AutoSettingItem = memo(function AutoSettingItem({
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
    // スタイルオブジェクトをメモ化（参照の安定性を保証）
    const style = useMemo(
        () => ({
            minWidth: minWidth,
            maxWidth: maxWidth,
        }),
        [minWidth, maxWidth],
    );

    // コントロールのレンダリングをメモ化
    const control = useMemo(
        () => renderControl(definition, value, onChange, style, placeholder, disabled),
        [definition, value, onChange, style, placeholder, disabled],
    );

    // ラベルと説明をメモ化
    const finalLabel = useMemo(() => label || definition.name, [label, definition.name]);
    const finalDescription = useMemo(
        () => description || definition.description,
        [description, definition.description],
    );

    return (
        <SettingItem
            label={finalLabel}
            description={finalDescription}
            control={control}
            required={definition.required}
        />
    );
});

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

const StringControl = memo(function StringControl({
    definition,
    value,
    onChange,
    style,
    placeholder,
    disabled,
}: StringControlProps) {
    // ドロップダウンのハンドラーをメモ化
    const handleDropdownChange = useCallback(
        (_: unknown, data: { optionValue?: string }) => onChange(data.optionValue as string),
        [onChange],
    );

    // テキスト入力のハンドラーをメモ化
    const handleInputCommit = useCallback((val: string | number) => onChange(val as string), [onChange]);

    // プレースホルダーをメモ化
    const finalPlaceholder = useMemo(
        () => placeholder || (definition.literals ? `${definition.name}を選択` : definition.description),
        [placeholder, definition.literals, definition.name, definition.description],
    );

    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={value ?? ""}
                selectedOptions={[value ?? ""]}
                onOptionSelect={handleDropdownChange}
                style={style}
                disabled={disabled}
                placeholder={finalPlaceholder}
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
            onCommit={handleInputCommit}
            definition={definition}
            placeholder={finalPlaceholder}
            style={style}
            disabled={disabled}
        />
    );
});

// ========================================
// ブール型コントロール
// ========================================

/**
 * ブール型コントロールのプロパティ
 * BaseControlPropsから不要なプロパティを除外（Switchコントロールには不要）
 */
type BooleanControlProps = Omit<BaseControlProps<boolean>, "definition" | "style" | "placeholder">;

const BooleanControl = memo(function BooleanControl({ value, onChange, disabled }: BooleanControlProps) {
    // ハンドラーをメモ化
    const handleChange = useCallback((_: unknown, data: { checked: boolean }) => onChange(data.checked), [onChange]);

    return <Switch checked={value ?? false} onChange={handleChange} disabled={disabled} />;
});

// ========================================
// 数値型コントロール
// ========================================

/**
 * 数値型コントロールのプロパティ
 * BaseControlPropsを使用して型安全に定義
 */
type NumberControlProps = BaseControlProps<number, NumberSettingValueInfo>;

const NumberControl = memo(function NumberControl({
    definition,
    value,
    onChange,
    style,
    placeholder,
    disabled,
}: NumberControlProps) {
    // ドロップダウンのハンドラーをメモ化
    const handleDropdownChange = useCallback(
        (_: unknown, data: { optionValue?: string }) => onChange(Number(data.optionValue)),
        [onChange],
    );

    // テキスト入力のハンドラーをメモ化
    const handleInputCommit = useCallback((val: string | number) => onChange(val as number), [onChange]);

    // プレースホルダーをメモ化
    const finalPlaceholder = useMemo(
        () => placeholder || (definition.literals ? `${definition.name}を選択` : definition.description),
        [placeholder, definition.literals, definition.name, definition.description],
    );

    // 値の文字列表現をメモ化
    const stringValue = useMemo(() => value?.toString() ?? "", [value]);

    // リテラル値がある場合はドロップダウン
    if (definition.literals && definition.literals.length > 0) {
        return (
            <Dropdown
                value={stringValue}
                selectedOptions={[stringValue]}
                onOptionSelect={handleDropdownChange}
                style={style}
                disabled={disabled}
                placeholder={finalPlaceholder}
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
            onCommit={handleInputCommit}
            definition={definition}
            placeholder={finalPlaceholder}
            style={style}
            disabled={disabled}
        />
    );
});
