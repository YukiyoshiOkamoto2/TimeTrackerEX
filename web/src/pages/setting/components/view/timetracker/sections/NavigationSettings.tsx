/**
 * ナビゲーション設定セクション(休暇イベント、無視可能イベント)
 */

import { TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { Badge } from "@fluentui/react-components";
import { SettingNavigationSection } from "../../../layout";
import { SettingNavigationItem } from "../../../ui";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;

interface NavigationSettingsProps {
    onNavigateToTimeOffEvents: () => void;
    onNavigateToIgnorableEvents: () => void;
}

export function NavigationSettings({
    onNavigateToTimeOffEvents,
    onNavigateToIgnorableEvents,
}: NavigationSettingsProps) {
    const { settings } = useTimeTrackerSettings();

    return (
        <>
            <SettingNavigationSection title={ttDef.timeOffEvent.name} required={false}>
                <SettingNavigationItem
                    title={ttDef.timeOffEvent.name}
                    description={ttDef.timeOffEvent.description}
                    badge={
                        settings?.timeOffEvent?.namePatterns && settings.timeOffEvent.namePatterns.length > 0 ? (
                            <Badge appearance="filled" color="informative">
                                {settings.timeOffEvent.namePatterns.length}件
                            </Badge>
                        ) : (
                            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
                        )
                    }
                    onClick={onNavigateToTimeOffEvents}
                />
            </SettingNavigationSection>

            <SettingNavigationSection title={ttDef.ignorableEvents.name} required={false}>
                <SettingNavigationItem
                    title={ttDef.ignorableEvents.name}
                    description={ttDef.ignorableEvents.description}
                    badge={
                        settings?.ignorableEvents && settings.ignorableEvents.length > 0 ? (
                            <Badge appearance="filled" color="informative">
                                {settings.ignorableEvents.length}件
                            </Badge>
                        ) : (
                            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
                        )
                    }
                    onClick={onNavigateToIgnorableEvents}
                />
            </SettingNavigationSection>
        </>
    );
}
