/**
 * 勤務時間自動入力設定セクション
 */

import { ObjectSettingValueInfo, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { SettingSection } from "../../../layout";
import { AutoSettingItem } from "../../../ui";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;
const scheduleAutoInputInfoDef = (ttDef.scheduleAutoInputInfo as ObjectSettingValueInfo).children!;

export function ScheduleAutoInputSettings() {
    const { settings, handleNestedUpdate } = useTimeTrackerSettings();

    return (
        <SettingSection
            title="勤務時間の自動入力設定"
            description="勤務開始・終了時間を自動入力する設定"
            required={true}
        >
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.startEndType}
                value={settings?.scheduleAutoInputInfo?.startEndType}
                onChange={(value: unknown) =>
                    handleNestedUpdate("scheduleAutoInputInfo", "startEndType", value as string)
                }
                minWidth="250px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.roundingTimeTypeOfSchedule}
                value={settings?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule}
                onChange={(value: unknown) =>
                    handleNestedUpdate("scheduleAutoInputInfo", "roundingTimeTypeOfSchedule", value as string)
                }
                minWidth="250px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.startEndTime}
                value={settings?.scheduleAutoInputInfo?.startEndTime}
                onChange={(value: unknown) =>
                    handleNestedUpdate("scheduleAutoInputInfo", "startEndTime", value as number)
                }
                maxWidth="120px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.workItemId}
                value={settings?.scheduleAutoInputInfo?.workItemId}
                onChange={(value: unknown) =>
                    handleNestedUpdate("scheduleAutoInputInfo", "workItemId", value as number)
                }
                maxWidth="150px"
                placeholder="WorkItemID"
            />
        </SettingSection>
    );
}
