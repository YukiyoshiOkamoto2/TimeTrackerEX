import { Badge, Button, Dropdown, Input, Option, Switch } from "@fluentui/react-components";
import { useState } from "react";
import { SETTINGS_DEFINITION, type ObjectSettingValueInfo } from "../../../../schema/settings/settingsDefinition";
import { getObjectChildren, updateNestedObject } from "../../../../schema/settings/settingUtils";
import { useSettings } from "../../../../store/settings/SettingsProvider";
import type { EventPattern, TimeTrackerSettings as TimeTrackerSettingsType } from "../../../../types";
import { SettingItem, SettingNavigationItem, SettingNavigationSection, SettingSection } from "../ui";
import { IgnorableEventsSettings } from "./IgnorableEventsSettings";
import { TimeOffEventsSettings } from "./TimeOffEventsSettings";

type SettingView = "main" | "ignorableEvents" | "timeOffEvents";

export function TimeTrackerSettings() {
    const [currentView, setCurrentView] = useState<SettingView>("main");

    if (currentView === "ignorableEvents") {
        return <TimeTrackerSettingsWithIgnorableEvents onBack={() => setCurrentView("main")} />;
    }

    if (currentView === "timeOffEvents") {
        return <TimeTrackerSettingsWithTimeOffEvents onBack={() => setCurrentView("main")} />;
    }

    return (
        <TimeTrackerSettingsMain
            onNavigateToIgnorableEvents={() => setCurrentView("ignorableEvents")}
            onNavigateToTimeOffEvents={() => setCurrentView("timeOffEvents")}
        />
    );
}

interface TimeTrackerSettingsWithIgnorableEventsProps {
    onBack: () => void;
}

function TimeTrackerSettingsWithIgnorableEvents({ onBack }: TimeTrackerSettingsWithIgnorableEventsProps) {
    const { settings, updateSettings } = useSettings();
    const tt = settings.timetracker as TimeTrackerSettingsType;

    const handleUpdate = (patterns: EventPattern[]) => {
        updateSettings({
            timetracker: {
                ...tt,
                ignorableEvents: patterns,
            },
        });
    };

    return <IgnorableEventsSettings patterns={tt?.ignorableEvents || []} onChange={handleUpdate} onBack={onBack} />;
}

interface TimeTrackerSettingsWithTimeOffEventsProps {
    onBack: () => void;
}

function TimeTrackerSettingsWithTimeOffEvents({ onBack }: TimeTrackerSettingsWithTimeOffEventsProps) {
    const { settings, updateSettings } = useSettings();
    const tt = settings.timetracker as TimeTrackerSettingsType;

    const handleUpdate = (patterns: EventPattern[], workItemId: number) => {
        updateSettings({
            timetracker: {
                ...tt,
                timeOffEvent: {
                    namePatterns: patterns,
                    workItemId,
                },
            },
        });
    };

    return (
        <TimeOffEventsSettings
            patterns={tt?.timeOffEvent?.namePatterns || []}
            workItemId={tt?.timeOffEvent?.workItemId || 0}
            onChange={handleUpdate}
            onBack={onBack}
        />
    );
}

interface TimeTrackerSettingsMainProps {
    onNavigateToIgnorableEvents: () => void;
    onNavigateToTimeOffEvents: () => void;
}

