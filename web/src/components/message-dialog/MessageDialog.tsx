import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    makeStyles,
    mergeClasses,
    tokens,
} from "@fluentui/react-components";
import { ErrorCircle24Filled, Info24Filled, Warning24Filled } from "@fluentui/react-icons";
import { memo, useCallback, useMemo, useState } from "react";

const useStyles = makeStyles({
    titleContainer: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    icon: {
        fontSize: "24px",
        flexShrink: 0,
    },
    infoIcon: {
        color: tokens.colorBrandForeground1,
    },
    warnIcon: {
        color: tokens.colorPaletteYellowForeground1,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
    },
    message: {
        fontSize: tokens.fontSizeBase300,
        lineHeight: tokens.lineHeightBase300,
        color: tokens.colorNeutralForeground1,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    },
});

export type MessageLevel = "INFO" | "WARN" | "ERROR";

type MessageState = {
    open: boolean;
    title: string;
    message: string;
    level: MessageLevel;
};

export interface AppMessageDialogRef {
    showMessageAsync: (title: string, message: string, level?: MessageLevel) => Promise<void>;
    showConfirmAsync: (title: string, message: string, level?: MessageLevel) => Promise<boolean>;
}

class AppMessageDialogRefImpl implements AppMessageDialogRef {
    private resolve?: () => void;
    private resolveConfirm?: (result: boolean) => void;
    private close?: () => void;
    private show?: (title: string, message: string, level?: MessageLevel) => void;
    private showConfirm?: (title: string, message: string, level?: MessageLevel) => void;

    setDelegate(
        show: (title: string, message: string, level?: MessageLevel) => void,
        showConfirm: (title: string, message: string, level?: MessageLevel) => void,
        close: () => void,
    ) {
        this.show = show;
        this.showConfirm = showConfirm;
        this.close = close;
    }

    closed() {
        this.resolve?.();
        this.close?.();
    }

    confirmedResult(result: boolean) {
        this.resolveConfirm?.(result);
        this.close?.();
    }

    async showMessageAsync(title: string, message: string, level?: MessageLevel): Promise<void> {
        this.closed?.();
        return new Promise<void>((resolve) => {
            this.show?.(title, message, level);
            this.resolve = resolve;
        });
    }

    async showConfirmAsync(title: string, message: string, level?: MessageLevel): Promise<boolean> {
        this.confirmedResult?.(false);
        return new Promise<boolean>((resolve) => {
            this.showConfirm?.(title, message, level);
            this.resolveConfirm = resolve;
        });
    }
}

const _appMessageDialogRef = new AppMessageDialogRefImpl();
export const appMessageDialogRef: AppMessageDialogRef = _appMessageDialogRef;

const LEVEL_CONFIG = {
    INFO: {
        icon: Info24Filled,
        className: "infoIcon",
    },
    WARN: {
        icon: Warning24Filled,
        className: "warnIcon",
    },
    ERROR: {
        icon: ErrorCircle24Filled,
        className: "errorIcon",
    },
} as const;

/**
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - すべてのハンドラーをuseCallbackで最適化
 * - アイコンとクラス名の計算をuseMemoで最適化
 */
export const MessageDialog = memo(function MessageDialog() {
    const styles = useStyles();
    const [state, setState] = useState<MessageState>({
        open: false,
        title: "",
        message: "",
        level: "INFO",
    });
    const [isConfirm, setIsConfirm] = useState(false);

    // ハンドラーの最適化
    const handleClose = useCallback(() => {
        _appMessageDialogRef.closed();
    }, []);

    const handleConfirm = useCallback((result: boolean) => {
        _appMessageDialogRef.confirmedResult(result);
    }, []);

    const showMessage = useCallback((title: string, message: string, level?: MessageLevel) => {
        setState({
            open: true,
            title,
            message,
            level: level ?? "INFO",
        });
        setIsConfirm(false);
    }, []);

    const showConfirmMessage = useCallback((title: string, message: string, level?: MessageLevel) => {
        setState({
            open: true,
            title,
            message,
            level: level ?? "WARN",
        });
        setIsConfirm(true);
    }, []);

    const closeDialog = useCallback(() => {
        setState((prev) => ({ ...prev, open: false }));
    }, []);

    _appMessageDialogRef.setDelegate(showMessage, showConfirmMessage, closeDialog);

    // アイコンとクラス名の計算を最適化
    const config = useMemo(() => LEVEL_CONFIG[state.level], [state.level]);
    const IconComponent = config.icon;

    const handleOpenChange = useCallback(
        (_: unknown, data: { open: boolean }) => {
            if (!data.open) {
                isConfirm ? handleConfirm(false) : handleClose();
            }
        },
        [isConfirm, handleConfirm, handleClose],
    );

    const iconClassName = useMemo(
        () => mergeClasses(styles.icon, styles[config.className]),
        [styles.icon, styles[config.className], config.className],
    );

    // ダイアログアクションボタンを最適化
    const dialogActions = useMemo(() => {
        if (isConfirm) {
            return (
                <>
                    <Button appearance="secondary" onClick={() => handleConfirm(false)}>
                        いいえ
                    </Button>
                    <Button appearance="primary" onClick={() => handleConfirm(true)}>
                        はい
                    </Button>
                </>
            );
        }
        return (
            <Button appearance="primary" onClick={handleClose}>
                OK
            </Button>
        );
    }, [isConfirm, handleConfirm, handleClose]);

    return (
        <Dialog open={state.open} onOpenChange={handleOpenChange}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>
                        <div className={styles.titleContainer}>
                            <IconComponent className={iconClassName} />
                            {state.title}
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <div className={styles.message}>{state.message}</div>
                    </DialogContent>
                    <DialogActions>{dialogActions}</DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
});
