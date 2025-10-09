/**
 * TimeTracker Data Transform Service
 *
 * すべてのデータ変換処理を統合したサービス
 * - DayTask → ScheduleItem変換
 * - WorkItem → ItemCodeOption変換
 * - LinkingResult → 表示用Row変換
 * - 統計情報計算
 */

import { getLogger } from "@/lib/logger";
import type { DayTask, Event, EventWorkItemPair, WorkItem } from "@/types";
import type { ItemCodeOption, ScheduleItem } from "../components";
import { AutoLinkingResult } from "../models/linking";
import { LinkedEventRow, TargetEventRow, UnlinkedEventRow } from "../models/table";

const logger = getLogger("DataTransform");

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

/**
 * 対象イベントデータを行データに変換
 */
export function convertTargetEventsToRows(
    linkingResult: AutoLinkingResult | null,
    dayTasks: DayTask[],
): TargetEventRow[] {
    if (!linkingResult || dayTasks.length === 0) return [];

    const allProcessedEvents = dayTasks.flatMap((task) => [...task.events, ...task.scheduleEvents]);
    const targetEvents = allProcessedEvents.filter((event) => !event.schedule.isPaidLeave);
    const linkedEventUuids = new Set(linkingResult.linked.map((pair) => pair.event.uuid));
    const unlinkedEventUuids = new Set(linkingResult.unlinked.map((event) => event.uuid));

    return targetEvents.map((event) => {
        const originalUuid = (event as any).originalUuid || event.uuid;
        const status = linkedEventUuids.has(originalUuid)
            ? "紐づけ済み"
            : unlinkedEventUuids.has(originalUuid)
              ? "未紐づけ"
              : "不明";

        return {
            id: event.uuid,
            name: event.name || "無題",
            startTime: new Date(event.schedule.start).toLocaleString("ja-JP", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            endTime: event.schedule.end
                ? new Date(event.schedule.end).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : "-",
            status,
        };
    });
}

/**
 * 紐付け済みイベントデータを行データに変換
 */
export function convertLinkedEventsToRows(
    linkingResult: AutoLinkingResult,
    manuallyLinkedPairs: EventWorkItemPair[],
): LinkedEventRow[] {
    const rows: LinkedEventRow[] = [];
    let historyCount = 0;

    for (const pair of linkingResult.linked) {
        const isTimeOff = pair.event.name?.includes("有給") || pair.event.name?.includes("休暇");
        let source: string;

        if (isTimeOff) {
            source = "休暇";
        } else if (historyCount < 1) {
            source = "履歴";
            historyCount++;
        } else {
            source = "自動";
        }

        rows.push({
            id: `auto-${pair.event.uuid}`,
            eventName: pair.event.name || "無題",
            startTime: new Date(pair.event.schedule.start).toLocaleString("ja-JP"),
            endTime: pair.event.schedule.end ? new Date(pair.event.schedule.end).toLocaleString("ja-JP") : "-",
            workItemName: pair.linkingWorkItem.workItem.name,
            source,
        });
    }

    for (const pair of manuallyLinkedPairs) {
        rows.push({
            id: `manual-${pair.event.uuid}`,
            eventName: pair.event.name || "無題",
            startTime: new Date(pair.event.schedule.start).toLocaleString("ja-JP"),
            endTime: pair.event.schedule.end ? new Date(pair.event.schedule.end).toLocaleString("ja-JP") : "-",
            workItemName: pair.workItem.name,
            source: "手動",
        });
    }

    return rows;
}

/**
 * 未紐付けイベントデータを行データに変換
 */
export function convertUnlinkedEventsToRows(
    linkingResult: AutoLinkingResult | null,
    selectedWorkItems: Map<string, string>,
): UnlinkedEventRow[] {
    if (!linkingResult) return [];

    return linkingResult.unlinked.map((event) => ({
        id: event.uuid,
        eventName: event.name || "無題",
        startTime: new Date(event.schedule.start).toLocaleString("ja-JP"),
        endTime: event.schedule.end ? new Date(event.schedule.end).toLocaleString("ja-JP") : "-",
        selectedWorkItemId: selectedWorkItems.get(event.uuid),
    }));
}
