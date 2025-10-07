/**
 * Setting Errors Summary Component
 *
 * 設定項目のエラーを一覧表示するコンポーネント
 */

import { MessageBar, MessageBarBody, MessageBarGroup, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
    errorSummary: {
        marginBottom: tokens.spacingVerticalXS,
        width: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
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
export function SettingErrorsSummary({ errors }: SettingErrorsSummaryProps) {
    const styles = useStyles();

    if (errors.length === 0) {
        return null;
    }

    return (
        <MessageBarGroup>
            {errors.map((err, index) => {
                return (
                    <MessageBar key={index} intent="error" className={styles.errorSummary}>
                        <MessageBarBody>{err.message}</MessageBarBody>
                    </MessageBar>
                );
            })}
        </MessageBarGroup>
    );
}
