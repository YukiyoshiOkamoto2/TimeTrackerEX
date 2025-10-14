/**
 * TimeTracker基本設定セクション
 *
 * パフォーマンス最適化:
 * - React.memo でコンポーネントをメモ化
 * - useCallback で各ハンドラーをメモ化
 */

import { AutoSettingItem, SettingSection } from "@/pages/setting/components";
import { TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { memo, useCallback } from "react";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.getTypedChildren()!;

export const BasicSettings = memo(function BasicSettings() {
    const { settings, handleUpdate } = useTimeTrackerSettings();

    // 各フィールド用のハンドラーをメモ化
    const handleUserNameChange = useCallback(
        (value: unknown) => handleUpdate("userName", value as string),
        [handleUpdate],
    );

    const handleBaseUrlChange = useCallback(
        (value: unknown) => handleUpdate("baseUrl", value as string),
        [handleUpdate],
    );

    const handleBaseProjectIdChange = useCallback(
        (value: unknown) => handleUpdate("baseProjectId", value as number),
        [handleUpdate],
    );

    const handleHistoryAutoInputChange = useCallback(
        (value: unknown) => handleUpdate("isHistoryAutoInput", value as boolean),
        [handleUpdate],
    );

    return (
        <SettingSection title="基本設定" description="TimeTrackerに接続するための必須項目" required={true}>
            <AutoSettingItem
                definition={ttDef.userName}
                value={settings?.userName}
                onChange={handleUserNameChange}
                minWidth="300px"
                placeholder="ユーザー名を入力"
            />
            <AutoSettingItem
                definition={ttDef.baseUrl}
                value={settings?.baseUrl}
                onChange={handleBaseUrlChange}
                minWidth="400px"
                placeholder="https://timetracker.example.com"
            />
            <AutoSettingItem
                definition={ttDef.baseProjectId}
                value={settings?.baseProjectId}
                onChange={handleBaseProjectIdChange}
                maxWidth="150px"
                placeholder="プロジェクトID"
            />
            <AutoSettingItem
                definition={ttDef.isHistoryAutoInput}
                value={settings?.isHistoryAutoInput}
                onChange={handleHistoryAutoInputChange}
            />
        </SettingSection>
    );
});
