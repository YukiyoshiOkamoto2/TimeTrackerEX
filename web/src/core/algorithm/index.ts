/**
 * TimeTracker Algorithm Core Module
 *
 * このモジュールは、PythonのTimeTrackerアルゴリズムをTypeScriptに移植したものです。
 * イベントとスケジュールの処理、時間の丸め処理、重複解消などの機能を提供します。
 */
export { TimeTrackerAlgorithm } from "./algorithm";

// Core functionality - 時間丸め、チェック処理
export {
    MAX_OLD,
    MAX_TIME,
    ROUNDING_TIME_UNIT,
    checkEvent,
    roundingSchedule,
    roundingTime,
} from "./TimeTrackerAlgorithmCore";

// Event operations - イベント操作(重複解消、検索、統合)
export { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

// Schedule operations - スケジュール処理
export { TimeTrackerAlgorithmSchedule } from "./TimeTrackerAlgorithmSchedule";

// Legacy compatibility - 後方互換性のためTimeTrackerAlgorithmEventをTimeTrackerAlgorithmHelperとしても公開
export { TimeTrackerAlgorithmEvent as TimeTrackerAlgorithmHelper } from "./TimeTrackerAlgorithmEvent";
