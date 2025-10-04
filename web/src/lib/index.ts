/**
 * Library Module
 *
 * アプリケーション全体で使用される汎用的なユーティリティ機能を提供します。
 *
 * @module lib
 *
 * @remarks
 * このモジュールは以下の3つの主要コンポーネントで構成されています：
 *
 * - **asyncQueue**: 非同期タスクのキュー管理（HTTP通信のレート制限など）
 * - **logger**: ログ出力とレベル管理（デバッグ、情報、警告、エラー）
 * - **storage**: 永続データストレージ（LocalStorageの抽象化）
 *
 * @packageDocumentation
 */

// ========================================
// AsyncQueue - 非同期タスクのキュー管理
// ========================================

/**
 * 非同期タスクのキュー管理
 *
 * @remarks
 * - HTTP通信のレート制限
 * - バッチ処理の順次実行
 * - 自動リトライ機能
 *
 * @example
 * ```typescript
 * const queue = new HttpRequestQueue()
 * const response = await queue.enqueueAsync({
 *   url: 'https://api.example.com/data',
 *   method: 'GET'
 * })
 * ```
 */
export { AsyncQueue, HttpRequestQueue } from "./asyncQueue";

/**
 * AsyncQueue関連の型定義
 */
export type { HttpRequestData, HttpRequestQueueResponse } from "./asyncQueue";

// ========================================
// Logger - ログ出力とレベル管理
// ========================================

/**
 * ログ出力とレベル管理
 *
 * @remarks
 * - 4段階のログレベル（DEBUG, INFO, WARN, ERROR）
 * - タイムスタンプとソース名の表示
 * - グローバル設定の共有
 *
 * @example
 * ```typescript
 * const logger = getLogger('MyComponent')
 * logger.info('処理開始')
 * logger.error('エラー発生', error)
 * ```
 */
export { LogLevel, Logger, configureLogger, getLogger } from "./logger";

/**
 * Logger関連の型定義
 */
export type { LoggerConfig } from "./logger";

// ========================================
// Storage - 永続データストレージ
// ========================================

/**
 * 永続データストレージ
 *
 * @remarks
 * - LocalStorageの抽象化レイヤー
 * - 型安全なデータ保存・取得
 * - 自動フォールバック（MemoryStorage）
 *
 * @example
 * ```typescript
 * const storage = getStorage()
 * storage.setValue('userName', 'John Doe')
 * const name = storage.getValue<string>('userName')
 * ```
 */
export { LocalStorageStorage, MemoryStorage, getStorage, resetStorage } from "./storage";

/**
 * Storage関連の型定義
 */
export type { IStorage } from "./storage";
