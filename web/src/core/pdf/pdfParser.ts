import { getLogger } from "@/lib";
import { Schedule } from "@/types";
import { createSchedule } from "@/types/utils";
import * as pdfjsLib from "pdfjs-dist";

// vitest 実行環境判定用の型ガード
function isVitestEnv(g: unknown): g is { __VITEST__: unknown } {
    return typeof g === "object" && g !== null && "__VITEST__" in (g as Record<string, unknown>);
}

const logger = getLogger("PDFParser");

// PDF.jsのワーカーを設定（テスト環境以外）
try {
    // グローバルに __VITEST__ が無い場合のみワーカー設定（テスト環境ではスキップ）
    if (!isVitestEnv(globalThis)) {
        const workerPath = (import.meta as { env?: { PROD?: boolean } }).env?.PROD
            ? "/okamoto/pdf.worker.min.js"
            : "/pdf.worker.min.js";
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
    }
} catch {
    // globalが見つからない場合はフォールバック
    // 開発環境では相対パス、本番環境では絶対パスにフォールバック
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        /* @vite-ignore */
        "/okamoto/pdfjs-dist/build/pdf.worker.min.js",
        import.meta.url,
    ).toString();
}

/**
 * PDFパース結果
 */
export interface InputPDFResult {
    /** 勤務時間スケジュール */
    schedule: Schedule[];
    /** 打刻時間スケジュール */
    scheduleStamp: Schedule[];
    /** エラーメッセージ */
    errorMessage?: string;
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
        interface PDFTextItem {
            str: string;
        }
        const pageText = (textContent.items as PDFTextItem[]).map((item) => item.str).join("");
        fullText += pageText + "\n";
    }
    logger.debug(`PDFテキスト抽出完了: ${fullText.length}文字`);
    logger.debug(fullText);
    return fullText;
}

/**
 * PDFテキストを解析してスケジュールを抽出
 * PDFから抽出されたテキストはスペース区切りになっているため、
 * 正規表現で日付エントリを抽出する
 */
function analyzePDFText(text: string): { schedule: Schedule[]; scheduleStamp: Schedule[] } {
    const schedule: Schedule[] = [];
    const scheduleStamp: Schedule[] = [];

    // 日付エントリのパターン: "8/21 ⽊ フレックス勤務..." または "8 / 21   ⽊   フレックス勤務..."
    // スペースあり・なしの両方に対応
    const dateEntryPattern =
        /(\d+)\s*\/\s*(\d+)\s*([月⽉火⽕水⽔木⽊金⾦土⼟日⽇])\s+(.*?)(?=\d+\s*\/\s*\d+\s*[月⽉火⽕水⽔木⽊金⾦土⼟日⽇]|$)/g;

    let match: RegExpExecArray | null;
    while ((match = dateEntryPattern.exec(text)) !== null) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const dayOfWeek = match[3];
        const entryContent = match[4].trim();

        // 休日チェック
        const isWeekendHoliday = dayOfWeek === "⼟" || dayOfWeek === "土" || dayOfWeek === "⽇" || dayOfWeek === "日";
        const isDesignatedHoliday = /所定休\s*⽇|法定休\s*⽇/.test(entryContent);
        const isPaidLeave = /＜休暇＞/.test(entryContent);
        const isHoliday = isWeekendHoliday || isDesignatedHoliday || isPaidLeave;

        const currentYear = new Date().getFullYear();

        // 打刻情報なしかどうかをチェック
        const hasNoStampInfo = /（打刻情報なし）/.test(entryContent);

        // 打刻時間のパターン: "09:01 -- 18:47" or "09 : 01   --   18 : 47"
        const stampTimePattern = /(\d{2})\s*:\s*(\d{2})\s*--\s*(\d{2})\s*:\s*(\d{2})/;
        const stampMatch = entryContent.match(stampTimePattern);

        // 勤務時間のパターン: "09時01分 ～ 18時47分" or "09 時 01 分 ～   18 時 47 分"
        const workTimePattern = /(\d{2})\s*時\s*(\d{2})\s*分\s*～\s*(\d{2})\s*時\s*(\d{2})\s*分/;
        const workMatch = entryContent.match(workTimePattern);

        // 打刻時間スケジュールの追加
        if (stampMatch && !hasNoStampInfo) {
            const startHour = parseInt(stampMatch[1]);
            const startMinute = parseInt(stampMatch[2]);
            const endHour = parseInt(stampMatch[3]);
            const endMinute = parseInt(stampMatch[4]);

            scheduleStamp.push(
                createSchedule(
                    new Date(currentYear, month - 1, day, startHour, startMinute),
                    new Date(currentYear, month - 1, day, endHour, endMinute),
                    isHoliday,
                    isPaidLeave,
                ),
            );
        } else {
            scheduleStamp.push(
                createSchedule(
                    new Date(currentYear, month - 1, day),
                    null,
                    isHoliday,
                    isPaidLeave,
                    hasNoStampInfo ? "打刻情報なし" : "打刻時間が見つかりません。",
                ),
            );
        }

        // 勤務時間スケジュールの追加
        if (workMatch) {
            const startHour = parseInt(workMatch[1]);
            const startMinute = parseInt(workMatch[2]);
            const endHour = parseInt(workMatch[3]);
            const endMinute = parseInt(workMatch[4]);

            schedule.push(
                createSchedule(
                    new Date(currentYear, month - 1, day, startHour, startMinute),
                    new Date(currentYear, month - 1, day, endHour, endMinute),
                    isHoliday,
                    isPaidLeave,
                ),
            );
        } else {
            schedule.push(
                createSchedule(
                    new Date(currentYear, month - 1, day),
                    null,
                    isHoliday,
                    isPaidLeave,
                    "勤務時間が見つかりません。",
                ),
            );
        }
    }

    return { schedule, scheduleStamp };
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
