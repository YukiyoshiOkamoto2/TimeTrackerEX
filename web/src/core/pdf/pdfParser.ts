import { getLogger } from "@/lib";
import * as pdfjsLib from "pdfjs-dist";

const logger = getLogger("PDFParser");

// PDF.jsのワーカーを設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * PDFスケジュール情報
 */
export interface PDFSchedule {
    /** 開始日時 */
    start: Date;
    /** 終了日時（オプション） */
    end?: Date;
    /** 休日フラグ */
    isHoliday: boolean;
    /** 有給休暇フラグ */
    isPaidLeave: boolean;
    /** エラーメッセージ */
    errorMessage?: string;
}

/**
 * PDFパース結果
 */
export interface InputPDFResult {
    /** 勤務時間スケジュール */
    schedule: PDFSchedule[];
    /** 打刻時間スケジュール */
    scheduleStamp: PDFSchedule[];
    /** エラーメッセージ */
    errorMessage?: string;
}

/**
 * 日付情報
 */
interface DayInfo {
    /** 処理後の行番号 */
    row: number;
    /** 日付文字列 (例: "7/21 月") */
    dayStr: string;
    /** 有給休暇フラグ */
    isPaidLeave: boolean;
    /** 休日フラグ */
    isHoliday: boolean;
}

/**
 * PDFファイルからテキストを抽出
 */
