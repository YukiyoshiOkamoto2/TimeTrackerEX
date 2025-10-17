/**
 * TimeTracker Session Management Hook
 *
 * TimeTrackerのセッション管理を行うカスタムフック
 * - 認証情報の管理(sessionStorageに永続化)
 * - プロジェクト・作業項目の取得とキャッシュ
 * - タスク登録
 * - 自動ログアウト(トークン期限切れ時)
 */

import type { TimeTrackerTask } from "@/core/api";
import { getLogger } from "@/lib";
import type { Project, WorkItem } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PasswordInputDialog } from "./PasswordInputDialog";
import {
    AuthError,
    authenticateWithPasswordAsync,
    clearAllSession,
    fetchProjectAndWorkItemsAsync as fetchProjectAndWorkItemsWithAuthCheckAsync,
    loadAuth,
    registerTaskWithAuthCheckAsync,
} from "./timeTrackerSessionHelper";

const logger = getLogger("useTimeTrackerSession");

/**
 * API失敗レスポンス
 */
export type TimeTrackerAPIFailure = {
    isError: true;
    errorMessage: string;
};

/**
 * API成功レスポンス
 */
export type TimeTrackerAPISuccess<T> = {
    isError: false;
    content: T;
};

/**
 * API結果の型（成功または失敗）
 */
export type TimeTrackerAPIResult<T = undefined> = TimeTrackerAPIFailure | TimeTrackerAPISuccess<T>;

/**
 * プロジェクトとWorkItemのセット
 */
export type ProjectAndWorkItem = {
    project: Project;
    workItems: WorkItem[];
};

/**
 * TimeTrackerセッションフックの返り値
 */
export interface TimeTrackerSessionHook {
    // コンポーネント
    /** パスワード入力ダイアログ */
    Dialog: () => JSX.Element;

    // 状態
    /** 認証済みかどうか */
    isAuthenticated: boolean;
    /** ローディング中かどうか */
    isLoading: boolean;

    // アクション
    /** パスワード入力ダイアログを開いて認証 */
    authenticateAsync: () => Promise<TimeTrackerAPIResult>;
    /** ログアウト */
    logout: () => void;
    /** プロジェクトと作業項目を取得 */
    fetchProjectAndWorkItemsAsync: (projectId: string) => Promise<TimeTrackerAPIResult<ProjectAndWorkItem>>;
    /** タスクを登録 */
    registerTaskAsync: (task: TimeTrackerTask) => Promise<TimeTrackerAPIResult>;
}

/**
 * useTimeTrackerSessionのオプション
 */
export interface UseTimeTrackerSessionOptions {
    /** TimeTracker APIのベースURL */
    baseUrl: string;
    /** ユーザー名 */
    userName: string;
    /** トークンの有効期限（分） */
    tokenExpirationMinutes?: number;
}

/**
 * TimeTrackerセッション管理フック
 */
