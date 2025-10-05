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

// カード情報の定義
const CARDS = [
    {
        icon: Calendar24Regular,
        title: "スケジュール管理",
        description: "カレンダーイベントから勤務時間を自動計算し、効率的に実績入力を行えます。",
        features: [
            "イベントの丸め処理に対応",
            "開始・終了時刻の自動調整",
            "プロジェクトごとの時間集計",
        ],
        buttonText: "スケジュールを開く",
        buttonAppearance: "primary" as const,
    },
    {
        icon: Clock24Regular,
        title: "時間計算アルゴリズム",
        description: "Pythonから移行したアルゴリズムをブラウザで実行し、動作を確認できます。",
        features: [
            "高精度な時間計算",
            "包括的なテストスイート",
            "リアルタイムプレビュー",
        ],
        buttonText: "テストを実行",
        buttonAppearance: "secondary" as const,
    },
    {
        icon: Settings24Regular,
        title: "設定",
        description: "丸め処理のタイプや時間間隔など、アプリケーションの動作をカスタマイズできます。",
        features: [
            "柔軟な丸め処理設定",
            "プロジェクト管理",
            "イベント設定",
        ],
        buttonText: "設定を開く",
        buttonAppearance: "secondary" as const,
    },
];

export function HomePage() {
    const styles = useStyles();

    return (
        <Page title="TimeTracker EX" subtitle="勤務実績入力を効率化するWebアプリケーション">
            <div className={styles.cards}>
                {CARDS.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <Card key={index} hoverable>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardIcon}>
                                        <Icon />
                                    </div>
                                    <div className={styles.cardTitle}>{card.title}</div>
                                </div>
                                <div className={styles.cardDescription}>{card.description}</div>
                                <div className={styles.features}>
                                    {card.features.map((feature, featureIndex) => (
                                        <div key={featureIndex} className={styles.feature}>
                                            <span className={styles.featureIcon}>✓</span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Button appearance={card.buttonAppearance}>{card.buttonText}</Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </Page>
    );
}
