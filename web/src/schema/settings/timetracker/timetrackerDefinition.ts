/**
 * TimeTracker Settings Definition
 *
 * TimeTrackerの設定項目定義です。
 */

import {
    EventDuplicatePriority,
    IgnorableEventPattern,
    PaidLeaveInputInfo,
    ScheduleAutoInputInfo,
    TimeOffEventConfig,
    TimeOffEventPattern,
    TimeTrackerSettings,
} from "@/types";
import {
    ArraySettingValueInfoTyped,
    BooleanSettingValueInfo,
    NumberSettingValueInfo,
    ObjectSettingValueInfoTyped,
    StringSettingValueInfo,
} from "../settingsDefinition";

/**
 * 休暇イベントの設定定義
 */
export const TIMETRACKER_TIME_OFF_EVNT_SETTINGS_DEFINITION = new ObjectSettingValueInfoTyped<TimeOffEventConfig>({
    name: "休暇イベントの設定",
    description: "休暇イベントとして扱うイベント名のパターンとWorkItemIDの設定",
    required: false,
    children: {
        namePatterns: new ArraySettingValueInfoTyped<ObjectSettingValueInfoTyped<TimeOffEventPattern>>({
            name: "休暇イベント名パターン",
            description: "休暇イベントとして扱うイベント名のパターンとマッチモードのリスト",
            required: true,
            itemType: "object",
            itemSchema: new ObjectSettingValueInfoTyped<TimeOffEventPattern>({
                name: "パターン設定",
                description: "イベント名のパターンとマッチモード",
                required: true,
                children: {
                    pattern: new StringSettingValueInfo({
                        name: "パターン",
                        description: "イベント名のパターン",
                        required: true,
                        minLength: 1,
                        disableEmpty: true,
                    }),
                    matchMode: new StringSettingValueInfo({
                        name: "一致モード",
                        description: "パターンの一致モード(partial: 部分一致, prefix: 前方一致, suffix: 後方一致)",
                        required: true,
                        defaultValue: "partial",
                        literals: ["partial", "prefix", "suffix"],
                    }),
                },
            }),
            minItems: 1,
        }),
        workItemId: new NumberSettingValueInfo({
            name: "休暇WorkItemID",
            description: "休暇として登録するWorkItemのID",
            required: true,
            integer: true,
            positive: true,
        }),
    },
});

/**
 * 無視可能イベントの設定定義
 */
export const TIMETRACKER_IGNORABLE_EVENTS = new ArraySettingValueInfoTyped<
    ObjectSettingValueInfoTyped<IgnorableEventPattern>
>({
    name: "無視可能イベント",
    description: "処理から除外するイベント名のパターンとマッチモードのリスト",
    required: false,
    itemType: "object",
    itemSchema: new ObjectSettingValueInfoTyped<IgnorableEventPattern>({
        name: "パターン設定",
        description: "イベント名のパターンとマッチモード",
        required: true,
        children: {
            pattern: new StringSettingValueInfo({
                name: "パターン",
                description: "イベント名のパターン",
                required: true,
                minLength: 1,
                disableEmpty: true,
            }),
            matchMode: new StringSettingValueInfo({
                name: "一致モード",
                description: "パターンの一致モード(partial: 部分一致, prefix: 前方一致, suffix: 後方一致)",
                required: true,
                defaultValue: "partial",
                literals: ["partial", "prefix", "suffix"],
            }),
        },
    }),
    minItems: 1,
});

/**
 * イベント重複時の優先判定設定
 */
export const TIMETRACKER_EVENT_DUPLICATE_PRIORITY = new ObjectSettingValueInfoTyped<EventDuplicatePriority>({
    name: "イベント重複時の優先判定",
    description: "イベントが重複した場合の優先度判定方法",
    required: true,
    children: {
        timeCompare: new StringSettingValueInfo({
            name: "時間の比較による優先度判定",
            description: `イベントの時間の比較による優先度判定
- small: 時間が短いイベントを優先(より細かく登録)
- large: 時間が長いイベントを優先(より大きく登録)`,
            required: true,
            defaultValue: "small",
            literals: ["small", "large"],
        }),
    },
});

/**
 * 勤務時間の自動入力設定
 */
