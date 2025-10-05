import { useNavigation } from "@/store/navigation";
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
            return <JsonEditorView onBack={() => setShowJsonEditor(false)} />;
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
