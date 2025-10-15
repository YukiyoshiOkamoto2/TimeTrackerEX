import { getLogger } from "@/lib";
import { AsyncQueue } from "@/lib/asyncQueue";

const logger = getLogger("AI Service");

const url = "https://askul-gpt.askul-it.com/v1/chat/completions";
const headerBase = {
    "Content-Type": "application/json",
};
const bodyBase = {
    model: "gpt-4.1",
    temperature: 0.7,
    max_tokens: 500,
};

export interface AIInferenceRequest {
    apiKey: string;
    user: string;
    system: string;
    abortController?: AbortController;
}

export type AIInferenceResponseOK = {
    ok: true;
    content: string;
};

export type AIInferenceResponseNG = {
    ok: false;
    errorMessage: string;
};

export type AIInferenceResponse = AIInferenceResponseOK | AIInferenceResponseNG;

/**
 * AI推論キューのデータ型
 */
interface AIInferenceQueueData {
    request: AIInferenceRequest;
}

/**
 * AI推論用のキュークラス
 * レート制限を考慮して1秒間隔で処理
 */
class AIInferenceQueue extends AsyncQueue<AIInferenceQueueData, AIInferenceResponse> {
    constructor() {
        // 1秒間隔で処理、タイムアウト60秒
        super(1000, 60000);
    }

    protected async execute(data: AIInferenceQueueData, abort: AbortController): Promise<AIInferenceResponse> {
        try {
            // AbortControllerをリクエストに追加
            const requestWithAbort: AIInferenceRequest = {
                ...data.request,
                abortController: abort,
            };
            return await infer(requestWithAbort);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("AI推論エラー:", errorMessage);
            return {
                ok: false,
                errorMessage,
            };
        }
    }
}

// グローバルなAI推論キューインスタンス
const aiInferenceQueue = new AIInferenceQueue();

/**
 * AI推論をキューに追加して実行
 */
export async function inferWithQueue(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    return await aiInferenceQueue.enqueueAsync({ request });
}

export async function infer(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    logger.info("AI Request -> " + JSON.stringify({ apiKey: "***", system: request.system, user: request.user }));
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...headerBase,
                Authorization: `Bearer ${request.apiKey}`,
            },
            body: JSON.stringify({
                ...bodyBase,
                messages: [
                    { role: "system", content: request.system },
                    { role: "user", content: request.user },
                ],
            }),
            signal: request.abortController?.signal,
        });

        if (!response.ok) {
            // 401エラーの場合はAPIキーが不正
            if (response.status === 401) {
                logger.info("AI Response NG -> 401 Unauthorized");
                return {
                    ok: false,
                    errorMessage: "APIキーが無効です。正しいAPIキーを入力してください。",
                };
            }

            // その他のエラー
            const errorMessage = JSON.stringify(await response.json());
            logger.info("AI Response NG -> " + errorMessage);
            return {
                ok: false,
                errorMessage,
            };
        }

        const data = await response.json();
        const content = String(data.choices?.[0]?.message?.content);
        logger.info("AI Response -> " + content);

        if (!content) {
            return {
                ok: false,
                errorMessage: "No response from AI",
            };
        }

        return {
            ok: true,
            content,
        };
    } catch (error) {
        // AbortErrorの場合はタイムアウトメッセージ
        if (error instanceof Error && error.name === "AbortError") {
            logger.error("AI Request aborted (timeout)");
            return {
                ok: false,
                errorMessage: "AI推論がタイムアウトしました。時間をおいて再度お試しください。",
            };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("AI Request error:", errorMessage);
        return {
            ok: false,
            errorMessage,
        };
    }
}
