/**
 * LinkingProcessView用のデータ変換ロジック
 *
 * UIコンポーネントとビジネスロジックを分離するため、
 * データ変換処理を独立した関数として定義
 */

import type { DayTask, EventWorkItemPair, Schedule } from "@/types";
import type {
    AutoLinkingResult,
    ExcludedEventRow,
    ExcludedStats,
    LinkedEventRow,
    PaidLeaveRow,
    TargetEventRow,
    UnlinkedEventRow,
} from "../models";

/**
 * 有給休暇データを行データに変換
 */
export function convertPaidLeaveToRows(schedules: Schedule[]): PaidLeaveRow[] {
    return schedules
        .filter((s) => s.isPaidLeave)
        .map((s, index) => {
            const date = new Date(s.start);
            const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
            return {
                id: `paid-${index}`,
                date: date.toLocaleDateString("ja-JP"),
                dayOfWeek: `(${dayOfWeek})`,
            };
        });
}

/**
 * 対象イベントデータを行データに変換
 */
export function convertTargetEventsToRows(
    linkingResult: AutoLinkingResult | null,
    dayTasks: DayTask[],
): TargetEventRow[] {
    if (!linkingResult || dayTasks.length === 0) return [];

    // dayTasksから全イベントを取得（通常イベント + 勤務時間変換イベント）
    const allProcessedEvents = dayTasks.flatMap((task) => [...task.events, ...task.scheduleEvents]);

    // 有給休暇イベントを除外
    const targetEvents = allProcessedEvents.filter((event) => !event.schedule.isPaidLeave);

    // 紐づけ済みイベントのUUIDセットを作成
    const linkedEventUuids = new Set(linkingResult.linked.map((pair) => pair.event.uuid));
    const unlinkedEventUuids = new Set(linkingResult.unlinked.map((event) => event.uuid));

    return targetEvents.map((event) => {
        // 元のイベントUUIDで紐づけ状態を判定
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
    linkingResult: AutoLinkingResult | null,
    manuallyLinkedPairs: EventWorkItemPair[],
): LinkedEventRow[] {
    if (!linkingResult) return [];

    const rows: LinkedEventRow[] = [];

    // 自動紐付けイベント（timeOffCountとhistoryCountを使って判定）
    let historyCount = 0;
    for (const pair of linkingResult.linked) {
        // 有給・休暇イベントかどうかを判定
        const isTimeOff = pair.event.name?.includes("有給") || pair.event.name?.includes("休暇");

        // 履歴からの紐付けかどうかを判定（timeOffでない場合で、historyCountがまだ残っている場合）
        let source: string;
        if (isTimeOff) {
            source = "休暇";
        } else if (historyCount < linkingResult.historyCount) {
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
            workItemName: pair.workItem.name,
            source,
        });
    }

    // 手動紐付けイベント
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

/**
 * 除外イベントデータを行データに変換
 */
export function convertExcludedEventsToRows(linkingResult: AutoLinkingResult | null): ExcludedEventRow[] {
    if (!linkingResult) return [];

    return linkingResult.excluded.map((info) => ({
        id: info.event.uuid,
        name: info.event.name || "無題",
        startTime: new Date(info.event.schedule.start).toLocaleString("ja-JP", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }),
        endTime: info.event.schedule.end
            ? new Date(info.event.schedule.end).toLocaleString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "-",
        reason: info.reason === "ignored" ? "無視" : info.reason === "outOfSchedule" ? "勤務日範囲外" : "不正",
        reasonDetail: info.reasonDetail || "",
    }));
}

/**
 * 除外イベントの統計を計算
 */
export function calculateExcludedStats(linkingResult: AutoLinkingResult | null): ExcludedStats {
    if (!linkingResult) return { ignored: 0, outOfSchedule: 0, invalid: 0 };

    const stats = linkingResult.excluded.reduce(
        (acc, info) => {
            if (info.reason === "ignored") acc.ignored++;
            else if (info.reason === "outOfSchedule") acc.outOfSchedule++;
            else if (info.reason === "invalid") acc.invalid++;
            return acc;
        },
        { ignored: 0, outOfSchedule: 0, invalid: 0 },
    );

    return stats;
}
