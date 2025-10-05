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
import {
    Info24Filled,
    Warning24Filled,
    ErrorCircle24Filled,
} from "@fluentui/react-icons";
import { useState } from "react";

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
};

class AppMessageDialogRefImpl implements AppMessageDialogRef {

    private resolve?: () => void;
    private close?: () => void;
    private show?: (title: string, message: string, level?: MessageLevel) => void;

    setDelegate(show: (title: string, message: string, level?: MessageLevel) => void, close: () => void) {
        this.show = show;
        this.close = close;
    }

    closed() {
        this.resolve?.();
        this.close?.();
    }

    async showMessageAsync(title: string, message: string, level?: MessageLevel): Promise<void> {
        this.closed?.();
        return new Promise<void>((resolve) => {
            this.show?.(title, message, level);
            this.resolve = resolve;
        });
    }
}

const _appMessageDialogRef = new AppMessageDialogRefImpl();
export const appMessageDialogRef = _appMessageDialogRef;

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

export const MessageDialog = () => {
    const styles = useStyles();
    const [state, setState] = useState<MessageState>({
        open: false,
        title: "",
        message: "",
        level: "INFO",
    });

    _appMessageDialogRef.setDelegate(
        (title, message, level) => {
            setState({
                open: true,
                title,
                message,
                level: level ?? "INFO",
            })
        },
        () => setState((prev) => ({ ...prev, open: false }))
    )

    const handleClose = () => {
        setState((prev) => ({ ...prev, open: false }));
    };

    const config = LEVEL_CONFIG[state.level];
    const IconComponent = config.icon;

    return (
        <Dialog open={state.open} onOpenChange={(_, data) => !data.open && handleClose()}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>
                        <div className={styles.titleContainer}>
                            <IconComponent
                                className={mergeClasses(styles.icon, styles[config.className])}
                            />
                            {state.title}
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <div className={styles.message}>{state.message}</div>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="primary" onClick={handleClose}>
                            OK
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};
