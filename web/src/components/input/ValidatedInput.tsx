/**
 * Validated Input Component
 *
 * 確認・キャンセルボタン付きの入力コンポーネント
 * 値の確定時にのみバリデーションが実行されます
 */

import {
    Button,
    Input,
    type InputProps,
    makeStyles,
    mergeClasses,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    tokens,
} from "@fluentui/react-components";
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
        gap: tokens.spacingHorizontalXS,
        justifyContent: "flex-end",
    },
    errorPopover: {
        maxWidth: "300px",
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

export interface ValidatedInputProps extends Omit<InputProps, "onChange" | "value"> {
    /** 現在の値 */
    value: string;
    /** 値が確定されたときのコールバック（エラー時は例外をスロー） */
    onCommit: (value: string) => void;
    /** カスタムクラス名 */
    className?: string;
}

/**
 * 確認・キャンセルボタン付きの入力コンポーネント
 *
 * @remarks
 * - 入力中は即座に更新されず、チェックマークボタンで確定します
 * - キャンセルボタンで元の値に戻せます
 * - 値の確定時にのみバリデーションが実行されるため、入力中のエラーを防げます
 *
 * @example
 * ```tsx
 * <ValidatedInput
 *   value={url}
 *   onCommit={(newValue) => updateUrl(newValue)}
 *   type="url"
 *   placeholder="https://example.com"
 * />
 * ```
 */
export function ValidatedInput({ value, onCommit, className, ...inputProps }: ValidatedInputProps) {
    const styles = useStyles();
    const [editingValue, setEditingValue] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);

    const isEditing = editingValue !== null;
    const currentValue = isEditing ? editingValue : value;
    const hasChanged = isEditing && editingValue !== value;

    const handleCommit = () => {
        if (editingValue !== null && editingValue !== value) {
            try {
                onCommit(editingValue);
                setEditingValue(null);
                setErrorMessage(null);
                setShowError(false);
            } catch (error) {
                // エラーをキャッチしてPopoverで表示
                const message = error instanceof Error ? error.message : String(error);
                setErrorMessage(message);
                setShowError(true);
            }
        }
    };

    const handleCancel = () => {
        setEditingValue(null);
        setErrorMessage(null);
        setShowError(false);
    };

    const handleChange = (_: unknown, data: { value: string }) => {
        setEditingValue(data.value);
        // 入力中はエラーをクリア
        if (errorMessage) {
            setErrorMessage(null);
            setShowError(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleCommit();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return (
        <div className={mergeClasses(styles.container, className)}>
            <Input
                {...inputProps}
                className={styles.input}
                value={currentValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
            {hasChanged && (
                <div className={styles.buttonGroup}>
                    <Popover open={showError} onOpenChange={(_, data) => setShowError(data.open)}>
                        <PopoverTrigger disableButtonEnhancement>
                            <Button
                                appearance="primary"
                                icon={<Checkmark20Regular />}
                                onClick={handleCommit}
                                title="確定 (Enter)"
                                style={{ minWidth: "82px" }}
                            />
                        </PopoverTrigger>
                        <PopoverSurface className={styles.errorPopover}>
                            <div className={styles.errorContent}>
                                <ErrorCircle20Regular className={styles.errorIcon} />
                                <div className={styles.errorMessage}>{errorMessage}</div>
                            </div>
                        </PopoverSurface>
                    </Popover>
                    <Button
                        appearance="secondary"
                        icon={<Dismiss20Regular />}
                        onClick={handleCancel}
                        style={{ minWidth: "82px" }}
                        title="キャンセル (Escape)"
                    />
                </div>
            )}
        </div>
    );
}
