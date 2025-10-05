import { Button, Dropdown, Input, Option, Switch } from "@fluentui/react-components";
import { SETTINGS_DEFINITION } from "../../../schema/settings/settingsDefinition";
import { useSettings } from "../../../store/settings/SettingsProvider";
import { SettingItem } from "./SettingItem";
import { SettingSection } from "./SettingSection";

export function TimeTrackerSettings() {
    const { settings, updateSettings } = useSettings();

    // timetracker設定を取得（階層構造に対応）
    const tt = settings.timetracker as any;
    const ttDef = SETTINGS_DEFINITION.timetracker.children as any;

    const handleUpdate = (field: string, value: any) => {
        updateSettings({
            timetracker: {
                ...tt,
                [field]: value,
            },
        });
    };

    const handleNestedUpdate = (parent: string, field: string, value: any) => {
        updateSettings({
            timetracker: {
                ...tt,
                [parent]: {
                    ...tt?.[parent],
                    [field]: value,
                },
            },
        });
    };

    return (
        <>
            <SettingSection title="基本設定" description={ttDef.userName.description}>
                <SettingItem
                    label={ttDef.userName.name}
                    description={ttDef.userName.description}
                    control={
                        <Input
                            value={tt?.userName || ""}
                            onChange={(_, data) => handleUpdate("userName", data.value)}
                            placeholder="ユーザー名を入力"
                            style={{ minWidth: "300px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.baseUrl.name}
                    description={ttDef.baseUrl.description}
                    control={
                        <Input
                            type="url"
                            value={tt?.baseUrl || ""}
                            onChange={(_, data) => handleUpdate("baseUrl", data.value)}
                            placeholder="https://timetracker.example.com"
                            style={{ minWidth: "400px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.baseProjectId.name}
                    description={ttDef.baseProjectId.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.baseProjectId?.toString() || ""}
                            onChange={(_, data) => handleUpdate("baseProjectId", parseInt(data.value) || 0)}
                            placeholder="プロジェクトID"
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
            </SettingSection>

            <SettingSection title="自動更新設定" description="アプリケーションの動作設定">
                <SettingItem
                    label={ttDef.enableAutoUpdate.name}
                    description={ttDef.enableAutoUpdate.description}
                    control={
                        <Switch
                            checked={tt?.enableAutoUpdate ?? true}
                            onChange={(_, data) => handleUpdate("enableAutoUpdate", data.checked)}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.isHistoryAutoInput.name}
                    description={ttDef.isHistoryAutoInput.description}
                    control={
                        <Switch
                            checked={tt?.isHistoryAutoInput ?? true}
                            onChange={(_, data) => handleUpdate("isHistoryAutoInput", data.checked)}
                        />
                    }
                />
            </SettingSection>

            <SettingSection
                title={ttDef.roundingTimeTypeOfEvent.name}
                description={ttDef.roundingTimeTypeOfEvent.description?.split('\n')[0]}
            >
                <SettingItem
                    label={ttDef.roundingTimeTypeOfEvent.name}
                    description={ttDef.roundingTimeTypeOfEvent.description}
                    control={
                        <Dropdown
                            value={tt?.roundingTimeTypeOfEvent || "nonduplicate"}
                            selectedOptions={[tt?.roundingTimeTypeOfEvent || "nonduplicate"]}
                            onOptionSelect={(_, data) => handleUpdate("roundingTimeTypeOfEvent", data.optionValue)}
                            style={{ minWidth: "200px" }}
                        >
                            <Option value="backward">backward（切り上げ）</Option>
                            <Option value="forward">forward（切り捨て）</Option>
                            <Option value="round">round（短く丸める）</Option>
                            <Option value="half">half（15分基準）</Option>
                            <Option value="stretch">stretch（長く丸める）</Option>
                            <Option value="nonduplicate">nonduplicate（重複を考慮）</Option>
                        </Dropdown>
                    }
                />
            </SettingSection>

            <SettingSection
                title={ttDef.timeOffEvent.name}
                description={ttDef.timeOffEvent.description}
            >
                <SettingItem
                    label={ttDef.timeOffEvent.children.nameOfEvent.name}
                    description={ttDef.timeOffEvent.children.nameOfEvent.description}
                    control={
                        <Input
                            value={tt?.timeOffEvent?.nameOfEvent?.join(", ") || ""}
                            onChange={(_, data) =>
                                handleNestedUpdate(
                                    "timeOffEvent",
                                    "nameOfEvent",
                                    data.value.split(",").map((s) => s.trim()),
                                )
                            }
                            placeholder="有給, 休暇"
                            style={{ minWidth: "300px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.timeOffEvent.children.workItemId.name}
                    description={ttDef.timeOffEvent.children.workItemId.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.timeOffEvent?.workItemId?.toString() || ""}
                            onChange={(_, data) =>
                                handleNestedUpdate("timeOffEvent", "workItemId", parseInt(data.value) || 0)
                            }
                            placeholder="WorkItemID"
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
            </SettingSection>

            <SettingSection
                title={ttDef.eventDuplicatePriority.name}
                description={ttDef.eventDuplicatePriority.description}
            >
                <SettingItem
                    label={ttDef.eventDuplicatePriority.children.timeCompare.name}
                    description={ttDef.eventDuplicatePriority.children.timeCompare.description}
                    control={
                        <Dropdown
                            value={tt?.eventDuplicatePriority?.timeCompare || "small"}
                            selectedOptions={[tt?.eventDuplicatePriority?.timeCompare || "small"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate("eventDuplicatePriority", "timeCompare", data.optionValue)
                            }
                            style={{ minWidth: "200px" }}
                        >
                            <Option value="small">small（短いイベント優先）</Option>
                            <Option value="large">large（長いイベント優先）</Option>
                        </Dropdown>
                    }
                />
            </SettingSection>

            <SettingSection
                title={ttDef.scheduleAutoInputInfo.name}
                description={ttDef.scheduleAutoInputInfo.description}
            >
                <SettingItem
                    label={ttDef.scheduleAutoInputInfo.children.startEndType.name}
                    description={ttDef.scheduleAutoInputInfo.children.startEndType.description}
                    control={
                        <Dropdown
                            value={tt?.scheduleAutoInputInfo?.startEndType || "both"}
                            selectedOptions={[tt?.scheduleAutoInputInfo?.startEndType || "both"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate("scheduleAutoInputInfo", "startEndType", data.optionValue)
                            }
                            style={{ minWidth: "200px" }}
                        >
                            <Option value="both">both（開始・終了）</Option>
                            <Option value="start">start（開始のみ）</Option>
                            <Option value="end">end（終了のみ）</Option>
                            <Option value="fill">fill（間を埋める）</Option>
                        </Dropdown>
                    }
                />
                <SettingItem
                    label={ttDef.scheduleAutoInputInfo.children.roundingTimeTypeOfSchedule.name}
                    description={ttDef.scheduleAutoInputInfo.children.roundingTimeTypeOfSchedule.description}
                    control={
                        <Dropdown
                            value={tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule || "half"}
                            selectedOptions={[tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule || "half"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate("scheduleAutoInputInfo", "roundingTimeTypeOfSchedule", data.optionValue)
                            }
                            style={{ minWidth: "200px" }}
                        >
                            <Option value="backward">backward（切り上げ）</Option>
                            <Option value="forward">forward（切り捨て）</Option>
                            <Option value="round">round（短く丸める）</Option>
                            <Option value="half">half（15分基準）</Option>
                            <Option value="stretch">stretch（長く丸める）</Option>
                        </Dropdown>
                    }
                />
                <SettingItem
                    label={ttDef.scheduleAutoInputInfo.children.startEndTime.name}
                    description={ttDef.scheduleAutoInputInfo.children.startEndTime.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.scheduleAutoInputInfo?.startEndTime?.toString() || "30"}
                            onChange={(_, data) =>
                                handleNestedUpdate("scheduleAutoInputInfo", "startEndTime", parseInt(data.value) || 30)
                            }
                            style={{ maxWidth: "120px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.scheduleAutoInputInfo.children.workItemId.name}
                    description={ttDef.scheduleAutoInputInfo.children.workItemId.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.scheduleAutoInputInfo?.workItemId?.toString() || ""}
                            onChange={(_, data) =>
                                handleNestedUpdate("scheduleAutoInputInfo", "workItemId", parseInt(data.value) || 0)
                            }
                            placeholder="WorkItemID"
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
            </SettingSection>

            <SettingSection
                title={ttDef.paidLeaveInputInfo.name}
                description={ttDef.paidLeaveInputInfo.description}
            >
                <SettingItem
                    label={ttDef.paidLeaveInputInfo.children.workItemId.name}
                    description={ttDef.paidLeaveInputInfo.children.workItemId.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.paidLeaveInputInfo?.workItemId?.toString() || ""}
                            onChange={(_, data) =>
                                handleNestedUpdate("paidLeaveInputInfo", "workItemId", parseInt(data.value) || 0)
                            }
                            placeholder="WorkItemID"
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.paidLeaveInputInfo.children.startTime.name}
                    description={ttDef.paidLeaveInputInfo.children.startTime.description}
                    control={
                        <Input
                            type="time"
                            value={tt?.paidLeaveInputInfo?.startTime || "09:00"}
                            onChange={(_, data) => handleNestedUpdate("paidLeaveInputInfo", "startTime", data.value)}
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
                <SettingItem
                    label={ttDef.paidLeaveInputInfo.children.endTime.name}
                    description={ttDef.paidLeaveInputInfo.children.endTime.description}
                    control={
                        <Input
                            type="time"
                            value={tt?.paidLeaveInputInfo?.endTime || "18:00"}
                            onChange={(_, data) => handleNestedUpdate("paidLeaveInputInfo", "endTime", data.value)}
                            style={{ maxWidth: "150px" }}
                        />
                    }
                />
            </SettingSection>

            <SettingSection title="データ管理">
                <SettingItem
                    label="データをエクスポート"
                    description="すべてのデータをJSONファイルとしてエクスポートします"
                    control={
                        <Button size="small" appearance="secondary">
                            エクスポート
                        </Button>
                    }
                />
                <SettingItem
                    label="データをインポート"
                    description="バックアップからデータを復元します"
                    control={
                        <Button size="small" appearance="secondary">
                            インポート
                        </Button>
                    }
                />
                <SettingItem
                    label="すべてのデータをクリア"
                    description="すべての設定とデータを削除します（取り消せません）"
                    control={
                        <Button size="small" appearance="secondary">
                            クリア
                        </Button>
                    }
                />
            </SettingSection>
        </>
    );
}
