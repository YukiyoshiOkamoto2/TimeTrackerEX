/**
 * Storage Module
 *
 * 永続データアクセスを提供するモジュールです。
 * LocalStorageをラップし、将来的にサーバーサイドストレージにも対応できる設計です。
 *
 * @remarks
 * - 現在はLocalStorageを使用していますが、インターフェースは抽象化されています
 * - 将来的にAPIサーバーへの保存に切り替えることができます
 * - JSON形式での自動シリアライズ/デシリアライズをサポートします
 * - データは構造化され、1つのルートキーに保存されます
 */

import { getLogger } from "./logger";

const logger = getLogger("Storage");

/**
 * ストレージのルートキー
 */
const ROOT_STORAGE_KEY = "time-tracker-data";

/**
 * ストレージデータの構造
 */
interface StorageData {
    version: number;
    [key: string]: unknown;
}

/**
 * ストレージインターフェース
 *
 * 永続データストレージの抽象インターフェースです。
 * LocalStorage、SessionStorage、APIサーバーなど、
 * 異なるストレージ実装を切り替え可能にします。
 */
export interface IStorage {
    /**
     * 値を取得する
     *
     * @param key - キー
     * @returns 値、存在しない場合はnull
     */
    getValue<T = unknown>(key: string): T | null;

    /**
     * 値を設定する
     *
     * @param key - キー
     * @param value - 値
     * @returns 成功した場合はtrue
     */
    setValue<T = unknown>(key: string, value: T): boolean;

    /**
     * 値を削除する
     *
     * @param key - キー
     * @returns 成功した場合はtrue
     */
    removeValue(key: string): boolean;

    /**
     * すべてのキーを取得する
     *
     * @returns キーの配列
     */
    getAllKeys(): string[];

    /**
     * すべての値をクリアする
     *
     * @returns 成功した場合はtrue
     */
    clear(): boolean;

    /**
     * キーが存在するかチェックする
     *
     * @param key - キー
     * @returns 存在する場合はtrue
     */
    hasKey(key: string): boolean;
}

/**
 * LocalStorageストレージ実装
 *
 * ブラウザのLocalStorageを使用した永続ストレージ実装です。
 *
 * @remarks
 * - データはJSON形式でシリアライズされます
 * - ブラウザのLocalStorage容量制限（通常5-10MB）に注意してください
 * - プライベートブラウジングモードでは使用できない場合があります
 * - データは構造化され、1つのルートキーに保存されます
 */
export class LocalStorageStorage implements IStorage {
    private rootKey: string;

    /**
     * コンストラクタ
     *
     * @param prefix - キーのプレフィックス（オプション、デフォルトは空文字列）
     *
     * @remarks
     * - プレフィックスを指定することで、名前空間を分離できます
     * - 例: `new LocalStorageStorage('app1:')` → キーは `app1:key` となります
     */
    constructor(prefix: string = "") {
        this.rootKey = `${prefix}${ROOT_STORAGE_KEY}`;
        logger.debug(`LocalStorageStorage初期化: prefix=${prefix}, rootKey=${this.rootKey}`);
    }

    /**
     * ルートデータを読み込む
     *
     * @returns ルートデータオブジェクト
     */
    private loadRootData(): StorageData {
        try {
            const item = localStorage.getItem(this.rootKey);
            if (item === null) {
                // 初期データを作成
                const initialData: StorageData = { version: 1 };
                this.saveRootData(initialData);
                return initialData;
            }
            return JSON.parse(item) as StorageData;
        } catch (error) {
            logger.error(`ルートデータの読み込みに失敗しました: error=${error}`);
            return { version: 1 };
        }
    }

    /**
     * ルートデータを保存する
     *
     * @param data - ルートデータオブジェクト
     */
    private saveRootData(data: StorageData): void {
        try {
            const item = JSON.stringify(data);
            localStorage.setItem(this.rootKey, item);
            logger.debug("ルートデータを保存しました");
        } catch (error) {
            logger.error(`ルートデータの保存に失敗しました: error=${error}`);
        }
    }

