/**
 * History Manager
 *
 * イベントと作業項目のマッピング履歴を管理するモジュールです。
 * Pythonのhistory.py (TimeTrackerHistory class)を移植しました。
 *
 * @remarks
 * - イベントのキーと作業項目IDのマッピングを保存・復元します
 * - Storageシステムを使用して永続化します
 * - 履歴のサイズ制限があり、古いエントリから自動削除されます
 */

import { getLogger } from "../../lib/logger";
import { getStorage } from "../../lib/storage";
import type { Event, WorkItem } from "../../types";

const logger = getLogger("HistoryManager");

/**
 * 履歴マネージャーの設定
 */
export interface HistoryConfig {
    /** LocalStorageのキー */
    storageKey: string;
    /** 履歴の最大サイズ */
    maxSize: number;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: HistoryConfig = {
    storageKey: "time-tracker-history",
    maxSize: 300,
};

/**
 * イベントキーを生成する
 *
 * @param event - イベント
 * @returns イベントのキー文字列
 *
 * @remarks
 * - `=` を `%3D` にエンコードして安全な文字列にします
 * - キー形式: `{uuid}|{name}|{organizer}`
 */
function getEventKey(event: Event): string {
    const key = `${event.uuid}|${event.name}|${event.organizer}`;
    return key.replace(/=/g, "%3D");
}

/**
 * 履歴マネージャークラス
 *
 * イベントと作業項目IDのマッピングを管理します。
 *
 * @example
 * ```typescript
 * const history = new HistoryManager()
 *
 * // 履歴を読み込み
 * history.load()
 *
 * // 作業項目IDを取得
 * const workItemId = history.getWorkItemId(event)
 *
 * // 履歴を保存
 * history.setHistory(event, workItem)
 * history.dump()
 * ```
 */
export class HistoryManager {
    private history: Map<string, string>;
    private config: HistoryConfig;
    private storage = getStorage();

    /**
     * コンストラクタ
     *
     * @param config - 設定（オプション）
     */
    constructor(config?: Partial<HistoryConfig>) {
        this.history = new Map();
        this.config = { ...DEFAULT_CONFIG, ...config };
        logger.debug(`HistoryManager初期化: storageKey=${this.config.storageKey}, maxSize=${this.config.maxSize}`);
    }

    /**
     * Storageから履歴を読み込む
     *
     * @remarks
     * - 読み込みに失敗した場合は空の履歴で初期化します
     * - 不正なデータは警告を出力してスキップします
     */
    load(): void {
        try {
            const data = this.storage.getValue<string>(this.config.storageKey);

            if (!data) {
                logger.info("履歴データが見つかりません。新規に作成します。");
                this.history.clear();
                this.dump();
                return;
            }

            this.history.clear();
            const lines = data.split("\n");
            let loadedCount = 0;

            for (const line of lines.slice(0, this.config.maxSize)) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                const [key, value] = trimmedLine.split("=");
                if (key && value) {
                    this.history.set(key, value);
                    loadedCount++;
                } else {
                    logger.warn(`不正な文字列です: ${line}`);
                }
            }

            logger.info(`履歴を読み込みました: ${loadedCount}件`);
        } catch (error) {
            logger.error(`履歴の読み込みに失敗しました: ${error}`);
            this.history.clear();
            this.dump();
        }
    }

    /**
     * 履歴をStorageに保存する
     *
     * @remarks
     * - `key=value` の形式で保存します
     * - 各エントリは改行で区切られます
     */
    dump(): void {
        try {
            const lines: string[] = [];
            for (const [key, value] of this.history.entries()) {
                lines.push(`${key}=${value}`);
            }

            const data = lines.join("\n");
            this.storage.setValue(this.config.storageKey, data);
            logger.debug(`履歴を保存しました: ${this.history.size}件`);
        } catch (error) {
            logger.error(`履歴の保存に失敗しました: ${error}`);
        }
    }

    /**
     * 作業項目IDの妥当性をチェックし、無効なエントリを削除する
     *
     * @param workItems - 有効な作業項目のリスト
     *
     * @remarks
     * - 作業項目リストに存在しないIDを持つエントリは削除されます
     */
    checkWorkItemId(workItems: WorkItem[]): void {
        const workItemMap = new Map(workItems.map((item) => [item.id, item]));
        const invalidKeys: string[] = [];

        for (const [key, value] of this.history.entries()) {
            if (!workItemMap.has(value)) {
                invalidKeys.push(key);
            }
        }

        if (invalidKeys.length > 0) {
            logger.debug(`無効なエントリを削除します: ${invalidKeys.length}件`);
            for (const key of invalidKeys) {
                const value = this.history.get(key);
                logger.debug(`削除: ${key}=${value}`);
                this.history.delete(key);
            }
        }
    }

