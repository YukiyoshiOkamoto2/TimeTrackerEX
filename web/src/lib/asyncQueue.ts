/**
 * AsyncQueue - 非同期キュー処理
 *
 * Pythonのasync_queue.pyをTypeScriptに移植したものです。
 * 非同期タスクをキューに入れて順次処理します。
 */

import { getLogger } from "./logger";

const logger = getLogger("AsyncQueue");

/**
 * 抽象非同期キュークラス
 */
export abstract class AsyncQueue<TData, TResult> {
    private queue: Array<{
        data: TData;
        resolve: (value: TResult) => void;
        reject: (error: Error) => void;
    }> = [];
    protected waitTime: number;
    protected timeoutMs: number;
    private processing = false;

    constructor(waitTimeMs: number, timeoutMs = 30000) {
        this.waitTime = waitTimeMs;
        this.timeoutMs = timeoutMs;
        this.startProcessing();
    }

    /**
     * データをキューに追加して結果を待つ
     */
    async enqueueAsync(data: TData): Promise<TResult> {
        logger.debug("Enqueue:", data);

        return new Promise<TResult>((resolve, reject) => {
            this.queue.push({ data, resolve, reject });
        });
    }

    /**
     * キューの処理を開始
     */
    private startProcessing(): void {
        this.processQueue();
    }

    /**
     * キューを順次処理
     */
    private async processQueue(): Promise<void> {
        // 意図的な永久ループ: 内部で待機(sleep)しつつキュー監視
        // 条件式は固定 true であり抜け条件は存在しない（インスタンスライフサイクルに従う）
        // eslint-disable-next-line no-constant-condition
        while (true) {
            await this.sleep(this.waitTime);

            if (this.queue.length > 0 && !this.processing) {
                this.processing = true;
                logger.debug(`Start. Queue task: ${this.queue.length}`);

                const item = this.queue.shift();
                if (item) {
                    const abortController = new AbortController();
                    const timeoutId = setTimeout(() => {
                        logger.warn(`Task timeout (${this.timeoutMs}ms). Aborting...`);
                        abortController.abort();
                    }, this.timeoutMs);

                    try {
                        const result = await this.execute(item.data, abortController);
                        item.resolve(result);
                    } catch (error) {
                        logger.error("Queue task error:", error);
                        if (error instanceof Error) {
                            logger.error("Stack:", error.stack);
                        }
                        item.reject(error instanceof Error ? error : new Error(String(error)));
                    } finally {
                        clearTimeout(timeoutId);
                        logger.debug("End Queue task.");
                        this.processing = false;
                    }
                }
            }
        }
    }

    /**
     * 指定時間スリープ
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 実際の処理を実装する抽象メソッド
     */
    protected abstract execute(data: TData, abort: AbortController): Promise<TResult>;
}

/**
 * HTTPリクエストのレスポンス
 */
export interface HttpRequestQueueResponse {
    status: number;
    body?: string;
}

/**
 * HTTPリクエストのデータ
 */
export interface HttpRequestData {
    url: string;
    headers?: Record<string, string>;
    json?: unknown;
}

/**
 * HTTPリクエストキュー
 */
export class HttpRequestQueue extends AsyncQueue<HttpRequestData, HttpRequestQueueResponse> {
    private headers?: Record<string, string>;
    private retryCount: number;

    constructor(waitTimeMs: number, retryCount = 2, headers?: Record<string, string>, timeoutMs = 30000) {
        super(waitTimeMs, timeoutMs);
        this.headers = headers;
        this.retryCount = retryCount;
    }

    /**
     * HTTPリクエストを実行
     */
    protected async execute(
        data: HttpRequestData,
        abortController: AbortController,
    ): Promise<HttpRequestQueueResponse> {
        if (!data.url) {
            throw new Error("url is required");
        }

        const { url, json } = data;
        let headers = { ...data.headers };

        if (this.headers) {
            headers = { ...headers, ...this.headers };
        }

        logger.info("Request:", url);
        logger.debug("Headers:", headers);
        logger.debug("json:", json);

        let qResponse: HttpRequestQueueResponse | null = null;
        let count = 0;

        while (qResponse === null) {
            try {
                let response: Response;

                if (json === undefined) {
                    // GET request
                    response = await fetch(url, {
                        method: "GET",
                        headers,
                        signal: abortController.signal,
                    });
                } else {
                    // POST request
                    headers["Content-Type"] = "application/json";
                    response = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(json),
                        signal: abortController.signal,
                    });
                }

                logger.debug("Response:", response);
                qResponse = {
                    status: response.status,
                    body: await response.text(),
                };
            } catch (error) {
                // AbortErrorの場合は即座にスロー
                if (error instanceof Error && error.name === "AbortError") {
                    logger.error("Request aborted due to timeout");
                    throw new Error("Request timeout");
                }

                logger.error("Request error:", error);
                if (error instanceof Error) {
                    logger.error("Stack:", error.stack);
                }

                if (count >= this.retryCount) {
                    throw error;
                }

                count++;
                logger.info(`Retry count: ${count}...`);
                await this.sleep(this.waitTime);
            }
        }

        logger.info("Response:", qResponse);
        return qResponse;
    }
}
