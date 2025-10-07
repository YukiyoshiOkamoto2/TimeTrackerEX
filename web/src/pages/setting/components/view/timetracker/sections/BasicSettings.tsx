/**
 * TimeTracker基本設定セクション
 */

import { TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { SettingSection } from "../../../layout";
import { AutoSettingItem } from "../../../ui";
import { useTimeTrackerSettings } from "../hooks/useTimeTrackerSettings";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;

export function BasicSettings() {
    const { settings, handleUpdate } = useTimeTrackerSettings();

    return (
        <SettingSection title="基本設定" description="TimeTrackerに接続するための必須項目" required={true}>
            <AutoSettingItem
                definition={ttDef.userName}
                value={settings?.userName}
                onChange={(value: unknown) => handleUpdate("userName", value as string)}
                minWidth="300px"
                placeholder="ユーザー名を入力"
            />
            <AutoSettingItem
                definition={ttDef.baseUrl}
                value={settings?.baseUrl}
                onChange={(value: unknown) => handleUpdate("baseUrl", value as string)}
                minWidth="400px"
                placeholder="https://timetracker.example.com"
            />
            <AutoSettingItem
                definition={ttDef.baseProjectId}
                value={settings?.baseProjectId}
                onChange={(value: unknown) => handleUpdate("baseProjectId", value as number)}
                maxWidth="150px"
                placeholder="プロジェクトID"
            />
            <AutoSettingItem
                definition={ttDef.isHistoryAutoInput}
                value={settings?.isHistoryAutoInput}
                onChange={(value: unknown) => handleUpdate("isHistoryAutoInput", value as boolean)}
            />
        </SettingSection>
    );
}