    /**
     * イベントに対応する作業項目IDを取得する
     *
     * @param event - イベント
     * @returns 作業項目ID、見つからない場合はnull
     */
    getWorkItemId(event: Event): string | null {
        const key = getEventKey(event);
        const workItemId = this.history.get(key);

        if (workItemId) {
            logger.debug(`履歴から作業項目IDを取得: ${key} -> ${workItemId}`);
            return workItemId;
        }

        return null;
    }

    /**
     * イベントと作業項目のマッピングを履歴に追加する
     *
     * @param event - イベント
     * @param workItem - 作業項目
     *
     * @remarks
     * - 履歴サイズが最大値を超える場合、最も古いエントリが削除されます
     * - 既存のエントリは上書きされます
     */
    setHistory(event: Event, workItem: WorkItem): void {
        // サイズチェック（最も古いエントリを削除）
        if (this.history.size >= this.config.maxSize) {
            const firstKey = this.history.keys().next().value;
            if (firstKey) {
                const firstValue = this.history.get(firstKey);
                logger.debug(`最大サイズに到達。最も古いエントリを削除: ${firstKey}=${firstValue}`);
                this.history.delete(firstKey);
            }
        }

        const key = getEventKey(event);
        this.history.set(key, workItem.id);
        logger.debug(`履歴を追加: ${key} -> ${workItem.id}`);
    }

    /**
     * 履歴をクリアする
     *
     * @remarks
     * - すべてのマッピングが削除されます
     * - LocalStorageの内容も更新されます
     */
    clear(): void {
        this.history.clear();
        logger.info("履歴をクリアしました");
        this.dump();
    }

    /**
     * 履歴のサイズを取得する
     *
     * @returns 現在の履歴エントリ数
     */
    getSize(): number {
        return this.history.size;
    }

    /**
     * すべての履歴エントリを取得する（デバッグ用）
     *
     * @returns 履歴エントリのマップ
     */
    getAll(): Map<string, string> {
        return new Map(this.history);
    }

    /**
     * すべての履歴エントリをキー(デコード済み)とItemIdの配列で取得する
     *
     * @returns キー(デコード済み)とItemIdのペアの配列
     *
     * @remarks
     * - キーの`%3D`は`=`にデコードされて返却されます
     */
    getAllEntries(): Array<{ key: string; itemId: string }> {
        const entries: Array<{ key: string; itemId: string }> = [];
        for (const [key, itemId] of this.history.entries()) {
            // %3D を = にデコード
            const decodedKey = key.replace(/%3D/g, "=");
            entries.push({ key: decodedKey, itemId });
        }
        return entries;
    }

    /**
     * キー(デコード済み)を指定して履歴を削除する
     *
     * @param decodedKey - デコード済みのキー文字列
     * @returns 削除に成功した場合はtrue、キーが存在しない場合はfalse
     *
     * @remarks
     * - キーに`=`が含まれている場合は`%3D`にエンコードして検索します
     * - 削除後、自動的にStorageに保存されます
     */
    deleteByKey(decodedKey: string): boolean {
        // = を %3D にエンコード
        const encodedKey = decodedKey.replace(/=/g, "%3D");

        if (this.history.has(encodedKey)) {
            const itemId = this.history.get(encodedKey);
            this.history.delete(encodedKey);
            logger.debug(`履歴を削除: ${decodedKey} (${encodedKey}) -> ${itemId}`);
            this.dump();
            return true;
        }

        logger.debug(`削除対象のキーが見つかりません: ${decodedKey} (${encodedKey})`);
        return false;
    }
}

/**
 * デフォルトの履歴マネージャーインスタンス
 */
let defaultInstance: HistoryManager | null = null;

/**
 * デフォルトの履歴マネージャーを取得する
 *
 * @returns 履歴マネージャーインスタンス
 *
 * @remarks
 * - シングルトンパターンで実装されています
 * - 初回呼び出し時に自動的に履歴を読み込みます
 */
export function getHistoryManager(): HistoryManager {
    if (!defaultInstance) {
        defaultInstance = new HistoryManager();
        defaultInstance.load();
    }
    return defaultInstance;
}

/**
 * 履歴マネージャーをリセットする（テスト用）
 */
export function resetHistoryManager(): void {
    defaultInstance = null;
}
