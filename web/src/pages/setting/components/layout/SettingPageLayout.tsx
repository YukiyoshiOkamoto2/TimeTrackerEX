import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { Page } from "../../../../components/page";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXL,
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingVerticalL,
    },
});

export interface SettingPageLayoutProps {
    title: string;
    subtitle?: string;
    /** 戻るボタンのクリックハンドラ。指定すると戻るボタンが表示されます */
    onBack?: () => void;
    children: ReactNode;
}

/**
 * 設定ページの共通レイアウトコンポーネント
 * onBackを指定すると戻るボタンが表示されます
 *
 * @example
 * ```tsx
 * // 戻るボタンなし
 * <SettingPageLayout title="設定" subtitle="アプリケーションの設定">
 *   <SettingSection title="一般設定">
 *     {// コンテンツ}
 *   </SettingSection>
 * </SettingPageLayout>
 *
 * // 戻るボタンあり
 * <SettingPageLayout
 *   title="無視可能イベント設定"
 *   subtitle="処理から除外するイベントを設定"
 *   onBack={() => navigate('back')}
 * >
 *   <SettingSection title="パターン設定">
 *     {// コンテンツ}
 *   </SettingSection>
 * </SettingPageLayout>
 * ```
 */
export function SettingPageLayout({ title, subtitle, onBack, children }: SettingPageLayoutProps) {
    const styles = useStyles();

    return (
        <Page title={title} subtitle={subtitle}>
            {onBack && (
                <div className={styles.header}>
                    <Button
                        appearance="subtle"
                        icon={<ArrowLeft20Regular />}
                        onClick={onBack}
                        size="large"
                        aria-label="戻る"
                    >
                        戻る
                    </Button>
                </div>
            )}
            <div className={styles.container}>{children}</div>
        </Page>
    );
}