export const TIMETRACKER_SCHEDULE_AUTO_INPUT_INFO = new ObjectSettingValueInfoTyped<ScheduleAutoInputInfo>({
    name: "勤務時間の自動入力設定",
    description: "勤務開始・終了時間を自動入力する設定",
    required: true,
    children: {
        startEndType: new StringSettingValueInfo({
            name: "開始終了時間の自動入力タイプ",
            description: `勤務時間の開始終了時間の自動入力タイプ
- both: 開始・終了時間を自動入力
- start: 開始時間のみ自動入力
- end: 終了時間のみ自動入力
- fill: 開始・終了時間の間でイベントと重複しない時間を自動入力`,
            required: true,
            defaultValue: "both",
            literals: ["both", "start", "end", "fill"],
        }),
        roundingTimeTypeOfSchedule: new StringSettingValueInfo({
            name: "勤務時間の丸め方法",
            description: `30分単位での勤務時間の丸め方法
- backward: 切り上げ
- forward: 切り捨て
- round: 短くなるように丸める
- half: 15分未満は0分に、15分以上は30分に
- stretch: 長くなるように丸める`,
            required: true,
            defaultValue: "half",
            literals: ["backward", "forward", "round", "half", "stretch"],
        }),
        startEndTime: new NumberSettingValueInfo({
            name: "自動入力時間(分)",
            description: "勤務開始・終了時間として自動入力する時間(分)",
            required: true,
            defaultValue: 30,
            literals: [30, 60, 90],
        }),
        workItemId: new NumberSettingValueInfo({
            name: "自動入力WorkItemID",
            description: "勤務時間として登録するWorkItemのID",
            required: true,
            integer: true,
            positive: true,
        }),
    },
});

/**
 * 有給休暇の自動入力設定
 */
export const TIMETRACKER_PAID_LEAVE_INPUT_INFO = new ObjectSettingValueInfoTyped<PaidLeaveInputInfo>({
    name: "有給休暇の自動入力設定",
    description: "有給休暇を自動入力する設定(オブジェクトが存在する場合に有効)",
    required: false,
    children: {
        workItemId: new NumberSettingValueInfo({
            name: "有給休暇のWorkItemID",
            description: "有給休暇として登録するWorkItemのID",
            required: true,
            integer: true,
            positive: true,
        }),
        startTime: new StringSettingValueInfo({
            name: "有給休暇の開始時間",
            description: "有給休暇の開始時間(HH:MM形式)",
            required: true,
            defaultValue: "09:00",
            pattern: /^\d{2}:\d{2}$/,
        }),
        endTime: new StringSettingValueInfo({
            name: "有給休暇の終了時間",
            description: "有給休暇の終了時間(HH:MM形式)",
            required: true,
            defaultValue: "17:30",
            pattern: /^\d{2}:\d{2}$/,
        }),
    },
});

/**
 * TimeTracker設定定義
 */
export const TIMETRACKER_SETTINGS_DEFINITION = new ObjectSettingValueInfoTyped<TimeTrackerSettings>({
    name: "TimeTracker設定",
    description: "TimeTrackerに関する設定",
    required: true,
    disableUnknownField: true,
    children: {
        userName: new StringSettingValueInfo({
            name: "ユーザー名(ログイン名)",
            description: "TimeTrackerにログインするためのユーザー名",
            required: true,
            minLength: 1,
            disableEmpty: true,
        }),

        baseUrl: new StringSettingValueInfo({
            name: "TimeTrackerのベースURL",
            description: "TimeTrackerのベースURL(例: https://timetracker.example.com)",
            defaultValue: "http://10.148.28.156/TimeTrackerNX/api",
            required: true,
            isUrl: true,
            disableEmpty: true,
        }),

        baseProjectId: new NumberSettingValueInfo({
            name: "プロジェクトID",
            description: "作業を登録するプロジェクトのID",
            defaultValue: 62368,
            required: true,
            integer: true,
            positive: true,
        }),

        isHistoryAutoInput: new BooleanSettingValueInfo({
            name: "履歴からのスケジュール自動入力",
            description: "過去の履歴から自動的にスケジュールを入力するかどうか",
            required: true,
            defaultValue: true,
        }),

        roundingTimeTypeOfEvent: new StringSettingValueInfo({
            name: "イベント時間の丸め方法",
            description: `30分単位でのイベント時間の丸め方法を設定します。
- backward: 開始終了時間を切り上げる
- forward: 開始終了時間を切り捨て
- round: 短くなるように丸める
- half: 15分未満は0分に、15分以上は30分に
- stretch: 長くなるように丸める
- nonduplicate: 重複しない場合は長く、重複する場合は短く`,
            required: true,
            defaultValue: "nonduplicate",
            literals: ["backward", "forward", "round", "half", "stretch", "nonduplicate"],
        }),
        timeOffEvent: TIMETRACKER_TIME_OFF_EVNT_SETTINGS_DEFINITION,
        ignorableEvents: TIMETRACKER_IGNORABLE_EVENTS,
        eventDuplicatePriority: TIMETRACKER_EVENT_DUPLICATE_PRIORITY,
        scheduleAutoInputInfo: TIMETRACKER_SCHEDULE_AUTO_INPUT_INFO,
        paidLeaveInputInfo: TIMETRACKER_PAID_LEAVE_INPUT_INFO,
    },
});
