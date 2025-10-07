/**
 * イベント処理設定セクション
 */

import { ObjectSettingValueInfo, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { SettingSection } from "../../../layout";
import { AutoSettingItem } from "../../../ui";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;
const eventDuplicatePriorityDef = (ttDef.eventDuplicatePriority as ObjectSettingValueInfo).children!;

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
