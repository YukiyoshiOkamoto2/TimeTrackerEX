import type { Event, Schedule } from "@/types";

/**
 * スケジュールのユーティリティ関数
 */
export const ScheduleUtils = {
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
     * エラーがあるか判定
     */
    isError(schedule: Schedule): boolean {
        return schedule.errorMessage != null;
    },

    /**
     * 基準日を取得
     */
    getBaseDate(schedule: Schedule): Date {
        const date = schedule.start || schedule.end;
        if (!date) {
            throw new Error("Schedule has no start or end date");
        }
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },

    /**
     * 他のスケジュールと重複しているか判定
     */
    isOverlap(schedule: Schedule, other: Schedule): boolean {
        if (!schedule.start || !schedule.end || !other.start || !other.end) {
            return false;
        }

        const scheduleBaseDate = this.getBaseDate(schedule);
        const otherBaseDate = this.getBaseDate(other);

        if (scheduleBaseDate.getTime() !== otherBaseDate.getTime()) {
            return false;
        }

        const latestStart = Math.max(schedule.start.getTime(), other.start.getTime());
        const earliestEnd = Math.min(schedule.end.getTime(), other.end.getTime());

        return latestStart < earliestEnd;
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
 * UUID生成（ブラウザ互換）
 */
export function generateUUID(): string {
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
    return {
        uuid: generateUUID(),
        name,
        organizer,
        isPrivate,
        isCancelled,
        location,
        schedule,
        workingEventType,
    };
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
    if (isPaidLeave && !isHoliday) {
        throw new Error("有給休暇の場合は休日フラグを設定してください。");
    }

    if (end && start > end) {
        throw new Error("終了時間が開始時間より前です。");
    }

    return {
        start,
        end,
        isHoliday,
        isPaidLeave,
        errorMessage,
    };
}
