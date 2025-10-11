/**
 * TimeTracker EX - Settings Type Definitions
 *
 * 設定関連の型定義です。
 */

/** 丸め方法 */
export type RoundingMethod = "backward" | "forward" | "round" | "half" | "stretch" | "nonduplicate";

/** 開始終了タイプ */
export type StartEndType = "both" | "start" | "end" | "fill";

/** 時間比較タイプ */
export type TimeCompare = "small" | "large";

/** 一致モード */
export type MatchMode = "partial" | "prefix" | "suffix";

/** テーマモード */
export type ThemeMode = "light" | "dark" | "system";

/** 言語 */
export type Language = "ja";

/** イベントパターン（共通） */
export interface EventPattern {
    /** パターン文字列 */
    pattern: string;
    /** 一致モード */
    matchMode: MatchMode;
}

/** 無視可能イベントのパターン */
export interface IgnorableEventPattern extends EventPattern {}

/** 休暇イベントのパターン */
export interface TimeOffEventPattern extends EventPattern {}

/** 休暇イベント設定 */
export interface TimeOffEventConfig {
    /** イベント名のパターンリスト */
    namePatterns: TimeOffEventPattern[];
    /** WorkItemID */
    workItemId: number;
}

/** イベント重複時の優先判定 */
export interface EventDuplicatePriority {
    /** 時間の比較による優先度判定 */
    timeCompare: TimeCompare;
}

/** 勤務時間の自動入力設定 */
export interface ScheduleAutoInputInfo {
    /** 開始終了時間の自動入力タイプ */
    startEndType: StartEndType;
    /** 勤務時間の丸め方法 */
    roundingTimeType: Exclude<RoundingMethod, "nonduplicate">;
    /** 自動入力時間（分） */
    startEndTime: number;
    /** WorkItemID */
    workItemId: number;
}

/** 有給休暇の自動入力設定 */
export interface PaidLeaveInputInfo {
    /** WorkItemID */
    workItemId: number;
    /** 開始時間（HH:MM形式） */
    startTime: string;
    /** 終了時間（HH:MM形式） */
    endTime: string;
}

/** TimeTracker設定 */
export interface TimeTrackerSettings {
    /** ユーザー名(ログイン名) */
    userName: string;
    /** TimeTrackerのベースURL */
    baseUrl: string;
    /** プロジェクトID (無効な場合はnull) */
    baseProjectId: number;
    /** 履歴からのスケジュール自動入力 */
    isHistoryAutoInput?: boolean;
    /** イベント時間の丸め方法 */
    roundingTimeTypeOfEvent: RoundingMethod;
    /** 休暇イベントの設定 */
    timeOffEvent?: TimeOffEventConfig;
    /** 無視可能イベント（パターンと一致モード） */
    ignorableEvents?: IgnorableEventPattern[];
    /** イベント重複時の優先判定 */
    eventDuplicatePriority: EventDuplicatePriority;
    /** 勤務時間の自動入力設定 */
    scheduleAutoInputInfo: ScheduleAutoInputInfo;
    /** 有給休暇の自動入力設定 */
    paidLeaveInputInfo?: PaidLeaveInputInfo;
}

/** 一般設定 */
export interface GeneralSettings {
    /** 言語 */
    language: Language;
}

/** 外観設定 */
export interface AppearanceSettings {
    /** テーマモード */
    theme: ThemeMode;
}

/** アプリケーション設定 */
export interface AppSettings {
    /** 一般設定 */
    general: GeneralSettings;
    /** 外観設定 */
    appearance: AppearanceSettings;
    /** TimeTracker設定 */
    timetracker: TimeTrackerSettings;
}
