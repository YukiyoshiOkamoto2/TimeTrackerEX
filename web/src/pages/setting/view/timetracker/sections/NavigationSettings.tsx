/**
 * ナビゲーション設定セクション(休暇イベント、無視可能イベント)
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useMemo でバッジ表示内容をメモ化
 */

import { SettingNavigationItem, SettingNavigationSection } from "@/pages/setting/components";
import { TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { Badge } from "@fluentui/react-components";
import { memo, useMemo } from "react";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;

interface NavigationSettingsProps {
    onNavigateToTimeOffEvents: () => void;
    onNavigateToIgnorableEvents: () => void;
    onNavigateToAppearance: () => void;
}

export const NavigationSettings = memo(function NavigationSettings({
    onNavigateToTimeOffEvents,
    onNavigateToIgnorableEvents,
    onNavigateToAppearance,
}: NavigationSettingsProps) {
    const { settings } = useTimeTrackerSettings();

    // 休暇イベントのバッジをメモ化
    const timeOffEventBadge = useMemo(() => {
        const count = settings?.timeOffEvent?.namePatterns?.length || 0;
        return count > 0 ? (
            <Badge appearance="filled" color="informative">
                {count}件
            </Badge>
        ) : (
            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
        );
    }, [settings?.timeOffEvent?.namePatterns?.length]);

    // 無視可能イベントのバッジをメモ化
    const ignorableEventsBadge = useMemo(() => {
        const count = settings?.ignorableEvents?.length || 0;
        return count > 0 ? (
            <Badge appearance="filled" color="informative">
                {count}件
            </Badge>
        ) : (
            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
        );
    }, [settings?.ignorableEvents?.length]);

    return (
        <>
            <SettingNavigationSection title={ttDef.timeOffEvent.name} required={false}>
                <SettingNavigationItem
                    title={ttDef.timeOffEvent.name}
                    description={ttDef.timeOffEvent.description}
                    badge={timeOffEventBadge}
                    onClick={onNavigateToTimeOffEvents}
                />
            </SettingNavigationSection>

            <SettingNavigationSection title={ttDef.ignorableEvents.name} required={false}>
                <SettingNavigationItem
                    title={ttDef.ignorableEvents.name}
                    description={ttDef.ignorableEvents.description}
                    badge={ignorableEventsBadge}
                    onClick={onNavigateToIgnorableEvents}
                />
            </SettingNavigationSection>

            <SettingNavigationSection title="外観設定" required={false}>
                <SettingNavigationItem
                    title="外観設定"
                    description="TimeTrackerの表示に関する設定を管理します"
                    onClick={onNavigateToAppearance}
                />
            </SettingNavigationSection>
        </>
    );
});
