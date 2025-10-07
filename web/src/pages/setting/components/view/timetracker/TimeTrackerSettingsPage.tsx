import { getSettingErrors, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { useEffect, useState } from "react";
import { useSettings } from "../../../../../store/settings/SettingsProvider";
import type { TimeTrackerSettings as TimeTrackerSettingsType } from "../../../../../types";
import { SettingPageLayout } from "../../layout";

import { IgnorableEventsNavigationPage } from "./IgnorableEventsNavigationPage";
import { TimeOffEventsNavigationPage } from "./TimeOffEventsNavigationPage";
import {
    BasicSettings,
    EventProcessingSettings,
    NavigationSettings,
    PaidLeaveInputSettings,
    ScheduleAutoInputSettings,
} from "./sections";

type SettingView = "main" | "ignorableEvents" | "timeOffEvents";

export function TimeTrackerSettingsPage() {
    const [currentView, setCurrentView] = useState<SettingView>("main");
    const { settings, updateSettings } = useSettings();
    const tt = settings.timetracker as TimeTrackerSettingsType;
    const [allErrors, setAllErrors] = useState(() => getSettingErrors(tt, TIMETRACKER_SETTINGS_DEFINITION));

    useEffect(() => {
        setAllErrors(getSettingErrors(tt, TIMETRACKER_SETTINGS_DEFINITION));
    }, [tt]);

    // 無視可能イベント設定ビュー
    if (currentView === "ignorableEvents") {
        return (
            <IgnorableEventsNavigationPage
                patterns={tt?.ignorableEvents || []}
                onChange={(patterns) => {
                    updateSettings({
                        timetracker: {
                            ...tt,
                            ignorableEvents: patterns,
                        },
                    });
                }}
                onBack={() => setCurrentView("main")}
            />
        );
    }

    // 休暇イベント設定ビュー
    if (currentView === "timeOffEvents") {
        return (
            <TimeOffEventsNavigationPage
                patterns={tt?.timeOffEvent?.namePatterns}
                workItemId={tt?.timeOffEvent?.workItemId}
                onChange={(patterns, workItemId) => {
                    updateSettings({
                        timetracker: {
                            ...tt,
                            timeOffEvent: {
                                namePatterns: patterns,
                                workItemId,
                            },
                        },
                    });
                }}
                onBack={() => setCurrentView("main")}
            />
        );
    }

    // メイン設定ビュー
    return (
        <SettingPageLayout errors={allErrors}>
            <BasicSettings />
            <EventProcessingSettings />
            <ScheduleAutoInputSettings />
            <PaidLeaveInputSettings />
            <NavigationSettings
                onNavigateToTimeOffEvents={() => setCurrentView("timeOffEvents")}
                onNavigateToIgnorableEvents={() => setCurrentView("ignorableEvents")}
            />
        </SettingPageLayout>
    );
}
