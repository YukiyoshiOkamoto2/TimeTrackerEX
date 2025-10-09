/**
 * TimeTracker Session Management Hook
 *
 * TimeTrackerのセッション管理を行うカスタムフック
 * - 認証情報の管理(sessionStorageに永続化)
 * - プロジェクト・作業項目の取得とキャッシュ
 * - タスク登録
 * - 自動ログアウト(トークン期限切れ時)
 */

import type { Project, WorkItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import {
    authenticateAsync,
    getProjectAsync,
    getWorkItemsAsync,
    isAuthenticationError,
    registerTaskAsync,
    TimeTrackerAuth,
    type TimeTrackerTask,
} from "@/core/api";
import {
    clearAllSession,
    loadAuth,
    loadProject,
    loadWorkItems,
    saveAuth,
    saveProject,
    saveWorkItems,
} from "./sessionStorage";

export interface TimeTrackerSessionState {
    // 認証状態
    isAuthenticated: boolean;
    auth: TimeTrackerAuth | null;

    // プロジェクト・作業項目
    project: Project | null;
    workItems: WorkItem[] | null;

    // ローディング状態
    isLoading: boolean;
    isAuthenticating: boolean;

    // エラー
    error: string | null;

    // パスワード入力ダイアログ
    isPasswordDialogOpen: boolean;
}

export interface TimeTrackerSessionActions {
    // 認証
    authenticateWithDialog: () => void;
    authenticateWithPassword: (password: string) => Promise<void>;
    logout: () => void;

    // プロジェクト・作業項目の取得
    fetchProjectAndWorkItems: (projectId: string) => Promise<void>;

    // タスク登録
    registerTask: (task: TimeTrackerTask) => Promise<void>;

    // エラークリア
    clearError: () => void;
}

export interface TimeTrackerSessionHook extends TimeTrackerSessionState, TimeTrackerSessionActions {}

export interface UseTimeTrackerSessionOptions {
    baseUrl: string;
    userName: string;
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
    const [auth, setAuth] = useState<TimeTrackerAuth | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [workItems, setWorkItems] = useState<WorkItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // 初期化: sessionStorageから復元
    useEffect(() => {
        const storedAuth = loadAuth();
        if (storedAuth) {
            setAuth(storedAuth);
        }

        const storedProject = loadProject();
        if (storedProject) {
            setProject(storedProject);
        }

        const storedWorkItems = loadWorkItems();
        if (storedWorkItems) {
            setWorkItems(storedWorkItems);
        }
    }, []);

    /**
     * パスワード入力ダイアログを開く
     */
    const authenticateWithDialog = useCallback(() => {
        setIsPasswordDialogOpen(true);
        setError(null);
    }, []);

    /**
     * パスワードで認証
     */
    const authenticateWithPassword = useCallback(
        async (password: string) => {
            setIsAuthenticating(true);
            setError(null);

            try {
                const newAuth = await authenticateAsync(baseUrl, userName, password);
                setAuth(newAuth);
                saveAuth(newAuth, tokenExpirationMinutes);
                setIsPasswordDialogOpen(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "認証に失敗しました";
                setError(errorMessage);
                throw err; // ダイアログ側でエラーハンドリングできるように再スロー
            } finally {
                setIsAuthenticating(false);
            }
        },
        [baseUrl, userName, tokenExpirationMinutes]
    );

    /**
     * ログアウト
     */
    const logout = useCallback(() => {
        setAuth(null);
        setProject(null);
        setWorkItems(null);
        setError(null);
        clearAllSession();
    }, []);

    /**
     * プロジェクトと作業項目を取得
     */
    const fetchProjectAndWorkItems = useCallback(
        async (projectId: string) => {
            if (!auth) {
                setError("認証されていません。接続してください。");
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // プロジェクト取得
                const fetchedProject = await getProjectAsync(baseUrl, projectId, auth);
                setProject(fetchedProject);
                saveProject(fetchedProject);

                // 作業項目取得
                const fetchedWorkItems = await getWorkItemsAsync(baseUrl, projectId, auth);
                setWorkItems(fetchedWorkItems);
                saveWorkItems(fetchedWorkItems);
            } catch (err) {
                // 認証エラーの場合はログアウト
                if (isAuthenticationError(err)) {
                    logout();
                    setError("認証の有効期限が切れました。再度接続してください。");
                } else {
                    const errorMessage =
                        err instanceof Error ? err.message : "プロジェクト・作業項目の取得に失敗しました";
                    setError(errorMessage);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [auth, baseUrl, logout]
    );

    /**
     * タスクを登録
     */
    const registerTask = useCallback(
        async (task: TimeTrackerTask) => {
            if (!auth) {
                throw new Error("認証されていません");
            }

            setIsLoading(true);
            setError(null);

            try {
                await registerTaskAsync(baseUrl, auth.userId, task, auth);
            } catch (err) {
                // 認証エラーの場合はログアウト
                if (isAuthenticationError(err)) {
                    logout();
                    throw new Error("認証の有効期限が切れました。再度接続してください。");
                }
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [auth, baseUrl, logout]
    );

    /**
     * エラークリア
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        isAuthenticated: !!auth,
        auth,
        project,
        workItems,
        isLoading,
        isAuthenticating,
        error,
        isPasswordDialogOpen,

        // Actions
        authenticateWithDialog,
        authenticateWithPassword,
        logout,
        fetchProjectAndWorkItems,
        registerTask,
        clearError,
    };
}
