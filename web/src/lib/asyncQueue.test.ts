/**
 * AsyncQueue Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncQueue, HttpRequestQueue } from "./asyncQueue";

// テスト用の具象クラス
class TestQueue extends AsyncQueue<string, string> {
    protected async execute(data: string, abortController: AbortController): Promise<string> {
        // AbortControllerのシグナルを監視
        return new Promise<string>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                resolve(`Processed: ${data}`);
            }, 100);

            abortController.signal.addEventListener("abort", () => {
                clearTimeout(timeoutId);
                reject(new Error("Aborted"));
            });
        });
    }
}

// タイムアウトをテストするための遅いクラス
class SlowTestQueue extends AsyncQueue<string, string> {
    protected async execute(data: string, abortController: AbortController): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // タイムアウトより長い処理
            const timeoutId = setTimeout(() => {
                resolve(`Processed: ${data}`);
            }, 5000);

            abortController.signal.addEventListener("abort", () => {
                clearTimeout(timeoutId);
                reject(new Error("Aborted"));
            });
        });
    }
}

describe("AsyncQueue", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("基本機能", () => {
        it("タスクをキューに追加して処理できる", async () => {
            const queue = new TestQueue(10);
            const result = await queue.enqueueAsync("test-data");
            expect(result).toBe("Processed: test-data");
        });

        it("複数のタスクを順次処理できる", async () => {
            const queue = new TestQueue(10);
            const results = await Promise.all([
                queue.enqueueAsync("data1"),
                queue.enqueueAsync("data2"),
                queue.enqueueAsync("data3"),
            ]);

            expect(results).toEqual(["Processed: data1", "Processed: data2", "Processed: data3"]);
        });
    });

    describe("タイムアウト機能", () => {
        it("タイムアウトが発生した場合、処理が中断される", async () => {
            const queue = new SlowTestQueue(10, 500); // 500msタイムアウト

            await expect(queue.enqueueAsync("slow-data")).rejects.toThrow("Aborted");
        });

        it("タイムアウト内に完了した場合、正常に処理される", async () => {
            const queue = new TestQueue(10, 1000); // 1秒タイムアウト
            const result = await queue.enqueueAsync("test-data");
            expect(result).toBe("Processed: test-data");
        });
    });

    describe("AbortController", () => {
        it("executeにAbortControllerが渡される", async () => {
            let receivedAbortController: AbortController | null = null;

            class SpyQueue extends AsyncQueue<string, string> {
                protected async execute(data: string, abortController: AbortController): Promise<string> {
                    receivedAbortController = abortController;
                    return `Processed: ${data}`;
                }
            }

            const queue = new SpyQueue(10);
            await queue.enqueueAsync("test-data");

            expect(receivedAbortController).toBeInstanceOf(AbortController);
        });
    });
});

describe("HttpRequestQueue", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe("タイムアウト機能", () => {
        it("GETリクエストでタイムアウトが設定される", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                status: 200,
                text: async () => "OK",
            });
            global.fetch = mockFetch;

            const queue = new HttpRequestQueue(10, 2, {}, 30000);
            await queue.enqueueAsync({ url: "https://example.com" });

            expect(mockFetch).toHaveBeenCalledWith(
                "https://example.com",
                expect.objectContaining({
                    method: "GET",
                    signal: expect.any(AbortSignal),
                }),
            );
        });

        it("POSTリクエストでタイムアウトが設定される", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                status: 200,
                text: async () => "OK",
            });
            global.fetch = mockFetch;

            const queue = new HttpRequestQueue(10, 2, {}, 30000);
            await queue.enqueueAsync({
                url: "https://example.com",
                json: { data: "test" },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "https://example.com",
                expect.objectContaining({
                    method: "POST",
                    signal: expect.any(AbortSignal),
                }),
            );
        });

        it("AbortErrorが発生した場合、タイムアウトエラーとして処理される", async () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";

            const mockFetch = vi.fn().mockRejectedValue(abortError);
            global.fetch = mockFetch;

            const queue = new HttpRequestQueue(10, 0, {}, 30000); // リトライなし
            await expect(queue.enqueueAsync({ url: "https://example.com" })).rejects.toThrow("Request timeout");
        });
    });

    describe("リトライ機能", () => {
        it("通常のエラーの場合、リトライが実行される", async () => {
            const mockFetch = vi
                .fn()
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce({
                    status: 200,
                    text: async () => "OK",
                });
            global.fetch = mockFetch;

            const queue = new HttpRequestQueue(10, 2, {}, 30000);
            const result = await queue.enqueueAsync({ url: "https://example.com" });

            expect(result.status).toBe(200);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("AbortErrorの場合、リトライせず即座にスローする", async () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";

            const mockFetch = vi.fn().mockRejectedValue(abortError);
            global.fetch = mockFetch;

            const queue = new HttpRequestQueue(10, 2, {}, 30000); // リトライ2回
            await expect(queue.enqueueAsync({ url: "https://example.com" })).rejects.toThrow("Request timeout");

            // AbortErrorの場合は1回のみ呼ばれる（リトライしない）
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });
});
