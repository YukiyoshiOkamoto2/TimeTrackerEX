/**
 * Password Input Dialog Component
 *
 * TimeTrackerへの認証に使用するパスワード入力ダイアログ
 */

import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Field,
    Input,
    makeStyles,
    Spinner,
    tokens,
} from "@fluentui/react-components";
import { KeyRegular, LockClosedRegular } from "@fluentui/react-icons";
import { useState } from "react";

const useStyles = makeStyles({
    dialogSurface: {
        maxWidth: "500px",
    },
    dialogBody: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    infoSection: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
    },
    infoRow: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    infoLabel: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground3,
        minWidth: "80px",
    },
    infoValue: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightSemibold,
    },
    passwordField: {
        marginTop: tokens.spacingVerticalM,
    },
    errorMessage: {
        color: tokens.colorPaletteRedForeground1,
        fontSize: tokens.fontSizeBase200,
        marginTop: tokens.spacingVerticalXS,
    },
    loadingContainer: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
});

export interface PasswordInputDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (password: string) => Promise<void>;
    userName: string;
    baseUrl: string;
}

export function PasswordInputDialog({ open, onOpenChange, onSubmit, userName, baseUrl }: PasswordInputDialogProps) {
    const styles = useStyles();
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!password.trim()) {
            setError("パスワードを入力してください");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(password);
            // 成功したらダイアログを閉じる
            setPassword("");
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "認証に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setPassword("");
        setError(null);
        setIsSubmitting(false);
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isSubmitting) {
            handleSubmit();
        } else if (e.key === "Escape" && !isSubmitting) {
            handleCancel();
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) => {
                if (!isSubmitting) {
                    onOpenChange(data.open);
                    if (!data.open) {
                        handleCancel();
                    }
                }
            }}
        >
            <DialogSurface className={styles.dialogSurface}>
                <DialogBody className={styles.dialogBody}>
                    <DialogTitle>TimeTracker 認証</DialogTitle>
                    <DialogContent>
                        <div className={styles.infoSection}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>接続先:</span>
                                <span className={styles.infoValue}>{baseUrl}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>ユーザー名:</span>
                                <span className={styles.infoValue}>{userName}</span>
                            </div>
                        </div>

                        <Field
                            className={styles.passwordField}
                            label="パスワード"
                            required
                            validationState={error ? "error" : "none"}
                            validationMessage={error || undefined}
                        >
                            <Input
                                type="password"
                                value={password}
                                onChange={(_, data) => setPassword(data.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isSubmitting}
                                placeholder="パスワードを入力してください"
                                contentBefore={<KeyRegular />}
                                autoFocus
                            />
                        </Field>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={handleCancel} disabled={isSubmitting}>
                            キャンセル
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !password.trim()}
                            icon={isSubmitting ? <Spinner size="tiny" /> : <LockClosedRegular />}
                        >
                            {isSubmitting ? "認証中..." : "接続"}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
