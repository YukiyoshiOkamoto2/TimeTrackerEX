import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Calendar24Regular, Clock24Regular, Settings24Regular } from "@fluentui/react-icons";
import { Card } from "../../components/card";
import { Page } from "../../components/page";

const useStyles = makeStyles({
    cards: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: tokens.spacingHorizontalXL,
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
        fontSize: tokens.fontSizeHero800,
        color: tokens.colorBrandForeground1,
    },
    cardTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    cardDescription: {
        fontSize: tokens.fontSizeBase300,
        lineHeight: tokens.lineHeightBase300,
        color: tokens.colorNeutralForeground3,
    },
    features: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
    },
    feature: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    featureIcon: {
        fontSize: tokens.fontSizeBase400,
    },
    cardActions: {
        display: "flex",
        gap: tokens.spacingHorizontalXS,
        marginTop: tokens.spacingVerticalXS,
    },
});

export function HomePage() {
    const styles = useStyles();

    return (
        <Page title="TimeTracker EX" subtitle="勤務実績入力を効率化するWebアプリケーション">
            <div className={styles.cards}>
                <Card hoverable>
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Calendar24Regular />
                            </div>
                            <div className={styles.cardTitle}>スケジュール管理</div>
                        </div>
                        <div className={styles.cardDescription}>
                            カレンダーイベントから勤務時間を自動計算し、効率的に実績入力を行えます。
                        </div>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>イベントの丸め処理に対応</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>開始・終了時刻の自動調整</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>プロジェクトごとの時間集計</span>
                            </div>
                        </div>
                        <div className={styles.cardActions}>
                            <Button appearance="primary">スケジュールを開く</Button>
                        </div>
                    </div>
                </Card>

                <Card hoverable>
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Clock24Regular />
                            </div>
                            <div className={styles.cardTitle}>時間計算アルゴリズム</div>
                        </div>
                        <div className={styles.cardDescription}>
                            Pythonから移行したアルゴリズムをブラウザで実行し、動作を確認できます。
                        </div>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>高精度な時間計算</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>包括的なテストスイート</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>リアルタイムプレビュー</span>
                            </div>
                        </div>
                        <div className={styles.cardActions}>
                            <Button appearance="secondary">テストを実行</Button>
                        </div>
                    </div>
                </Card>

                <Card hoverable>
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>
                                <Settings24Regular />
                            </div>
                            <div className={styles.cardTitle}>設定</div>
                        </div>
                        <div className={styles.cardDescription}>
                            丸め処理のタイプや時間間隔など、アプリケーションの動作をカスタマイズできます。
                        </div>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>柔軟な丸め処理設定</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>プロジェクト管理</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✓</span>
                                <span>イベント設定</span>
                            </div>
                        </div>
                        <div className={styles.cardActions}>
                            <Button appearance="secondary">設定を開く</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </Page>
    );
}
