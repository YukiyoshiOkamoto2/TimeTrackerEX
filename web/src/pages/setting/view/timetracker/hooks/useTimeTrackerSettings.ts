/**
 * TimeTracker設定を操作するカスタムフック
 *
 * パフォーマンス最適化:
 * - useCallback でハンドラーをメモ化し、不要な再レンダリングを防止
 * - useMemo で設定オブジェクトをメモ化
 */

import { useSettings } from "@/store";
import type { TimeTrackerSettings } from "@/types";
import { useCallback, useMemo } from "react";

export function useTimeTrackerSettings() {
    const { settings, updateSettings } = useSettings();

    // TimeTracker設定をメモ化（参照の安定性を保証）
    const tt = useMemo(() => settings.timetracker!, [settings.timetracker]);

    /**
     * トップレベルフィールドを更新（メモ化）
     */
    const handleUpdate = useCallback(
        (field: string, value: string | number | boolean | undefined) => {
            if (value === undefined) return;
            updateSettings({
                timetracker: {
                    ...tt,
                    [field]: value,
                },
            });
        },
        [tt, updateSettings],
    );

    /**
     * ネストされたオブジェクトのフィールドを更新（メモ化）
     */
    const handleNestedUpdate = useCallback(
        (parent: string, field: string, value: string | number | boolean | undefined) => {
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
        },
        [tt, updateSettings],
    );

    /**
     * ネストされたオブジェクト全体を更新（メモ化）
     */
    const handleObjectUpdate = useCallback(
        (parent: string, value: unknown) => {
            updateSettings({
                timetracker: {
                    ...tt,
                    [parent]: value,
                },
            });
        },
        [tt, updateSettings],
    );

    return useMemo(
        () => ({
            settings: tt,
            handleUpdate,
            handleNestedUpdate,
            handleObjectUpdate,
            updateSettings,
        }),
        [tt, handleUpdate, handleNestedUpdate, handleObjectUpdate, updateSettings],
    );
}
