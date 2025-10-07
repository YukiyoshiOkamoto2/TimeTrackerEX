/**
 * Setting Errors Summary Component
 *
 * 設定項目のエラーを一覧表示するコンポーネント
 */

import { MessageBar, MessageBarBody, MessageBarTitle, makeStyles, tokens } from "@fluentui/react-components";
import { ErrorCircle20Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    errorSummary: {
        marginBottom: tokens.spacingVerticalXL,
    },
    errorList: {
        marginTop: tokens.spacingVerticalS,
        marginLeft: tokens.spacingHorizontalM,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
    },
    errorItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
    },
});

export interface SettingError {
    /** エラーID（項目を識別するユニークな値） */
    id: string;
    /** 項目名 */
    label: string;
    /** エラーメッセージ */
    message: string;
}

export interface SettingErrorsSummaryProps {
    /** エラーリスト */
    errors: SettingError[];
    /** タイトル */
    title?: string;
}

/**
 * 設定エラーのサマリーを表示するコンポーネント
 */
export function SettingErrorsSummary({ errors, title = "入力エラー" }: SettingErrorsSummaryProps) {
    const styles = useStyles();

    if (errors.length === 0) {
        return null;
    }

    return (
        <MessageBar intent="error" className={styles.errorSummary}>
            <MessageBarBody>
                <MessageBarTitle>
                    {title} ({errors.length}件)
                </MessageBarTitle>
                <div className={styles.errorList}>
                    {errors.map((error) => (
                        <div key={error.id} className={styles.errorItem}>
                            <ErrorCircle20Regular className={styles.errorIcon} />
                            <span>
                                <strong>{error.label}</strong>: {error.message}
                            </span>
                        </div>
                    ))}
                </div>
            </MessageBarBody>
        </MessageBar>
    );
}
