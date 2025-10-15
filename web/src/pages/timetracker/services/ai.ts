/**
 * AI自動紐づけサービス
 *
 * イベントとWorkItemの紐づけをAIで推論します
 */

import { inferWithQueue, type AIInferenceRequest } from "@/core/ai/service";
import { HistoryManager, type HistoryEntry } from "@/core/history";
import { getLogger } from "@/lib";
import type { Event, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types/utils";
import type { LinkingEventWorkItemPair } from "../models";

const logger = getLogger("AI Linking Service");

// 定数定義
const CHUNK_SIZE = 10; // AIに送信するイベントのチャンクサイズ
const MAX_HISTORY_ENTRIES = 20; // システムプロンプトに含める履歴の最大数

/**
 * チャンク処理の進捗情報
 */
export interface ChunkProgress {
    /** 現在のチャンク番号（1始まり） */
    current: number;
    /** 全チャンク数 */
    total: number;
    /** 現在のチャンク内のイベント数 */
    chunkSize: number;
    /** 処理状況 */
    status: "processing" | "success" | "error";
    /** 成功した場合の提案数（statusがsuccessの場合） */
    suggestionCount?: number;
    /** エラーメッセージ（statusがerrorの場合） */
    errorMessage?: string;
}

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
    /** チャンク処理の進捗コールバック（オプション） */
    onChunkProgress?: (progress: ChunkProgress) => void;
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
 * イベントをキーでグループ化（EventUtils.getKeyを使用）
 */
function groupEventsByKey(events: Event[]): Map<string, Event[]> {
    const eventMap = new Map<string, Event[]>();

    for (const event of events) {
        const key = EventUtils.getKey(event);
        if (!eventMap.has(key)) {
            eventMap.set(key, []);
        }
        eventMap.get(key)!.push(event);
    }

    return eventMap;
}

/**
 * 紐づけ済みペアから現在の紐づけパターンを生成
 */
function formatCurrentLinkingPatterns(linkedPairs: LinkingEventWorkItemPair[]): string {
    if (linkedPairs.length === 0) {
        return "(まだ紐づけがありません)";
    }

    const linkedEventMap = groupEventsByKey(linkedPairs.map((p) => p.event));

    const patterns: string[] = [];
    for (const [eventKey] of linkedEventMap.entries()) {
        // 同じイベントキーを持つペアを取得
        const pairs = linkedPairs.filter((p) => EventUtils.getKey(p.event) === eventKey);
        if (pairs.length === 0) continue;

        const firstPair = pairs[0];
        const eventName = firstPair.event.name || "(無題)";
        const workItemName = firstPair.linkingWorkItem.workItem.name;
        const workItemId = firstPair.linkingWorkItem.workItem.id;
        const count = pairs.length > 1 ? ` (${pairs.length}件)` : "";

        patterns.push(`イベント:"${eventName}"${count} → WorkItem:ID=${workItemId}, 名前="${workItemName}"`);
    }

    return patterns.join("\n");
}

/**
 * 履歴エントリから過去の紐づけパターンを生成
 */
function formatHistoryPatterns(historyEntries: HistoryEntry[], useHistory: boolean): string {
    if (!useHistory || historyEntries.length === 0) {
        return "";
    }

    const topHistory = historyEntries.sort((a, b) => b.useCount - a.useCount).slice(0, MAX_HISTORY_ENTRIES);

    const patterns = topHistory.map((entry) => {
        return `イベント:"${entry.eventName}" → WorkItem:ID=${entry.itemId}, 名前="${entry.itemName}" (使用回数:${entry.useCount})`;
    });

    return "\n\n【過去の紐づけ履歴（頻度順）】\n" + patterns.join("\n");
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
    const currentLinkingPatterns = formatCurrentLinkingPatterns(linkedPairs);

    // 履歴からの傾向分析
    const historyPattern = formatHistoryPatterns(historyEntries, useHistory);

    return `あなたは勤務管理システムのAIアシスタントです。カレンダーイベントを適切なWorkItem（作業項目）に自動紐づけする専門家です。

【WorkItem構造】
WorkItemには大きく2つのカテゴリがあります：
1. 開発案件：要件定義、設計、実装、テスト、リリース、ミーティング、プロジェクト管理など
2. 非開発案件：保守、ミーティング、調査、管理業務、システム運用、サービス運用、障害対応など

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
8. 曖昧な場合は紐づけ不要（返却不要）

【出力形式】
以下のCSV形式で必ず回答してください（ヘッダーなし）：
イベントID,WorkItemID,信頼度,理由

例：
1,1234567,0.9,イベント名とWorkItem名が一致
2,1234567,0.8,過去の紐づけ履歴から推測

注意事項：
- 各行は「イベントID,WorkItemID,信頼度,理由」の形式
- イベントIDは1から始まる番号
- 信頼度は0.0～1.0の小数
- 理由は簡潔に（カンマを含む場合は不要）
- CSV形式のみを返し、他の説明文は不要`;
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
            return `${index + 1}. 件名:"${name}"${organizer}${location}`;
        })
        .join("\n");

    return `以下のイベントを適切なWorkItemに紐づけてください：

【未紐づけイベント】
${eventList}

上記のイベントそれぞれに対して、最適なWorkItemを推論してJSON形式で回答してください。
回答時は各イベントをID（1から${unlinkedEvents.length}までの番号）で指定してください。`;
}

