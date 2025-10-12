import { useState } from "react";

import { useSettings } from "@/store";
import { IgnorableEventPattern, TimeOffEventPattern, TimeTrackerSettings } from "@/types";
import { SettingPageLayout } from "../../components";
import { AppearanceNavigationPage } from "./AppearanceNavigationPage";
import { IgnorableEventsNavigationPage } from "./IgnorableEventsNavigationPage";
import { TimeOffEventsNavigationPage } from "./TimeOffEventsNavigationPage";
import {
    BasicSettings,
    EventProcessingSettings,
    NavigationSettings,
    PaidLeaveInputSettings,
    ScheduleAutoInputSettings,
} from "./sections";

type SettingView = "main" | "ignorableEvents" | "timeOffEvents" | "appearance";

export function TimeTrackerSettingsPage() {
    const [currentView, setCurrentView] = useState<SettingView>("main");
    const { settings, updateSettings, validationErrors } = useSettings();
    const tt = settings.timetracker as TimeTrackerSettings;
    const errors = validationErrors.timeTracker;

    const handleIgnorableEventsChange = (patterns: IgnorableEventPattern[]) => {
        // const uniquePatterns = removeDuplicateEventPatterns(patterns);
        const uniquePatterns = patterns;
        updateSettings({
            timetracker: {
                ...tt,
                ignorableEvents: uniquePatterns.length > 0 ? uniquePatterns : undefined,
            },
        });
    };

    const handleTimeOffEventChange = (patterns: TimeOffEventPattern[], workItemId: number) => {
        // const uniquePatterns = removeDuplicateEventPatterns(patterns);
        const uniquePatterns = patterns;
        const timeOffEvent =
            uniquePatterns.length > 0
                ? {
                      namePatterns: uniquePatterns,
                      workItemId,
                  }
                : undefined;
        updateSettings({
            timetracker: {
                ...tt,
                timeOffEvent,
            },
        });
    };

    // 無視可能イベント設定ビュー
    if (currentView === "ignorableEvents") {
        return (
            <IgnorableEventsNavigationPage
                patterns={tt?.ignorableEvents || []}
                onChange={handleIgnorableEventsChange}
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
                onChange={handleTimeOffEventChange}
                onBack={() => setCurrentView("main")}
            />
        );
    }

    // 外観設定ビュー
    if (currentView === "appearance") {
        return <AppearanceNavigationPage onBack={() => setCurrentView("main")} />;
    }

    // メイン設定ビュー
    return (
        <SettingPageLayout errors={errors}>
            <BasicSettings />
            <EventProcessingSettings />
            <ScheduleAutoInputSettings />
            <PaidLeaveInputSettings />
            <NavigationSettings
                onNavigateToTimeOffEvents={() => setCurrentView("timeOffEvents")}
                onNavigateToIgnorableEvents={() => setCurrentView("ignorableEvents")}
                onNavigateToAppearance={() => setCurrentView("appearance")}
            />
        </SettingPageLayout>
    );
}
