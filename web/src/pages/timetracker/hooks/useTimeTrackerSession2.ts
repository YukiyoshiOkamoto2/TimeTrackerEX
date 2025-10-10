/**
 * TimeTracker Session Manageme    // プロジェクト・WorkItem
    project: Project | null;
    workItems: WorkItem[] | null;

    // ローディング状態
    isLoading: boolean;
    isAuthenticating: boolean;

    // エラー
    error: string | null;

    // パスワード入力ダイアログ
    isPasswordDialogOpen: boolean;

    // Phase 7追加: タスク登録用パスワード
    // セッション中のみメモリに保持（sessionStorageには保存しない）
    password: string | null;
}* TimeTrackerのセッション管理を行うカスタムフック
 * - 認証情報の管理(sessionStorageに永続化)
 * - プロジェクト・作業項目の取得とキャッシュ
 * - タスク登録
 * - 自動ログアウト(トークン期限切れ時)
 */

import type { TimeTrackerAuth, TimeTrackerTask } from "@/core/api";
import type { Project, WorkItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import {
    authenticateWithPasswordAsync,
    clearAllSession,
    fetchProjectAndWorkItemsAsync,
    handleAuthenticationError,
    loadAuth,
    loadProject,
    loadWorkItems,
    registerTaskWithAuthCheckAsync,
} from "./timeTrackerSessionHelper";

export type TimeTrackerAPIFailuer = {
    isError: true;
    errorMessage: string;
};

export type TimeTrackerAPISuccess<T> = {
    isError: false;
    content: T;
};

export type TimeTrackerAPIResult<T = undefined> = TimeTrackerAPIFailuer | TimeTrackerAPISuccess<T>;

export type ProjectAndWorkItem = {
    project: Project;
    workItem: WorkItem[];
};

export interface TimeTrackerSessionState {
    // 認証状態
    isAuthenticated: boolean;
    // ローディング状態
    isLoading: boolean;
}

export interface TimeTrackerSessionActions {
    // 認証
    authenticateAsync: () => Promise<TimeTrackerAPIResult>;
    logout: () => void;

    // プロジェクト・作業項目の取得
    fetchProjectAndWorkItems: (projectId: string) => Promise<TimeTrackerAPIResult<ProjectAndWorkItem>>;

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
        async (pwd: string) => {
            setIsAuthenticating(true);
            setError(null);

            try {
                const newAuth = await authenticateWithPasswordAsync(baseUrl, userName, pwd, tokenExpirationMinutes);
                setAuth(newAuth);
                setIsPasswordDialogOpen(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "認証に失敗しました";
                setError(errorMessage);
                throw err; // ダイアログ側でエラーハンドリングできるように再スロー
            } finally {
                setIsAuthenticating(false);
            }
        },
        [baseUrl, userName, tokenExpirationMinutes],
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
     * @param onInvalidProjectId プロジェクトID取得失敗時に実行されるコールバック（設定のクリアなど）
     */
    const fetchProjectAndWorkItems = useCallback(
        async (projectId: string, onInvalidProjectId?: () => void | Promise<void>) => {
            if (!auth) {
                setError("認証されていません。接続してください。");
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const { project: fetchedProject, workItems: fetchedWorkItems } = await fetchProjectAndWorkItemsAsync(
                    baseUrl,
                    projectId,
                    auth,
                    userName,
                );

                setProject(fetchedProject);
                setWorkItems(fetchedWorkItems);
            } catch (err) {
                const { shouldLogout, errorMessage } = handleAuthenticationError(err);

                if (shouldLogout) {
                    logout();
                } else if (onInvalidProjectId) {
                    // プロジェクトIDが無効な場合は設定をクリア
                    await onInvalidProjectId();
                }

                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [auth, baseUrl, userName, logout],
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
                await registerTaskWithAuthCheckAsync(baseUrl, task, auth);
            } catch (err) {
                const { shouldLogout, errorMessage } = handleAuthenticationError(err);

                if (shouldLogout) {
                    logout();
                    throw new Error(errorMessage);
                }

                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [auth, baseUrl, logout],
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
