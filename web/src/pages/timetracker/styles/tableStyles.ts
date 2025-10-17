/**
 * TimeTracker共通テーブルスタイル
 *
 * 各ビューで使用するテーブルの統一されたスタイル定義
 */

import { makeStyles, tokens } from "@fluentui/react-components";

/**
 * 共通テーブルスタイル
 */
export const useTableStyles = makeStyles({
    /** テーブルラッパー - 基本レイアウト */
    tableWrapper: {
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 520px)",
        minHeight: "300px",
    },

    /** テーブルコンテナ - スクロール領域 */
    tableContainer: {
        flex: 1,
        overflow: "auto",
        backgroundColor: tokens.colorNeutralBackground1,
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
    },

    /** ツールバー - アクション領域 */
    toolbar: {
        marginBottom: tokens.spacingVerticalM,
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        display: "flex",
        gap: tokens.spacingHorizontalS,
        flexWrap: "wrap",
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    },

    /** セル内中央揃え */
    centeredCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        overflow: "hidden",
    },

    /** 日時表示セル */
    dateTimeCell: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        fontSize: tokens.fontSizeBase300,
    },

    /** セカンダリテキスト */
    secondaryText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },

    /** バッジ共通スタイル */
    badge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: tokens.borderRadiusSmall,
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
    },

    /** 強調テキスト */
    emphasizedText: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },

    /** エラーテキスト */
    errorText: {
        color: tokens.colorPaletteRedForeground1,
    },

    /** ワーニングテキスト */
    warningText: {
        color: tokens.colorPaletteDarkOrangeForeground1,
    },

    /** サクセステキスト */
    successText: {
        color: tokens.colorPaletteGreenForeground1,
    },

    /** アクションボタンセル */
    actionButtonCell: {
        minWidth: "120px",
        padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalS}`,
        fontSize: tokens.fontSizeBase300,
    },
});

/**
 * カラム幅設定のユーティリティ
 */
export const createColumnSizing = (config: Record<string, { minWidth: number; idealWidth: number }>) => config;
