import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowLeft20Regular, CodeRegular } from "@fluentui/react-icons";
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
        justifyContent: "space-between",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingVerticalL,
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
});

export interface SettingNavigationPageLayoutProps {
    title: string;
    subtitle?: string;
    /** 戻るボタンのクリックハンドラ。指定すると戻るボタンが表示されます */
    onBack?: () => void;
    /** ヘッダー右側に表示する追加アクション */
    headerActions?: ReactNode;
    /** JSON表示ボタンのクリックハンドラ。指定するとJSON表示ボタンが表示されます */
    onShowJson?: () => void;
    children: ReactNode;
}

/**
 * 設定ページの共通レイアウトコンポーネント
 * onBackを指定すると戻るボタンが表示されます
 * onShowJsonを指定すると設定のJSON表示ボタンが表示されます
 *
 * @example
 * ```tsx
 * // 戻るボタンなし
 * <SettingPageNavigationLayout title="設定" subtitle="アプリケーションの設定">
 *   <SettingSection title="一般設定">
 *     {// コンテンツ}
 *   </SettingSection>
 * </SettingPageNavigationLayout>
 *
 * // 戻るボタンとJSON表示ボタンあり
 * <SettingPageNavigationLayout
 *   title="無視可能イベント設定"
 *   subtitle="処理から除外するイベントを設定"
 *   onBack={() => navigate('back')}
 *   onShowJson={() => setShowJsonEditor(true)}
 * >
 *   <SettingSection title="パターン設定">
 *     {// コンテンツ}
 *   </SettingSection>
 * </SettingPageNavigationLayout>
 * ```
 */
export function SettingNavigationPageLayout({
    title,
    subtitle,
    onBack,
    headerActions,
    onShowJson,
    children,
}: SettingNavigationPageLayoutProps) {
    const styles = useStyles();

    return (
        <Page title={title} subtitle={subtitle}>
            {(onBack || headerActions || onShowJson) && (
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {onBack && (
                            <Button
                                appearance="subtle"
                                icon={<ArrowLeft20Regular />}
                                onClick={onBack}
                                size="large"
                                aria-label="戻る"
                            >
                                戻る
                            </Button>
                        )}
                    </div>
                    <div className={styles.headerRight}>
                        {headerActions}
                        {onShowJson && (
                            <Button appearance="secondary" icon={<CodeRegular />} onClick={onShowJson}>
                                設定のJSON表示
                            </Button>
                        )}
                    </div>
                </div>
            )}
            <div className={styles.container}>{children}</div>
        </Page>
    );
}
