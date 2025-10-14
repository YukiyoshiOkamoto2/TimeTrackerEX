import { formatDateKey, isOverlapping, resetTime } from "@/lib/dateUtil";
import { EventSchema, isType, ScheduleSchema } from "@/schema/models";
import type { Event, Schedule, WorkItem, WorkItemChldren } from "@/types";

/**
 * スケジュールのユーティリティ関数
 */
export const ScheduleUtils = {
    /**
     * オブジェクトがSchedule型であるかをチェック
     *
     * @param obj - チェックする値
     * @returns Schedule型の場合はtrue
     */
    isSchedule(obj: unknown): obj is Schedule {
        return isType(ScheduleSchema, obj);
    },

    /**
     * スケジュールの範囲（時間差）を取得
     */
    getRange(schedule: Schedule): number | null {
        if (!schedule.start || !schedule.end) {
            return null;
        }
        return schedule.end.getTime() - schedule.start.getTime();
    },

    /**
     * 基準日を取得
     */
    getBaseDate(schedule: Schedule): Date {
        const date = schedule.start || schedule.end;
        if (!date) {
            throw new Error("Schedule has no start or end date");
        }
        return resetTime(date);
    },

    /**
     * 基準日のキー（YYYY-MM-DD形式）を取得
     */
    getBaseDateKey(schedule: Schedule): string {
        const baseDate = this.getBaseDate(schedule);
        return formatDateKey(baseDate);
    },

    /**
     * 他のスケジュールと重複しているか判定
     */
    isOverlap(schedule: Schedule, other: Schedule): boolean {
        if (!schedule.end || !other.end) {
            throw new Error(
                `スケジュールの重複判定で終了時間の存在しないスケジュールが渡されました。(a: ${ScheduleUtils.getText(schedule)}, b: ${ScheduleUtils.getText(other)})`,
            );
        }

        const scheduleBaseDate = this.getBaseDate(schedule);
        const otherBaseDate = this.getBaseDate(other);

        if (scheduleBaseDate.getTime() !== otherBaseDate.getTime()) {
            return false;
        }

        return isOverlapping(schedule.start, schedule.end, other.start, other.end);
    },

    /**
     * スケジュールのテキスト表現を取得
     */
    getText(schedule: Schedule): string {
        const text: string[] = [];
        const baseDate = this.getBaseDate(schedule);

        if (baseDate) {
            text.push(
                baseDate.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                }),
            );
        } else {
            text.push("日付未定");
        }

        if (schedule.isPaidLeave) {
            text.push("<有給休暇>");
        }
        if (!schedule.isPaidLeave && schedule.isHoliday) {
            text.push("【休日】");
        }

        if (schedule.start) {
            text.push(
                schedule.start.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            );
        } else {
            text.push("開始時間未定");
        }

        text.push("-");

        if (schedule.end) {
            if (schedule.start && schedule.end > baseDate) {
                text.push(
                    schedule.end.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        weekday: "short",
                    }),
                );
            }
            text.push(
                schedule.end.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            );
        } else {
            text.push("終了時間未定");
        }

        if (schedule.errorMessage) {
            text.push(`※${schedule.errorMessage}`);
        }

        return text.join(" ");
    },
};

/**
 * イベントのユーティリティ関数
 */
