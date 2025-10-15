import { appMessageDialogRef } from "@/components/message-dialog";
import { HistoryManager } from "@/core";
import { getLogger } from "@/lib";
import { useSettings } from "@/store";
import { usePageContent } from "@/store/content";
import { Event, Schedule, WorkItem } from "@/types";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../../components/page";
import { ValidationErrorDialog } from "./components/ValidationErrorDialog";
import { useTimeTrackerSession, type TimeTrackerAPIResult } from "./hooks";
import { ProjectAndWorkItem } from "./hooks/useTimeTrackerSession";
import type { LinkingEventWorkItemPair, LinkingInfo, UploadInfo } from "./models";
import { validateAndCleanupSettings } from "./services/validate";
import { CompletionView } from "./view/CompletionView";
import { FileUploadView } from "./view/FileUploadView";
import { LinkingProcessView } from "./view/LinkingProcessView";

const logger = getLogger("TimeTrackerPage");

// ============================================================================
// シングルトンとスタイル定義
// ============================================================================

const historyManager = new HistoryManager();
historyManager.load();

const useStyles = makeStyles({
    viewContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        width: "100%",
    },
    slideInRight: {
        animationName: {
            from: {
                opacity: 0,
                transform: "translateX(60px)",
            },
            to: {
                opacity: 1,
                transform: "translateX(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    slideInLeft: {
        animationName: {
            from: {
                opacity: 0,
                transform: "translateX(-60px)",
            },
            to: {
                opacity: 1,
                transform: "translateX(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
});

// ============================================================================
// 型定義と定数
// ============================================================================

/** ビュー種別 */
type View = "upload" | "linking" | "completion";

/** ビューインデックス */
type ViewIndex = 0 | 1 | 2;

/** TimeTrackerのビュー状態を管理するカスタムフック */
interface UseTimeTrackerViewStateReturn {
    /** 現在のビュー */
    currentView: View;
    /** スライド方向 */
    slideDirection: "left" | "right" | "none";
    /** 前のビューに戻る */
    backTo: (back?: ViewIndex) => void;
    /** 次のビューに進む */
    nextTo: (next?: ViewIndex) => void;
}

/**
 * TimeTrackerページの永続化データ型定義
 * uploadInfoにpdfとicsが含まれているため、uploadInfoのみを管理
 */
interface TimeTrackerPageContent {
    uploadInfo?: UploadInfo;
}

/** 利用可能なビューのリスト */
const VIEWS: View[] = ["upload", "linking", "completion"];

// ============================================================================
// カスタムフック
// ============================================================================

/**
 * TimeTrackerページのビュー状態を管理するカスタムフック
 * ビューの切り替えとスライドアニメーションの方向を管理します
 */
const useTimeTrackerViewState = (): UseTimeTrackerViewStateReturn => {
    const [currentIndex, setCurrentIndex] = useState<ViewIndex>(0);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");

    // 現在のビューを計算
    const currentView = useMemo(() => VIEWS[currentIndex], [currentIndex]);

    // 前のビューに戻る関数（useCallbackでメモ化）
    const backTo = useCallback(
        (back: ViewIndex = 1) => {
            const backIndex = currentIndex - back;
            if (backIndex < 0) {
                throw new Error(`TimeTrackerPage invalid back.: current ${VIEWS[currentIndex]}`);
            }
            setCurrentIndex(backIndex as ViewIndex);
            setSlideDirection("left");
        },
        [currentIndex],
    );

    // 次のビューに進む関数（useCallbackでメモ化）
    const nextTo = useCallback(
        (next: ViewIndex = 1) => {
            const nextIndex = currentIndex + next;
            if (nextIndex > VIEWS.length - 1) {
                throw new Error(`TimeTrackerPage invalid next.: current ${VIEWS[currentIndex]}`);
            }
            setCurrentIndex(nextIndex as ViewIndex);
            setSlideDirection("right");
        },
        [currentIndex],
    );

    return { currentView, slideDirection, backTo, nextTo };
};

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * 認証チェックを実行し、未認証の場合は認証を試行
 * @returns 認証成功時true、失敗時false
 */
const ensureAuthenticated = async (
    isAuthenticated: boolean,
    authenticateAsync: () => Promise<TimeTrackerAPIResult>,
): Promise<boolean> => {
    if (isAuthenticated) return true;

    const authResult = await authenticateAsync();
    if (authResult.isError) {
        await appMessageDialogRef.showMessageAsync("認証エラー", "TimeTrackerの認証に失敗しました。", "ERROR");
        return false;
    }
    return true;
};

/**
 * エラーをログに記録し、ユーザーにダイアログで通知
 */
const handleError = async (error: unknown, context: string): Promise<void> => {
    logger.error(`Error in ${context}:`, error);
    await appMessageDialogRef.showMessageAsync(
        "処理エラー",
        error instanceof Error ? error.message : "不明なエラーが発生しました。",
        "ERROR",
    );
};

// ============================================================================
// メインコンポーネント
// ============================================================================

/**
 * TimeTrackerページコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - ハンドラーをuseCallbackでメモ化
 * - 計算値をuseMemoで最適化
 * - ContentProviderでpdf、ics、uploadInfoを永続化
 */
export const TimeTrackerPage = memo(function TimeTrackerPage() {
    const styles = useStyles();
    const { settings, validationErrors, updateSettings } = useSettings();
    const timetracker = settings.timetracker;

    const [pageContent, setPageContent] = usePageContent<TimeTrackerPageContent>("TimeTracker");
    const uploadInfo = pageContent?.uploadInfo;

    const [isLoading, setIsLoading] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const { currentView, slideDirection, backTo, nextTo } = useTimeTrackerViewState();

    const [linkingInfo, setLinkingInfo] = useState<LinkingInfo>();

    // セッション管理（メモ化）
    const sessionConfig = useMemo(
        () => ({
            baseUrl: timetracker?.baseUrl || "",
            userName: timetracker?.userName || "",
        }),
        [timetracker?.baseUrl, timetracker?.userName],
    );
    const { Dialog, isAuthenticated, ...sessionHook } = useTimeTrackerSession(sessionConfig);

    // ============================================================================
    // イベントハンドラー
    // ============================================================================

    // UploadInfo更新用のセッター（ContentProviderに保存）
    const setUploadInfo = useCallback(
        (uploadInfo: UploadInfo | undefined) => {
            setPageContent({
                uploadInfo,
            });
        },
        [setPageContent],
    );

    // 履歴管理の更新（メモ化）
    const updateHistory = useCallback((workItems: WorkItem[]) => {
        historyManager.load();
        historyManager.checkWorkItemId(workItems);
        historyManager.dump();
    }, []);

    // プロジェクト情報取得（メモ化）
    const fetchProjectData = useCallback(
        async (projectId: string): Promise<ProjectAndWorkItem | undefined> => {
            const result = await sessionHook.fetchProjectAndWorkItemsAsync(projectId, async () => {
                // プロジェクトID取得失敗時は設定をクリア
                if (timetracker) {
                    updateSettings({
                        timetracker: {
                            ...timetracker,
                            baseProjectId: -1,
                        },
                    });
                }
                await appMessageDialogRef.showMessageAsync(
                    "設定エラー",
                    `プロジェクトID ( ${projectId} ) が無効なため設定をクリアしました。\n設定画面で正しいプロジェクトIDを設定してください。`,
                    "ERROR",
                );
            });

            if (result.isError) {
                await appMessageDialogRef.showMessageAsync("TimeTrackerデータ取得エラー", result.errorMessage, "ERROR");
                return;
            }

            return result.content;
        },
        [sessionHook, timetracker, updateSettings],
    );

    // 紐づけ開始処理（メモ化）
    const handleLinking = useCallback(
        async (selectedInfo: { schedules: Schedule[]; events: Event[] }) => {
            if (!timetracker) {
                logger.error("Nothing. Timetracker settings.");
                return;
            }

            if (selectedInfo.schedules.length === 0 || selectedInfo.events.length === 0) {
                logger.error("Nothing. schedules and events.");
                return;
            }

            // 認証チェック
            const authenticated = await ensureAuthenticated(isAuthenticated, sessionHook.authenticateAsync);
            if (!authenticated) return;

            try {
                setIsLoading(true);

                // プロジェクト情報取得
                const itemResult = await fetchProjectData(String(timetracker?.baseProjectId));
                if (!itemResult) {
                    return;
                }

                // 履歴の更新
                updateHistory(itemResult.workItems);

                // 設定の検証とクリーンアップ
                const cleanResult = validateAndCleanupSettings(timetracker, itemResult.workItems);
                if (cleanResult.items.length > 0) {
                    await appMessageDialogRef.showMessageAsync(
                        "設定エラー",
                        `設定項目に不正なIDが存在します。削除します。（ ${cleanResult.items.length}件 ）\n\n` +
                            cleanResult.items.map((i) => "・ " + i).join("\n"),
                        "ERROR",
                    );
                    updateSettings({
                        timetracker: cleanResult.settings,
                    });
                    return;
                }

                // 紐づけ情報を設定
                setLinkingInfo({
                    ...selectedInfo,
                    workItems: itemResult.workItems,
                });

                // 成功時のみ次画面へ遷移
                nextTo();
            } catch (error) {
                await handleError(error, "handleLinking");
            } finally {
                setIsLoading(false);
            }
        },
        [isAuthenticated, sessionHook, timetracker, fetchProjectData, updateHistory, updateSettings, nextTo],
    );

    /**
     * 紐づけ処理完了時のハンドラー
     */
    const handleRegisterEvents = useCallback(
        async (linkingEventWorkItemPair: LinkingEventWorkItemPair[]) => {
            // 認証チェック
            const authenticated = await ensureAuthenticated(isAuthenticated, sessionHook.authenticateAsync);
            if (!authenticated) return;

            try {
                setIsLoading(true);

                const tasks = linkingEventWorkItemPair.map((l) => ({
                    workItemId: l.linkingWorkItem.workItem.id,
                    startTime: l.event.schedule.start,
                    endTime: l.event.schedule.end!,
                }));

                for (const task of tasks) {
                    await sessionHook.registerTaskAsync(task);
                }

                // 成功時のみ次画面へ遷移
                nextTo();
            } catch (error) {
                await handleError(error, "handleRegisterEvents");
            } finally {
                setIsLoading(false);
            }
        },
        [isAuthenticated, sessionHook, nextTo],
    );

    // ============================================================================
    // エフェクト
    // ============================================================================

    /**
     * TimeTracker設定のバリデーションチェック
     * エラーがある場合はFileUploadViewに戻り、エラーダイアログを表示
     */
    useEffect(() => {
        const hasTimeTrackerErrors = validationErrors.timeTracker.length > 0;
        if (hasTimeTrackerErrors) {
            // FileUploadViewに戻る
            if (currentView === "completion") {
                backTo(2);
            } else if (currentView === "linking") {
                backTo(1);
            }

            // エラーダイアログを表示
            setShowErrorDialog(true);
        }
    }, [validationErrors.timeTracker, currentView, backTo]);

    // ============================================================================
    // レンダリング
    // ============================================================================

    /**
     * アニメーションクラスを取得（スライド方向に応じたクラスを返す）
     */
    const animationClass = useMemo(
        () => (slideDirection === "right" ? styles.slideInRight : slideDirection === "left" ? styles.slideInLeft : ""),
        [slideDirection, styles.slideInLeft, styles.slideInRight],
    );

    return (
        <>
            <Page
                title="TimeTracker"
                subtitle="勤怠情報とスケジュールの紐づけ管理"
                loading={isLoading}
                loadingText="処理中..."
            >
                <div className={mergeClasses(styles.viewContainer, animationClass)} key={currentView}>
                    {currentView === "completion" ? (
                        <CompletionView onBack={backTo} />
                    ) : currentView === "linking" ? (
                        <LinkingProcessView
                            linkingInfo={linkingInfo}
                            onBack={backTo}
                            onRegisterEvents={handleRegisterEvents}
                        />
                    ) : (
                        <FileUploadView
                            uploadInfo={uploadInfo}
                            onChangeUploadInfo={setUploadInfo}
                            onLinking={handleLinking}
                        />
                    )}
                </div>
            </Page>

            <ValidationErrorDialog open={showErrorDialog} errors={validationErrors.timeTracker} />
            <Dialog />
        </>
    );
});
