import { Editor } from "@/components/editor";
import { appMessageDialogRef } from "@/components/message-dialog";
import { getSettingErrors, SettingJSON, type ObjectSettingValueInfo, type ObjectType } from "@/schema";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Dismiss20Regular, Save20Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { SettingSection } from "../../layout";
import { SettingErrorsSummary } from "../../ui";

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
    const [allErrors, setAllErrors] = useState(() => getSettingErrors(value, definition));

    const hasError = allErrors.length > 0;

    useEffect(() => {
        const result = SettingJSON.parse(jsonText);
        if (result.isError) {
            setAllErrors([
                {
                    id: "JSON",
                    label: "🐷 JSONパーズエラー",
                    message: result.errorMessage,
                },
            ]);
        } else {
            setAllErrors(getSettingErrors(result.value, definition));
        }
    }, [jsonText, definition, value]);

    const handleSave = () => {
        if (hasError) {
            return;
        }

        let error;
        const result = SettingJSON.parse(jsonText);
        if (result.isError) {
            error = result.errorMessage;
        } else {
            const check = getSettingErrors(result.value, definition);
            if (check.length === 0) {
                onSave(result.value as T);
            } else {
                error = check.map((e) => e.message).join("\n");
            }
        }
        if (error) {
            appMessageDialogRef.showMessageAsync("🐷 JSONパーズエラー", error, "ERROR");
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
            {/* バリデーションエラー表示 */}
            {hasError && <SettingErrorsSummary errors={allErrors} title="検証エラー" />}

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