export function useTimeTrackerSession({
    baseUrl,
    userName,
    tokenExpirationMinutes = 60,
}: UseTimeTrackerSessionOptions): TimeTrackerSessionHook {
    // State
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [authChangeCounter, setAuthChangeCounter] = useState(0); // 認証状態変更を追跡

    // パスワード入力ダイアログの完了を待つためのPromise resolve関数
    const authenticateResolveRef = useRef<((value: TimeTrackerAPIResult) => void) | null>(null);

    /**
     * 認証済みかどうかを判定（sessionStorageから取得）
     * authChangeCounterが変更されると再評価される
     */
    const isAuthenticated = useMemo(() => {
        return loadAuth() !== null;
    }, [authChangeCounter]);

    /**
     * ダイアログを閉じて認証処理を完了（キャンセル時）
     */
    const closeDialog = useCallback(() => {
        setIsPasswordDialogOpen(false);
        if (authenticateResolveRef.current) {
            logger.info("認証ダイアログがキャンセルされました");
            authenticateResolveRef.current({
                isError: true,
                errorMessage: "認証がキャンセルされました",
            });
            authenticateResolveRef.current = null;
        }
    }, []);

    // クリーンアップ: マウント解除時に待機中のPromiseを解決してメモリリークを防止
    useEffect(() => {
        return () => {
            if (authenticateResolveRef.current) {
                logger.warn("コンポーネントがアンマウントされました。待機中の認証処理をキャンセルします");
                authenticateResolveRef.current({
                    isError: true,
                    errorMessage: "コンポーネントがアンマウントされました",
                });
                authenticateResolveRef.current = null;
            }
        };
    }, []);

    /**
     * パスワード入力ダイアログコンポーネント
     */
    const Dialog = useCallback(() => {
        /**
         * パスワードによる認証処理
         */
        const authenticateWithPassword = async (pwd: string): Promise<void> => {
            try {
                // 認証実行（sessionStorageに保存される）
                await authenticateWithPasswordAsync(baseUrl, userName, pwd, tokenExpirationMinutes);
                logger.info("認証に成功しました");

                // 認証状態変更を通知
                setAuthChangeCounter((prev) => prev + 1);

                // 認証成功時にダイアログを閉じてPromiseを解決
                setIsPasswordDialogOpen(false);
                const result: TimeTrackerAPIResult = {
                    isError: false,
                    content: undefined,
                };
                if (authenticateResolveRef.current) {
                    authenticateResolveRef.current(result);
                    authenticateResolveRef.current = null;
                }
                return;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "認証に失敗しました";
                logger.error("認証に失敗しました:", errorMessage);
                // 認証失敗はダイアログ内でエラー表示するだけで、Promiseは解決しない
                throw new Error(errorMessage);
            }
        };

        return (
            <PasswordInputDialog
                userName={userName}
                open={isPasswordDialogOpen}
                onCancel={closeDialog}
                onSubmit={authenticateWithPassword}
            />
        );
    }, [baseUrl, userName, tokenExpirationMinutes, isPasswordDialogOpen, closeDialog]);

    /**
     * パスワード入力ダイアログを開いて認証
     */
    const authenticateAsync = useCallback(async (): Promise<TimeTrackerAPIResult> => {
        logger.info("パスワード入力ダイアログを開きます");

        // 既に認証処理が進行中の場合は警告
        if (authenticateResolveRef.current) {
            logger.warn("認証処理が既に進行中です");
        }

        setIsPasswordDialogOpen(true);
        return new Promise<TimeTrackerAPIResult>((resolve) => {
            authenticateResolveRef.current = resolve;
        });
    }, []);

    /**
     * ログアウト
     */
    const logout = useCallback(() => {
        logger.info("ログアウトします");
        clearAllSession();
        // 認証状態変更を通知
        setAuthChangeCounter((prev) => prev + 1);
    }, []);

    /**
     * プロジェクトと作業項目を取得
     * @param projectId プロジェクトID
     * @param onInvalidProjectId プロジェクトID取得失敗時に実行されるコールバック（設定のクリアなど）
     */
    const fetchProjectAndWorkItemsAsync = useCallback(
        async (projectId: string): Promise<TimeTrackerAPIResult<ProjectAndWorkItem>> => {
            logger.info(`プロジェクトと作業項目を取得します: projectId=${projectId}`);

            setIsLoading(true);
            try {
                // helperが内部でsessionStorageから認証情報を取得
                const result = await fetchProjectAndWorkItemsWithAuthCheckAsync(baseUrl, projectId, userName);
                logger.info(`プロジェクトと作業項目の取得に成功しました`);
                return {
                    isError: false,
                    content: result,
                };
            } catch (err) {
                if (err instanceof AuthError) {
                    // 認証エラー: ログアウトして認証状態を更新
                    logger.warn(`認証エラー: ${err.message}`);
                    logout();
                    return {
                        isError: true,
                        errorMessage: err.message,
                    };
                }

                // その他のエラー
                const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
                logger.warn(`プロジェクトと作業項目の取得に失敗しました: ${errorMessage}`);

                return {
                    isError: true,
                    errorMessage,
                };
            } finally {
                setIsLoading(false);
            }
        },
        [baseUrl, userName, logout],
    );

    /**
     * タスクを登録
     * @param task 登録するタスク
     */
    const registerTaskAsync = useCallback(
        async (task: TimeTrackerTask): Promise<TimeTrackerAPIResult> => {
            logger.info(`タスクを登録します (作業項目ID: ${task.workItemId})`);

            setIsLoading(true);
            try {
                // helperが内部でsessionStorageから認証情報を取得
                await registerTaskWithAuthCheckAsync(baseUrl, task);
                logger.info("タスクの登録に成功しました");
                return {
                    isError: false,
                    content: undefined,
                };
            } catch (err) {
                if (err instanceof AuthError) {
                    // 認証エラー: ログアウトして認証状態を更新
                    logger.error(`認証エラー: ${err.message}`);
                    logout();
                    return {
                        isError: true,
                        errorMessage: err.message,
                    };
                }

                // その他のエラー
                const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
                logger.error(`タスクの登録に失敗しました: ${errorMessage}`);
                return {
                    isError: true,
                    errorMessage,
                };
            } finally {
                setIsLoading(false);
            }
        },
        [baseUrl, logout],
    );

    return {
        // Component
        Dialog,

        // State
        isAuthenticated,
        isLoading,

        // Actions
        authenticateAsync,
        logout,
        fetchProjectAndWorkItemsAsync,
        registerTaskAsync,
    };
}
