import type { ObjectSettingValueInfo } from "@/schema/settings";
import {
    APPEARANCE_SETTINGS_DEFINITION,
    GENERAL_SETTINGS_DEFINITION,
    TIMETRACKER_SETTINGS_DEFINITION,
} from "@/schema/settings";
import { useNavigation } from "@/store/navigation";
import { useSettings } from "@/store/settings/SettingsProvider";
import type {
    AppearanceSettings as AppearanceSettingsType,
    GeneralSettings as GeneralSettingsType,
    TimeTrackerSettings as TimeTrackerSettingsType,
} from "@/types/settings";
import { Button, makeStyles, SelectTabData, SelectTabEvent, Tab, TabList, tokens } from "@fluentui/react-components";
import { CodeRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { Page } from "../../components/page";
import { AppearanceSettingsPage, GeneralSettingsPage, JsonEditorView, TimeTrackerSettingsPage } from "./components";

const useStyles = makeStyles({
    pageContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
    headerActions: {
        position: "absolute",
        top: "32px",
        right: "32px",
    },
    contentContainer: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
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

/**
 * カテゴリー設定定義
 */
interface CategoryConfig<T> {
    /** UIコンポーネント */
    component: React.ComponentType;
    /** スキーマ定義 */
    definition: ObjectSettingValueInfo;
    /** 設定値の取得 */
    getValue: (settings: ReturnType<typeof useSettings>["settings"]) => T;
    /** 設定値の保存 */
    updateValue: (updateFn: ReturnType<typeof useSettings>["updateSettings"], value: T) => void;
}

// カテゴリー設定の一元管理
const CATEGORY_CONFIG: Record<SettingCategory, CategoryConfig<Record<string, unknown>>> = {
    general: {
        component: GeneralSettingsPage,
        definition: GENERAL_SETTINGS_DEFINITION,
        getValue: (settings) => settings.general as unknown as Record<string, unknown>,
        updateValue: (updateFn, val) => updateFn({ general: val as unknown as GeneralSettingsType }),
    },
    appearance: {
        component: AppearanceSettingsPage,
        definition: APPEARANCE_SETTINGS_DEFINITION,
        getValue: (settings) => settings.appearance as unknown as Record<string, unknown>,
        updateValue: (updateFn, val) => updateFn({ appearance: val as unknown as AppearanceSettingsType }),
    },
    timetracker: {
        component: TimeTrackerSettingsPage,
        definition: TIMETRACKER_SETTINGS_DEFINITION,
        getValue: (settings) => settings.timetracker as unknown as Record<string, unknown>,
        updateValue: (updateFn, val) => updateFn({ timetracker: val as unknown as TimeTrackerSettingsType }),
    },
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
        const config = CATEGORY_CONFIG[selectedCategory];

        if (showJsonEditor) {
            const value = config.getValue(settings);
            const handleSave = (val: Record<string, unknown>) => {
                config.updateValue(updateSettings, val);
                setShowJsonEditor(false);
            };

            return (
                <JsonEditorView
                    definition={config.definition}
                    value={value}
                    onSave={handleSave}
                    onCancel={() => setShowJsonEditor(false)}
                />
            );
        }

        const Component = config.component;
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
