import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";
import { SettingErrorsSummary, type SettingError } from "../ui";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(12px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationFast,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXL,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(12px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationDelay: "0.1s",
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
});

export interface SettingPageLayoutProps {
    /** 検証エラーのリスト */
    errors?: SettingError[];
    /** エラーサマリーのタイトル */
    errorTitle?: string;
    children: ReactNode;
}

/**
 * 設定ページの共通レイアウトコンポーネント
 * ページ上部にエラーサマリーを表示し、その下にコンテンツを配置します
 *
 * @example
 * ```tsx
 * <SettingPageLayout errors={errors}>
 *   <SettingSection title="一般設定">
 *     {// コンテンツ}
 *   </SettingSection>
 *   <SettingSection title="詳細設定">
 *     {// コンテンツ}
 *   </SettingSection>
 * </SettingPageLayout>
 * ```
 */
export function SettingPageLayout({ errors, errorTitle = "入力エラー", children }: SettingPageLayoutProps) {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            {errors && errors.length > 0 && <SettingErrorsSummary errors={errors} title={errorTitle} />}
            <div className={styles.content}>{children}</div>
        </div>
    );
}
