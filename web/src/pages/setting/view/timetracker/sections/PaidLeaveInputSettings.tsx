/**
 * 有給休暇自動入力設定セクション
 */

import { TIMETRACKER_PAID_LEAVE_INPUT_INFO, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;
const paidLeaveInputInfoDef = TIMETRACKER_PAID_LEAVE_INPUT_INFO.getTypedChildren()!;

export function PaidLeaveInputSettings() {
    const { settings, handleNestedUpdate, handleObjectUpdate } = useTimeTrackerSettings();

    return (
        <SettingSection
            title={ttDef.paidLeaveInputInfo.name}
            description={ttDef.paidLeaveInputInfo.description}
            required={false}
            collapsible={true}
            enabled={settings?.paidLeaveInputInfo !== undefined}
            onEnabledChange={(enabled: boolean) => {
                if (enabled) {
                    // Switchをオンにしたときはデフォルト値でオブジェクトを作成
                    handleObjectUpdate("paidLeaveInputInfo", {
                        workItemId: -1,
                        startTime: "09:00",
                        endTime: "17:30",
                    });
                } else {
                    // Switchをオフにしたときはオブジェクトを削除(undefinedに設定)
                    handleObjectUpdate("paidLeaveInputInfo", undefined);
                }
            }}
        >
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.workItemId}
                value={settings?.paidLeaveInputInfo?.workItemId}
                onChange={(value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "workItemId", value as number)}
                maxWidth="150px"
                placeholder="WorkItemID"
                disabled={settings?.paidLeaveInputInfo === undefined}
            />
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.startTime}
                value={settings?.paidLeaveInputInfo?.startTime}
                onChange={(value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "startTime", value as string)}
                maxWidth="150px"
                disabled={settings?.paidLeaveInputInfo === undefined}
            />
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.endTime}
                value={settings?.paidLeaveInputInfo?.endTime}
                onChange={(value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "endTime", value as string)}
                maxWidth="150px"
                disabled={settings?.paidLeaveInputInfo === undefined}
            />
        </SettingSection>
    );
}
