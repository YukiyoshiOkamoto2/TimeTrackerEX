import { Editor } from "@/components/editor";
import type { ObjectSettingValueInfo, ObjectType } from "@/schema";
import { Button, MessageBar, MessageBarBody, makeStyles, tokens } from "@fluentui/react-components";
import { Dismiss20Regular, Save20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { SettingSection } from "../../layout";
import { SettingErrorsSummary, type SettingError } from "../../ui";

const useStyles = makeStyles({
    editor: {
        height: "420px",
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: tokens.spacingHorizontalM,
        marginTop: tokens.spacingVerticalL,
    },
    errorSection: {
        marginBottom: tokens.spacingVerticalL,
    },
});

export type JsonEditorViewProps<T extends ObjectType> = {
    /** 設定定義 */
    definition: ObjectSettingValueInfo;
    /** 現在の設定値 */
    value: T;
    /** 保存時のコールバック */
    onSave: (value: T) => void;
    /** キャンセル時のコールバック */
    onCancel: () => void;
};

export function JsonEditorView<T extends ObjectType>({ definition, value, onSave, onCancel }: JsonEditorViewProps<T>) {
    const styles = useStyles();
    const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
    const [parseError, setParseError] = useState<string | null>(null);

    // JSONのパースと検証
    const { validationResult, errors } = useMemo(() => {
        try {
            const parsed = JSON.parse(jsonText);
            setParseError(null);
            const result = definition.validatePartial(parsed);

            // エラーメッセージをSettingError配列に変換
            const errorList: SettingError[] = [];
            if (result.isError && result.errorMessage) {
                // エラーメッセージを行ごとに分割して処理
                const lines = result.errorMessage.split("\n").filter((line) => line.trim());
                lines.forEach((line, index) => {
                    // エラーメッセージから項目名とメッセージを抽出
                    // 形式: "フィールド名: エラーメッセージ" or "エラーメッセージ"
                    const match = line.match(/^(.+?):\s*(.+)$/);
                    if (match) {
                        errorList.push({
                            id: `error-${index}`,
                            label: match[1].trim(),
                            message: match[2].trim(),
                        });
                    } else {
                        errorList.push({
                            id: `error-${index}`,
                            label: "設定エラー",
                            message: line.trim(),
                        });
                    }
                });
            }

            return { validationResult: result, errors: errorList };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setParseError(`JSON形式が不正です: ${errorMessage}`);
            return {
                validationResult: { isError: true, errorMessage: errorMessage },
                errors: [],
            };
        }
    }, [jsonText, definition]);

    const hasError = parseError !== null || validationResult.isError;

    const handleSave = () => {
        if (hasError) {
            return;
        }
        try {
            const parsed = JSON.parse(jsonText) as T;
            onSave(parsed);
        } catch (err) {
            console.error("保存に失敗しました:", err);
        }
    };

    const handleEditorChange = (newValue: string) => {
        setJsonText(newValue);
    };

    return (
        <SettingSection
            title="JSON設定"
            description="設定をJSON形式で直接編集できます。不正なJSON形式で保存するとアプリケーションが正常に動作しない可能性があります。"
        >
            {/* パースエラー表示 */}
            {parseError && (
                <div className={styles.errorSection}>
                    <MessageBar intent="error">
                        <MessageBarBody>{parseError}</MessageBarBody>
                    </MessageBar>
                </div>
            )}

            {/* バリデーションエラー表示 */}
            {!parseError && errors.length > 0 && <SettingErrorsSummary errors={errors} title="検証エラー" />}

            {/* エディタ */}
            <Editor className={styles.editor} value={jsonText} language="json" onTextChanged={handleEditorChange} />

            {/* アクションボタン */}
            <div className={styles.actions}>
                <Button appearance="secondary" icon={<Dismiss20Regular />} onClick={onCancel}>
                    キャンセル
                </Button>
                <Button appearance="primary" icon={<Save20Regular />} onClick={handleSave} disabled={hasError}>
                    保存
                </Button>
            </div>
        </SettingSection>
    );
}
