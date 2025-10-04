import type { SelectTabData, SelectTabEvent } from "@fluentui/react-components";
import { Button, makeStyles, Persona, SearchBox, Tab, TabList, tokens } from "@fluentui/react-components";
import { Clock24Regular, Home24Regular, Search20Regular, SettingsRegular } from "@fluentui/react-icons";
import { useState } from "react";
import { HomePage } from "./pages/home";
import { SettingPage } from "./pages/setting";
import { TimeTrackerPage } from "./pages/timetracker";

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
    { id: "TimeTracker", label: "TimeTracker", icon: <Clock24Regular /> },
];

function App() {
    const styles = useStyles();
    const [selectedTab, setSelectedTab] = useState<string>("Home");

    const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
        setSelectedTab(data.value as string);
    };

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.userSection}>
                    <Persona
                        name="Oliver"
                        secondaryText="Local Account"
                        avatar={{ color: "colorful", "aria-hidden": true }}
                        size="large"
                    />
                </div>

                <div className={styles.searchBox}>
                    <SearchBox placeholder="Find a setting" contentBefore={<Search20Regular />} />
                </div>

                <nav className={styles.navList}>
                    <TabList vertical selectedValue={selectedTab} onTabSelect={onTabSelect} size="large">
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
                        onClick={() => setSelectedTab("Settings")}
                    >
                        Settings
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {selectedTab === "Home" && <HomePage />}
                {selectedTab === "TimeTracker" && <TimeTrackerPage />}
                {selectedTab === "Settings" && <SettingPage />}
            </main>
        </div>
    );
}

export default App;
