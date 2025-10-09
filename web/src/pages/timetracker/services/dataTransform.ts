/**
 * Data Transform Service
 *
 * DayTaskとScheduleItem間のデータ変換を行うサービス
 */

import { getLogger } from "@/lib/logger";
import type { DayTask, Event, WorkItem } from "@/types";
import type { ItemCodeOption, ScheduleItem } from "../components";

const logger = getLogger("dataTransform");

/**
 * DayTaskをScheduleItemに変換
 *
 * @param dayTasks - 日ごとのタスクリスト
 * @returns ScheduleItemの配列
 */
export function convertDayTasksToScheduleItems(dayTasks: DayTask[]): ScheduleItem[] {
    const scheduleItems: ScheduleItem[] = [];

    logger.info(`DayTask変換開始: ${dayTasks.length}日分`);

    for (const dayTask of dayTasks) {
        const dateStr = formatDate(dayTask.baseDate);

        // 通常イベントを変換
        for (const event of dayTask.events) {
            const item = convertEventToScheduleItem(event, dateStr);
            if (item) {
                scheduleItems.push(item);
            }
        }

        // スケジュールイベント（勤務時間）を変換
        for (const scheduleEvent of dayTask.scheduleEvents) {
            const item = convertEventToScheduleItem(scheduleEvent, dateStr);
            if (item) {
                scheduleItems.push(item);
            }
        }
    }

    logger.info(`DayTask変換完了: ${dayTasks.length}日分 → ${scheduleItems.length}件のScheduleItem`);
    return scheduleItems;
}

/**
 * EventをScheduleItemに変換
 *
 * @param event - イベント
 * @param dateStr - 日付文字列
 * @returns ScheduleItem または null（変換失敗時）
 */
function convertEventToScheduleItem(event: Event, dateStr: string): ScheduleItem | null {
    try {
        const startTime = event.schedule.start;
        const endTime = event.schedule.end;

        if (!startTime) {
            logger.warn(`イベント "${event.name}" の開始時刻が不明です`);
            return null;
        }

        const timeStr = formatTimeRange(startTime, endTime);

        return {
            date: dateStr,
            time: timeStr,
            name: event.name || "無題",
            organizer: event.organizer || "",
            itemCode: undefined, // CompletionViewで編集可能
        };
    } catch (error) {
        logger.error(`イベント変換エラー: ${event.name}`, error);
        return null;
    }
}

/**
 * 日付をフォーマット
 *
 * @param date - Date
 * @returns "2024/01/15" 形式
 */
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
}

/**
 * 時刻範囲をフォーマット
 *
 * @param start - 開始時刻
 * @param end - 終了時刻
 * @returns "09:00-10:30" 形式
 */
function formatTimeRange(start: Date, end?: Date): string {
    const startStr = formatTime(start);

    if (!end) {
        return startStr;
    }

    const endStr = formatTime(end);
    return `${startStr}-${endStr}`;
}

/**
 * 時刻をフォーマット
 *
 * @param date - Date
 * @returns "09:00" 形式
 */
function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * WorkItemからItemCodeOptionを生成
 *
 * @param workItems - WorkItemの配列
 * @returns ItemCodeOptionの配列
 */
export function generateItemCodeOptions(workItems: WorkItem[]): ItemCodeOption[] {
    logger.info(`ItemCodeOptions生成: ${workItems.length}件`);

    return workItems.map((item) => ({
        code: item.id,
        name: item.name,
    }));
}
