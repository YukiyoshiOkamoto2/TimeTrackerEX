import type { SelectTabData, SelectTabEvent } from "@fluentui/react-components";
import { Button, makeStyles, Persona, SearchBox, Tab, TabList, tokens } from "@fluentui/react-components";
import { Clock24Regular, Home24Regular, Search20Regular, SettingsRegular } from "@fluentui/react-icons";
import { memo, Suspense } from "react";
import { ErrorBoundary, SuspenseFallback } from "./components/error-boundary";
import { MessageDialog } from "./components/message-dialog";
import { HomePage } from "./pages/home";
import { SettingPage } from "./pages/setting";
import { TimeTrackerPage } from "./pages/timetracker";
import { useNavigation } from "./store/navigation";
import { NavigationPageName } from "./store/navigation/NavigationProvider";

const useStyles = makeStyles({
    container: {
        display: "flex",
        height: "100vh",
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
    },
    sidebar: {
        width: "280px",
        backgroundColor: tokens.colorNeutralBackground2,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    userSection: {
        padding: "16px 16px 8px 16px",
    },
    searchBox: {
        padding: "16px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    navList: {
        padding: "8px",
        overflowY: "auto",
        flex: 1,
    },
    settingsButtonWrapper: {
        padding: "8px",
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    mainContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflowY: "hidden",
    },
});

type NavItem = {
    id: string;
    label: string;
    icon: JSX.Element;
};

const navItems: NavItem[] = [
    { id: "Home", label: "Home", icon: <Home24Regular /> },
    { id: "TimeTracker", label: "TimeTracker EX", icon: <Clock24Regular /> },
];

/**
 * メインアプリケーションコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 */
const App = memo(function App() {
    const styles = useStyles();
    const { currentPageName, navigate } = useNavigation();

    const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
        navigate(data.value as NavigationPageName);
    };

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.userSection}>
                    <Persona
                        name=""
                        secondaryText=""
                        avatar={{ color: "colorful", "aria-hidden": true }}
                        size="large"
                    />
                </div>

                <div className={styles.searchBox}>
                    <SearchBox placeholder="開発中・・・" contentBefore={<Search20Regular />} />
                </div>

                <nav className={styles.navList}>
                    <TabList vertical selectedValue={currentPageName} onTabSelect={onTabSelect} size="large">
                        {navItems.map((item) => (
                            <Tab key={item.id} value={item.id} icon={item.icon}>
                                {item.label}
                            </Tab>
                        ))}
                    </TabList>
                </nav>

                <div className={styles.settingsButtonWrapper}>
                    <Button
                        appearance="subtle"
                        icon={<SettingsRegular />}
                        style={{ width: "100%", justifyContent: "flex-start" }}
                        onClick={() => navigate("Settings")}
                    >
                        Settings
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <ErrorBoundary>
                    <Suspense fallback={<SuspenseFallback />}>
                        {currentPageName === "Home" && <HomePage />}
                        {currentPageName === "TimeTracker" && <TimeTrackerPage />}
                        {currentPageName === "Settings" && <SettingPage />}
                    </Suspense>
                </ErrorBoundary>
            </main>

            {/* Global Message Dialog */}
            <MessageDialog />
        </div>
    );
});

export default App;
