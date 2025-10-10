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
} as const;

/**
 * 認証エラークラス
 * API実行時に認証が必要または認証が失敗した場合にスローされる
 */
export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthError";
    }
}

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
 * 全てのセッション情報をクリア
 */
export function clearAllSession(): void {
    clearAuth();
}

/**
 * 認証情報を取得（認証チェック付き）
 *
 * @throws {AuthError} 認証されていない、または認証の有効期限が切れている場合
 */
function getAuthOrThrow(): TimeTrackerAuth {
    const auth = loadAuth();
    if (!auth) {
        throw new AuthError("認証されていません。接続してください。");
    }
    return auth;
}

// ========================================
// Business Logic Functions
// ========================================

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
 * @param userName - ユーザー名
 * @returns プロジェクトと作業項目
 * @throws {AuthError} 認証されていない、または認証エラーが発生した場合
 */
export async function fetchProjectAndWorkItemsAsync(
    baseUrl: string,
    projectId: string,
    userName: string,
): Promise<{ project: Project; workItems: WorkItem[] }> {
    // 認証情報を取得（未認証の場合はAuthErrorをスロー）
    const auth = getAuthOrThrow();

    try {
        // プロジェクト取得
        const project = await getProjectAsync(baseUrl, projectId, auth);

        // 作業項目取得
        const workItems = await getWorkItemsAsync(baseUrl, projectId, auth, userName);

        return { project, workItems };
    } catch (error) {
        // 認証エラーの場合はセッションをクリアしてAuthErrorをスロー
        if (isAuthenticationError(error)) {
            clearAuth();
            throw new AuthError("認証の有効期限が切れました。再度接続してください。");
        }
        throw error;
    }
}

/**
 * タスクを登録（認証チェック付き）
 *
 * @param baseUrl - TimeTracker のベースURL
 * @param task - 登録するタスク
 * @throws {AuthError} 認証されていない、または認証エラーが発生した場合
 */
export async function registerTaskWithAuthCheckAsync(baseUrl: string, task: TimeTrackerTask): Promise<void> {
    // 認証情報を取得（未認証の場合はAuthErrorをスロー）
    const auth = getAuthOrThrow();

    try {
        await registerTaskAsync(baseUrl, auth.userId, task, auth);
    } catch (error) {
        // 認証エラーの場合はセッションをクリアしてAuthErrorをスロー
        if (isAuthenticationError(error)) {
            clearAuth();
            throw new AuthError("認証の有効期限が切れました。再度接続してください。");
        }
        throw error;
    }
}
