/**
 * Setting Validated Input Component
 *
 * 設定用の確認・キャンセルボタン付き入力コンポーネント
 * SettingValueInfoの定義に基づいて値を検証します
 */

import type { NumberSettingValueInfo, StringSettingValueInfo } from "@/schema";
import { Button, Input, type InputProps, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Checkmark20Regular, Dismiss20Regular, ErrorCircle20Regular } from "@fluentui/react-icons";
import { useState } from "react";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
    input: {
        width: "100%",
    },
    buttonGroup: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        justifyContent: "flex-end",
        width: "100%",
    },
    errorPopover: {
        backgroundColor: tokens.colorPaletteRedBackground2,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalS,
    },
    errorContent: {
        display: "flex",
        alignItems: "flex-start",
        gap: tokens.spacingHorizontalS,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
        flexShrink: 0,
    },
    errorMessage: {
        color: tokens.colorNeutralForeground1,
    },
});

export interface SettingValidatedInputProps extends Omit<InputProps, "onChange" | "value"> {
    /** 現在の値（文字列または数値） */
    value: string | number | undefined;
    /** 値が確定されたときのコールバック（文字列または数値） */
    onCommit: (value: string | number) => void;
    /** 設定値の定義情報（検証に使用） */
    definition: StringSettingValueInfo | NumberSettingValueInfo;
    /** カスタムクラス名 */
    className?: string;
}

/**
 * 設定用の確認・キャンセルボタン付き入力コンポーネント
 *
 * @remarks
 * - 入力中は即座に更新されず、チェックマークボタンで確定します
 * - キャンセルボタンで元の値に戻せます
 * - 値の確定時にSettingValueInfoの定義に基づいてバリデーションが実行されます
 * - 文字列と数値の両方に対応
 *
 * @example
 * ```tsx
 * // 文字列の場合
 * <SettingValidatedInput
 *   value={url}
 *   onCommit={(newValue) => updateUrl(newValue as string)}
 *   definition={urlDefinition}
 *   type="url"
 *   placeholder="https://example.com"
 * />
 *
 * // 数値の場合
 * <SettingValidatedInput
 *   value={projectId}
 *   onCommit={(newValue) => updateProjectId(newValue as number)}
 *   definition={projectIdDefinition}
 *   type="number"
 *   placeholder="0"
 * />
 * ```
 */
export function SettingValidatedInput({
    value,
    onCommit,
    definition,
    className,
    ...inputProps
}: SettingValidatedInputProps) {
    const styles = useStyles();
    const [editValue, setEditValue] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const isNumberType = definition.type === "number";
    const isEditing = editValue !== undefined;

    // 表示用の値を文字列に変換
    const displayValue = isEditing ? editValue : value !== undefined && value !== null ? String(value) : "";

    const handleCommit = () => {
        try {
            // 編集中の値を検証
            const valueToCommit = editValue ?? "";

            // 数値型の場合は数値に変換して検証
            let validatedValue: string | number = valueToCommit;
            if (isNumberType) {
                const numValue = Number(valueToCommit);
                if (valueToCommit !== "" && isNaN(numValue)) {
                    setError("有効な数値を入力してください");
                    return;
                }
                validatedValue = valueToCommit === "" ? "" : numValue;
            }

            const validationResult = definition.validate(validatedValue);

            if (validationResult.isError) {
                setError(validationResult.errorMessage || "Invalid value");
                return;
            }

            // 検証成功: 値を確定
            onCommit(validatedValue);
            setEditValue(undefined);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const handleCancel = () => {
        setEditValue(undefined);
        setError(null);
    };

    const handleChange = (_: unknown, data: { value: string }) => {
        setEditValue(data.value);
        setError(null);
    };

    return (
        <div className={mergeClasses(styles.container, className)}>
            <Input {...inputProps} className={styles.input} value={displayValue} onChange={handleChange} />
            {isEditing && (
                <div className={styles.buttonGroup}>
                    <Button appearance="primary" icon={<Checkmark20Regular />} onClick={handleCommit} />
                    <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={handleCancel} />
                </div>
            )}
            {error && (
                <div className={styles.errorPopover}>
                    <div className={styles.errorContent}>
                        <ErrorCircle20Regular className={styles.errorIcon} />
                        <div className={styles.errorMessage}>{error}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
