import { Card } from "@/components/card";
import { PageHeader } from "@/components/page";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { CheckmarkCircle24Regular, DocumentBulletList24Regular, Warning24Regular } from "@fluentui/react-icons";
import { memo } from "react";
import { SectionTitle, ViewHeader, ViewSection } from "../components/ViewLayout";

const useStyles = makeStyles({
    completionMessage: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingHorizontalL,
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalM,
        paddingLeft: tokens.spacingHorizontalL,
        paddingRight: tokens.spacingHorizontalL,
        backgroundColor: tokens.colorNeutralBackground3,
        borderTopWidth: tokens.strokeWidthThick,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorBrandForeground1,
        borderBottomWidth: "0",
        borderLeftWidth: "0",
        borderRightWidth: "0",
        borderRadius: tokens.borderRadiusMedium,
    },
    completionIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorPaletteGreenForeground1,
    },
    completionText: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    statusCard: {
        marginBottom: tokens.spacingVerticalL,
    },
});

export type CompletionViewProps = {
    onBack: (index: 1 | 2) => void;
};

/**
 * 完了ビューコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 */
export const CompletionView = memo(function CompletionView({ onBack }: CompletionViewProps) {
    const styles = useStyles();

    const breadcrumbs = ["TimeTracker", "紐づけ処理", "スケジュール確認"];

    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) {
            onBack(2);
        } else if (index === 1) {
            onBack(1);
        }
    };

    // 未設定の作業項目コード数をカウント
    const missingCodesCount = 0;
    const hasErrors = missingCodesCount > 0;

    return (
        <>
            <ViewHeader left={<PageHeader breadcrumbs={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />} />

            <ViewSection>
                {/* 警告メッセージ */}
                {hasErrors && (
                    <Card className={mergeClasses(styles.completionMessage, styles.statusCard)}>
                        <Warning24Regular
                            className={styles.completionIcon}
                            style={{ color: tokens.colorPaletteRedForeground1 }}
                        />
                        <div className={styles.completionText}>
                            {missingCodesCount}
                            件の作業項目コードが未設定です。全てのスケジュールに作業項目コードを設定してください。
                        </div>
                    </Card>
                )}

                {/* 確認メッセージ */}
                {!hasErrors && (
                    <Card className={mergeClasses(styles.completionMessage, styles.statusCard)}>
                        <CheckmarkCircle24Regular className={styles.completionIcon} />
                        <div className={styles.completionText}>
                            {0}件のスケジュールを登録します。内容を確認してください。
                        </div>
                    </Card>
                )}

                {/* スケジュール一覧 */}
                <div>
                    <SectionTitle icon={<DocumentBulletList24Regular />}>スケジュール一覧</SectionTitle>
                </div>
            </ViewSection>
        </>
    );
});
