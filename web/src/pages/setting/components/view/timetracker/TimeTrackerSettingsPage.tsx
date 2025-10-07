import { getSettingErrors, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { useEffect, useState } from "react";
import { useSettings } from "../../../../../store/settings/SettingsProvider";
import type {
    IgnorableEventPattern,
    TimeOffEventPattern,
    TimeTrackerSettings as TimeTrackerSettingsType,
} from "../../../../../types";
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

    useEffect(() => {
        setAllErrors(getSettingErrors(tt, TIMETRACKER_SETTINGS_DEFINITION));
    }, [tt]);

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
