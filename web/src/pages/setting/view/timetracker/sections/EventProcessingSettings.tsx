/**
 * イベント処理設定セクション
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useCallback で各ハンドラーをメモ化
 */

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { TIMETRACKER_EVENT_DUPLICATE_PRIORITY, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { memo, useCallback } from "react";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;
const eventDuplicatePriorityDef = TIMETRACKER_EVENT_DUPLICATE_PRIORITY.getTypedChildren()!;

export const EventProcessingSettings = memo(function EventProcessingSettings() {
    const { settings, handleUpdate, handleNestedUpdate } = useTimeTrackerSettings();

    // 各フィールド用のハンドラーをメモ化
    const handleRoundingTimeTypeChange = useCallback(
        (value: unknown) => handleUpdate("roundingTimeTypeOfEvent", value as string),
        [handleUpdate],
    );

    const handleTimeCompareChange = useCallback(
        (value: unknown) => handleNestedUpdate("eventDuplicatePriority", "timeCompare", value as string),
        [handleNestedUpdate],
    );

    return (
        <SettingSection title="イベント処理設定" description="イベントの丸め方法と重複時の優先度" required={true}>
            <AutoSettingItem
                definition={ttDef.roundingTimeTypeOfEvent}
                value={settings?.roundingTimeTypeOfEvent}
                onChange={handleRoundingTimeTypeChange}
                minWidth="250px"
            />
            <AutoSettingItem
                definition={eventDuplicatePriorityDef.timeCompare}
                value={settings?.eventDuplicatePriority?.timeCompare}
                onChange={handleTimeCompareChange}
                minWidth="250px"
            />
        </SettingSection>
    );
});