    /**
     * 値を取得する
     *
     * @param key - キー（ルートデータ内のフィールド名）
     * @returns 値、存在しない場合はnull
     *
     * @remarks
     * - ルートデータオブジェクトから特定のフィールドを取得します
     * - 例: ルートデータが `{version: 1, sample2: {value: 1}}` の場合、
     *   `getValue('sample2')` は `{value: 1}` を返します
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * const value = storage.getValue<{value: number}>('sample2')
     * console.log(value) // => {value: 1} or null
     * ```
     */
    getValue<T = unknown>(key: string): T | null {
        try {
            const rootData = this.loadRootData();

            if (!(key in rootData)) {
                logger.debug(`値が見つかりません: ${key}`);
                return null;
            }

            const value = rootData[key] as T;
            logger.debug(`値を取得: ${key}`);
            return value;
        } catch (error) {
            logger.error(`値の取得に失敗しました: ${key}, error=${error}`);
            return null;
        }
    }

    /**
     * 値を設定する
     *
     * @param key - キー（ルートデータ内のフィールド名）
     * @param value - 値
     * @returns 成功した場合はtrue
     *
     * @remarks
     * - ルートデータオブジェクトの特定のフィールドを更新します
     * - 例: `setValue('sample2', {value: 2})` は、
     *   ルートデータを `{version: 1, sample2: {value: 2}, ...}` に更新します
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * storage.setValue('sample2', {value: 2})
     * storage.setValue('settings', { theme: 'dark', lang: 'ja' })
     * ```
     */
    setValue<T = unknown>(key: string, value: T): boolean {
        try {
            const rootData = this.loadRootData();
            rootData[key] = value;
            this.saveRootData(rootData);
            logger.debug(`値を設定: ${key}`);
            return true;
        } catch (error) {
            logger.error(`値の設定に失敗しました: ${key}, error=${error}`);
            return false;
        }
    }

    /**
     * 値を削除する
     *
     * @param key - キー（ルートデータ内のフィールド名）
     * @returns 成功した場合はtrue
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * storage.removeValue('sample2')
     * ```
     */
    removeValue(key: string): boolean {
        try {
            const rootData = this.loadRootData();
            delete rootData[key];
            this.saveRootData(rootData);
            logger.debug(`値を削除: ${key}`);
            return true;
        } catch (error) {
            logger.error(`値の削除に失敗しました: ${key}, error=${error}`);
            return false;
        }
    }

    /**
     * すべてのキーを取得する
     *
     * @returns キーの配列（ルートデータ内のユーザーフィールド名、versionは除外）
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * storage.setValue('sample2', {value: 1})
     * storage.setValue('sample3', {value: 2})
     * const keys = storage.getAllKeys()
     * console.log(keys) // => ['sample2', 'sample3']
     * ```
     */
    getAllKeys(): string[] {
        try {
            const rootData = this.loadRootData();
            const keys = Object.keys(rootData).filter((key) => key !== "version");
            logger.debug(`すべてのキーを取得: ${keys.length}件`);
            return keys;
        } catch (error) {
            logger.error(`キーの取得に失敗しました: error=${error}`);
            return [];
        }
    }

    /**
     * すべての値をクリアする
     *
     * @returns 成功した場合はtrue
     *
     * @remarks
     * - ルートデータを初期状態（version のみ）にリセットします
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * storage.clear() // ルートデータが {version: 1} にリセットされます
     * ```
     */
    clear(): boolean {
        try {
            const initialData: StorageData = { version: 1 };
            this.saveRootData(initialData);
            logger.info("ストレージをクリア");
            return true;
        } catch (error) {
            logger.error(`クリアに失敗しました: error=${error}`);
            return false;
        }
    }

