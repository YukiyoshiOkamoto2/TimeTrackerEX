import { Editor } from "@/components/editor";
import { makeStyles, tokens } from "@fluentui/react-components";
import { SettingPageLayout, SettingSection } from "../layout";

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
            <SettingSection title="JSON設定">
                <Editor className={styles.editor} value={mockSettings} language="json" />
            </SettingSection>
        </SettingPageLayout>
    );
}
