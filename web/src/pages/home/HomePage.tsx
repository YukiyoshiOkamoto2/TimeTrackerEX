import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Calendar24Regular } from "@fluentui/react-icons";
import { memo, useCallback } from "react";
import { Card } from "../../components/card";
import { Page } from "../../components/page";
import { useNavigation } from "../../store/navigation";

const useStyles = makeStyles({
    container: {
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        minHeight: "320px",
        padding: tokens.spacingVerticalXXXL,
    },
    card: {
        maxWidth: "420px",
        width: "100%",
    },
    cardContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    cardIcon: {
        fontSize: "48px",
        color: tokens.colorBrandForeground1,
    },
    cardTitle: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    cardDescription: {
        fontSize: tokens.fontSizeBase400,
        lineHeight: tokens.lineHeightBase400,
        color: tokens.colorNeutralForeground2,
    },
    features: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        paddingLeft: tokens.spacingHorizontalM,
    },
    feature: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    featureIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorPaletteGreenForeground2,
        fontWeight: tokens.fontWeightBold,
    },
    cardActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: tokens.spacingHorizontalS,
        marginTop: tokens.spacingVerticalM,
    },
});

/**
 * ホームページコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 */
export const HomePage = memo(function HomePage() {
    const styles = useStyles();
    const { navigate } = useNavigation();

    const handleNavigateToTimeTracker = useCallback(() => {
        navigate("TimeTracker");
    }, [navigate]);

    return (
        <Page title="便利ツール" subtitle="業務を効率化するWebアプリケーション">
            <div className={styles.container}>
                <Card hoverable className={styles.card}>
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Calendar24Regular />
                            </div>
                            <div className={styles.cardTitle}>TimeTracker EX</div>
                        </div>
                        <div className={styles.cardDescription}>
                            カレンダーイベントから勤務時間を自動計算し、効率的に実績入力を行えます。
                        </div>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>PDFとICSファイルからデータ抽出</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>AIによる自動紐づけ</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>イベントの丸め処理に対応</span>
                            </div>
                        </div>
                        <div className={styles.cardActions}>
                            <Button appearance="primary" size="large" onClick={handleNavigateToTimeTracker}>
                                開く
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </Page>
    );
});
