import type { SettingError } from "@/schema";
import { useNavigation } from "@/store";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { ErrorCircle24Filled, Settings24Regular } from "@fluentui/react-icons";
import { useCallback, useMemo } from "react";

/** ValidationErrorDialogのProps */
export interface ValidationErrorDialogProps {
    /** ダイアログの表示状態 */
    open: boolean;
    /** エラーリスト */
    errors: SettingError[];
}

const useStyles = makeStyles({
    // Dialog
    surface: {
        maxWidth: "650px",
        minWidth: "500px",
    },

    // タイトル
    titleContainer: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalL,
        paddingBottom: tokens.spacingVerticalM,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
        fontSize: "28px",
    },

    // コンテンツ
    contentContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXL,
        padding: `${tokens.spacingVerticalL} 0`,
    },
    description: {
        color: tokens.colorNeutralForeground2,
        lineHeight: "1.7",
        fontSize: tokens.fontSizeBase300,
        margin: 0,
    },

    // エラーリスト
    errorListContainer: {
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusLarge,
        padding: tokens.spacingVerticalXL,
        maxHeight: "350px",
        overflowY: "auto",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    errorListTitle: {
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: tokens.spacingVerticalM,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase300,
    },
    errorList: {
        margin: 0,
        paddingLeft: tokens.spacingHorizontalXXL,
    },
    errorItem: {
        marginBottom: tokens.spacingVerticalM,
        lineHeight: "1.8",
        fontSize: tokens.fontSizeBase200,
    },
    errorLabel: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorPaletteRedForeground1,
        marginRight: tokens.spacingHorizontalXS,
    },
    errorMessage: {
        color: tokens.colorNeutralForeground2,
    },

    // アクションヒント
    actionHint: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
        backgroundColor: tokens.colorBrandBackground2,
        borderRadius: tokens.borderRadiusLarge,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase300,
        border: `1px solid ${tokens.colorBrandStroke1}`,
    },
    settingsIcon: {
        color: tokens.colorBrandForeground1,
        fontSize: "20px",
    },

    // アクション
    actions: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        paddingTop: tokens.spacingVerticalL,
    },
});

/**
 * TimeTracker設定のバリデーションエラーを表示するダイアログ
 * エラー内容を分かりやすく表示し、設定ページへの誘導を行う
 */
export function ValidationErrorDialog({ open, errors }: ValidationErrorDialogProps) {
    const styles = useStyles();
    const { navigate } = useNavigation();

    /**
     * 設定ページを開く
     */
    const handleOpenSettings = useCallback(() => {
        navigate("Settings", undefined, "timetracker");
    }, [navigate]);

    // エラー数のメモ化
    const errorCount = useMemo(() => errors.length, [errors.length]);

    return (
        <Dialog open={open}>
            <DialogSurface className={styles.surface}>
                <DialogBody>
                    <DialogTitle>
                        <div className={styles.titleContainer}>
                            <ErrorCircle24Filled className={styles.errorIcon} />
                            <span>TimeTracker設定エラー ({errorCount}件)</span>
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <div className={styles.contentContainer}>
                            <p className={styles.description}>
                                TimeTracker設定に不正な項目があります。
                                <br />
                                設定を修正してから再度お試しください。
                            </p>

                            <div className={styles.errorListContainer}>
                                <div className={styles.errorListTitle}>エラー内容 ({errorCount}件)</div>
                                <ul className={styles.errorList}>
                                    {errors.map((error, index) => (
                                        <li key={index} className={styles.errorItem}>
                                            <span className={styles.errorLabel}>{error.label}</span>
                                            <span className={styles.errorMessage}>{error.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className={styles.actionHint}>
                                <Settings24Regular className={styles.settingsIcon} />
                                <span>設定ページでこれらの項目を修正できます</span>
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions className={styles.actions}>
                        <Button
                            appearance="primary"
                            size="large"
                            icon={<Settings24Regular />}
                            onClick={handleOpenSettings}
                        >
                            設定ページを開く
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
