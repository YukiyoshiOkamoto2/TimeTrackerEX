/**
 * Ignore Manager
 *
 * イベントやスケジュールの無視設定を管理するモジュールです。
 * Pythonのignore.py (Ignore class)を移植しました。
 *
 * @remarks
 * - 無視するイベント/スケジュールのルールを保存・管理します
 * - マッチングタイプ: "exact"(完全一致) または "contains"(部分一致)
 * - Storageシステムを使用して永続化します
 */

import { getLogger } from "../../lib/logger";
import { getStorage } from "../../lib/storage";
import type { Event, EventPattern, Schedule } from "../../types";

const logger = getLogger("IgnoreManager");

/**
 * 無視情報の型（後方互換性のため保持）
 */
export interface IgnoreInfo {
    /** 無視対象の種類 */
    type: "event" | "schedule";
    /** マッチング対象の名前 */
    name: string;
    /** マッチングタイプ (デフォルト: "exact") */
    matchType?: "contains" | "exact";
}

/**
 * 無視マネージャーの設定
 */
export interface IgnoreConfig {
    /** Storageのキー */
    storageKey: string;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: IgnoreConfig = {
    storageKey: "ignore-items",
};

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
 * const ignoreManager = new IgnoreManager({ ignorableEvents: ignorePatterns })
 *
 * // イベントが無視対象かチェック
 * const shouldIgnore = ignoreManager.ignoreEvent(event)
 *
 * // 旧形式（後方互換性のため保持）
 * const oldIgnoreManager = new IgnoreManager()
 * oldIgnoreManager.load()
 * oldIgnoreManager.addIgnoreItem({
 *   type: 'event',
 *   name: '休憩',
 *   matchType: 'contains'
 * })
 * oldIgnoreManager.dump()
 * ```
 */
export class IgnoreManager {
    private ignoreItems: IgnoreInfo[];
    private ignorableEventPatterns: EventPattern[];
    private config: IgnoreConfig;
    private storage = getStorage();

    /**
     * コンストラクタ
     *
     * @param options - オプション
     * @param options.config - 設定（オプション、後方互換性のため保持）
     * @param options.ignorableEvents - 無視可能イベントパターン（推奨）
     */
    constructor(options?: { config?: Partial<IgnoreConfig>; ignorableEvents?: EventPattern[] }) {
        this.ignoreItems = [];
        this.ignorableEventPatterns = options?.ignorableEvents || [];
        this.config = { ...DEFAULT_CONFIG, ...options?.config };
        logger.debug(
            `IgnoreManager初期化: storageKey=${this.config.storageKey}, patterns=${this.ignorableEventPatterns.length}件`,
        );
    }

    /**
     * Storageから無視設定を読み込む
     *
     * @remarks
     * - 読み込みに失敗した場合は空の設定で初期化します
     * - 不正なデータは警告を出力してスキップします
     */
    load(): void {
        try {
            const data = this.storage.getValue<IgnoreInfo[]>(this.config.storageKey);

            if (!data || !Array.isArray(data)) {
                logger.info("無視設定が見つかりません。新規に作成します。");
                this.ignoreItems = [];
                this.dump();
                return;
            }

            // データの検証
            this.ignoreItems = data.filter((item) => {
                if (!item || typeof item !== "object") {
                    logger.warn(`不正な無視設定です: ${JSON.stringify(item)}`);
                    return false;
                }
                if (!item.type || !item.name) {
                    logger.warn(`不正な無視設定です: ${JSON.stringify(item)}`);
                    return false;
                }
                return true;
            });

            logger.info(`無視設定を読み込みました: ${this.ignoreItems.length}件`);
        } catch (error) {
            logger.error(`無視設定の読み込みに失敗しました: ${error}`);
            this.ignoreItems = [];
            this.dump();
        }
    }

    /**
     * 無視設定をStorageに保存する
     *
     * @remarks
     * - JSON形式で保存します
     */
    dump(): void {
        try {
            const success = this.storage.setValue(this.config.storageKey, this.ignoreItems);
            if (!success) {
                throw new Error("無視設定の保存に失敗しました");
            }
            logger.debug(`無視設定を保存しました: ${this.ignoreItems.length}件`);
        } catch (error) {
            logger.error(`無視設定の保存に失敗しました: ${error}`);
            throw error;
        }
    }

    /**
     * イベントが無視対象かチェックする
     *
     * @param event - チェック対象のイベント
     * @returns 無視対象の場合true
     *
     * @example
     * ```typescript
     * const ignoreManager = new IgnoreManager()
     * ignoreManager.load()
     *
     * if (ignoreManager.ignoreEvent(event)) {
     *   console.log('このイベントは無視されます')
     * }
     * ```
     */
    ignoreEvent(event: Event): boolean {
        // EventPatternを使用した新形式のチェック（優先）
        if (this.ignorableEventPatterns.length > 0) {
            return this.ignorableEventPatterns.some((pattern) => this.matchPattern(pattern, event.name));
        }

        // 旧形式のチェック（後方互換性）
        const ignoreEvents = this.ignoreItems.filter((item) => item.type === "event");
        return ignoreEvents.some((item) => this.match(item, event.name));
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
        // Scheduleは名前を持たないため、常にfalseを返す（Pythonの実装と同じ）
        return false;
    }

    /**
     * 無視設定を追加する
     *
     * @param item - 追加する無視設定
     *
     * @example
     * ```typescript
     * ignoreManager.addIgnoreItem({
     *   type: 'event',
     *   name: '休憩',
     *   matchType: 'contains'
     * })
     * ignoreManager.dump()
     * ```
     */
    addIgnoreItem(item: IgnoreInfo): void {
        this.ignoreItems.push(item);
        logger.debug(`無視設定を追加: ${item.type} - ${item.name}`);
    }

    /**
     * 無視設定を削除する
     *
     * @param index - 削除するインデックス
     *
     * @example
     * ```typescript
     * ignoreManager.removeIgnoreItem(0)
     * ignoreManager.dump()
     * ```
     */
    removeIgnoreItem(index: number): void {
        if (index >= 0 && index < this.ignoreItems.length) {
            const removed = this.ignoreItems.splice(index, 1)[0];
            logger.debug(`無視設定を削除: ${removed.type} - ${removed.name}`);
        }
    }

    /**
     * すべての無視設定を取得する
     *
     * @returns 無視設定の配列
     */
    getAllIgnoreItems(): IgnoreInfo[] {
        return [...this.ignoreItems];
    }

    /**
     * すべての無視設定をクリアする
     */
    clear(): void {
        this.ignoreItems = [];
        this.dump();
        logger.info("無視設定をクリアしました");
    }

    /**
     * 無視設定の件数を取得する
     *
     * @returns 件数
     */
    getSize(): number {
        return this.ignoreItems.length;
    }

    /**
     * 名前がパターンにマッチするかチェックする（旧形式）
     *
     * @param item - 無視設定
     * @param name - チェック対象の名前
     * @returns マッチする場合true
     */
    private match(item: IgnoreInfo, name: string): boolean {
        if (!item.name) {
            return false;
        }

        const matchType = item.matchType || "exact";

        if (matchType === "exact") {
            return item.name === name;
        } else {
            return name.includes(item.name);
        }
    }

    /**
     * 名前がEventPatternにマッチするかチェックする（新形式）
     *
     * @param pattern - イベントパターン
     * @param name - チェック対象の名前
     * @returns マッチする場合true
     */
    private matchPattern(pattern: EventPattern, name: string): boolean {
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
    getIgnorableEventPatterns(): EventPattern[] {
        return [...this.ignorableEventPatterns];
    }

    /**
     * 無視可能イベントパターンを設定する
     *
     * @param patterns - 無視可能イベントパターンの配列
     */
    setIgnorableEventPatterns(patterns: EventPattern[]): void {
        this.ignorableEventPatterns = patterns;
        logger.debug(`無視可能イベントパターンを設定: ${patterns.length}件`);
    }
}

/**
 * デフォルトの無視マネージャーインスタンス
 */
let defaultIgnoreManager: IgnoreManager | null = null;

/**
 * デフォルトの無視マネージャーを取得する
 *
 * @returns 無視マネージャーインスタンス
 *
 * @remarks
 * - シングルトンパターンで実装されています
 * - 初回呼び出し時に自動的にload()されます
 *
 * @example
 * ```typescript
 * const ignoreManager = getIgnoreManager()
 * if (ignoreManager.ignoreEvent(event)) {
 *   // イベントを無視
 * }
 * ```
 */
export function getIgnoreManager(): IgnoreManager {
    if (!defaultIgnoreManager) {
        defaultIgnoreManager = new IgnoreManager();
        defaultIgnoreManager.load();
    }
    return defaultIgnoreManager;
}

/**
 * デフォルトの無視マネージャーをリセットする（テスト用）
 */
export function resetIgnoreManager(): void {
    defaultIgnoreManager = null;
}
