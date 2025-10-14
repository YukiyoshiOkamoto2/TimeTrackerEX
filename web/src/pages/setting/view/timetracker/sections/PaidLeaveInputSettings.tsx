/**
 * 有給休暇自動入力設定セクション
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useCallback で各ハンドラーをメモ化
 * - useMemo で有効状態と無効状態をメモ化
 */

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { TIMETRACKER_PAID_LEAVE_INPUT_INFO, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { memo, useCallback, useMemo } from "react";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;
const paidLeaveInputInfoDef = TIMETRACKER_PAID_LEAVE_INPUT_INFO.getTypedChildren()!;

export const PaidLeaveInputSettings = memo(function PaidLeaveInputSettings() {
    const { settings, handleNestedUpdate, handleObjectUpdate } = useTimeTrackerSettings();

    // 有効状態をメモ化
    const isEnabled = useMemo(() => settings?.paidLeaveInputInfo !== undefined, [settings?.paidLeaveInputInfo]);

    // 有効/無効切り替えハンドラーをメモ化
    const handleEnabledChange = useCallback(
        (enabled: boolean) => {
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
        },
        [handleObjectUpdate],
    );

    // 各フィールド用のハンドラーをメモ化
    const handleWorkItemIdChange = useCallback(
        (value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "workItemId", value as number),
        [handleNestedUpdate],
    );

    const handleStartTimeChange = useCallback(
        (value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "startTime", value as string),
        [handleNestedUpdate],
    );

    const handleEndTimeChange = useCallback(
        (value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "endTime", value as string),
        [handleNestedUpdate],
    );

    return (
        <SettingSection
            title={ttDef.paidLeaveInputInfo.name}
            description={ttDef.paidLeaveInputInfo.description}
            required={false}
            collapsible={true}
            enabled={isEnabled}
            onEnabledChange={handleEnabledChange}
        >
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.workItemId}
                value={settings?.paidLeaveInputInfo?.workItemId}
                onChange={handleWorkItemIdChange}
                maxWidth="150px"
                placeholder="WorkItemID"
                disabled={!isEnabled}
            />
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.startTime}
                value={settings?.paidLeaveInputInfo?.startTime}
                onChange={handleStartTimeChange}
                maxWidth="150px"
                disabled={!isEnabled}
            />
            <AutoSettingItem
                definition={paidLeaveInputInfoDef.endTime}
                value={settings?.paidLeaveInputInfo?.endTime}
                onChange={handleEndTimeChange}
                maxWidth="150px"
                disabled={!isEnabled}
            />
        </SettingSection>
    );
});
