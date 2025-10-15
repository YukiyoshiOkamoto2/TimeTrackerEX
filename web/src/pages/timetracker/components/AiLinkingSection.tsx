/**
 * AI自動紐づけセクションコンポーネント
 */

import { InteractiveCard } from "@/components/card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { getLogger } from "@/lib/logger";
import type { Event, WorkItem } from "@/types";
import { WorkItemUtils } from "@/types/utils";
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    makeStyles,
    ProgressBar,
    Switch,
    tokens,
} from "@fluentui/react-components";
import { History24Regular, Key24Regular, Sparkle24Regular } from "@fluentui/react-icons";
import { useCallback, useState } from "react";
import type { LinkingEventWorkItemPair } from "../models";
import { autoLinkWithAI, type ChunkProgress } from "../services/ai";

const logger = getLogger("AiLinkingSection");

const useStyles = makeStyles({
    section: {
        marginBottom: tokens.spacingVerticalS,
    },
    settingRow: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottom: "none",
        },
    },
    settingInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        flex: 1,
    },
    settingTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    settingDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: "1.3",
    },
    settingControl: {
        display: "flex",
        alignItems: "center",
        marginLeft: tokens.spacingHorizontalL,
    },
    settingIcon: {
        fontSize: "18px",
        color: tokens.colorBrandForeground1,
    },
    tokenInput: {
        minWidth: "300px",
    },
    progressDialog: {
        minWidth: "500px",
        maxWidth: "600px",
    },
    progressContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
        padding: tokens.spacingVerticalL,
    },
    progressTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        textAlign: "center",
        marginBottom: tokens.spacingVerticalS,
    },
    progressInfo: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
        textAlign: "center",
        marginTop: tokens.spacingVerticalS,
    },
    progressStats: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: tokens.spacingVerticalS,
        marginTop: tokens.spacingVerticalM,
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
    },
    progressStatItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
    },
    progressStatLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    progressStatValue: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
    },
    progressDetail: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        textAlign: "center",
        marginTop: tokens.spacingVerticalS,
    },
});

export interface AiLinkingSectionProps {
    /** 未紐づけイベント */
    unlinkedEvents: Event[];
    /** 現在紐づけ済みのペア */
    linkedPairs: LinkingEventWorkItemPair[];
    /** 利用可能なWorkItemリスト */
    workItems: WorkItem[];
    /** AI紐づけ変更コールバック（履歴に保存しない） - 複数の紐づけをまとめて処理 */
    onAiLinkingChange: (suggestions: Array<{ eventId: string; workItemId: string; confidence: number }>) => void;
}

/**
 * AI自動紐づけセクション
 */
