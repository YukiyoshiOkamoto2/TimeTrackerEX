/**
 * TimeTracker EX - Model Type Definitions
 *
 * このモジュールは、Pythonのmodel.pyをTypeScriptに移植した型定義です。
 * スケジュール、イベント、プロジェクト、作業項目などのデータ構造を定義します。
 */

import {
    EventSchema,
    ProjectSchema,
    ScheduleSchema,
    WorkingEventTypeSchema,
    WorkItemChildrenSchema,
    WorkItemSchema,
} from "@/schema";
import z from "zod";

/**
 * 勤務イベントタイプ
 * - start: 勤務開始
 * - middle: 勤務中
 * - end: 勤務終了
 */
export type WorkingEventType = z.infer<typeof WorkingEventTypeSchema>;

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
export type Schedule = z.infer<typeof ScheduleSchema>;

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
export type Event = z.infer<typeof EventSchema>;

/**
 * プロジェクトを表すインターフェース
 *
 * @property id - プロジェクトのID
 * @property name - プロジェクト名
 * @property projectId - プロジェクトID
 * @property projectName - プロジェクト名
 * @property projectCode - プロジェクトコード
 */
export type Project = z.infer<typeof ProjectSchema>;

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
export type WorkItemChldren = z.infer<typeof WorkItemChildrenSchema>;

export type WorkItem = z.infer<typeof WorkItemSchema>;