    /**
     * キーが存在するかチェックする
     *
     * @param key - キー（ルートデータ内のフィールド名）
     * @returns 存在する場合はtrue
     *
     * @example
     * ```typescript
     * const storage = new LocalStorageStorage()
     * if (storage.hasKey('sample2')) {
     *   console.log('sample2は設定済みです')
     * }
     * ```
     */
    hasKey(key: string): boolean {
        const rootData = this.loadRootData();
        return key in rootData;
    }
}

/**
 * メモリストレージ実装（テスト用）
 *
 * メモリ上にデータを保持するストレージ実装です。
 * 主にテストやLocalStorageが使用できない環境で使用します。
 *
 * @remarks
 * - ページをリロードするとデータは消失します
 * - LocalStorageのモックとして使用できます
 * - LocalStorageStorageと同じ構造化データ形式を使用します
 */
export class MemoryStorage implements IStorage {
    private rootData: StorageData;

    /**
     * コンストラクタ
     *
     * @param prefix - キーのプレフィックス（オプション、互換性のため）
     */
    constructor(prefix: string = "") {
        this.rootData = { version: 1 };
        logger.debug(`MemoryStorage初期化: prefix=${prefix}`);
    }

    getValue<T = unknown>(key: string): T | null {
        if (!(key in this.rootData)) {
            return null;
        }
        return this.rootData[key] as T;
    }

    setValue<T = unknown>(key: string, value: T): boolean {
        this.rootData[key] = value;
        return true;
    }

    removeValue(key: string): boolean {
        delete this.rootData[key];
        return true;
    }

    getAllKeys(): string[] {
        return Object.keys(this.rootData).filter((key) => key !== "version");
    }

    clear(): boolean {
        this.rootData = { version: 1 };
        return true;
    }

    hasKey(key: string): boolean {
        return key in this.rootData;
    }
}

/**
 * デフォルトのストレージインスタンス
 */
let defaultStorage: IStorage | null = null;

/**
 * デフォルトのストレージを取得する
 *
 * @param prefix - キーのプレフィックス（オプション）
 * @returns ストレージインスタンス
 *
 * @remarks
 * - LocalStorageが使用可能な場合はLocalStorageStorageを返します
 * - LocalStorageが使用できない場合はMemoryStorageを返します
 * - シングルトンパターンで実装されています
 *
 * @example
 * ```typescript
 * const storage = getStorage('app:')
 * storage.setValue('key', 'value')
 * const value = storage.getValue<string>('key')
 * ```
 */
export function getStorage(prefix: string = ""): IStorage {
    if (!defaultStorage) {
        try {
            // LocalStorageの動作確認
            const testKey = "__storage_test__";
            localStorage.setItem(testKey, "test");
            localStorage.removeItem(testKey);

            defaultStorage = new LocalStorageStorage(prefix);
            logger.info("LocalStorageを使用します");
        } catch (error) {
            logger.warn("LocalStorageが使用できません。MemoryStorageを使用します");
            defaultStorage = new MemoryStorage(prefix);
        }
    }

    return defaultStorage;
}

/**
 * デフォルトのストレージをリセットする（テスト用）
 */
export function resetStorage(): void {
    defaultStorage = null;
}

/**
 * SessionStorageストレージ実装
 *
 * ブラウザのSessionStorageを使用した一時ストレージ実装です。
 *
 * @remarks
 * - データはJSON形式でシリアライズされます
 * - タブ/ウィンドウを閉じるとデータは消失します
 * - データは構造化され、1つのルートキーに保存されます
 */
export class SessionStorageStorage implements IStorage {
    private rootKey: string;

    /**
     * コンストラクタ
     *
     * @param prefix - キーのプレフィックス（オプション、デフォルトは空文字列）
     */
    constructor(prefix: string = "") {
        this.rootKey = `${prefix}${ROOT_STORAGE_KEY}`;
        logger.debug(`SessionStorageStorage初期化: prefix=${prefix}, rootKey=${this.rootKey}`);
    }

