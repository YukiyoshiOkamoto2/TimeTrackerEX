/**
 * 日付ユーティリティ関数
 * タイムゾーンに依存しない安全な日付操作を提供
 */

/**
 * 現在の日時を取得
 * テストでモック化しやすいように関数化
 * 
 * @returns 現在の日時
 * 
 * @example
 * const now = getCurrentDate()
 */
export function getCurrentDate(): Date {
    return new Date();
}

/**
 * 今日の日付を取得（時刻を00:00:00にリセット）
 * 
 * @returns 今日の日付（00:00:00.000）
 * 
 * @example
 * const today = getToday() // 2024-02-03T00:00:00.000 (local)
 */
export function getToday(): Date {
    return resetTime(getCurrentDate());
}

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 * タイムゾーンに依存せず、ローカル日付をそのまま文字列化
 * 
 * @param date - 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 * 
 * @example
 * formatDateKey(new Date(2024, 1, 3)) // "2024-02-03"
 */
export function formatDateKey(date: Date): string {
    return date.toLocaleDateString("en-CA");
}

/**
 * 日付と時刻を日本語形式でフォーマット
 * 
 * @param start - 開始日時
 * @param end - 終了日時（nullの場合は開始時刻のみ表示）
 * @returns フォーマットされた日時文字列
 * 
 * @example
 * formatDateTime(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0))
 * // "2024/2/3 (土)　09:00～18:00"
 * 
 * formatDateTime(new Date(2024, 1, 3, 9, 0), null)
 * // "2024/2/3 (土)　09:00"
 */
export function formatDateTime(start: Date, end: Date | null): string {
    const dateStr = start.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
    });

    const timeStr = end
        ? `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}～${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
        : start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    return `${dateStr}　${timeStr}`;
}

/**
 * 日付の時刻部分を00:00:00.000にリセット
 * 
 * @param date - リセットする日付
 * @returns 時刻がリセットされた新しいDateオブジェクト
 * 
 * @example
 * resetTime(new Date(2024, 1, 3, 15, 30)) // 2024-02-03T00:00:00.000 (local)
 */
export function resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 2つの日付が同じ日かどうかを判定
 * 時刻は無視して年月日のみで比較
 * 
 * @param date1 - 比較する日付1
 * @param date2 - 比較する日付2
 * @returns 同じ日の場合true
 * 
 * @example
 * isSameDay(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0)) // true
 * isSameDay(new Date(2024, 1, 3), new Date(2024, 1, 4)) // false
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * 日付を比較（時刻は無視）
 * 
 * @param date1 - 比較する日付1
 * @param date2 - 比較する日付2
 * @returns date1がdate2より前なら負、同じなら0、後なら正の数
 * 
 * @example
 * compareDates(new Date(2024, 1, 3), new Date(2024, 1, 4)) // 負の数
 * compareDates(new Date(2024, 1, 3, 9, 0), new Date(2024, 1, 3, 18, 0)) // 0
 */
export function compareDates(date1: Date, date2: Date): number {
    const reset1 = resetTime(date1);
    const reset2 = resetTime(date2);
    return reset1.getTime() - reset2.getTime();
}

/**
 * 日付文字列（YYYY-MM-DD）から安全にDateオブジェクトを作成
 * タイムゾーンの影響を受けずにローカル日付として作成
 * 
 * @param dateString - YYYY-MM-DD形式の日付文字列
 * @returns ローカルタイムの00:00:00.000を指すDateオブジェクト
 * 
 * @example
 * parseDateKey("2024-02-03") // 2024-02-03T00:00:00.000 (local timezone)
 */
export function parseDateKey(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

/**
 * 日付範囲の日数を計算（開始日と終了日を含む）
 * 
 * @param startDate - 開始日
 * @param endDate - 終了日
 * @returns 日数
 * 
 * @example
 * getDayCount(new Date(2024, 1, 1), new Date(2024, 1, 3)) // 3
 */
export function getDayCount(startDate: Date, endDate: Date): number {
    const start = resetTime(startDate);
    const end = resetTime(endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 日付に日数を加算
 * 
 * @param date - 基準日
 * @param days - 加算する日数（負の値で減算）
 * @returns 新しいDateオブジェクト
 * 
 * @example
 * addDays(new Date(2024, 1, 1), 5) // 2024-02-06
 * addDays(new Date(2024, 1, 1), -1) // 2024-01-31
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * 2つの日付範囲が重複しているかを判定
 * 
 * @param start1 - 範囲1の開始日時
 * @param end1 - 範囲1の終了日時
 * @param start2 - 範囲2の開始日時
 * @param end2 - 範囲2の終了日時
 * @returns 重複している場合true
 * 
 * @example
 * isOverlapping(
 *   new Date(2024, 1, 1, 9, 0),
 *   new Date(2024, 1, 1, 12, 0),
 *   new Date(2024, 1, 1, 11, 0),
 *   new Date(2024, 1, 1, 14, 0)
 * ) // true
 */
export function isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    const latestStart = Math.max(start1.getTime(), start2.getTime());
    const earliestEnd = Math.min(end1.getTime(), end2.getTime());
    return latestStart < earliestEnd;
}

/**
 * 日付配列から重複を除いた日付キーのSetを取得
 * 
 * @param dates - 日付の配列
 * @returns YYYY-MM-DD形式の日付キーのSet
 * 
 * @example
 * getUniqueDateKeys([
 *   new Date(2024, 1, 1, 9, 0),
 *   new Date(2024, 1, 1, 18, 0),
 *   new Date(2024, 1, 2)
 * ]) // Set { "2024-02-01", "2024-02-02" }
 */
export function getUniqueDateKeys(dates: Date[]): Set<string> {
    return new Set(dates.map(formatDateKey));
}
