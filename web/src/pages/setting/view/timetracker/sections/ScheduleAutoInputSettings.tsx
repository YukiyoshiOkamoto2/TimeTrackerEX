/**
 * 勤務時間自動入力設定セクション
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useCallback で各ハンドラーをメモ化
 */

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { TIMETRACKER_SCHEDULE_AUTO_INPUT_INFO } from "@/schema";
import { memo, useCallback } from "react";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const scheduleAutoInputInfoDef = TIMETRACKER_SCHEDULE_AUTO_INPUT_INFO.getTypedChildren()!;

export const ScheduleAutoInputSettings = memo(function ScheduleAutoInputSettings() {
    const { settings, handleNestedUpdate } = useTimeTrackerSettings();

    // 各フィールド用のハンドラーをメモ化
    const handleStartEndTypeChange = useCallback(
        (value: unknown) => handleNestedUpdate("scheduleAutoInputInfo", "startEndType", value as string),
        [handleNestedUpdate],
    );

    const handleRoundingTimeTypeChange = useCallback(
        (value: unknown) => handleNestedUpdate("scheduleAutoInputInfo", "roundingTimeTypeOfSchedule", value as string),
        [handleNestedUpdate],
    );

    const handleStartEndTimeChange = useCallback(
        (value: unknown) => handleNestedUpdate("scheduleAutoInputInfo", "startEndTime", value as number),
        [handleNestedUpdate],
    );

    const handleWorkItemIdChange = useCallback(
        (value: unknown) => handleNestedUpdate("scheduleAutoInputInfo", "workItemId", value as number),
        [handleNestedUpdate],
    );

    return (
        <SettingSection
            title="勤務時間の自動入力設定"
            description="勤務開始・終了時間を自動入力する設定"
            required={true}
        >
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.startEndType}
                value={settings?.scheduleAutoInputInfo?.startEndType}
                onChange={handleStartEndTypeChange}
                minWidth="250px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.roundingTimeType}
                value={settings?.scheduleAutoInputInfo?.roundingTimeType}
                onChange={handleRoundingTimeTypeChange}
                minWidth="250px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.startEndTime}
                value={settings?.scheduleAutoInputInfo?.startEndTime}
                onChange={handleStartEndTimeChange}
                maxWidth="120px"
            />
            <AutoSettingItem
                definition={scheduleAutoInputInfoDef.workItemId}
                value={settings?.scheduleAutoInputInfo?.workItemId}
                onChange={handleWorkItemIdChange}
                maxWidth="150px"
                placeholder="WorkItemID"
            />
        </SettingSection>
    );
});
