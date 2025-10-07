import {
    APP_SETTINGS_DEFINITION,
    APPEARANCE_SETTINGS_DEFINITION,
    TIMETRACKER_SETTINGS_DEFINITION,
} from "@/schema/settings";
import { useNavigation } from "@/store/navigation";
import { useSettings } from "@/store/settings/SettingsProvider";
import type {
    AppearanceSettings as AppearanceSettingsType,
    AppSettings,
    TimeTrackerSettings as TimeTrackerSettingsType,
} from "@/types/settings";
import { Button, makeStyles, SelectTabData, SelectTabEvent, Tab, TabList, tokens } from "@fluentui/react-components";
import { CodeRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { Page } from "../../components/page";
import { AppearanceSettings, GeneralSettings, JsonEditorView, TimeTrackerSettings } from "./components";

const useStyles = makeStyles({
    pageContainer: {
        position: "relative",
    },
    headerActions: {
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 10,
    },
    contentContainer: {
        display: "flex",
        gap: tokens.spacingHorizontalXXL,
    },
    sidebar: {
        minWidth: "240px",
        width: "240px",
    },
    sidebarNav: {
        position: "sticky",
        top: tokens.spacingVerticalL,
    },
    mainContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXL,
        minWidth: "0",
    },
});

type SettingCategory = "general" | "appearance" | "timetracker";

// カテゴリーに対応するコンポーネントマップ
const CATEGORY_COMPONENTS: Record<SettingCategory, React.ComponentType> = {
    general: GeneralSettings,
    appearance: AppearanceSettings,
    timetracker: TimeTrackerSettings,
};

export function SettingPage() {
    const styles = useStyles();
    const { link } = useNavigation();
    const { settings, updateSettings } = useSettings();
    const [selectedCategory, setSelectedCategory] = useState<SettingCategory>("general");
    const [showJsonEditor, setShowJsonEditor] = useState(false);

    // リンクに基づいてカテゴリーを設定
    useEffect(() => {
        if (link === "timetracker") {
            setSelectedCategory("timetracker");
        }
    }, [link]);

    // カテゴリー変更ハンドラー
    const handleCategoryChange = (_event: SelectTabEvent, data: SelectTabData) => {
        setSelectedCategory(data.value as SettingCategory);
    };

    // コンテンツをレンダリング
    const renderContent = () => {
        if (showJsonEditor) {
            // カテゴリーに応じた定義と値を取得
            let definition, value, onSave;

            switch (selectedCategory) {
                case "general":
                    // 一般設定 = 全体のapp settings (timetracker + appearance)
                    definition = APP_SETTINGS_DEFINITION;
                    value = settings as unknown as Record<string, unknown>;
                    onSave = (val: Record<string, unknown>) => updateSettings(val as unknown as AppSettings);
                    break;
                case "appearance":
                    definition = APPEARANCE_SETTINGS_DEFINITION;
                    value = settings.appearance as unknown as Record<string, unknown>;
                    onSave = (val: Record<string, unknown>) =>
                        updateSettings({ appearance: val as unknown as AppearanceSettingsType });
                    break;
                case "timetracker":
                    definition = TIMETRACKER_SETTINGS_DEFINITION;
                    value = settings.timetracker as unknown as Record<string, unknown>;
                    onSave = (val: Record<string, unknown>) =>
                        updateSettings({ timetracker: val as unknown as TimeTrackerSettingsType });
                    break;
            }

            return (
                <JsonEditorView
                    definition={definition}
                    value={value}
                    onSave={(val) => {
                        onSave(val);
                        setShowJsonEditor(false);
                    }}
                    onCancel={() => setShowJsonEditor(false)}
                />
            );
        }

        const Component = CATEGORY_COMPONENTS[selectedCategory];
        return <Component />;
    };

    return (
        <Page title="設定" subtitle="アプリケーションの設定をカスタマイズ">
            <div className={styles.pageContainer}>
                {!showJsonEditor && (
                    <div className={styles.headerActions}>
                        <Button appearance="secondary" icon={<CodeRegular />} onClick={() => setShowJsonEditor(true)}>
                            設定のJSON表示
                        </Button>
                    </div>
                )}
                {!showJsonEditor && (
                    <div className={styles.contentContainer}>
                        <div className={styles.sidebar}>
                            <nav className={styles.sidebarNav}>
                                <TabList
                                    vertical
                                    selectedValue={selectedCategory}
                                    onTabSelect={handleCategoryChange}
                                    size="large"
                                >
                                    <Tab value="general">一般</Tab>
                                    <Tab value="appearance">外観設定</Tab>
                                    <Tab value="timetracker">TimeTracker</Tab>
                                </TabList>
                            </nav>
                        </div>
                        <div className={styles.mainContent}>{renderContent()}</div>
                    </div>
                )}
                {showJsonEditor && renderContent()}
            </div>
        </Page>
    );
}
