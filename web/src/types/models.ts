/**
 * TimeTracker EX - Model Type Definitions
 *
 * このモジュールは、Pythonのmodel.pyをTypeScriptに移植した型定義です。
 * スケジュール、イベント、プロジェクト、作業項目などのデータ構造を定義します。
 */

import type { RoundingMethod, StartEndType, TimeCompare } from "./settings";

/**
 * 勤務イベントタイプ
 * - start: 勤務開始
 * - middle: 勤務中
 * - end: 勤務終了
 */
export type WorkingEventType = "start" | "middle" | "end";

/**
 * スケジュールを表すインターフェース
 *
 * @property start - スケジュールの開始時間
 * @property end - スケジュールの終了時間（オプション）
 * @property isHoliday - 休日であるかどうかを示すフラグ（デフォルト: false）
 * @property isPaidLeave - 有給休暇であるかどうかを示すフラグ（デフォルト: false）
 * @property errorMessage - エラーメッセージ（オプション）
 *
 * @remarks
 * - 有給休暇の場合は休日フラグも設定する必要があります
 * - 開始時間が終了時間より後の場合はエラーとなります
 */
export interface Schedule {
    /** スケジュールの開始時間 */
    start: Date;
    /** スケジュールの終了時間 */
    end?: Date;
    /** 休日であるかどうか */
    isHoliday?: boolean;
    /** 有給休暇であるかどうか */
    isPaidLeave?: boolean;
    /** エラーメッセージ */
    errorMessage?: string | null;
}

/**
 * イベントを表すインターフェース
 *
 * @property uuid - イベントの一意識別子
 * @property name - イベント名
 * @property organizer - イベントの主催者
 * @property isPrivate - イベントが非公開かどうか
 * @property isCancelled - イベントがキャンセルされているかどうか
 * @property location - イベントの場所
 * @property schedule - イベントのスケジュール
 * @property recurrence - イベントの繰り返し日程（オプション）
 * @property workingEventType - 勤務時間を示すタイプ（オプション）
 *
 * @remarks
 * - UUIDが設定されていない場合は自動生成されます
 * - スケジュールの開始時間または終了時間が未設定の場合はエラーとなります
 */
export interface Event {
    /** イベントの一意識別子 */
    uuid: string;
    /** イベント名 */
    name: string;
    /** イベントの主催者 */
    organizer: string;
    /** イベントが非公開かどうか */
    isPrivate: boolean;
    /** イベントがキャンセルされているかどうか */
    isCancelled: boolean;
    /** イベントの場所 */
    location: string;
    /** イベントのスケジュール */
    schedule: Schedule;
    /** イベントの繰り返し日程 */
    recurrence?: Date[] | null;
    /** 勤務時間を示すタイプ */
    workingEventType?: WorkingEventType | null;
}

/**
 * プロジェクトを表すインターフェース
 *
 * @property id - プロジェクトのID
 * @property name - プロジェクト名
 * @property projectId - プロジェクトID
 * @property projectName - プロジェクト名
 * @property projectCode - プロジェクトコード
 */
export interface Project {
    /** プロジェクトのID */
    id: string;
    /** プロジェクト名 */
    name: string;
    /** プロジェクトID */
    projectId: string;
    /** プロジェクト名 */
    projectName: string;
    /** プロジェクトコード */
    projectCode: string;
}

/**
 * 作業項目を表すインターフェース
 *
 * @property id - 作業項目の一意の識別子
 * @property name - 作業項目の名前
 * @property folderName - 作業項目が属するフォルダの名前
 * @property folderPath - 作業項目が属するフォルダのパス
 * @property subItems - サブ作業項目のリスト（オプション）
 *
 * @remarks
 * - get_most_nest_children()メソッドで最も深い階層にある子作業項目を取得できます
 */
export interface WorkItemChldren {
    /** 作業項目の一意の識別子 */
    id: string;
    /** 作業項目の名前 */
    name: string;
    /** 作業項目が属するフォルダの名前 */
    folderName: string;
    /** 作業項目が属するフォルダのパス */
    folderPath: string;
}

export interface WorkItem extends WorkItemChldren {
    /** サブ作業項目のリスト */
    subItems?: WorkItem[] | null;
}

/**
 * 日次タスクを表すインターフェース
 *
 * @property baseDate - 基準日
 * @property project - プロジェクト情報
 * @property events - 通常イベントのリスト
 * @property scheduleEvents - 勤務時間イベントのリスト
 */
export interface DayTask {
    /** 基準日 */
    baseDate: Date;
    /** プロジェクト情報 */
    project: Project;
    /** 通常イベントのリスト */
    events: Event[];
    /** 勤務時間イベントのリスト */
    scheduleEvents: Event[];
}

/**
 * イベント入力情報を表すインターフェース
 *
 * @property eventDuplicateTimeCompare - 重複時の時間比較方法
 * @property roundingTimeType - 時間の丸め処理タイプ
 */
export interface EventInputInfo {
    /** 重複時の時間比較方法（短い順/長い順） */
    eventDuplicateTimeCompare: TimeCompare;
    /** 時間の丸め処理タイプ */
    roundingTimeType: RoundingMethod;
}

/**
 * スケジュール入力情報を表すインターフェース
 *
 * @property roundingTimeType - 時間の丸め処理タイプ（nonduplicateを除く）
 * @property startEndType - 開始・終了の処理タイプ
 * @property startEndTime - 開始・終了時間（分単位）
 */
export interface ScheduleInputInfo {
    /** 時間の丸め処理タイプ */
    roundingTimeType: Exclude<RoundingMethod, "nonduplicate">;
    /** 開始・終了の処理タイプ */
    startEndType: StartEndType;
    /** 開始・終了時間（分単位） */
    startEndTime: number;
}

/**
 * イベントと作業項目のペアを表すインターフェース
 *
 * @property event - イベント情報
 * @property workItem - 作業項目情報
 */
export interface EventWorkItemPair {
    /** イベント情報 */
    event: Event;
    /** 作業項目情報 */
    workItem: WorkItem;
}

/**
 * TimeTracker日次タスクを表すインターフェース
 *
 * @property baseDate - 基準日
 * @property project - プロジェクト情報
 * @property eventWorkItemPair - イベントと作業項目のペアのリスト
 */
export interface TimeTrackerDayTask {
    /** 基準日 */
    baseDate: Date;
    /** プロジェクト情報 */
    project: Project;
    /** イベントと作業項目のペアのリスト */
    eventWorkItemPair: EventWorkItemPair[];
}

/**
 * 日付フォーマット定数
 */
export const DAY_FORMAT = "yyyy/MM/dd (EEE)";

/**
 * 時刻フォーマット定数
 */
export const TIME_FORMAT = "HH:mm";

/**
 * ユーティリティ関数のエクスポート
 */
export { createEvent, createSchedule, EventUtils, generateUUID, ScheduleUtils } from "./utils";