function TimeTrackerSettingsMain({
    onNavigateToIgnorableEvents,
    onNavigateToTimeOffEvents,
}: TimeTrackerSettingsMainProps) {
    const { settings, updateSettings } = useSettings();

    // timetracker設定を取得（階層構造に対応）
    const tt = settings.timetracker!;
    const ttDef = (SETTINGS_DEFINITION.timetracker as ObjectSettingValueInfo).children;

    // ネストされたオブジェクト型定義を取得
    const eventDuplicatePriorityDef = getObjectChildren(ttDef, "eventDuplicatePriority");
    const scheduleAutoInputInfoDef = getObjectChildren(ttDef, "scheduleAutoInputInfo");
    const paidLeaveInputInfoDef = getObjectChildren(ttDef, "paidLeaveInputInfo");

    const handleUpdate = (field: string, value: string | number | boolean | undefined) => {
        if (value === undefined) return;
        updateSettings({
            timetracker: {
                ...tt,
                [field]: value,
            },
        });
    };

    const handleNestedUpdate = (parent: string, field: string, value: string | number | boolean | undefined) => {
        if (value === undefined) return;
        const parentValue = tt?.[parent as keyof TimeTrackerSettingsType];
        updateSettings({
            timetracker: {
                ...tt,
                [parent]: updateNestedObject(
                    parentValue as Record<string, unknown> | undefined,
                    field,
                    value as string | number | boolean,
                ),
            },
        });
    };

    return (
        <>
            {/* 必須設定 */}
            <SettingSection title="基本設定" description="TimeTrackerに接続するための必須項目" required={true}>
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

            <SettingSection title="イベント処理設定" description="イベントの丸め方法と重複時の優先度" required={true}>
                <SettingItem
                    label={ttDef.roundingTimeTypeOfEvent.name}
                    description={ttDef.roundingTimeTypeOfEvent.description}
                    control={
                        <Dropdown
                            value={tt?.roundingTimeTypeOfEvent || "nonduplicate"}
                            selectedOptions={[tt?.roundingTimeTypeOfEvent || "nonduplicate"]}
                            onOptionSelect={(_, data) => handleUpdate("roundingTimeTypeOfEvent", data.optionValue)}
                            style={{ minWidth: "250px" }}
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
                <SettingItem
                    label={eventDuplicatePriorityDef.timeCompare.name}
                    description={eventDuplicatePriorityDef.timeCompare.description}
                    control={
                        <Dropdown
                            value={tt?.eventDuplicatePriority?.timeCompare || "small"}
                            selectedOptions={[tt?.eventDuplicatePriority?.timeCompare || "small"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate("eventDuplicatePriority", "timeCompare", data.optionValue)
                            }
                            style={{ minWidth: "250px" }}
                        >
                            <Option value="small">small（短いイベント優先）</Option>
                            <Option value="large">large（長いイベント優先）</Option>
                        </Dropdown>
                    }
                />
            </SettingSection>

            <SettingSection
                title="勤務時間の自動入力設定"
                description="勤務開始・終了時間を自動入力する設定"
                required={true}
            >
                <SettingItem
                    label={scheduleAutoInputInfoDef.startEndType.name}
                    description={scheduleAutoInputInfoDef.startEndType.description}
                    control={
                        <Dropdown
                            value={tt?.scheduleAutoInputInfo?.startEndType || "both"}
                            selectedOptions={[tt?.scheduleAutoInputInfo?.startEndType || "both"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate("scheduleAutoInputInfo", "startEndType", data.optionValue)
                            }
                            style={{ minWidth: "250px" }}
                        >
                            <Option value="both">both（開始・終了）</Option>
                            <Option value="start">start（開始のみ）</Option>
                            <Option value="end">end（終了のみ）</Option>
                            <Option value="fill">fill（間を埋める）</Option>
                        </Dropdown>
                    }
                />
                <SettingItem
                    label={scheduleAutoInputInfoDef.roundingTimeTypeOfSchedule.name}
                    description={scheduleAutoInputInfoDef.roundingTimeTypeOfSchedule.description}
                    control={
                        <Dropdown
                            value={tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule || "half"}
                            selectedOptions={[tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule || "half"]}
                            onOptionSelect={(_, data) =>
                                handleNestedUpdate(
                                    "scheduleAutoInputInfo",
                                    "roundingTimeTypeOfSchedule",
                                    data.optionValue,
                                )
                            }
                            style={{ minWidth: "250px" }}
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
                    label={scheduleAutoInputInfoDef.startEndTime.name}
                    description={scheduleAutoInputInfoDef.startEndTime.description}
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
                    label={scheduleAutoInputInfoDef.workItemId.name}
                    description={scheduleAutoInputInfoDef.workItemId.description}
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
                required={false}
                collapsible={true}
                enabled={tt?.paidLeaveInputInfo?.enabled ?? false}
                onEnabledChange={(enabled: boolean) => {
                    updateSettings({
                        timetracker: {
                            ...tt,
                            paidLeaveInputInfo: {
                                workItemId: tt?.paidLeaveInputInfo?.workItemId ?? 0,
                                startTime: tt?.paidLeaveInputInfo?.startTime ?? "",
                                endTime: tt?.paidLeaveInputInfo?.endTime ?? "",
                                enabled,
                            },
                        },
                    });
                }}
            >
                <SettingItem
                    label={paidLeaveInputInfoDef.workItemId.name}
                    description={paidLeaveInputInfoDef.workItemId.description}
                    control={
                        <Input
                            type="number"
                            value={tt?.paidLeaveInputInfo?.workItemId?.toString() || ""}
                            onChange={(_, data) =>
                                handleNestedUpdate("paidLeaveInputInfo", "workItemId", parseInt(data.value) || 0)
                            }
                            placeholder="WorkItemID"
                            style={{ maxWidth: "150px" }}
                            required={tt?.paidLeaveInputInfo?.enabled ?? false}
                        />
                    }
                />
                <SettingItem
                    label={paidLeaveInputInfoDef.startTime.name}
                    description={paidLeaveInputInfoDef.startTime.description}
                    control={
                        <Input
                            type="time"
                            value={tt?.paidLeaveInputInfo?.startTime || "09:00"}
                            onChange={(_, data) => handleNestedUpdate("paidLeaveInputInfo", "startTime", data.value)}
                            style={{ maxWidth: "150px" }}
                            required={tt?.paidLeaveInputInfo?.enabled ?? false}
                        />
                    }
                />
                <SettingItem
                    label={paidLeaveInputInfoDef.endTime.name}
                    description={paidLeaveInputInfoDef.endTime.description}
                    control={
                        <Input
                            type="time"
                            value={tt?.paidLeaveInputInfo?.endTime || "17:30"}
                            onChange={(_, data) => handleNestedUpdate("paidLeaveInputInfo", "endTime", data.value)}
                            style={{ maxWidth: "150px" }}
                            required={tt?.paidLeaveInputInfo?.enabled ?? false}
                        />
                    }
                />
            </SettingSection>

            <SettingNavigationSection
                title="休暇イベント設定"
                description="休暇イベント名とWorkItemIDの設定"
                required={false}
            >
                <SettingNavigationItem
                    title={ttDef.timeOffEvent.name}
                    description={ttDef.timeOffEvent.description}
                    badge={
                        tt?.timeOffEvent?.namePatterns && tt.timeOffEvent.namePatterns.length > 0 ? (
                            <Badge appearance="filled" color="informative">
                                {tt.timeOffEvent.namePatterns.length}件
                            </Badge>
                        ) : (
                            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
                        )
                    }
                    onClick={onNavigateToTimeOffEvents}
                />
            </SettingNavigationSection>

            <SettingNavigationSection
                title={ttDef.ignorableEvents.name}
                description={ttDef.ignorableEvents.description}
                required={false}
            >
                <SettingNavigationItem
                    title={ttDef.ignorableEvents.name}
                    description={ttDef.ignorableEvents.description}
                    badge={
                        tt?.ignorableEvents && tt.ignorableEvents.length > 0 ? (
                            <Badge appearance="filled" color="informative">
                                {tt.ignorableEvents.length}件
                            </Badge>
                        ) : (
                            <span style={{ color: "var(--colorNeutralForeground3)" }}>0件</span>
                        )
                    }
                    onClick={onNavigateToIgnorableEvents}
                />
            </SettingNavigationSection>

            <SettingSection title="データ管理" required={false}>
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
