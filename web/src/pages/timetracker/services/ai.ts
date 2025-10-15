/**
 * AI自動紐づけサービス
 *
 * イベントとWorkItemの紐づけをAIで推論します
 */

import { infer, type AIInferenceRequest } from "@/core/ai/service";
import { HistoryManager, type HistoryEntry } from "@/core/history";
import { getLogger } from "@/lib";
import type { Event, WorkItem } from "@/types";
import { WorkItemUtils } from "@/types/utils";
import type { LinkingEventWorkItemPair } from "../models";

const logger = getLogger("AI Linking Service");

/**
 * AI紐づけリクエスト
 */
export interface AILinkingRequest {
    /** APIキー */
    apiKey: string;
    /** 現在紐づけ済みのペア */
    linkedPairs: LinkingEventWorkItemPair[];
    /** 未紐づけイベント */
    unlinkedEvents: Event[];
    /** 利用可能なWorkItemリスト */
    workItems: WorkItem[];
    /** 履歴を使用するか */
    useHistory: boolean;
}

/**
 * AI紐づけ結果
 */
export interface AILinkingResult {
    /** 成功したか */
    ok: boolean;
    /** エラーメッセージ（失敗時） */
    errorMessage?: string;
    /** 推論された紐づけ（成功時） */
    suggestions?: Array<{
        eventUuid: string;
        workItemId: string;
        confidence: number;
        reason: string;
    }>;
}

/**
 * WorkItem情報を簡潔にフォーマット
 */
function formatWorkItemForAI(workItem: WorkItem, includeChildren: boolean = true): string {
    const children = WorkItemUtils.getMostNestChildren([workItem]);

    if (!includeChildren || children.length === 0) {
        return `- ID:${workItem.id}, 名前:"${workItem.name}"`;
    }

    const childrenInfo = children
        .map((child) => `  - ID:${child.id}, 名前:"${child.name}", パス:"${child.folderPath}"`)
        .join("\n");

    return `- ID:${workItem.id}, 名前:"${workItem.name}"\n${childrenInfo}`;
}

/**
 * 紐づけ傾向を分析してシステムプロンプトを生成
 */
function generateSystemPrompt(
    linkedPairs: LinkingEventWorkItemPair[],
    historyEntries: HistoryEntry[],
    workItems: WorkItem[],
    useHistory: boolean,
): string {
    // WorkItem全体の構造を説明
    const workItemStructure = workItems.map((wi) => formatWorkItemForAI(wi, true)).join("\n\n");

    // 現在の紐づけ傾向を分析
    const currentLinkingPatterns = linkedPairs
        .map((pair) => {
            const eventName = pair.event.name || "(無題)";
            const workItemName = pair.linkingWorkItem.workItem.name;
            const workItemId = pair.linkingWorkItem.workItem.id;
            return `イベント:"${eventName}" → WorkItem:ID=${workItemId}, 名前="${workItemName}"`;
        })
        .join("\n");

    // 履歴からの傾向分析
    let historyPattern = "";
    if (useHistory && historyEntries.length > 0) {
        const topHistory = historyEntries.sort((a, b) => b.useCount - a.useCount).slice(0, 20);

        historyPattern =
            "\n\n【過去の紐づけ履歴（頻度順）】\n" +
            topHistory
                .map((entry) => {
                    return `イベント:"${entry.eventName}" → WorkItem:ID=${entry.itemId}, 名前="${entry.itemName}" (使用回数:${entry.useCount})`;
                })
                .join("\n");
    }

    return `あなたは勤務管理システムのAIアシスタントです。カレンダーイベントを適切なWorkItem（作業項目）に自動紐づけする専門家です。

【WorkItem構造】
WorkItemには大きく2つのカテゴリがあります：
1. 開発案件：要件定義、設計、実装、テスト、リリース、ミーティング、プロジェクト管理など
2. 非開発案件：休暇、保守、障害対応、システム運用、サービス運用、調査、管理業務、ミーティングなど

【利用可能なWorkItemリスト】
${workItemStructure}

【現在の紐づけ傾向】
${currentLinkingPatterns || "(まだ紐づけがありません)"}
${historyPattern}

【紐づけルール】
1. イベント名とWorkItem名の類似性を重視
2. 現在の紐づけ傾向を学習して一貫性を保つ
3. 履歴データから頻度の高いパターンを優先
4. プロジェクト名やキーワードの一致を確認
5. MTG、ミーティング → ミーティング系のWorkItem
6. 開発、実装、設計 → 該当する開発案件
7. 保守、障害 → 非開発案件の該当項目
8. 曖昧な場合は最も汎用的なWorkItemを選択

【出力形式】
以下のJSON形式で必ず回答してください：
{
  "suggestions": [
    {
      "eventUuid": "イベントのUUID",
      "workItemId": "WorkItemのID",
      "confidence": 0.0～1.0の信頼度,
      "reason": "紐づけ理由の簡潔な説明"
    }
  ]
}

注意：必ずJSON形式のみを返してください。他の説明文は不要です。`;
}

