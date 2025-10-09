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

const useStyles = makeStyles({
    surface: {
        maxWidth: "600px",
    },
    titleContainer: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
        fontSize: "24px",
    },
    contentContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    description: {
        color: tokens.colorNeutralForeground2,
        lineHeight: "1.5",
    },
    errorListContainer: {
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalM,
        maxHeight: "300px",
        overflowY: "auto",
    },
    errorListTitle: {
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: tokens.spacingVerticalS,
        color: tokens.colorNeutralForeground1,
    },
    errorList: {
        margin: 0,
        paddingLeft: tokens.spacingHorizontalXL,
    },
    errorItem: {
        marginBottom: tokens.spacingVerticalS,
        lineHeight: "1.6",
    },
    errorLabel: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorPaletteRedForeground1,
    },
    errorMessage: {
        color: tokens.colorNeutralForeground2,
    },
    actionHint: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground4,
        borderRadius: tokens.borderRadiusMedium,
        color: tokens.colorNeutralForeground2,
        fontSize: tokens.fontSizeBase200,
    },
    settingsIcon: {
        color: tokens.colorBrandForeground1,
    },
    actions: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
    },
});

export interface ValidationErrorDialogProps {
    /** ダイアログの表示状態 */
    open: boolean;
    /** エラーリスト */
    errors: SettingError[];
}

/**
 * バリデーションエラーを表示するリッチなダイアログコンポーネント
 */
export function ValidationErrorDialog({ open, errors }: ValidationErrorDialogProps) {
    const styles = useStyles();
    const { navigate } = useNavigation();

    const handleOpenSettings = () => {
        navigate("Settings", undefined, "timetracker");
    };

    return (
        <Dialog open={open}>
            <DialogSurface className={styles.surface}>
                <DialogBody>
                    <DialogTitle>
                        <div className={styles.titleContainer}>
                            <ErrorCircle24Filled className={styles.errorIcon} />
                            TimeTracker設定エラー
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
                                <div className={styles.errorListTitle}>エラー内容</div>
                                <ul className={styles.errorList}>
                                    {errors.map((error, index) => (
                                        <li key={index} className={styles.errorItem}>
                                            <span className={styles.errorLabel}>{error.label}</span>
                                            <span className={styles.errorMessage}>: {error.message}</span>
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
                        {/* <Button appearance="secondary" icon={<Dismiss24Regular />} onClick={onClose}>
                            閉じる
                        </Button> */}
                        <Button appearance="primary" icon={<Settings24Regular />} onClick={handleOpenSettings}>
                            設定ページを開く
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
