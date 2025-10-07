import { ObjectSettingValueInfo, TIMETRACKER_SETTINGS_DEFINITION } from "@/schema";
import { Badge } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { useSettings } from "../../../../../store/settings/SettingsProvider";
import type { EventPattern, TimeTrackerSettings as TimeTrackerSettingsType } from "../../../../../types";
import {
    AutoSettingItem,
    SettingSection,
    SettingNavigationItem,
    SettingNavigationSection,
    type SettingError,
} from "../../ui";
import { JsonEditorView } from "../shared/JsonEditorView";
import { IgnorableEventsSettings } from "./IgnorableEventsSettings";
import { TimeOffEventsSettings } from "./TimeOffEventsSettings";

type SettingView = "main" | "ignorableEvents" | "timeOffEvents" | "jsonEditor";

const ttDef = TIMETRACKER_SETTINGS_DEFINITION.children!;
const eventDuplicatePriorityDef = (ttDef.eventDuplicatePriority as ObjectSettingValueInfo).children!;
const scheduleAutoInputInfoDef = (ttDef.scheduleAutoInputInfo as ObjectSettingValueInfo).children!;
const paidLeaveInputInfoDef = (ttDef.paidLeaveInputInfo as ObjectSettingValueInfo).children!;

export function TimeTrackerSettings() {
    const [currentView, setCurrentView] = useState<SettingView>("main");
    const { settings, updateSettings } = useSettings();

    if (currentView === "jsonEditor") {
        return (
            <JsonEditorView
                definition={TIMETRACKER_SETTINGS_DEFINITION}
                value={settings.timetracker as unknown as Record<string, unknown>}
                onSave={(value) => {
                    updateSettings({ timetracker: value as unknown as TimeTrackerSettingsType });
                    setCurrentView("main");
                }}
                onCancel={() => setCurrentView("main")}
            />
        );
    }

    if (currentView === "ignorableEvents") {
        return (
            <TimeTrackerSettingsWithIgnorableEvents
                onBack={() => setCurrentView("main")}
                onShowJson={() => setCurrentView("jsonEditor")}
            />
        );
    }

    if (currentView === "timeOffEvents") {
        return (
            <TimeTrackerSettingsWithTimeOffEvents
                onBack={() => setCurrentView("main")}
                onShowJson={() => setCurrentView("jsonEditor")}
            />
        );
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
    onShowJson: () => void;
}

function TimeTrackerSettingsWithIgnorableEvents({ onBack, onShowJson }: TimeTrackerSettingsWithIgnorableEventsProps) {
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

    return (
        <IgnorableEventsSettings
            patterns={tt?.ignorableEvents || []}
            onChange={handleUpdate}
            onBack={onBack}
            onShowJson={onShowJson}
        />
    );
}

interface TimeTrackerSettingsWithTimeOffEventsProps {
    onBack: () => void;
    onShowJson: () => void;
}

function TimeTrackerSettingsWithTimeOffEvents({ onBack, onShowJson }: TimeTrackerSettingsWithTimeOffEventsProps) {
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
            patterns={tt?.timeOffEvent?.namePatterns}
            workItemId={tt?.timeOffEvent?.workItemId}
            onChange={handleUpdate}
            onBack={onBack}
            onShowJson={onShowJson}
        />
    );
}

interface TimeTrackerSettingsMainProps {
    onNavigateToIgnorableEvents: () => void;
    onNavigateToTimeOffEvents: () => void;
}

const getError = (setting: unknown) => {
    const errorList: SettingError[] = [];
    const result = TIMETRACKER_SETTINGS_DEFINITION.validate(setting as Record<string, unknown>);

    if (result.isError && result.errorMessage) {
        const lines = result.errorMessage.split("\n").filter((line) => line.trim());
        lines.forEach((line, index) => {
            const match = line.match(/^(.+?):\s*(.+)$/);
            if (match) {
                errorList.push({
                    id: `error-${index}`,
                    label: match[1].trim(),
                    message: match[2].trim(),
                });
            } else {
                errorList.push({
                    id: `error-${index}`,
                    label: "設定エラー",
                    message: line.trim(),
                });
            }
        });
    }

    return errorList;
};

