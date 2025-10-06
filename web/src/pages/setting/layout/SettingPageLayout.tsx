import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";
import { Page } from "../../../components/page";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXL,
    },
});

export interface SettingPageLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

/**
 * 設定ページの共通レイアウトコンポーネント
 *
 * @example
 * ```tsx
 * <SettingPageLayout title="無視可能イベント設定" subtitle="処理から除外するイベントを設定">
 *   <SettingContentSection title="パターン設定">
 *     {// コンテンツ}
 *   </SettingContentSection>
 * </SettingPageLayout>
 * ```
 */
export function SettingPageLayout({ title, subtitle, children }: SettingPageLayoutProps) {
    const styles = useStyles();

    return (
        <Page title={title} subtitle={subtitle}>
            <div className={styles.container}>{children}</div>
        </Page>
    );
}
