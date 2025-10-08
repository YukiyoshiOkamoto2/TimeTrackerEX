/**
 * Ignore Manager
 *
 * イベントやスケジュールの無視設定を管理するモジュールです。
 *
 * @remarks
 * - 無視するイベント/スケジュールのルールを管理します
 * - 設定から渡されたIgnorableEventPatternに基づいて判定します
 * - ローカルストレージへのアクセスは行いません
 */

import { getLogger } from "../../lib/logger";
import type { Event, IgnorableEventPattern, Schedule } from "../../types";

const logger = getLogger("IgnoreManager");

/**
 * 無視マネージャークラス
 *
 * イベントやスケジュールの無視設定を管理します。
 *
 * @example
 * ```typescript
 * // 設定から無視パターンを指定して初期化
 * const ignorePatterns = [
 *   { pattern: '休憩', matchMode: 'partial' },
 *   { pattern: 'MTG', matchMode: 'prefix' }
 * ]
 * const ignoreManager = new IgnoreManager(ignorePatterns)
 *
 * // イベントが無視対象かチェック
 * const shouldIgnore = ignoreManager.ignoreEvent(event)
 * ```
 */
export class IgnoreManager {
    private ignorableEventPatterns: IgnorableEventPattern[];

    /**
     * コンストラクタ
     *
     * @param ignorableEvents - 無視可能イベントパターンの配列
     */
    constructor(ignorableEvents: IgnorableEventPattern[] = []) {
        this.ignorableEventPatterns = ignorableEvents;
        logger.debug(`IgnoreManager初期化: patterns=${this.ignorableEventPatterns.length}件`);
    }

    /**
     * イベントが無視対象かチェックする
     *
     * @param event - チェック対象のイベント
     * @returns 無視対象の場合true
     *
     * @example
     * ```typescript
     * const ignoreManager = new IgnoreManager([
     *   { pattern: '休憩', matchMode: 'partial' }
     * ])
     *
     * if (ignoreManager.ignoreEvent(event)) {
     *   console.log('このイベントは無視されます')
     * }
     * ```
     */
    ignoreEvent(event: Event): boolean {
        return this.ignorableEventPatterns.some((pattern) => this.matchPattern(pattern, event.name));
    }

    /**
     * スケジュールが無視対象かチェックする
     *
     * @param _schedule - チェック対象のスケジュール（未使用）
     * @returns 無視対象の場合true
     *
     * @remarks
     * - Scheduleは時間範囲のみで名前を持たないため、常にfalseを返します
     * - 将来的に名前付きScheduleをサポートする場合に備えて残しています
     *
     * @example
     * ```typescript
     * const ignoreManager = new IgnoreManager()
     * ignoreManager.load()
     *
     * if (ignoreManager.ignoreSchedule(schedule)) {
     *   console.log('このスケジュールは無視されます')
     * }
     * ```
     */
    ignoreSchedule(_schedule: Schedule): boolean {
        // 未使用引数であることを明示（Lint抑止のため）
        void _schedule;
        // Scheduleは名前を持たないため、常にfalseを返す（Pythonの実装と同じ）
        return false;
    }

    /**
     * 名前がEventPatternにマッチするかチェックする
     *
     * @param pattern - イベントパターン
     * @param name - チェック対象の名前
     * @returns マッチする場合true
     */
    private matchPattern(pattern: IgnorableEventPattern, name: string): boolean {
        if (!pattern.pattern) {
            return false;
        }

        switch (pattern.matchMode) {
            case "partial":
                // 部分一致
                return name.includes(pattern.pattern);
            case "prefix":
                // 前方一致
                return name.startsWith(pattern.pattern);
            case "suffix":
                // 後方一致
                return name.endsWith(pattern.pattern);
            default:
                return false;
        }
    }

    /**
     * 無視可能イベントパターンを取得する
     *
     * @returns 無視可能イベントパターンの配列
     */
    getIgnorableEventPatterns(): IgnorableEventPattern[] {
        return [...this.ignorableEventPatterns];
    }

    /**
     * 無視可能イベントパターンを設定する
     *
     * @param patterns - 無視可能イベントパターンの配列
     */
    setIgnorableEventPatterns(patterns: IgnorableEventPattern[]): void {
        this.ignorableEventPatterns = patterns;
        logger.debug(`無視可能イベントパターンを設定: ${patterns.length}件`);
    }
}