function TimeTrackerSettingsMain({
    onNavigateToIgnorableEvents,
    onNavigateToTimeOffEvents,
}: TimeTrackerSettingsMainProps) {
    const { settings, updateSettings } = useSettings();

    // timetracker設定を取得（階層構造に対応）
    const tt = settings.timetracker!;
    // バリデーションエラーを収集
    const [allErrors, setAllErrors] = useState<SettingError[]>(getError(tt));

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

    useEffect(() => {
        setAllErrors(getError(tt));
    }, [tt]);

    // セクション別にエラーをフィルタする関数
    const getErrorsForPath = (pathPrefix: string) => {
        return allErrors.filter((error: SettingError) => error.label.startsWith(pathPrefix));
    };

    const baseErrors = getErrorsForPath("TimeTracker設定 -> userName").concat(
        getErrorsForPath("TimeTracker設定 -> baseUrl"),
        getErrorsForPath("TimeTracker設定 -> baseProjectId"),
    );
    const scheduleAutoInputErrors = getErrorsForPath("TimeTracker設定 -> scheduleAutoInputInfo");
    const paidLeaveErrors = getErrorsForPath("TimeTracker設定 -> paidLeaveInputInfo");

    return (
        <>
            {/* 必須設定 */}
            <SettingSection
                title="基本設定"
                description="TimeTrackerに接続するための必須項目"
                required={true}
                errors={baseErrors}
            >
                <AutoSettingItem
                    definition={ttDef.userName}
                    value={tt?.userName}
                    onChange={(value: unknown) => handleUpdate("userName", value as string)}
                    minWidth="300px"
                    placeholder="ユーザー名を入力"
                />
                <AutoSettingItem
                    definition={ttDef.baseUrl}
                    value={tt?.baseUrl}
                    onChange={(value: unknown) => handleUpdate("baseUrl", value as string)}
                    minWidth="400px"
                    placeholder="https://timetracker.example.com"
                />
                <AutoSettingItem
                    definition={ttDef.baseProjectId}
                    value={tt?.baseProjectId}
                    onChange={(value: unknown) => handleUpdate("baseProjectId", value as number)}
                    maxWidth="150px"
                    placeholder="プロジェクトID"
                />
                <AutoSettingItem
                    definition={ttDef.isHistoryAutoInput}
                    value={tt?.isHistoryAutoInput}
                    onChange={(value: unknown) => handleUpdate("isHistoryAutoInput", value as boolean)}
                />
            </SettingSection>

            <SettingSection title="イベント処理設定" description="イベントの丸め方法と重複時の優先度" required={true}>
                <AutoSettingItem
                    definition={ttDef.roundingTimeTypeOfEvent}
                    value={tt?.roundingTimeTypeOfEvent}
                    onChange={(value: unknown) => handleUpdate("roundingTimeTypeOfEvent", value as string)}
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={eventDuplicatePriorityDef.timeCompare}
                    value={tt?.eventDuplicatePriority?.timeCompare}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("eventDuplicatePriority", "timeCompare", value as string)
                    }
                    minWidth="250px"
                />
            </SettingSection>

            <SettingSection
                title="勤務時間の自動入力設定"
                description="勤務開始・終了時間を自動入力する設定"
                required={true}
                errors={scheduleAutoInputErrors}
            >
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.startEndType}
                    value={tt?.scheduleAutoInputInfo?.startEndType}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("scheduleAutoInputInfo", "startEndType", value as string)
                    }
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.roundingTimeTypeOfSchedule}
                    value={tt?.scheduleAutoInputInfo?.roundingTimeTypeOfSchedule}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("scheduleAutoInputInfo", "roundingTimeTypeOfSchedule", value as string)
                    }
                    minWidth="250px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.startEndTime}
                    value={tt?.scheduleAutoInputInfo?.startEndTime}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("scheduleAutoInputInfo", "startEndTime", value as number)
                    }
                    maxWidth="120px"
                />
                <AutoSettingItem
                    definition={scheduleAutoInputInfoDef.workItemId}
                    value={tt?.scheduleAutoInputInfo?.workItemId}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("scheduleAutoInputInfo", "workItemId", value as number)
                    }
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
                errors={paidLeaveErrors}
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
                    value={tt?.paidLeaveInputInfo?.workItemId}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("paidLeaveInputInfo", "workItemId", value as number)
                    }
                    maxWidth="150px"
                    placeholder="WorkItemID"
                    disabled={!tt?.paidLeaveInputInfo?.enabled}
                />
                <AutoSettingItem
                    definition={paidLeaveInputInfoDef.startTime}
                    value={tt?.paidLeaveInputInfo?.startTime}
                    onChange={(value: unknown) =>
                        handleNestedUpdate("paidLeaveInputInfo", "startTime", value as string)
                    }
                    maxWidth="150px"
                    disabled={!tt?.paidLeaveInputInfo?.enabled}
                />
                <AutoSettingItem
                    definition={paidLeaveInputInfoDef.endTime}
                    value={tt?.paidLeaveInputInfo?.endTime}
                    onChange={(value: unknown) => handleNestedUpdate("paidLeaveInputInfo", "endTime", value as string)}
                    maxWidth="150px"
                    disabled={!tt?.paidLeaveInputInfo?.enabled}
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
        </>
    );
}