    /**
     * ルートデータを読み込む
     */
    private loadRootData(): StorageData {
        try {
            const item = sessionStorage.getItem(this.rootKey);
            if (item === null) {
                const initialData: StorageData = { version: 1 };
                this.saveRootData(initialData);
                return initialData;
            }
            return JSON.parse(item) as StorageData;
        } catch (error) {
            logger.error(`ルートデータの読み込みに失敗しました: error=${error}`);
            return { version: 1 };
        }
    }

    /**
     * ルートデータを保存する
     */
    private saveRootData(data: StorageData): void {
        try {
            const item = JSON.stringify(data);
            sessionStorage.setItem(this.rootKey, item);
            logger.debug("ルートデータを保存しました");
        } catch (error) {
            logger.error(`ルートデータの保存に失敗しました: error=${error}`);
        }
    }

    getValue<T = unknown>(key: string): T | null {
        try {
            const rootData = this.loadRootData();

            if (!(key in rootData)) {
                logger.debug(`値が見つかりません: ${key}`);
                return null;
            }

            const value = rootData[key] as T;
            logger.debug(`値を取得: ${key}`);
            return value;
        } catch (error) {
            logger.error(`値の取得に失敗しました: ${key}, error=${error}`);
            return null;
        }
    }

    setValue<T = unknown>(key: string, value: T): boolean {
        try {
            const rootData = this.loadRootData();
            rootData[key] = value;
            this.saveRootData(rootData);
            logger.debug(`値を設定: ${key}`);
            return true;
        } catch (error) {
            logger.error(`値の設定に失敗しました: ${key}, error=${error}`);
            return false;
        }
    }

    removeValue(key: string): boolean {
        try {
            const rootData = this.loadRootData();
            delete rootData[key];
            this.saveRootData(rootData);
            logger.debug(`値を削除: ${key}`);
            return true;
        } catch (error) {
            logger.error(`値の削除に失敗しました: ${key}, error=${error}`);
            return false;
        }
    }

    getAllKeys(): string[] {
        try {
            const rootData = this.loadRootData();
            const keys = Object.keys(rootData).filter((key) => key !== "version");
            logger.debug(`すべてのキーを取得: ${keys.length}件`);
            return keys;
        } catch (error) {
            logger.error(`キーの取得に失敗しました: error=${error}`);
            return [];
        }
    }

    clear(): boolean {
        try {
            const initialData: StorageData = { version: 1 };
            this.saveRootData(initialData);
            logger.info("ストレージをクリア");
            return true;
        } catch (error) {
            logger.error(`クリアに失敗しました: error=${error}`);
            return false;
        }
    }

    hasKey(key: string): boolean {
        const rootData = this.loadRootData();
        return key in rootData;
    }
}

/**
 * デフォルトのセッションストレージインスタンス
 */
let defaultSessionStorage: IStorage | null = null;

/**
 * デフォルトのセッションストレージを取得する
 *
 * @param prefix - キーのプレフィックス（オプション）
 * @returns セッションストレージインスタンス
 *
 * @remarks
 * - SessionStorageが使用可能な場合はSessionStorageStorageを返します
 * - SessionStorageが使用できない場合はMemoryStorageを返します
 * - シングルトンパターンで実装されています
 */
export function getSessionStorage(prefix: string = ""): IStorage {
    if (!defaultSessionStorage) {
        try {
            // SessionStorageの動作確認
            const testKey = "__session_storage_test__";
            sessionStorage.setItem(testKey, "test");
            sessionStorage.removeItem(testKey);

            defaultSessionStorage = new SessionStorageStorage(prefix);
            logger.info("SessionStorageを使用します");
        } catch (error) {
            logger.warn("SessionStorageが使用できません。MemoryStorageを使用します");
            defaultSessionStorage = new MemoryStorage(prefix);
        }
    }

    return defaultSessionStorage;
}

/**
 * デフォルトのセッションストレージをリセットする（テスト用）
 */
export function resetSessionStorage(): void {
    defaultSessionStorage = null;
}
