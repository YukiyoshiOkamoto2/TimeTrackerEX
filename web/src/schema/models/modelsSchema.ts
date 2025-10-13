/**
 * Models Schema Definition with Zod
 *
 * models.tsの型定義に対応するZodスキーマ定義です。
 * バリデーション、パース、型推論を提供します。
 */

import { z } from "zod";

/**
 * 勤務イベントタイプのスキーマ
 */
export const WorkingEventTypeSchema = z.enum(["start", "middle", "end"]);

/**
 * スケジュールのスキーマ
 *
 * @remarks
 * - 有給休暇の場合は休日フラグも設定する必要があります
 * - 開始時間が終了時間より後の場合はエラーとなります
 */
export const ScheduleSchema = z
    .object({
        /** スケジュールの開始時間 */
        start: z.date({
            required_error: "開始時間は必須です",
            invalid_type_error: "開始時間はDate型である必要があります",
        }),
        /** スケジュールの終了時間 */
        end: z
            .date({
                invalid_type_error: "終了時間はDate型である必要があります",
            })
            .optional(),
        /** 休日であるかどうか */
        isHoliday: z.boolean().optional().default(false),
        /** 有給休暇であるかどうか */
        isPaidLeave: z.boolean().optional().default(false),
        /** エラーメッセージ */
        errorMessage: z.string().nullable().optional(),
    })
    .refine(
        (data) => {
            // 終了時間が設定されている場合、開始時間より後である必要がある
            if (data.end && data.start) {
                return data.end >= data.start;
            }
            return true;
        },
        {
            message: "終了時間は開始時間より後である必要があります",
            path: ["end"],
        },
    )
    .refine(
        (data) => {
            // 有給休暇の場合は休日フラグも必要
            if (data.isPaidLeave) {
                return data.isHoliday === true;
            }
            return true;
        },
        {
            message: "有給休暇の場合は休日フラグも設定する必要があります",
            path: ["isPaidLeave"],
        },
    );

/**
 * イベントのスキーマ
 *
 * @remarks
 * - UUIDが設定されていない場合は自動生成されます
 * - スケジュールの開始時間または終了時間が未設定の場合はエラーとなります
 */
export const EventSchema = z.object({
    /** イベントの一意識別子 */
    uuid: z
        .string({
            error: "UUIDは必須です",
            invalid_type_error: "UUIDは文字列である必要があります",
        })
        .min(1, "UUIDは空文字列にできません"),
    /** イベント名 */
    name: z
        .string({
            required_error: "イベント名は必須です",
            invalid_type_error: "イベント名は文字列である必要があります",
        })
        .min(1, "イベント名は空文字列にできません"),
    /** イベントの主催者 */
    organizer: z.string({
        required_error: "主催者は必須です",
        invalid_type_error: "主催者は文字列である必要があります",
    }),
    /** イベントが非公開かどうか */
    isPrivate: z.boolean({
        required_error: "非公開フラグは必須です",
        invalid_type_error: "非公開フラグはboolean型である必要があります",
    }),
    /** イベントがキャンセルされているかどうか */
    isCancelled: z.boolean({
        required_error: "キャンセルフラグは必須です",
        invalid_type_error: "キャンセルフラグはboolean型である必要があります",
    }),
    /** イベントの場所 */
    location: z.string({
        required_error: "場所は必須です",
        invalid_type_error: "場所は文字列である必要があります",
    }),
    /** イベントのスケジュール */
    schedule: ScheduleSchema,
    /** イベントの繰り返し日程 */
    recurrence: z.array(z.date()).nullable().optional(),
    /** 勤務時間を示すタイプ */
    workingEventType: WorkingEventTypeSchema.nullable().optional(),
});

/**
 * プロジェクトのスキーマ
 */
export const ProjectSchema = z.object({
    /** プロジェクトのID */
    id: z
        .string({
            required_error: "IDは必須です",
            invalid_type_error: "IDは文字列である必要があります",
        })
        .min(1, "IDは空文字列にできません"),
    /** プロジェクト名 */
    name: z
        .string({
            required_error: "プロジェクト名は必須です",
            invalid_type_error: "プロジェクト名は文字列である必要があります",
        })
        .min(1, "プロジェクト名は空文字列にできません"),
    /** プロジェクトID */
    projectId: z
        .string({
            required_error: "プロジェクトIDは必須です",
            invalid_type_error: "プロジェクトIDは文字列である必要があります",
        })
        .min(1, "プロジェクトIDは空文字列にできません"),
    /** プロジェクト名 */
    projectName: z
        .string({
            required_error: "プロジェクト名は必須です",
            invalid_type_error: "プロジェクト名は文字列である必要があります",
        })
        .min(1, "プロジェクト名は空文字列にできません"),
    /** プロジェクトコード */
    projectCode: z
        .string({
            required_error: "プロジェクトコードは必須です",
            invalid_type_error: "プロジェクトコードは文字列である必要があります",
        })
        .min(1, "プロジェクトコードは空文字列にできません"),
});