/**
 * AIレスポンスをパース（CSV形式、eventIdからeventUuidに変換）
 */
function parseAIResponse(content: string, eventChunk: Event[]): AILinkingResult {
    try {
        // CSV行を抽出（空行や説明文を除外）
        const lines = content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => {
                // 空行、説明文、例示行を除外
                if (!line) return false;
                if (line.startsWith("イベント") || line.startsWith("例：")) return false;
                // カンマを含む行のみを対象
                return line.includes(",");
            });

        if (lines.length === 0) {
            return {
                ok: false,
                errorMessage: "AIの応答にCSV形式のデータが含まれていません",
            };
        }

        // 各行をパース
        const validSuggestions: Array<{
            eventUuid: string;
            workItemId: string;
            confidence: number;
            reason: string;
        }> = [];

        for (const line of lines) {
            // CSV行をパース（カンマで分割、最大4つまで）
            const parts = line.split(",", 4);
            if (parts.length < 4) {
                logger.warn(`不正なCSV行をスキップ: ${line}`);
                continue;
            }

            const [eventIdStr, workItemId, confidenceStr, ...reasonParts] = parts;
            const eventId = Number(eventIdStr.trim());
            const confidence = Number(confidenceStr.trim());
            const reason = reasonParts.join(",").trim(); // カンマを含む理由に対応

            // バリデーション
            if (isNaN(eventId) || isNaN(confidence)) {
                logger.warn(`無効なデータ形式をスキップ: ${line}`);
                continue;
            }

            if (confidence < 0 || confidence > 1) {
                logger.warn(`信頼度が範囲外: ${confidence} (行: ${line})`);
                continue;
            }

            // eventIdをeventUuidに変換
            const eventIndex = eventId - 1; // 1ベースから0ベースに変換
            if (eventIndex < 0 || eventIndex >= eventChunk.length) {
                logger.warn(`無効なeventId: ${eventId} (範囲: 1-${eventChunk.length})`);
                continue;
            }

            const event = eventChunk[eventIndex];
            validSuggestions.push({
                eventUuid: event.uuid,
                workItemId: workItemId.trim(),
                confidence: confidence,
                reason: reason || "理由なし",
            });
        }

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
        logger.error("レスポンス内容:", content);
        return {
            ok: false,
            errorMessage: errorMessage,
        };
    }
}

/**
 * 配列を指定サイズのチャンクに分割
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * 同じイベントをグループ化（EventUtils.isSameで判定）
 * @returns [代表イベント配列, イベントUUID→グループ内全UUIDのマップ]
 */
function groupSameEvents(events: Event[]): [Event[], Map<string, string[]>] {
    const uniqueEvents: Event[] = [];
    const eventGroupMap = new Map<string, string[]>(); // 代表UUID → 同じグループのUUID配列

    for (const event of events) {
        // 既存の代表イベントの中から同じものを探す
        const existingEvent = uniqueEvents.find((e) => EventUtils.isSame(e, event));

        if (existingEvent) {
            // 既存グループに追加
            const group = eventGroupMap.get(existingEvent.uuid)!;
            group.push(event.uuid);
        } else {
            // 新しいグループを作成
            uniqueEvents.push(event);
            eventGroupMap.set(event.uuid, [event.uuid]);
        }
    }

    logger.info(`イベントグループ化: ${events.length}件 → ${uniqueEvents.length}件のユニークイベント`);
    return [uniqueEvents, eventGroupMap];
}

/**
 * 有効な履歴エントリをフィルタして取得
 */
function getValidHistoryEntries(workItems: WorkItem[]): HistoryEntry[] {
    const historyManager = new HistoryManager();
    historyManager.load();
    const allHistory = historyManager.getAll();

    // WorkItemが存在するものだけをフィルタ
    const validWorkItemIds = new Set(WorkItemUtils.getMostNestChildren(workItems).map((w) => w.id));

    // MapからArrayに変換してフィルタ
    return Array.from(allHistory.values()).filter((entry) => validWorkItemIds.has(entry.itemId));
}

/**
 * AIレスポンスから紐づけ提案を展開
 * 同じイベントグループ内の全イベントに対して紐づけを適用
 */
