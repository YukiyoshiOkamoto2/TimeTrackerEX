import { ObjectSettingValueInfo, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { Badge, Button } from "@fluentui/react-components";
import { useState } from "react";
import { useSettings } from "../../../../store/settings/SettingsProvider";
import type { EventPattern, TimeTrackerSettings as TimeTrackerSettingsType } from "../../../../types";
import { AutoSettingItem, SettingItem, SettingNavigationItem, SettingNavigationSection, SettingSection } from "../ui";
import { IgnorableEventsSettings } from "./IgnorableEventsSettings";
import { TimeOffEventsSettings } from "./TimeOffEventsSettings";

type SettingView = "main" | "ignorableEvents" | "timeOffEvents";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;
const eventDuplicatePriorityDef = (ttDef.eventDuplicatePriority as ObjectSettingValueInfo).children!;
const scheduleAutoInputInfoDef = (ttDef.scheduleAutoInputInfo as ObjectSettingValueInfo).children!;
const paidLeaveInputInfoDef = (ttDef.paidLeaveInputInfo as ObjectSettingValueInfo).children!;

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
                [parent]: {
                    ...(parentValue as unknown as Record<string, unknown>),
                    [field]: value,
                },
            },
        });
    };

    return (
        <>
            {/* 必須設定 */}
            <SettingSection title="基本設定" description="TimeTrackerに接続するための必須項目" required={true}>
                <AutoSettingItem
                    definition={ttDef.userName}
                    value={tt?.userName || ""}
                    onChange={(value) => handleUpdate("userName", value as string)}
                    minWidth="300px"
                    placeholder="ユーザー名を入力"
                />
                <AutoSettingItem
                    definition={ttDef.baseUrl}
                    value={tt?.baseUrl || ""}
                    onChange={(value) => handleUpdate("baseUrl", value as string)}
                    minWidth="400px"
                    placeholder="https://timetracker.example.com"
                />
                <AutoSettingItem
                    definition={ttDef.baseProjectId}
                    value={tt?.baseProjectId || 0}
                    onChange={(value) => handleUpdate("baseProjectId", value as number)}
                    maxWidth="150px"
                    placeholder="プロジェクトID"
                />
                <AutoSettingItem
                    definition={ttDef.isHistoryAutoInput}
                    value={tt?.isHistoryAutoInput ?? true}
                    onChange={(value) => handleUpdate("isHistoryAutoInput", value as boolean)}
                />
            </SettingSection>

            <SettingSection title="イベント処理設定" description="イベントの丸め方法と重複時の優先度" required={true}>
                <AutoSettingItem
                    definition={ttDef.roundingTimeTypeOfEvent}
                    value={tt?.roundingTimeTypeOfEvent || "nonduplicate"}
                    onChange={(value) => handleUpdate("roundingTimeTypeOfEvent", value as string)}
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={eventDuplicatePriorityDef.timeCompare}
                    value={tt?.eventDuplicatePriority?.timeCompare || "small"}
                    onChange={(value) => handleNestedUpdate("eventDuplicatePriority", "timeCompare", value as string)}
                    minWidth="250px"
                />
            </SettingSection>

            <SettingSection
                title="勤務時間の自動入力設定"
                description="勤務開始・終了時間を自動入力する設定"
                required={true}
            >
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.startEndType}
                    value={tt?.scheduleAutoInputInfo?.startEndType || "both"}
                    onChange={(value) => handleNestedUpdate("scheduleAutoInputInfo", "startEndType", value as string)}
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.roundingTimeTypeOfSchedule}
                    value={tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule || "half"}
                    onChange={(value) =>
                        handleNestedUpdate("scheduleAutoInputInfo", "roundingTimeTypeOfSchedule", value as string)
                    }
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.startEndTime}
                    value={tt?.scheduleAutoInputInfo?.startEndTime || 30}
                    onChange={(value) => handleNestedUpdate("scheduleAutoInputInfo", "startEndTime", value as number)}
                    maxWidth="120px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.workItemId}
                    value={tt?.scheduleAutoInputInfo?.workItemId || 0}
                    onChange={(value) => handleNestedUpdate("scheduleAutoInputInfo", "workItemId", value as number)}
                    maxWidth="150px"
                    placeholder="WorkItemID"
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
                <AutoSettingItem
                    definition={paidLeaveInputInfoDef.workItemId}
                    value={tt?.paidLeaveInputInfo?.workItemId || 0}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("paidLeaveInputInfo", "workItemId", value as number)
                    }
                    maxWidth="150px"
                    placeholder="WorkItemID"
                />
                <AutoSettingItem
                    definition={paidLeaveInputInfoDef.startTime}
                    value={tt?.paidLeaveInputInfo?.startTime || "09:00"}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("paidLeaveInputInfo", "startTime", value as string)
                    }
                    maxWidth="150px"
                />
                <AutoSettingItem
                    definition={paidLeaveInputInfoDef.endTime}
                    value={tt?.paidLeaveInputInfo?.endTime || "17:30"}
                    onChange={(value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "endTime", value as string)}
                    maxWidth="150px"
                />
            </SettingSection>

            <SettingNavigationSection title={ttDef.timeOffEvent.name} required={false}>
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

            <SettingNavigationSection title={ttDef.ignorableEvents.name} required={false}>
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
