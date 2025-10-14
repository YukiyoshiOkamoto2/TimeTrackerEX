import { getLogger } from "@/lib";

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

async function infer(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    logger.info("");
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
        });

        if (!response.ok) {
            const errorMessage = await response.json().catch(() => ({ error: { message: response.statusText } }));
            return {
                ok: false,
                errorMessage,
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            errorMessage,
        };
    }
}