async function extractTextFromPDF(file: File): Promise<string> {
    logger.debug(`PDFテキスト抽出開始: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    logger.debug(`PDFページ数: ${pdf.numPages}`);

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join("\n");
        fullText += pageText + "\n";
    }

    logger.debug(`PDFテキスト抽出完了: ${fullText.length}文字`);
    return fullText;
}

/**
 * 指定行の前後の行を取得
 */
function getAroundLines(lines: string[], row: number, around: number = 2): string[] {
    const start = Math.max(0, row - around);
    const end = Math.min(lines.length, row + around + 1);
    return lines.slice(start, end);
}

/**
 * 日付情報を取得
 */
function getDayInfo(row: number, lines: string[]): DayInfo | null {
    const patternDay1 = /^\d+\/\d+$/;
    const patternDay2 = /^[月火水木金土日]$/;
    const patternDay3 = /^所定休日$/;
    const patternDay4 = /^＜休暇＞$/;

    // 日付パターン1のチェック (例: "7/21")
    const day1Match = lines[row]?.trim().match(patternDay1);
    if (!day1Match || row + 1 >= lines.length) {
        return null;
    }

    let dayStr = day1Match[0];
    row += 1;

    // 日付パターン2のチェック (例: "月")
    const day2Match = lines[row]?.trim().match(patternDay2);
    if (!day2Match) {
        return null;
    }

    dayStr = `${dayStr} ${day2Match[0]}`;
    let isHoliday = dayStr.endsWith("土") || dayStr.endsWith("日");

    row += 1;

    // 所定休日チェック
    if (lines[row]?.trim().match(patternDay3)) {
        isHoliday = true;
    }

    // 有給休暇チェック
    const isPaidLeave = !!lines[row]?.trim().match(patternDay4);

    return {
        row,
        dayStr,
        isPaidLeave,
        isHoliday: isHoliday || isPaidLeave,
    };
}

/**
 * PDFテキストを解析してスケジュールを抽出
 */
function analyzePDFText(text: string): { schedule: PDFSchedule[]; scheduleStamp: PDFSchedule[] } {
    const patternTime = /.*(\d{2}時\d{2}分)\s+.\s+(\d{2}時\d{2}分)/;
    const patternTimeStamp = /.*(\d{2}:\d{2})?\s*--\s*(\d{2}:\d{2})?/;

    const lines = text.split("\n");
    const schedule: PDFSchedule[] = [];
    const scheduleStamp: PDFSchedule[] = [];
    let row = 0;

    while (row < lines.length) {
        const dayInfo = getDayInfo(row, lines);

        if (!dayInfo) {
            row += 1;
            continue;
        }

        const { dayStr, isPaidLeave, isHoliday } = dayInfo;

        // 休日または有給休暇の場合は次の行へ
        if (isPaidLeave || isHoliday) {
            row = dayInfo.row + 1;
        } else {
            // 通常勤務の場合は2行進める
            row = dayInfo.row + 2;
        }

        let timeStart: string | null = null;
        let timeEnd: string | null = null;
        let errorMessage: string | undefined;

        let timeStartStamp: string | null = null;
        let timeEndStamp: string | null = null;
        let errorMessageStamp: string | undefined;

        // 打刻時間の解析
        const timeMatchStamp = lines[row]?.trim().match(patternTimeStamp);
        if (timeMatchStamp) {
            timeStartStamp = timeMatchStamp[1] || null;
            timeEndStamp = timeMatchStamp[2] || null;
        } else {
            errorMessageStamp = "打刻時間が見つかりません。";
        }

        // 勤務時間の解析
        let timeMatch = lines[row]?.trim().match(patternTime);
        if (timeMatch) {
            timeStart = timeMatch[1];
            timeEnd = timeMatch[2];
        } else if (row + 1 < lines.length) {
            timeMatch = lines[row + 1]?.trim().match(patternTime);
            if (timeMatch) {
                timeStart = timeMatch[1];
                timeEnd = timeMatch[2];
            }
        }

        if (!timeMatch) {
            errorMessage = "勤務時間が見つかりません。";
        }

        const currentYear = new Date().getFullYear();
        const [month, day] = dayStr.split(" ")[0].split("/").map(Number);

        // 勤務時間スケジュールの追加
        if (errorMessage) {
            logger.debug("Schedule format error at line:\n" + getAroundLines(lines, row).join("\n"));
            schedule.push({
                start: new Date(currentYear, month - 1, day),
                isHoliday,
                isPaidLeave,
                errorMessage,
            });
        } else if (timeStart && timeEnd) {
            const startTime = parseTimeString(timeStart);
            const endTime = parseTimeString(timeEnd);
            schedule.push({
                start: new Date(currentYear, month - 1, day, startTime.hour, startTime.minute),
                end: new Date(currentYear, month - 1, day, endTime.hour, endTime.minute),
                isHoliday,
                isPaidLeave,
            });
        }

        // 打刻時間スケジュールの追加
        if (errorMessageStamp) {
            logger.debug("Schedule format error at line:\n" + getAroundLines(lines, row).join("\n"));
            scheduleStamp.push({
                start: new Date(currentYear, month - 1, day),
                isHoliday,
                isPaidLeave,
                errorMessage: errorMessageStamp,
            });
        } else {
            const startStamp = timeStartStamp ? parseTimeString(timeStartStamp, true) : null;
            const endStamp = timeEndStamp ? parseTimeString(timeEndStamp, true) : null;

            scheduleStamp.push({
                start: startStamp
                    ? new Date(currentYear, month - 1, day, startStamp.hour, startStamp.minute)
                    : new Date(currentYear, month - 1, day),
                end: endStamp ? new Date(currentYear, month - 1, day, endStamp.hour, endStamp.minute) : undefined,
                isHoliday,
                isPaidLeave,
            });
        }

        row += 1;
    }

    return { schedule, scheduleStamp };
}

/**
 * 時刻文字列をパース
 */
function parseTimeString(timeStr: string, isStampFormat: boolean = false): { hour: number; minute: number } {
    if (isStampFormat) {
        // "09:45" 形式
        const [hour, minute] = timeStr.split(":").map(Number);
        return { hour, minute };
    } else {
        // "09時45分" 形式
        const match = timeStr.match(/(\d{2})時(\d{2})分/);
        if (!match) {
            throw new Error(`Invalid time format: ${timeStr}`);
        }
        return {
            hour: parseInt(match[1]),
            minute: parseInt(match[2]),
        };
    }
}

/**
 * PDFファイルをパースしてスケジュール情報を抽出
 * @param file PDFファイル
 * @returns パース結果
 */
export async function parsePDF(file: File): Promise<InputPDFResult> {
    logger.info(`PDFファイルのパース開始: ${file.name}`);
    const result: InputPDFResult = {
        schedule: [],
        scheduleStamp: [],
    };

    try {
        const text = await extractTextFromPDF(file);
        const { schedule, scheduleStamp } = analyzePDFText(text);
        result.schedule = schedule;
        result.scheduleStamp = scheduleStamp;
        logger.info(`PDFパース完了: スケジュール=${schedule.length}件, 打刻=${scheduleStamp.length}件`);
    } catch (e) {
        const errorMsg = `PDFファイルの解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
        logger.error(errorMsg);
        result.errorMessage = errorMsg;
    }

    return result;
}
