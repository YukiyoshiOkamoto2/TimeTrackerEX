import { useCallback, useMemo, useState } from "react";

import { useSettings } from "@/store";
import type { IgnorableEventPattern, TimeOffEventPattern, TimeTrackerSettings } from "@/types";
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

/**
 * TimeTracker設定ページ
 *
 * パフォーマンス最適化:
 * - useCallback でハンドラーをメモ化
 * - useMemo で設定オブジェクトとエラーをメモ化
 * - ビュー切り替えでのコンポーネント再作成を最小化
 */
export function TimeTrackerSettingsPage() {
    const [currentView, setCurrentView] = useState<SettingView>("main");
    const { settings, updateSettings, validationErrors } = useSettings();

    // 設定とエラーをメモ化
    const tt = useMemo(() => settings.timetracker as TimeTrackerSettings, [settings.timetracker]);
    const errors = useMemo(() => validationErrors.timeTracker, [validationErrors.timeTracker]);

    // 無視可能イベント変更ハンドラー（メモ化）
    const handleIgnorableEventsChange = useCallback(
        (patterns: IgnorableEventPattern[]) => {
            // const uniquePatterns = removeDuplicateEventPatterns(patterns);
            const uniquePatterns = patterns;
            updateSettings({
                timetracker: {
                    ...tt,
                    ignorableEvents: uniquePatterns.length > 0 ? uniquePatterns : undefined,
                },
            });
        },
        [tt, updateSettings],
    );

    // 休暇イベント変更ハンドラー（メモ化）
    const handleTimeOffEventChange = useCallback(
        (patterns: TimeOffEventPattern[], workItemId: number) => {
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
        },
        [tt, updateSettings],
    );

    // ビュー切り替えハンドラー（メモ化）
    const handleNavigateToMain = useCallback(() => setCurrentView("main"), []);
    const handleNavigateToIgnorableEvents = useCallback(() => setCurrentView("ignorableEvents"), []);
    const handleNavigateToTimeOffEvents = useCallback(() => setCurrentView("timeOffEvents"), []);
    const handleNavigateToAppearance = useCallback(() => setCurrentView("appearance"), []);

    // 無視可能イベント設定ビュー
    if (currentView === "ignorableEvents") {
        return (
            <IgnorableEventsNavigationPage
                patterns={tt?.ignorableEvents || []}
                onChange={handleIgnorableEventsChange}
                onBack={handleNavigateToMain}
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
                onBack={handleNavigateToMain}
            />
        );
    }

    // 外観設定ビュー
    if (currentView === "appearance") {
        return <AppearanceNavigationPage onBack={handleNavigateToMain} />;
    }

    // メイン設定ビュー
    return (
        <SettingPageLayout errors={errors}>
            <BasicSettings />
            <EventProcessingSettings />
            <ScheduleAutoInputSettings />
            <PaidLeaveInputSettings />
            <NavigationSettings
                onNavigateToTimeOffEvents={handleNavigateToTimeOffEvents}
                onNavigateToIgnorableEvents={handleNavigateToIgnorableEvents}
                onNavigateToAppearance={handleNavigateToAppearance}
            />
        </SettingPageLayout>
    );
}