export function AiLinkingSection({ unlinkedEvents, linkedPairs, workItems, onAiLinkingChange }: AiLinkingSectionProps) {
    const styles = useStyles();

    // ローカルステート
    const [token, setToken] = useState<string>("");
    const [useHistory, setUseHistory] = useState<boolean>(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progressInfo, setProgressInfo] = useState<{
        current: number;
        total: number;
        chunkSize: number;
        successCount: number;
        errorCount: number;
        filteredCount: number;
    }>({ current: 0, total: 0, chunkSize: 0, successCount: 0, errorCount: 0, filteredCount: 0 });

    // AI自動紐づけハンドラー
    const handleAILinking = useCallback(async () => {
        if (!token || token.trim() === "") {
            await appMessageDialogRef.showMessageAsync(
                "APIトークンが必要です",
                "AI自動紐づけを使用するにはAPIトークンを入力してください。",
                "ERROR",
            );
            return;
        }

        if (unlinkedEvents.length === 0) {
            await appMessageDialogRef.showMessageAsync(
                "未紐づけイベントがありません",
                "すべてのイベントが既に紐づけられています。",
                "INFO",
            );
            return;
        }

        try {
            logger.info(`AI自動紐づけ開始: ${unlinkedEvents.length}件の未紐づけイベント`);

            // 進捗ダイアログを表示
            setIsProcessing(true);
            setProgressInfo({ current: 0, total: 0, chunkSize: 0, successCount: 0, errorCount: 0, filteredCount: 0 });

            // AI推論実行
            const result = await autoLinkWithAI({
                apiKey: token,
                linkedPairs: linkedPairs,
                unlinkedEvents: unlinkedEvents,
                workItems: workItems,
                useHistory: useHistory,
                onChunkProgress: (progress: ChunkProgress) => {
                    setProgressInfo((prev) => {
                        const newInfo = {
                            current: progress.current,
                            total: progress.total,
                            chunkSize: progress.chunkSize,
                            successCount: prev.successCount,
                            errorCount: prev.errorCount,
                            filteredCount: prev.filteredCount,
                        };

                        if (progress.status === "success") {
                            newInfo.successCount = prev.successCount + (progress.suggestionCount || 0);
                        } else if (progress.status === "error") {
                            newInfo.errorCount = prev.errorCount + 1;
                        }

                        return newInfo;
                    });
                },
            });

            if (!result.ok) {
                await appMessageDialogRef.showMessageAsync(
                    "AI紐づけ失敗",
                    result.errorMessage || "不明なエラーが発生しました",
                    "ERROR",
                );
                return;
            }

            if (!result.suggestions || result.suggestions.length === 0) {
                await appMessageDialogRef.showMessageAsync(
                    "紐づけ提案なし",
                    "AIから紐づけ提案が得られませんでした。",
                    "WARN",
                );
                return;
            }

            // AI提案をフィルタリング（信頼度閾値と存在するWorkItemのみ）
            const validSuggestions: Array<{ eventId: string; workItemId: string; confidence: number }> = [];
            let failedCount = 0;
            let filteredByConfidenceCount = 0;

            for (const suggestion of result.suggestions) {
                // 信頼度チェック
                if (suggestion.confidence < confidenceThreshold) {
                    filteredByConfidenceCount++;
                    logger.info(
                        `AI紐づけ提案除外（信頼度不足）: Event=${suggestion.eventUuid} → WorkItem=${suggestion.workItemId} ` +
                            `(信頼度:${suggestion.confidence} < 閾値:${confidenceThreshold})`,
                    );
                    continue;
                }

                // WorkItemが存在するか確認
                const selectedWorkItem = WorkItemUtils.getMostNestChildren(workItems).find(
                    (w) => w.id === suggestion.workItemId,
                );

                if (selectedWorkItem) {
                    validSuggestions.push({
                        eventId: suggestion.eventUuid,
                        workItemId: suggestion.workItemId,
                        confidence: suggestion.confidence,
                    });
                    logger.info(
                        `AI紐づけ提案: Event=${suggestion.eventUuid} → WorkItem=${suggestion.workItemId} ` +
                            `(信頼度:${suggestion.confidence}, 理由:${suggestion.reason})`,
                    );
                } else {
                    failedCount++;
                    logger.warn(`AI紐づけ提案除外: WorkItem not found (${suggestion.workItemId})`);
                }
            }

            // 進捗情報を更新（フィルタ件数を反映）
            setProgressInfo((prev) => ({
                ...prev,
                filteredCount: filteredByConfidenceCount,
            }));

            // すべての有効な提案をまとめて適用
            if (validSuggestions.length > 0) {
                onAiLinkingChange(validSuggestions);
                logger.info(`AI紐づけ適用完了: ${validSuggestions.length}件の紐づけを一括適用`);
            }

            const successCount = validSuggestions.length;

            // 進捗ダイアログを閉じる
            setIsProcessing(false);

            await appMessageDialogRef.showMessageAsync(
                "AI紐づけ完了",
                `${successCount}件のイベントを自動紐づけしました。\n` +
                    (filteredByConfidenceCount > 0
                        ? `${filteredByConfidenceCount}件は信頼度が低くスキップされました。\n`
                        : "") +
                    (failedCount > 0 ? `${failedCount}件は紐づけに失敗しました。` : ""),
                successCount > 0 ? "INFO" : "WARN",
            );
        } catch (error) {
            // 進捗ダイアログを閉じる
            setIsProcessing(false);

            const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
            logger.error("AI紐づけエラー:", errorMessage);
            await appMessageDialogRef.showMessageAsync("AI紐づけエラー", errorMessage, "ERROR");
        }
    }, [token, useHistory, confidenceThreshold, unlinkedEvents, linkedPairs, workItems, onAiLinkingChange]);

    return (
        <div className={styles.section}>
            <InteractiveCard
                title="AIによる自動紐づけ"
                description="AIを使用して未紐づけのイベントを自動的にWorkItemに紐づけます"
                icon={<Sparkle24Regular />}
                variant="expandable"
            >
                {/* トークン設定 */}
                <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingTitle}>
                            <Key24Regular className={styles.settingIcon} />
                            APIトークン
                        </div>
                        <div className={styles.settingDescription}>
                            OpenAI APIトークンを入力してください。AIによる自動紐づけに使用されます。
                        </div>
                    </div>
                    <div className={styles.settingControl}>
                        <Input
                            placeholder="トークンを入力"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className={styles.tokenInput}
                        />
                    </div>
                </div>

                {/* 履歴の参照設定 */}
                <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingTitle}>
                            <History24Regular className={styles.settingIcon} />
                            履歴の参照
                        </div>
                        <div className={styles.settingDescription}>
                            過去の紐づけ履歴を参照してAIの精度を向上させます。履歴データが使用されます。
                        </div>
                    </div>
                    <div className={styles.settingControl}>
                        <Switch checked={useHistory} onChange={(e) => setUseHistory(e.currentTarget.checked)} />
                    </div>
                </div>

                {/* 信頼度閾値設定 */}
                <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingTitle}>
                            <Sparkle24Regular className={styles.settingIcon} />
                            信頼度の閾値
                        </div>
                        <div className={styles.settingDescription}>
                            AIが提案する紐づけの信頼度の最低値を設定します（0.0～1.0）。閾値未満の提案は無視されます。
                        </div>
                    </div>
                    <div className={styles.settingControl}>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={confidenceThreshold.toString()}
                            onChange={(e) => {
                                const value = Number.parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0 && value <= 1) {
                                    setConfidenceThreshold(value);
                                }
                            }}
                            style={{ width: "100px" }}
                        />
                    </div>
                </div>

                {/* AI開始ボタン */}
                <div className={styles.settingRow}>
                    <Button
                        appearance="primary"
                        icon={<Sparkle24Regular />}
                        onClick={handleAILinking}
                        style={{ margin: "12px 0 0 auto" }}
                        disabled={token === ""}
                    >
                        AI自動紐づけを開始
                    </Button>
                </div>
            </InteractiveCard>

            {/* AI処理中の進捗ダイアログ */}
            <Dialog open={isProcessing} modalType="modal">
                <DialogSurface className={styles.progressDialog}>
                    <DialogBody>
                        <DialogTitle>
                            <Sparkle24Regular
                                style={{
                                    marginRight: "8px",
                                    verticalAlign: "middle",
                                    color: tokens.colorBrandForeground1,
                                }}
                            />
                            AI自動紐づけ処理中
                        </DialogTitle>
                        <DialogContent>
                            <div className={styles.progressContent}>
                                <div className={styles.progressTitle}>
                                    チャンク {progressInfo.current} / {progressInfo.total} を処理中
                                </div>

                                <ProgressBar
                                    value={progressInfo.total > 0 ? progressInfo.current / progressInfo.total : 0}
                                    max={1}
                                    thickness="large"
                                    shape="rounded"
                                />

                                {progressInfo.chunkSize > 0 && (
                                    <div className={styles.progressDetail}>
                                        現在のチャンク: {progressInfo.chunkSize}件のイベント
                                    </div>
                                )}

                                {(progressInfo.successCount > 0 ||
                                    progressInfo.errorCount > 0 ||
                                    progressInfo.filteredCount > 0) && (
                                    <div className={styles.progressStats}>
                                        <div className={styles.progressStatItem}>
                                            <div className={styles.progressStatLabel}>成功</div>
                                            <div className={styles.progressStatValue}>
                                                {progressInfo.successCount}件
                                            </div>
                                        </div>
                                        {progressInfo.filteredCount > 0 && (
                                            <div className={styles.progressStatItem}>
                                                <div className={styles.progressStatLabel}>信頼度不足</div>
                                                <div
                                                    className={styles.progressStatValue}
                                                    style={{ color: tokens.colorPaletteYellowForeground1 }}
                                                >
                                                    {progressInfo.filteredCount}件
                                                </div>
                                            </div>
                                        )}
                                        {progressInfo.errorCount > 0 && (
                                            <div className={styles.progressStatItem}>
                                                <div className={styles.progressStatLabel}>エラー</div>
                                                <div
                                                    className={styles.progressStatValue}
                                                    style={{ color: tokens.colorPaletteDarkOrangeForeground1 }}
                                                >
                                                    {progressInfo.errorCount}件
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={styles.progressInfo}>AIが未紐づけイベントを解析しています...</div>
                            </div>
                        </DialogContent>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
}
