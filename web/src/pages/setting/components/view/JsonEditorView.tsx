import { Editor } from "@/components/editor";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { SaveRegular } from "@fluentui/react-icons";
import { SettingContentSection, SettingPageLayout } from "../layout";

const useStyles = makeStyles({
    editor: {
        height: "540px",
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: tokens.spacingHorizontalM,
        marginTop: tokens.spacingVerticalL,
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
        <SettingPageLayout
            title="設定のJSON表示"
            subtitle="設定をJSON形式で直接編集できます。不正なJSON形式で保存するとアプリケーションが正常に動作しない可能性があります。"
        >
            <SettingContentSection>
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
            </SettingContentSection>
        </SettingPageLayout>
    );
}