/**
 * 作業項目の子要素のスキーマ
 */
export const WorkItemChildrenSchema = z.object({
    /** 作業項目の一意の識別子 */
    id: z
        .string({
            required_error: "IDは必須です",
            invalid_type_error: "IDは文字列である必要があります",
        })
        .min(1, "IDは空文字列にできません"),
    /** 作業項目の名前 */
    name: z
        .string({
            required_error: "作業項目名は必須です",
            invalid_type_error: "作業項目名は文字列である必要があります",
        })
        .min(1, "作業項目名は空文字列にできません"),
    /** 作業項目が属するフォルダの名前 */
    folderName: z.string({
        required_error: "フォルダ名は必須です",
        invalid_type_error: "フォルダ名は文字列である必要があります",
    }),
    /** 作業項目が属するフォルダのパス */
    folderPath: z.string({
        required_error: "フォルダパスは必須です",
        invalid_type_error: "フォルダパスは文字列である必要があります",
    }),
});

/**
 * 作業項目のスキーマ（再帰的）
 */
export const WorkItemSchema: z.ZodType<{
    id: string;
    name: string;
    folderName: string;
    folderPath: string;
    subItems?: Array<{
        id: string;
        name: string;
        folderName: string;
        folderPath: string;
        subItems?: unknown;
    }> | null;
}> = WorkItemChildrenSchema.extend({
    /** サブ作業項目のリスト */
    subItems: z.lazy(() => z.array(WorkItemSchema).nullable().optional()),
});

/**
 * 日次タスクのスキーマ
 */
export const DayTaskSchema = z.object({
    /** 基準日 */
    baseDate: z.date({
        required_error: "基準日は必須です",
        invalid_type_error: "基準日はDate型である必要があります",
    }),
    /** 通常イベントのリスト */
    events: z.array(EventSchema),
    /** 勤務時間イベントのリスト */
    scheduleEvents: z.array(EventSchema),
});

/**
 * RoundingMethodのスキーマ
 */
export const RoundingMethodSchema = z.enum(["backward", "forward", "round", "half", "stretch", "nonduplicate"]);

/**
 * TimeCompareのスキーマ
 */
export const TimeCompareSchema = z.enum(["small", "large"]);

/**
 * イベント入力情報のスキーマ
 */
export const EventInputInfoSchema = z.object({
    /** 重複時の時間比較方法（短い順/長い順） */
    eventDuplicateTimeCompare: TimeCompareSchema,
    /** 時間の丸め処理タイプ */
    roundingTimeType: RoundingMethodSchema,
});

/**
 * イベントと作業項目のペアのスキーマ
 */
export const EventWorkItemPairSchema = z.object({
    /** イベント情報 */
    event: EventSchema,
    /** 作業項目情報 */
    workItem: WorkItemSchema,
});

/**
 * TimeTracker日次タスクのスキーマ
 */
export const TimeTrackerDayTaskSchema = z.object({
    /** 基準日 */
    baseDate: z.date({
        required_error: "基準日は必須です",
        invalid_type_error: "基準日はDate型である必要があります",
    }),
    /** プロジェクト情報 */
    project: ProjectSchema,
    /** イベントと作業項目のペアのリスト */
    eventWorkItemPair: z.array(EventWorkItemPairSchema),
});

/**
 * 型推論用の型定義
 */
export type WorkingEventType = z.infer<typeof WorkingEventTypeSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type WorkItemChildren = z.infer<typeof WorkItemChildrenSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type DayTask = z.infer<typeof DayTaskSchema>;
export type RoundingMethod = z.infer<typeof RoundingMethodSchema>;
export type TimeCompare = z.infer<typeof TimeCompareSchema>;
export type EventInputInfo = z.infer<typeof EventInputInfoSchema>;
export type EventWorkItemPair = z.infer<typeof EventWorkItemPairSchema>;
export type TimeTrackerDayTask = z.infer<typeof TimeTrackerDayTaskSchema>;

/**
 * 日付フォーマット定数
 */
export const DAY_FORMAT = "yyyy/MM/dd (EEE)";

/**
 * 時刻フォーマット定数
 */
export const TIME_FORMAT = "HH:mm";