export const EventUtils = {
    /**
     * オブジェクトがEvent型であるかをチェック
     *
     * @param obj - チェックする値
     * @returns Event型の場合はtrue
     */
    isEvent(obj: unknown): obj is Event {
        return isType(EventSchema, obj);
    },

    /**
     * イベントのキーを生成
     */
    getKey(event: Event): string {
        return `${event.name || ""}_${event.organizer || ""}_${event.workingEventType || ""}_${event.isPrivate || "false"}`;
    },

    /**
     * 2つのイベントが同じか判定
     */
    isSame(event: Event, other: Event): boolean {
        return this.getKey(event) === this.getKey(other);
    },

    /**
     * 新しいスケジュールでイベントをコピー
     */
    scheduled(event: Event, newSchedule: Schedule, unique = false): Event {
        return {
            ...event,
            uuid: unique ? crypto.randomUUID() : event.uuid,
            schedule: newSchedule,
        };
    },

    /**
     * イベントのテキスト表現を取得
     */
    getText(event: Event): string {
        const text: string[] = [];

        if (event.isPrivate) {
            text.push("【非公開】");
        }
        if (event.isCancelled) {
            text.push("【キャンセル】");
        }
        if (event.name) {
            text.push(event.name);
        }
        if (event.organizer) {
            text.push(`（${event.organizer}）`);
        }

        text.push(" ");

        if (!event.recurrence) {
            text.push(ScheduleUtils.getText(event.schedule));
        } else {
            if (event.schedule.start) {
                text.push(
                    event.schedule.start.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                );
            } else {
                text.push("開始時間未定");
            }
            text.push("-");
            if (event.schedule.end) {
                text.push(
                    event.schedule.end.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                );
            } else {
                text.push("終了時間未定");
            }
            text.push(" ");
            text.push("[");
            text.push(
                event.recurrence
                    .map((dt) =>
                        dt.toLocaleDateString("ja-JP", {
                            month: "2-digit",
                            day: "2-digit",
                        }),
                    )
                    .join(","),
            );
            text.push("]");
        }

        return text.join("");
    },
};

/**
 *
 */
export const WorkItemUtils = {
    /**
     *
     * @param workItem
     * @returns
     */
    getText(workItem: WorkItemChldren) {
        const pathReplace = workItem.folderPath.split("/").pop() || "";
        const folderName = workItem.folderPath.replace("/" + pathReplace, "");
        return `${workItem.name} ( ${folderName} )`;
    },
    /**
     *
     * @param workItem
     * @returns
     */
    getMostNestChildren(workItem: WorkItem | WorkItem[]): WorkItemChldren[] {
        if (Array.isArray(workItem)) {
            return workItem.flatMap((item) => WorkItemUtils.getMostNestChildren(item));
        }
        if (workItem.subItems && workItem.subItems.length > 0) {
            return workItem.subItems.flatMap((s) => WorkItemUtils.getMostNestChildren(s));
        }
        return [workItem];
    },
    /**
     * WorkItemツリーを処理して、リーフノードでsubItemsが1つだけの場合は切り上げる
     * @param workItems 処理対象のWorkItem配列
     * @returns 処理済みのWorkItem配列
     */
    getTargetWorkItems(workItems: WorkItem[]): WorkItem[] {
        return workItems.flatMap((workItem) => {
            // subItemsがない場合はリーフノードなのでそのまま返す
            if (!workItem.subItems || workItem.subItems.length === 0) {
                return [workItem];
            }

            // subItemsを再帰的に処理
            const processedSubItems = WorkItemUtils.getTargetWorkItems(workItem.subItems);

            // 処理後のsubItemsが1つだけで、元のsubItemsが1つだけの場合は切り上げ
            if (workItem.subItems.length === 1 && processedSubItems.length === 1) {
                return processedSubItems;
            }

            // それ以外の場合は、処理済みのsubItemsを持つ新しいWorkItemを返す
            return [
                {
                    ...workItem,
                    subItems: processedSubItems,
                },
            ];
        });
    },
};

/**
 * UUID生成（ブラウザ互換）
 */
function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // フォールバック実装
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * イベントを作成
 */
export function createEvent(
    name: string,
    schedule: Schedule,
    organizer = "",
    location = "",
    isPrivate = false,
    isCancelled = false,
    workingEventType: Event["workingEventType"] = null,
): Event {
    return EventSchema.parse({
        uuid: generateUUID(),
        name,
        organizer,
        isPrivate,
        isCancelled,
        location,
        schedule,
        workingEventType,
    });
}

/**
 * スケジュールを作成
 */
export function createSchedule(
    start: Date,
    end: Date | null = null,
    isHoliday = false,
    isPaidLeave = false,
    errorMessage: string | null = null,
): Schedule {
    return ScheduleSchema.parse({
        start,
        end: end ?? undefined,
        isHoliday,
        isPaidLeave,
        errorMessage,
    });
}
