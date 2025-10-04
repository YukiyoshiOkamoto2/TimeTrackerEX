/**
 * Logger Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureLogger, getLogger, Logger, LogLevel } from "./logger";

describe("Logger", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleDebugSpy: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleInfoSpy: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleWarnSpy: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
        consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("基本的なログ出力", () => {
        it("DEBUGレベルのログを出力できる", () => {
            const logger = new Logger("TestComponent", { level: LogLevel.DEBUG });
            logger.debug("デバッグメッセージ");

            expect(consoleDebugSpy).toHaveBeenCalledOnce();
            const [message] = consoleDebugSpy.mock.calls[0];
            expect(message).toContain("[DEBUG]");
            expect(message).toContain("デバッグメッセージ");
            expect(message).toContain("TestComponent");
        });

        it("INFOレベルのログを出力できる", () => {
            const logger = new Logger("TestComponent");
            logger.info("情報メッセージ");

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).toContain("[INFO]");
            expect(message).toContain("情報メッセージ");
        });

        it("WARNレベルのログを出力できる", () => {
            const logger = new Logger("TestComponent");
            logger.warn("警告メッセージ");

            expect(consoleWarnSpy).toHaveBeenCalledOnce();
            const [message] = consoleWarnSpy.mock.calls[0];
            expect(message).toContain("[WARN]");
            expect(message).toContain("警告メッセージ");
        });

        it("ERRORレベルのログを出力できる", () => {
            const logger = new Logger("TestComponent");
            logger.error("エラーメッセージ");

            expect(consoleErrorSpy).toHaveBeenCalledOnce();
            const [message] = consoleErrorSpy.mock.calls[0];
            expect(message).toContain("[ERROR]");
            expect(message).toContain("エラーメッセージ");
        });
    });

    describe("ログレベルフィルタリング", () => {
        it("INFOレベルに設定した場合、DEBUGログは出力されない", () => {
            const logger = new Logger("TestComponent", { level: LogLevel.INFO });
            logger.debug("デバッグメッセージ");
            logger.info("情報メッセージ");

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).toHaveBeenCalledOnce();
        });

        it("WARNレベルに設定した場合、INFO以下のログは出力されない", () => {
            const logger = new Logger("TestComponent", { level: LogLevel.WARN });
            logger.debug("デバッグメッセージ");
            logger.info("情報メッセージ");
            logger.warn("警告メッセージ");

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledOnce();
        });

        it("ERRORレベルに設定した場合、ERRORのみ出力される", () => {
            const logger = new Logger("TestComponent", { level: LogLevel.ERROR });
            logger.debug("デバッグメッセージ");
            logger.info("情報メッセージ");
            logger.warn("警告メッセージ");
            logger.error("エラーメッセージ");

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });

        it("setLevelでログレベルを変更できる", () => {
            const logger = new Logger("TestComponent", { level: LogLevel.WARN });
            logger.info("情報メッセージ1");
            expect(consoleInfoSpy).not.toHaveBeenCalled();

            logger.setLevel(LogLevel.INFO);
            logger.info("情報メッセージ2");
            expect(consoleInfoSpy).toHaveBeenCalledOnce();
        });
    });

    describe("メッセージのフォーマット", () => {
        it('nullとundefinedを"None"として扱う', () => {
            const logger = new Logger("TestComponent");
            logger.info(null);
            logger.info(undefined);

            expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
            const [message1] = consoleInfoSpy.mock.calls[0];
            const [message2] = consoleInfoSpy.mock.calls[1];
            expect(message1).toContain("None");
            expect(message2).toContain("None");
        });

        it("長いメッセージを切り詰める", () => {
            const logger = new Logger("TestComponent", { maxMessageLength: 10 });
            const longMessage = "a".repeat(100);
            logger.info(longMessage);

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).toContain("aaaaaaaaaa...");
        });

        it("オブジェクトを文字列に変換できる", () => {
            const logger = new Logger("TestComponent");
            const obj = { key: "value" };
            logger.info(obj);

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).toContain("[object Object]");
        });

        it("数値を文字列に変換できる", () => {
            const logger = new Logger("TestComponent");
            logger.info(123);

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).toContain("123");
        });
    });

    describe("フォーマットオプション", () => {
        it("タイムスタンプを非表示にできる", () => {
            const logger = new Logger("TestComponent", { showTimestamp: false });
            logger.info("メッセージ");

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            // タイムスタンプは日付形式なので、含まれていないことを確認
            expect(message).not.toMatch(/\d{4}\/\d{2}\/\d{2}/);
        });

        it("ログレベルを非表示にできる", () => {
            const logger = new Logger("TestComponent", { showLevel: false });
            logger.info("メッセージ");

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).not.toContain("[INFO]");
        });

        it("ソース情報を非表示にできる", () => {
            const logger = new Logger("TestComponent", { showSource: false });
            logger.info("メッセージ");

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).not.toContain("TestComponent");
        });

        it("updateConfigで設定を更新できる", () => {
            const logger = new Logger("TestComponent");
            logger.info("メッセージ1");

            const [message1] = consoleInfoSpy.mock.calls[0];
            expect(message1).toContain("[INFO]");

            logger.updateConfig({ showLevel: false });
            logger.info("メッセージ2");

            const [message2] = consoleInfoSpy.mock.calls[1];
            expect(message2).not.toContain("[INFO]");
        });
    });

    describe("追加引数のサポート", () => {
        it("複数の引数を渡せる", () => {
            const logger = new Logger("TestComponent");
            const obj = { key: "value" };
            logger.info("メッセージ", obj, 123);

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const args = consoleInfoSpy.mock.calls[0];
            expect(args).toHaveLength(3);
            expect(args[1]).toEqual(obj);
            expect(args[2]).toBe(123);
        });
    });

    describe("グローバルロガー", () => {
        it("getLoggerでロガーを取得できる", () => {
            const logger = getLogger();
            expect(logger).toBeInstanceOf(Logger);
        });

        it("名前を指定してロガーを取得できる", () => {
            const logger = getLogger("CustomComponent");
            logger.info("メッセージ");

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const [message] = consoleInfoSpy.mock.calls[0];
            expect(message).toContain("CustomComponent");
        });

        it("configureLoggerでグローバル設定を更新できる", () => {
            configureLogger({ level: LogLevel.DEBUG });
            const logger = getLogger("TestComponent");
            logger.debug("デバッグメッセージ");

            expect(consoleDebugSpy).toHaveBeenCalledOnce();

            // 設定を元に戻す
            configureLogger({ level: LogLevel.INFO });
        });
    });
});
