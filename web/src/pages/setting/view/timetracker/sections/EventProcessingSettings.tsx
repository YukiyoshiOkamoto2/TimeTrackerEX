/**
 * イベント処理設定セクション
 */

import { TIMETRACKER_EVENT_DUPLICATE_PRIORITY, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;
const eventDuplicatePriorityDef = TIMETRACKER_EVENT_DUPLICATE_PRIORITY.getTypedChildren()!;

export function EventProcessingSettings() {
    const { settings, handleUpdate, handleNestedUpdate } = useTimeTrackerSettings();

    return (
        <SettingSection title="イベント処理設定" description="イベントの丸め方法と重複時の優先度" required={true}>
            <AutoSettingItem
                definition={ttDef.roundingTimeTypeOfEvent}
                value={settings?.roundingTimeTypeOfEvent}
                onChange={(value: unknown) => handleUpdate("roundingTimeTypeOfEvent", value as string)}
                minWidth="250px"
            />
            <AutoSettingItem
                definition={eventDuplicatePriorityDef.timeCompare}
                value={settings?.eventDuplicatePriority?.timeCompare}
                onChange={(value: unknown) =>
                    handleNestedUpdate("eventDuplicatePriority", "timeCompare", value as string)
                }
                minWidth="250px"
            />
        </SettingSection>
    );
}
