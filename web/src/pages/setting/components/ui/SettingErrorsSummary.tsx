/**
 * Setting Errors Summary Component
 *
 * 設定項目のエラーを一覧表示するコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useMemo でエラーリストのレンダリングをメモ化
 */

import { MessageBar, MessageBarBody, MessageBarGroup, makeStyles, tokens } from "@fluentui/react-components";
import { memo, useMemo } from "react";

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
export const SettingErrorsSummary = memo(function SettingErrorsSummary({ errors }: SettingErrorsSummaryProps) {
    const styles = useStyles();

    // エラーメッセージのレンダリングをメモ化
    const errorMessages = useMemo(
        () =>
            errors.map((err, index) => (
                <MessageBar key={err.id || index} intent="error" className={styles.errorSummary}>
                    <MessageBarBody>
                        {err.label}: {err.message}
                    </MessageBarBody>
                </MessageBar>
            )),
        [errors, styles.errorSummary],
    );

    if (errors.length === 0) {
        return null;
    }

    return <MessageBarGroup>{errorMessages}</MessageBarGroup>;
});