function expandSuggestionsToEventGroups(
    suggestions: Array<{ eventUuid: string; workItemId: string; confidence: number; reason: string }>,
    eventGroupMap: Map<string, string[]>,
): Array<{ eventUuid: string; workItemId: string; confidence: number; reason: string }> {
    const expandedSuggestions: Array<{
        eventUuid: string;
        workItemId: string;
        confidence: number;
        reason: string;
    }> = [];

    for (const suggestion of suggestions) {
        const group = eventGroupMap.get(suggestion.eventUuid);
        if (group) {
            // グループ内の全イベントUUIDに対して同じ紐づけを追加
            for (const uuid of group) {
                expandedSuggestions.push({
                    eventUuid: uuid,
                    workItemId: suggestion.workItemId,
                    confidence: suggestion.confidence,
                    reason: suggestion.reason,
                });
            }
        }
    }

    return expandedSuggestions;
}

/**
 * チャンクごとにAI推論を実行
 */
async function processEventChunk(
    chunk: Event[],
    chunkIndex: number,
    totalChunks: number,
    systemPrompt: string,
    apiKey: string,
    onProgress?: (progress: ChunkProgress) => void,
): Promise<Array<{ eventUuid: string; workItemId: string; confidence: number; reason: string }>> {
    const current = chunkIndex + 1;
    logger.info(`チャンク ${current}/${totalChunks} を処理中（${chunk.length}件）`);

    // 処理開始をコールバック
    onProgress?.({
        current,
        total: totalChunks,
        chunkSize: chunk.length,
        status: "processing",
    });

    // チャンク用のユーザープロンプトを生成
    const userPrompt = generateUserPrompt(chunk);

    // AI推論をキューに追加して実行
    const aiRequest: AIInferenceRequest = {
        apiKey: apiKey,
        system: systemPrompt,
        user: userPrompt,
    };

    const aiResponse = await inferWithQueue(aiRequest);

    if (!aiResponse.ok) {
        logger.error(`チャンク ${current} の推論失敗:`, aiResponse.errorMessage);

        // エラーをコールバック
        onProgress?.({
            current,
            total: totalChunks,
            chunkSize: chunk.length,
            status: "error",
            errorMessage: aiResponse.errorMessage,
        });

        return [];
    }

    // レスポンスをパース
    const result = parseAIResponse(aiResponse.content!, chunk);

    if (result.ok && result.suggestions) {
        logger.info(`チャンク ${current} 推論成功: ${result.suggestions.length}件の提案`);

        // 成功をコールバック
        onProgress?.({
            current,
            total: totalChunks,
            chunkSize: chunk.length,
            status: "success",
            suggestionCount: result.suggestions.length,
        });

        return result.suggestions;
    } else {
        logger.warn(`チャンク ${current} のパース失敗:`, result.errorMessage);

        // エラーをコールバック
        onProgress?.({
            current,
            total: totalChunks,
            chunkSize: chunk.length,
            status: "error",
            errorMessage: result.errorMessage,
        });

        return [];
    }
}

/**
 * AI自動紐づけを実行（イベントを10件ずつ処理）
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
    const historyEntries = request.useHistory ? getValidHistoryEntries(request.workItems) : [];
    if (request.useHistory) {
        logger.info(`履歴エントリ取得: ${historyEntries.length}件`);
    }

    // 同じイベントをグループ化（重複排除）
    const [uniqueEvents, eventGroupMap] = groupSameEvents(request.unlinkedEvents);

    // システムプロンプトを生成（全チャンク共通）
    const systemPrompt = generateSystemPrompt(
        request.linkedPairs,
        historyEntries,
        request.workItems,
        request.useHistory,
    );

    // ユニークイベントをチャンクに分割
    const eventChunks = chunkArray(uniqueEvents, CHUNK_SIZE);
    logger.info(`イベントを${eventChunks.length}チャンクに分割（各チャンク最大${CHUNK_SIZE}件）`);

    // 各チャンクを順次処理して提案を収集
    const allSuggestions: Array<{
        eventUuid: string;
        workItemId: string;
        confidence: number;
        reason: string;
    }> = [];

    for (let i = 0; i < eventChunks.length; i++) {
        const suggestions = await processEventChunk(
            eventChunks[i],
            i,
            eventChunks.length,
            systemPrompt,
            request.apiKey,
            request.onChunkProgress,
        );
        allSuggestions.push(...suggestions);
    }

    // 結果を返す（同じイベントグループに展開）
    if (allSuggestions.length === 0) {
        return {
            ok: false,
            errorMessage: "すべてのチャンクの処理に失敗しました",
        };
    }

    // 同じイベントグループ内の全イベントに紐づけを展開
    const expandedSuggestions = expandSuggestionsToEventGroups(allSuggestions, eventGroupMap);

    logger.info(
        `AI推論完了: ${allSuggestions.length}件のユニーク提案 → ${expandedSuggestions.length}件の紐づけ（重複イベント展開後）`,
    );
    expandedSuggestions.forEach((s) => {
        logger.info(`  - Event:${s.eventUuid} → WorkItem:${s.workItemId} (信頼度:${s.confidence}, 理由:${s.reason})`);
    });

    return {
        ok: true,
        suggestions: expandedSuggestions,
    };
}
