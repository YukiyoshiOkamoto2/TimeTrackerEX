/**
 * TimeTracker設定を操作するカスタムフック
 */

import { useSettings } from "@/store";
import type { TimeTrackerSettings } from "@/types";

export function useTimeTrackerSettings() {
    const { settings, updateSettings } = useSettings();
    const tt = settings.timetracker!;

    /**
     * トップレベルフィールドを更新
     */
    const handleUpdate = (field: string, value: string | number | boolean | undefined) => {
        if (value === undefined) return;
        updateSettings({
            timetracker: {
                ...tt,
                [field]: value,
            },
        });
    };

    /**
     * ネストされたオブジェクトのフィールドを更新
     */
    const handleNestedUpdate = (parent: string, field: string, value: string | number | boolean | undefined) => {
        if (value === undefined) return;
        const parentValue = tt?.[parent as keyof TimeTrackerSettings];
        updateSettings({
            timetracker: {
                ...tt,
                [parent]: {
                    ...(parentValue as unknown as Record<string, unknown>),
                    [field]: value,
                },
            },
        });
    };

    /**
     * ネストされたオブジェクト全体を更新
     */
    const handleObjectUpdate = (parent: string, value: unknown) => {
        updateSettings({
            timetracker: {
                ...tt,
                [parent]: value,
            },
        });
    };

    return {
        settings: tt,
        handleUpdate,
        handleNestedUpdate,
        handleObjectUpdate,
        updateSettings,
    };
}
