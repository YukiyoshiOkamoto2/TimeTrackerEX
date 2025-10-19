/**
 * Logger - ログ管理
 *
 * Pythonのlogger.pyをTypeScriptに移植したものです。
 * ブラウザ環境でのログ出力を管理します。
 */

/**
 * ログレベル
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * ログ設定
 */
export interface LoggerConfig {
    /** 最小ログレベル (デフォルト: INFO) */
    level?: LogLevel;
    /** ログメッセージの最大文字数 (デフォルト: 1000) */
    maxMessageLength?: number;
    /** タイムスタンプを表示するか (デフォルト: true) */
    showTimestamp?: boolean;
    /** ログレベルを表示するか (デフォルト: true) */
    showLevel?: boolean;
    /** ファイル名を表示するか (デフォルト: true) */
    showSource?: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<LoggerConfig> = {
    level: LogLevel.INFO,
    maxMessageLength: 1000,
    showTimestamp: true,
    showLevel: true,
    showSource: true,
};

const MAX_LOG_HISTORY = 2000;

export type LogEntry = {
    timestamp: Date;
    level: LogLevel;
    message: string;
    source: string;
    args: unknown[];
};

const logHistory: LogEntry[] = [];

function addLogEntry(entry: LogEntry): void {
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
        logHistory.splice(0, logHistory.length - MAX_LOG_HISTORY);
    }
}

/**
 * カスタムロガークラス
 *
 * ブラウザのconsoleをラップし、ログレベルや文字数制限などを提供します。
 *
 * @example
 * ```typescript
 * const logger = new Logger('MyComponent');
 * logger.info('初期化完了');
 * logger.error('エラーが発生しました', error);
 * ```
 */
export class Logger {
    private name: string;
    private config: Required<LoggerConfig>;

    constructor(name: string = "App", config?: LoggerConfig) {
        this.name = name;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * DEBUGレベルのログを出力
     */
    debug(message: unknown, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    /**
     * INFOレベルのログを出力
     */
    info(message: unknown, ...args: unknown[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    /**
     * WARNレベルのログを出力
     */
    warn(message: unknown, ...args: unknown[]): void {
        this.log(LogLevel.WARN, message, ...args);
    }

    /**
     * ERRORレベルのログを出力
     */
    error(message: unknown, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }

    /**
     * ログを出力
     */
    private log(level: LogLevel, message: unknown, ...args: unknown[]): void {
        // ログレベルチェック
        if (level < this.config.level) {
            return;
        }

        const timestamp = new Date();
        const messageStr = this.truncateMessage(message);

        // メッセージのフォーマット
        const formattedMessage = this.formatMessage(level, messageStr, timestamp);

        addLogEntry({
            timestamp,
            level,
            message: messageStr,
            source: this.name,
            args,
        });

        // コンソール出力
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, ...args);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, ...args);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, ...args);
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, ...args);
                break;
        }
    }

    /**
     * メッセージをフォーマット
     */
    private formatMessage(level: LogLevel, message: string, timestamp: Date): string {
        const parts: string[] = [];

        // タイムスタンプ
        if (this.config.showTimestamp) {
            const timestampString = timestamp.toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
            parts.push(timestampString);
        }

        // ログレベル
        if (this.config.showLevel) {
            parts.push(`[${LogLevel[level]}]`);
        }

        // メッセージ本体
        parts.push(message);

        // ソース情報
        if (this.config.showSource) {
            parts.push(`: ${this.name}`);
        }

        return parts.join(" ");
    }

    /**
     * メッセージを切り詰め
     */
    private truncateMessage(message: unknown): string {
        const messageStr = message === null || message === undefined ? "None" : String(message);

        if (messageStr.length > this.config.maxMessageLength) {
            return messageStr.substring(0, this.config.maxMessageLength) + "...";
        }

        return messageStr;
    }

    /**
     * ログレベルを設定
     */
    setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    /**
     * 設定を更新
     */
    updateConfig(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

/**
 * グローバルロガーインスタンス
 */
let globalLogger: Logger | null = null;

/**
 * グローバルロガーを取得
 *
 * @example
 * ```typescript
 * const logger = getLogger('MyComponent');
 * logger.info('メッセージ');
 * ```
 */
export function getLogger(name?: string): Logger {
    if (!globalLogger) {
        globalLogger = new Logger();
    }

    if (name) {
        return new Logger(name, globalLogger["config"]);
    }

    return globalLogger;
}

/**
 * グローバルロガーの設定を更新
 *
 * @example
 * ```typescript
 * configureLogger({ level: LogLevel.DEBUG });
 * ```
 */
export function configureLogger(config: LoggerConfig): void {
    if (!globalLogger) {
        globalLogger = new Logger("App", config);
    } else {
        globalLogger.updateConfig(config);
    }
}

/**
 * 直近のログ履歴を取得
 */
export function getLogHistory(limit?: number): LogEntry[] {
    if (limit && limit > 0) {
        return logHistory.slice(-limit).map((entry) => ({ ...entry, timestamp: new Date(entry.timestamp.getTime()) }));
    }

    return logHistory.map((entry) => ({ ...entry, timestamp: new Date(entry.timestamp.getTime()) }));
}
