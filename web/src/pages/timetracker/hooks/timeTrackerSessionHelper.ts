/**
 * TimeTracker Session Storage Helper
 *
 * TimeTracker のセッション情報管理を提供するヘルパーモジュールです。
 * SessionStorage を使用して認証情報、プロジェクト、WorkItem を管理します。
 */

import {
    authenticateAsync,
    getProjectAsync,
    getWorkItemsAsync,
    isAuthenticationError,
    registerTaskAsync,
    type TimeTrackerAuth,
    type TimeTrackerTask,
} from "@/core/api";
import { getSessionStorage } from "@/lib/storage";
import type { Project, WorkItem } from "@/types";

const TIMETRACKER_STORAGE_KEYS = {
    AUTH: "timetracker_auth",
    PROJECT: "timetracker_project",
    WORK_ITEMS: "timetracker_workitems",
} as const;

/**
 * 認証情報（有効期限付き）
 */
export interface StoredAuth extends TimeTrackerAuth {
    expiresAt: number; // Unix timestamp (milliseconds)
}

/**
 * セッションストレージから認証情報を取得
 */
export function loadAuth(): StoredAuth | null {
    try {
        const storage = getSessionStorage();
        const auth = storage.getValue<StoredAuth>(TIMETRACKER_STORAGE_KEYS.AUTH);

        if (!auth) {
            return null;
        }

        // 有効期限チェック
        if (auth.expiresAt && Date.now() > auth.expiresAt) {
            // 期限切れの場合は削除
            storage.removeValue(TIMETRACKER_STORAGE_KEYS.AUTH);
            return null;
        }

        return auth;
    } catch (error) {
        console.error("Failed to load auth from sessionStorage:", error);
        return null;
    }
}

/**
 * 認証情報をセッションストレージに保存
 *
 * @param auth - 認証情報
 * @param expiresInMinutes - 有効期限（分）デフォルト: 60分
 */
export function saveAuth(auth: TimeTrackerAuth, expiresInMinutes: number = 60): void {
    try {
        const storedAuth: StoredAuth = {
            ...auth,
            expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
        };

        const storage = getSessionStorage();
        storage.setValue(TIMETRACKER_STORAGE_KEYS.AUTH, storedAuth);
    } catch (error) {
        console.error("Failed to save auth to sessionStorage:", error);
    }
}

/**
 * 認証情報をセッションストレージから削除
 */
export function clearAuth(): void {
    try {
        const storage = getSessionStorage();
        storage.removeValue(TIMETRACKER_STORAGE_KEYS.AUTH);
    } catch (error) {
        console.error("Failed to clear auth from sessionStorage:", error);
    }
}

/**
 * セッションストレージからプロジェクト情報を取得
 */
export function loadProject(): Project | null {
    try {
        const storage = getSessionStorage();
        return storage.getValue<Project>(TIMETRACKER_STORAGE_KEYS.PROJECT);
    } catch (error) {
        console.error("Failed to load project from sessionStorage:", error);
        return null;
    }
}

/**
 * プロジェクト情報をセッションストレージに保存
 */
export function saveProject(project: Project): void {
    try {
        const storage = getSessionStorage();
        storage.setValue(TIMETRACKER_STORAGE_KEYS.PROJECT, project);
    } catch (error) {
        console.error("Failed to save project to sessionStorage:", error);
    }
}

/**
 * プロジェクト情報をセッションストレージから削除
 */
export function clearProject(): void {
    try {
        const storage = getSessionStorage();
        storage.removeValue(TIMETRACKER_STORAGE_KEYS.PROJECT);
    } catch (error) {
        console.error("Failed to clear project from sessionStorage:", error);
    }
}

/**
 * セッションストレージからWorkItem一覧を取得
 */
export function loadWorkItems(): WorkItem[] | null {
    try {
        const storage = getSessionStorage();
        return storage.getValue<WorkItem[]>(TIMETRACKER_STORAGE_KEYS.WORK_ITEMS);
    } catch (error) {
        console.error("Failed to load work items from sessionStorage:", error);
        return null;
    }
}

/**
 * WorkItem一覧をセッションストレージに保存
 */
export function saveWorkItems(workItems: WorkItem[]): void {
    try {
        const storage = getSessionStorage();
        storage.setValue(TIMETRACKER_STORAGE_KEYS.WORK_ITEMS, workItems);
    } catch (error) {
        console.error("Failed to save work items to sessionStorage:", error);
    }
}

/**
 * WorkItem一覧をセッションストレージから削除
 */
export function clearWorkItems(): void {
    try {
        const storage = getSessionStorage();
        storage.removeValue(TIMETRACKER_STORAGE_KEYS.WORK_ITEMS);
    } catch (error) {
        console.error("Failed to clear work items from sessionStorage:", error);
    }
}

/**
 * 全てのセッション情報をクリア
 */
export function clearAllSession(): void {
    clearAuth();
    clearProject();
    clearWorkItems();
}

// ========================================
// Business Logic Functions
// ========================================

/**
 * 認証エラーのハンドリング結果
 */
export interface AuthErrorHandlingResult {
    shouldLogout: boolean;
    errorMessage: string;
}

/**
 * 認証エラーをハンドリング
 */
export function handleAuthenticationError(error: unknown): AuthErrorHandlingResult {
    if (isAuthenticationError(error)) {
        return {
            shouldLogout: true,
            errorMessage: "認証の有効期限が切れました。再度接続してください。",
        };
    }

    return {
        shouldLogout: false,
        errorMessage: error instanceof Error ? error.message : "エラーが発生しました",
    };
}

/**
 * パスワードで認証を実行
 *
 * @param baseUrl - TimeTracker のベースURL
 * @param userName - ユーザー名
 * @param password - パスワード
 * @param expiresInMinutes - トークン有効期限（分）
 * @returns 認証情報
 */
export async function authenticateWithPasswordAsync(
    baseUrl: string,
    userName: string,
    password: string,
    expiresInMinutes: number = 60,
): Promise<TimeTrackerAuth> {
    const auth = await authenticateAsync(baseUrl, userName, password);
    saveAuth(auth, expiresInMinutes);
    return auth;
}

/**
 * プロジェクトと作業項目を取得してキャッシュ
 *
 * @param baseUrl - TimeTracker のベースURL
 * @param projectId - プロジェクトID
 * @param auth - 認証情報
 * @param userName - ユーザー名
 * @returns プロジェクトと作業項目
 */
export async function fetchProjectAndWorkItemsAsync(
    baseUrl: string,
    projectId: string,
    auth: TimeTrackerAuth,
    userName: string,
): Promise<{ project: Project; workItems: WorkItem[] }> {
    // プロジェクト取得
    const project = await getProjectAsync(baseUrl, projectId, auth);
    saveProject(project);

    // 作業項目取得
    const workItems = await getWorkItemsAsync(baseUrl, projectId, auth, userName);
    saveWorkItems(workItems);

    return { project, workItems };
}

/**
 * タスクを登録（認証チェック付き）
 *
 * @param baseUrl - TimeTracker のベースURL
 * @param task - 登録するタスク
 * @param auth - 認証情報
 * @throws 認証エラーの場合はエラーをスロー
 */
export async function registerTaskWithAuthCheckAsync(
    baseUrl: string,
    task: TimeTrackerTask,
    auth: TimeTrackerAuth,
): Promise<void> {
    await registerTaskAsync(baseUrl, auth.userId, task, auth);
}