/**
 * ユーザープロンプトを生成
 */
function generateUserPrompt(unlinkedEvents: Event[]): string {
    const eventList = unlinkedEvents
        .map((event, index) => {
            const name = event.name || "(無題)";
            const organizer = event.organizer ? `, 主催者:${event.organizer}` : "";
            const location = event.location ? `, 場所:${event.location}` : "";
            return `${index + 1}. UUID:${event.uuid}, 件名:"${name}"${organizer}${location}`;
        })
        .join("\n");

    return `以下のイベントを適切なWorkItemに紐づけてください：

【未紐づけイベント】
${eventList}

上記のイベントそれぞれに対して、最適なWorkItemを推論してJSON形式で回答してください。`;
}

/**
 * AIレスポンスをパース
 */
function parseAIResponse(content: string): AILinkingResult {
    try {
        // JSONのみを抽出（マークダウンのコードブロックも考慮）
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                ok: false,
                errorMessage: "AIの応答がJSON形式ではありません",
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
            return {
                ok: false,
                errorMessage: "AIの応答に suggestions が含まれていません",
            };
        }

        // バリデーション
        const validSuggestions = parsed.suggestions.filter((s: any) => {
            return s.eventUuid && s.workItemId && typeof s.confidence === "number" && s.reason;
        });

        if (validSuggestions.length === 0) {
            return {
                ok: false,
                errorMessage: "有効な紐づけ提案が見つかりませんでした",
            };
        }

        return {
            ok: true,
            suggestions: validSuggestions,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "パースエラー";
        logger.error("AIレスポンスのパースに失敗:", errorMessage);
        return {
            ok: false,
            errorMessage: errorMessage,
        };
    }
}

/**
 * AI自動紐づけを実行
 */
export async function autoLinkWithAI(request: AILinkingRequest): Promise<AILinkingResult> {
    logger.info("AI自動紐づけ開始", {
        linkedCount: request.linkedPairs.length,
        unlinkedCount: request.unlinkedEvents.length,
        useHistory: request.useHistory,
    });

    // 未紐づけイベントがない場合
    if (request.unlinkedEvents.length === 0) {
        return {
            ok: true,
            suggestions: [],
        };
    }

    // 履歴を取得
    let historyEntries: HistoryEntry[] = [];
    if (request.useHistory) {
        const historyManager = new HistoryManager();
        historyManager.load();
        const allHistory = historyManager.getAll();

        // WorkItemが存在するものだけをフィルタ
        const validWorkItemIds = new Set(WorkItemUtils.getMostNestChildren(request.workItems).map((w) => w.id));

        // MapからArrayに変換してフィルタ
        historyEntries = Array.from(allHistory.values()).filter((entry) => validWorkItemIds.has(entry.itemId));

        logger.info(`履歴エントリ取得: ${historyEntries.length}件`);
    }

    // プロンプト生成
    const systemPrompt = generateSystemPrompt(
        request.linkedPairs,
        historyEntries,
        request.workItems,
        request.useHistory,
    );
    const userPrompt = generateUserPrompt(request.unlinkedEvents);

    // AI推論実行
    const aiRequest: AIInferenceRequest = {
        apiKey: request.apiKey,
        system: systemPrompt,
        user: userPrompt,
    };

    const aiResponse = await infer(aiRequest);

    if (!aiResponse.ok) {
        logger.error("AI推論失敗:", aiResponse.errorMessage);
        return {
            ok: false,
            errorMessage: aiResponse.errorMessage,
        };
    }

    // レスポンスをパース
    const result = parseAIResponse(aiResponse.content);

    if (result.ok && result.suggestions) {
        logger.info(`AI推論成功: ${result.suggestions.length}件の提案`);
        result.suggestions.forEach((s) => {
            logger.info(
                `  - Event:${s.eventUuid} → WorkItem:${s.workItemId} (信頼度:${s.confidence}, 理由:${s.reason})`,
            );
        });
    }

    return result;
}
