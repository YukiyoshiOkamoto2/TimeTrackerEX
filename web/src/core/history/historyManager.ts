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
 * 履歴エントリ
 */
export interface HistoryEntry {
    /** イベント名 */
    eventName: string;
    /** 作業項目ID */
    itemId: string;
    /** 項目名 */
    itemName: string;
    /** 使用回数 */
    useCount: number;
    /** 最終使用日時 */
    lastUsedDate: Date;
}

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
    private history: Map<string, HistoryEntry>;
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
     * イベント情報からキーを生成する
     *
     * @param event - イベント情報
     * @returns 生成されたキー
     */
    private getEventKey(event: Event): string {
        const uuid = event.uuid || "";
        const name = event.name || "";
        const organizer = event.organizer || "";
        // =をエンコードして保存（LocalStorageのキーとしての問題を回避）
        return `${uuid}|${name}|${organizer}`;
    }

    /**
     * Storageから履歴を読み込む
     *
     * @remarks
     * - 読み込みに失敗した場合は空の履歴で初期化します
     * - 不正なデータは警告を出力してスキップします
     * - CSV形式: key,eventName,WorkItemId,itemName,useCount,lastUsedDate
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

            for (let i = 0; i < lines.length && loadedCount < this.config.maxSize; i++) {
                const trimmedLine = lines[i].trim();
                if (!trimmedLine) continue;

                // ヘッダー行をスキップ
                if (i === 0 && trimmedLine.startsWith("key,")) {
                    continue;
                }

                // CSV形式: key,eventName,WorkItemId,itemName,useCount,lastUsedDate
                const tempLine = trimmedLine.replace(/\\,/g, "\x00");
                const parts = tempLine.split(",");

                if (parts.length === 6) {
                    const key = parts[0].replace(/\x00/g, ",");
                    const eventName = parts[1].replace(/\x00/g, ",");
                    const itemId = parts[2];
                    const itemName = parts[3].replace(/\x00/g, ",");
                    const useCount = parseInt(parts[4], 10);
                    const lastUsedDate = new Date(parts[5]);

                    if (key && itemId && !isNaN(useCount) && !isNaN(lastUsedDate.getTime())) {
                        this.history.set(key, { eventName, itemId, itemName, useCount, lastUsedDate });
                        loadedCount++;
                    } else {
                        logger.warn(`不正な形式です: ${trimmedLine}`);
                    }
                } else {
                    logger.warn(`不正なCSV形式です: ${trimmedLine}`);
                }
            }

            logger.info(`履歴を読み込みました: ${loadedCount}件`);
        } catch (error) {
            logger.error(`履歴の読み込みに失敗しました: ${error}`);
            this.history.clear();
        } finally {
            this.dump();
        }
    }

    /**
     * 履歴をStorageに保存する
     *
     * @remarks
     * - CSV形式: `key,eventName,WorkItemId,itemName,useCount,lastUsedDate` で保存します
     * - ヘッダー行を含みます
     * - 各エントリは改行で区切られます
     */
    dump(): void {
        try {
            const lines: string[] = [];

            // CSVヘッダー
            lines.push("key,eventName,WorkItemId,itemName,useCount,lastUsedDate");

            for (const [key, entry] of this.history.entries()) {
                // カンマを含む項目名はエスケープ
                const escapedKey = key.replace(/,/g, "\\,");
                const escapedEventName = entry.eventName.replace(/,/g, "\\,");
                const escapedItemName = entry.itemName.replace(/,/g, "\\,");
                // 日時はISO 8601形式で秒まで(分まで表示するため)
                const dateStr = entry.lastUsedDate.toISOString().slice(0, 16).replace("T", " ");
                lines.push(
                    `${escapedKey},${escapedEventName},${entry.itemId},${escapedItemName},${entry.useCount},${dateStr}`,
                );
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

        for (const [key, entry] of this.history.entries()) {
            if (!workItemMap.has(entry.itemId)) {
                invalidKeys.push(key);
            }
        }

        if (invalidKeys.length > 0) {
            logger.info(`無効なエントリを削除します: ${invalidKeys.length}件`);
            for (const key of invalidKeys) {
                const entry = this.history.get(key);
                logger.info(`削除: ${key}=${entry?.itemId}`);
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
        const key = this.getEventKey(event);
        const entry = this.history.get(key);

        if (entry) {
            logger.debug(`履歴から作業項目IDを取得: ${key} -> ${entry.itemId}`);
            entry.useCount = entry.useCount + 1;
            entry.lastUsedDate = new Date();
            return entry.itemId;
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
     * - 既存のエントリがある場合は使用回数をインクリメントし、最終使用日時を更新します
     */
    setHistory(event: Event, workItem: WorkItem): void {
        const key = this.getEventKey(event);
        const existingEntry = this.history.get(key);
        const now = new Date();

        if (existingEntry) {
            // 既存エントリの使用回数をインクリメント、最終使用日時を更新
            existingEntry.useCount++;
            existingEntry.eventName = event.name; // イベント名を更新
            existingEntry.itemName = workItem.name; // 項目名を更新
            existingEntry.lastUsedDate = now;
            logger.debug(`履歴を更新: ${key} -> ${workItem.id} (使用回数: ${existingEntry.useCount})`);
        } else {
            // サイズチェック（最も古いエントリを削除）
            if (this.history.size >= this.config.maxSize) {
                const firstKey = this.history.keys().next().value;
                if (firstKey) {
                    const firstEntry = this.history.get(firstKey);
                    logger.debug(`最大サイズに到達。最も古いエントリを削除: ${firstKey}=${firstEntry?.itemId}`);
                    this.history.delete(firstKey);
                }
            }

            // 新規エントリを追加
            this.history.set(key, {
                eventName: event.name,
                itemId: workItem.id,
                itemName: workItem.name,
                useCount: 1,
                lastUsedDate: now,
            });
            logger.debug(`履歴を追加: ${key} -> ${workItem.id} (${workItem.name})`);
        }
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
    getAll(): Map<string, HistoryEntry> {
        return new Map(this.history);
    }

    /**
     * すべての履歴エントリをキー(デコード済み)と詳細情報の配列で取得する
     *
     * @returns キー(デコード済み)と詳細情報のペアの配列
     *
     * @remarks
     * - 使用回数の降順、次に最終使用日時の降順でソートされます
     */
    getAllEntries(): (HistoryEntry & { key: string })[] {
        const entries: (HistoryEntry & { key: string })[] = [];
        for (const [key, entry] of this.history.entries()) {
            entries.push({
                key,
                eventName: entry.eventName,
                itemId: entry.itemId,
                itemName: entry.itemName,
                useCount: entry.useCount,
                lastUsedDate: entry.lastUsedDate,
            });
        }
        // 使用回数の降順、次に最終使用日時の降順でソート
        return entries.sort((a, b) => {
            if (b.useCount !== a.useCount) {
                return b.useCount - a.useCount;
            }
            return b.lastUsedDate.getTime() - a.lastUsedDate.getTime();
        });
    }

    /**
     * キー(デコード済み)を指定して履歴を削除する
     *
     * @param decodedKey - デコード済みのキー文字列
     * @returns 削除に成功した場合はtrue、キーが存在しない場合はfalse
     *
     * @remarks
     * - 削除後、自動的にStorageに保存されます
     */
    deleteByKey(key: string): boolean {
        if (this.history.has(key)) {
            const itemId = this.history.get(key);
            this.history.delete(key);
            logger.debug(`履歴を削除: ${key} -> ${itemId}`);
            this.dump();
            return true;
        }

        logger.debug(`削除対象のキーが見つかりません: ${key}`);
        return false;
    }

    /**
     * 複数のキーを指定して一括削除する
     *
     * @param keys - 削除するキーの配列
     * @returns 削除した件数
     *
     * @remarks
     * - 削除後、自動的にStorageに保存されます
     */
    deleteByKeys(keys: string[]): number {
        let deletedCount = 0;
        for (const key of keys) {
            if (this.history.has(key)) {
                this.history.delete(key);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            logger.info(`履歴を一括削除: ${deletedCount}件`);
            this.dump();
        }
        return deletedCount;
    }

    /**
     * 履歴エントリのWorkItemIdを更新する
     *
     * @param key - 更新するエントリのキー
     * @param newItemId - 新しい作業項目ID
     * @param newItemName - 新しい作業項目名
     * @returns 更新に成功した場合はtrue
     *
     * @remarks
     * - 更新後、自動的にStorageに保存されます
     */
    updateWorkItemId(key: string, newItemId: string, newItemName: string): boolean {
        const entry = this.history.get(key);
        if (entry) {
            entry.itemId = newItemId;
            entry.itemName = newItemName;
            entry.lastUsedDate = new Date();
            logger.debug(`履歴を更新: ${key} -> ${newItemId} (${newItemName})`);
            this.dump();
            return true;
        }
        logger.debug(`更新対象のキーが見つかりません: ${key}`);
        return false;
    }

    /**
     * 履歴をJSON文字列としてエクスポートする
     *
     * @returns JSON形式の履歴データ
     */
    exportToJSON(): string {
        const entries = this.getAllEntries();
        return JSON.stringify(entries, null, 2);
    }

    /**
     * JSON文字列から履歴をインポートする
     *
     * @param jsonData - JSON形式の履歴データ
     * @param merge - trueの場合は既存データとマージ、falseの場合は上書き
     * @returns インポートされたエントリ数
     *
     * @remarks
     * - インポート後、自動的にStorageに保存されます
     */
    importFromJSON(jsonData: string, merge: boolean = false): number {
        try {
            const entries = JSON.parse(jsonData) as (HistoryEntry & { key: string })[];

            if (!Array.isArray(entries)) {
                throw new Error("Invalid JSON format: expected array");
            }

            if (!merge) {
                this.history.clear();
            }

            let importedCount = 0;
            for (const entry of entries) {
                if (entry.key && entry.itemId && entry.eventName !== undefined) {
                    this.history.set(entry.key, {
                        eventName: entry.eventName,
                        itemId: entry.itemId,
                        itemName: entry.itemName,
                        useCount: entry.useCount || 1,
                        lastUsedDate: new Date(entry.lastUsedDate),
                    });
                    importedCount++;
                }
            }

            logger.info(`履歴をインポート: ${importedCount}件 (マージ: ${merge})`);
            this.dump();
            return importedCount;
        } catch (error) {
            logger.error(`履歴のインポートに失敗: ${error}`);
            throw error;
        }
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
