import { Editor } from "@/components/editor";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { SaveRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateX(40px)",
            },
            to: {
                opacity: 1,
                transform: "translateX(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: tokens.spacingVerticalL,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(-10px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationDelay: "0.05s",
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    title: {
        fontSize: "24px",
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    description: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXS,
    },
    editor: {
        height: "540px",
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(20px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationDelay: "0.1s",
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: tokens.spacingHorizontalM,
        animationName: {
            from: {
                opacity: 0,
            },
            to: {
                opacity: 1,
            },
        },
        animationDuration: tokens.durationNormal,
        animationDelay: "0.15s",
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
});

// Mock settings JSON
const mockSettings = JSON.stringify({
    general: {
        autoStart: false,
        minimizeOnStart: false,
        notifications: true,
        sound: false,
        language: "ja",
    },
    appearance: {
        theme: "system",
        accentColor: true,
        animations: true,
        compactMode: false,
    },
    timeTracker: {
        autoLink: true,
        duplicateCheck: true,
        useAI: false,
        defaultPdfPath: "",
        defaultIcsPath: "",
        historyRetentionDays: 90,
        saveProcessingLogs: true,
    },
});

export type JsonEditorViewProps = {
    onBack: () => void;
};

export function JsonEditorView({ onBack }: JsonEditorViewProps) {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>設定のJSON表示</div>
                    <div className={styles.description}>
                        設定をJSON形式で直接編集できます。不正なJSON形式で保存するとアプリケーションが正常に動作しない可能性があります。
                    </div>
                </div>
            </div>

            <div className={styles.editor}>
                <Editor language="json" value={mockSettings} />
            </div>

            <div className={styles.actions}>
                <Button appearance="secondary" onClick={onBack}>
                    キャンセル
                </Button>
                <Button appearance="primary" icon={<SaveRegular />}>
                    保存
                </Button>
            </div>
        </div>
    );
}
