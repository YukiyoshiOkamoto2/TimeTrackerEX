import { getCurrentDate, getLogger } from "@/lib";
import ICAL from "ical.js";

import { Event } from "@/types";
import { createEvent, createSchedule } from "@/types/utils";

const logger = getLogger("ICSParser");

// 過去日の期限
const MAX_OLD = 30

/**
 * ICSファイルのパース結果
 */
export interface InputICSResult {
    /** パースされたイベントリスト */
    events: Event[];
    /** エラーメッセージリスト */
    errorMessages: string[];
}

/**
 * ICSファイルの内容をパースしてイベント情報を抽出する
 * @param fileContent ICSファイルの内容
 * @returns パース結果(イベントリストとエラーメッセージ)
 */
export function parseICS(fileContent: string): InputICSResult {
    logger.info("ICSファイルのパース開始");
    const result: InputICSResult = {
        events: [],
        errorMessages: [],
    };

    try {
        // ICSファイルをパース
        const jcalData = ICAL.parse(fileContent);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");
        logger.debug(`検出されたイベント数: ${vevents.length}`);

        // 指定日前の基準日
        const now = getCurrentDate();
        const startDate = new Date(now.getTime() - MAX_OLD * 24 * 60 * 60 * 1000);

        // 各イベントを処理
        for (const vevent of vevents) {
            try {
                const event = parseEvent(vevent, startDate, now);
                if (event) {
                    result.events.push(event);
                }
            } catch (e) {
                const summary = vevent.getFirstPropertyValue("summary") || "(不明)";
                const errorMsg = `【SKIP】 イベント "${summary}" の解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
                logger.warn(errorMsg);
                result.errorMessages.push(errorMsg);
            }
        }

        // イベントを開始日時でソート
        result.events.sort((a, b) => {
            const startCompare = a.schedule.start.getTime() - b.schedule.start.getTime();
            if (startCompare !== 0) return startCompare;
            // 開始時刻が同じ場合は期間の長さでソート
            const durationA = (a.schedule.end?.getTime() ?? 0) - a.schedule.start.getTime();
            const durationB = (b.schedule.end?.getTime() ?? 0) - b.schedule.start.getTime();
            return durationA - durationB;
        });
    } catch (e) {
        const errorMsg = `ICSファイルの解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
        logger.error(errorMsg);
        result.errorMessages.push(errorMsg);
    }

    logger.info(`ICSパース完了: 成功=${result.events.length}件, エラー=${result.errorMessages.length}件`);
    return result;
}

/**
 * 個別のイベントをパースする
 */
function parseEvent(vevent: ICAL.Component, startDate: Date, now: Date): Event | null {
    // 必須フィールドの取得
    const summaryValue = vevent.getFirstPropertyValue("summary");
    const dtstartValue = vevent.getFirstPropertyValue("dtstart");
    const dtendValue = vevent.getFirstPropertyValue("dtend");

    if (!summaryValue || !dtstartValue || !dtendValue) {
        throw new Error("必須フィールド(SUMMARY, DTSTART, DTEND)が不足しています");
    }

    // 型ガード: ICAL.Timeかどうかを確認
    const dtstart = dtstartValue as ICAL.Time;
    const dtend = dtendValue as ICAL.Time;
    const summary = String(summaryValue);

    // 日時をJavaScript Dateに変換
    const start = dtstart.toJSDate();
    const end = dtend.toJSDate();

    if (start > end) {
        throw new Error("終了日時が開始日時より前です");
    }

    // オプションフィールドの取得
    const uidValue = vevent.getFirstPropertyValue("uid");
    const organizerValue = vevent.getFirstPropertyValue("organizer");
    const locationValue = vevent.getFirstPropertyValue("location");
    const classValue = vevent.getFirstPropertyValue("class");
    const transpValue = vevent.getFirstPropertyValue("transp");

    const uid = uidValue ? String(uidValue) : "";
    const organizer = organizerValue ? String(organizerValue) : "";
    const location = locationValue ? String(locationValue) : "";
    const transp = transpValue ? String(transpValue) : "";

    const isPrivate = classValue === "PRIVATE";
    const isCancelled =
        transp === "TRANSPARENT" || summary.startsWith("Canceled:") || summary.startsWith("キャンセル済み:");

    // 繰り返しイベントの処理
    const recurrence = parseRecurrence(vevent, dtstart, now);

    // 過去のイベント(XX日前より古い)で繰り返しもない場合はスキップ
    const eventDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    if (eventDate < startDateOnly && (!recurrence || recurrence.length === 0)) {
        throw new Error(`過去のイベントです: ${summary}`);
    }

    const schedule = createSchedule(start, end);
    const event = createEvent(summary, schedule, organizer, location, isPrivate, isCancelled);
    
    return {
        ...event,
        uuid: uid,
        recurrence: recurrence && recurrence.length > 0 ? recurrence : undefined,
    };
}

/**
 * 繰り返しイベントの発生日時を取得
 */
function parseRecurrence(vevent: ICAL.Component, dtstart: ICAL.Time, now: Date): Date[] | null {
    const rrule = vevent.getFirstPropertyValue("rrule");
    if (!rrule) {
        return null;
    }

    try {
        const expand = new ICAL.RecurExpansion({
            component: vevent,
            dtstart,
        });

        const occurrences: Date[] = [];
        let next: ICAL.Time | null;

        // 現在までの繰り返しを展開(最大1000回)
        let count = 0;
        while ((next = expand.next()) && count < 1000) {
            const occurrenceDate = next.toJSDate();
            if (occurrenceDate > now) {
                break;
            }
            occurrences.push(occurrenceDate);
            count++;
        }

        return occurrences;
    } catch (e) {
        // 繰り返しの解析に失敗した場合はnullを返す
        return null;
    }
}

/**
 * ICSファイルから最近のイベントのみを抽出する
 * @param fileContent ICSファイルの内容
 * @param daysAgo 何日前までのイベントを含めるか(デフォルト: 30日)
 * @returns フィルタリングされたICS形式の文字列
 */
export function extractRecentEvents(fileContent: string, daysAgo: number = 30): string {
    const lines = fileContent.split("\n");
    const recentEvents: string[] = [];
    let currentEvent: string[] = [];
    let inEvent = false;
    let firstEventNone = true;

    const now = getCurrentDate();
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    for (const line of lines) {
        const trimmedLine = line.startsWith(" ") ? line : line.trim();

        if (trimmedLine === "BEGIN:VEVENT") {
            inEvent = true;
            firstEventNone = false;
            currentEvent = [trimmedLine];
        } else if (trimmedLine === "END:VEVENT") {
            if (inEvent) {
                currentEvent.push(trimmedLine);
                if (isRecentEvent(currentEvent, startDate)) {
                    recentEvents.push(...currentEvent);
                }
            }
            inEvent = false;
        } else if (inEvent) {
            currentEvent.push(trimmedLine);
        } else if (firstEventNone) {
            recentEvents.push(trimmedLine);
        }
    }

    // ICS形式で出力
    const output = recentEvents.join("\n");
    return output.endsWith("END:VCALENDAR") ? output : output + "\nEND:VCALENDAR\n";
}

/**
 * イベントが最近のものかチェック
 */
function isRecentEvent(eventLines: string[], startDate: Date): boolean {
    for (const line of eventLines) {
        if (line.startsWith("DTSTART")) {
            const match = line.match(/DTSTART.*:(\d+)/);
            if (!match) return false;

            const dtstartStr = match[1];
            try {
                // YYYYMMDDTHHMMSSまたはYYYYMMDD形式をパース
                const year = parseInt(dtstartStr.substring(0, 4));
                const month = parseInt(dtstartStr.substring(4, 6)) - 1;
                const day = parseInt(dtstartStr.substring(6, 8));

                let hour = 0,
                    minute = 0,
                    second = 0;
                if (dtstartStr.length > 8) {
                    hour = parseInt(dtstartStr.substring(9, 11));
                    minute = parseInt(dtstartStr.substring(11, 13));
                    second = parseInt(dtstartStr.substring(13, 15));
                }

                const dtstartDate = new Date(year, month, day, hour, minute, second);
                return dtstartDate >= startDate;
            } catch {
                return false;
            }
        }
    }
    return false;
}
