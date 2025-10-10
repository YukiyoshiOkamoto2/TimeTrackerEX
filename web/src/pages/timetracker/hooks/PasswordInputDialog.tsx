/**
 * Password Input Dialog Component
 *
 * TimeTrackerへの認証に使用するパスワード入力ダイアログ
 */

import { StatCard } from "@/components/card";
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    Field,
    Input,
    makeStyles,
    shorthands,
    Spinner,
    tokens,
} from "@fluentui/react-components";
import { KeyRegular, LockClosedRegular, PersonRegular, ShieldCheckmarkRegular } from "@fluentui/react-icons";
import { useState } from "react";

const useStyles = makeStyles({
    dialogSurface: {
        maxWidth: "560px",
        minWidth: "480px",
        ...shorthands.overflow("hidden"),
        boxShadow: tokens.shadow64,
    },
    dialogBody: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXL,
        ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXL),
    },
    headerSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
        ...shorthands.borderBottom("2px", "solid", tokens.colorNeutralStroke2),
    },
    iconContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "80px",
        height: "80px",
        ...shorthands.borderRadius(tokens.borderRadiusCircular),
        backgroundColor: tokens.colorBrandBackground,
        boxShadow: `0 8px 24px ${tokens.colorBrandBackgroundPressed}40`,
        animationName: {
            "0%": { transform: "scale(0.9)", opacity: "0" },
            "50%": { transform: "scale(1.05)" },
            "100%": { transform: "scale(1)", opacity: "1" },
        },
        animationDuration: "0.6s",
        animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    shieldIcon: {
        fontSize: "40px",
        color: tokens.colorNeutralForegroundInverted,
    },
    titleText: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForeground1,
        textAlign: "center",
        marginTop: tokens.spacingVerticalS,
        letterSpacing: "0.5px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
        marginBottom: tokens.spacingVerticalM,
    },
    passwordField: {
        "& input": {
            fontSize: tokens.fontSizeBase400,
            ...shorthands.padding(tokens.spacingVerticalM),
            ...shorthands.borderRadius(tokens.borderRadiusMedium),
            transitionProperty: "all",
            transitionDuration: tokens.durationNormal,
            ":focus": {
                boxShadow: `0 0 0 2px ${tokens.colorBrandBackground}40`,
                transform: "scale(1.01)",
            },
        },
    },
    errorMessage: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
        backgroundColor: tokens.colorPaletteRedBackground1,
        color: tokens.colorPaletteRedForeground1,
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        animationName: {
            "0%": { transform: "translateX(-10px)", opacity: "0" },
            "100%": { transform: "translateX(0)", opacity: "1" },
        },
        animationDuration: "0.3s",
    },
    actions: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        justifyContent: "flex-end",
    },
    submitButton: {
        fontWeight: tokens.fontWeightBold,
        boxShadow: `0 4px 12px ${tokens.colorBrandBackgroundPressed}40`,
        transitionProperty: "all",
        transitionDuration: tokens.durationNormal,
        ":hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 8px 20px ${tokens.colorBrandBackgroundPressed}50`,
        },
        ":active": {
            transform: "translateY(0)",
        },
    },
    buttonContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: tokens.spacingHorizontalS,
    },
});

export interface PasswordInputDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (password: string) => Promise<void>;
    userName: string;
}

export function PasswordInputDialog({ open, onOpenChange, onSubmit, userName }: PasswordInputDialogProps) {
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
                    {/* ヘッダーセクション */}
                    <div className={styles.headerSection}>
                        <div className={styles.iconContainer}>
                            <ShieldCheckmarkRegular className={styles.shieldIcon} />
                        </div>
                        <div>
                            <div className={styles.titleText}>TimeTracker 認証</div>
                        </div>
                    </div>

                    <DialogContent>
                        {/* 接続情報セクション */}
                        <div className={styles.section}>
                            <StatCard icon={<PersonRegular />} label="ユーザー名" value={userName} />
                        </div>

                        {/* パスワード入力セクション */}
                        <div className={styles.section}>
                            <Field
                                className={styles.passwordField}
                                label="パスワード"
                                required
                                validationState={error ? "error" : "none"}
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
                                    size="large"
                                />
                            </Field>

                            {/* エラーメッセージ */}
                            {error && (
                                <div className={styles.errorMessage}>
                                    <LockClosedRegular />
                                    {error}
                                </div>
                            )}
                        </div>
                    </DialogContent>

                    {/* アクションボタン */}
                    <div className={styles.actions}>
                        <Button appearance="secondary" onClick={handleCancel} disabled={isSubmitting}>
                            キャンセル
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !password.trim()}
                            className={styles.submitButton}
                        >
                            {isSubmitting ? (
                                <div className={styles.buttonContent}>
                                    <Spinner size="tiny" />
                                    <span>認証中...</span>
                                </div>
                            ) : (
                                <div className={styles.buttonContent}>
                                    <LockClosedRegular />
                                    <span>安全に接続</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
