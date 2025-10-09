import { makeStyles, tokens } from "@fluentui/react-components";

/**
 * TimeTracker View共通スタイル
 */
export const useCommonViewStyles = makeStyles({
    // ヘッダーコンテナ
    headerContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: tokens.spacingVerticalL,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        alignItems: "center",
    },

    // セクション
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    sectionTitle: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXXS,
    },
    sectionIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground2,
    },

    // ボタン
    primaryButton: {
        minWidth: "200px",
        height: "48px",
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
    },
    secondaryButton: {
        minWidth: "120px",
    },

    // カードコンテンツ
    cardContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },

    // グリッドレイアウト
    gridContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: tokens.spacingHorizontalL,
    },

    // 統計グリッド
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: tokens.spacingVerticalL,
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        padding: tokens.spacingVerticalL,
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    statLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        fontWeight: tokens.fontWeightMedium,
    },
    statValue: {
        fontSize: tokens.fontSizeHero800,
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightSemibold,
    },
    statValueSuccess: {
        color: tokens.colorPaletteGreenForeground1,
    },
    statValueWarning: {
        color: tokens.colorPaletteYellowForeground1,
    },
    statValueError: {
        color: tokens.colorPaletteRedForeground1,
    },
    statSubText: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
    },

    // 情報表示
    infoItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    infoIcon: {
        fontSize: tokens.fontSizeBase400,
    },
    infoLabel: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        minWidth: "120px",
    },

    // テーブルコンテナ
    tableContainer: {
        marginTop: tokens.spacingVerticalL,
    },

    // アクションボタンコンテナ
    actionButtonContainer: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: tokens.spacingVerticalXL,
        gap: tokens.spacingHorizontalM,
    },
});
