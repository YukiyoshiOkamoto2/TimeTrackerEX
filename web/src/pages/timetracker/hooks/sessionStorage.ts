/**
 * TimeTracker Session Storage Utilities
 *
 * セッションストレージを使用してTimeTrackerのセッション情報を管理します。
 */

import type { TimeTrackerAuth } from "@/core/api";
import type { Project, WorkItem } from "@/types";

const STORAGE_KEYS = {
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
        const data = sessionStorage.getItem(STORAGE_KEYS.AUTH);
        if (!data) {
            return null;
        }

        const auth: StoredAuth = JSON.parse(data);

        // 有効期限チェック
        if (auth.expiresAt && Date.now() > auth.expiresAt) {
            // 期限切れの場合は削除
            sessionStorage.removeItem(STORAGE_KEYS.AUTH);
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

        sessionStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(storedAuth));
    } catch (error) {
        console.error("Failed to save auth to sessionStorage:", error);
    }
}

/**
 * 認証情報をセッションストレージから削除
 */
export function clearAuth(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    } catch (error) {
        console.error("Failed to clear auth from sessionStorage:", error);
    }
}

/**
 * セッションストレージからプロジェクト情報を取得
 */
export function loadProject(): Project | null {
    try {
        const data = sessionStorage.getItem(STORAGE_KEYS.PROJECT);
        if (!data) {
            return null;
        }

        return JSON.parse(data) as Project;
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
        sessionStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(project));
    } catch (error) {
        console.error("Failed to save project to sessionStorage:", error);
    }
}

/**
 * プロジェクト情報をセッションストレージから削除
 */
export function clearProject(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.PROJECT);
    } catch (error) {
        console.error("Failed to clear project from sessionStorage:", error);
    }
}

/**
 * セッションストレージからWorkItem一覧を取得
 */
export function loadWorkItems(): WorkItem[] | null {
    try {
        const data = sessionStorage.getItem(STORAGE_KEYS.WORK_ITEMS);
        if (!data) {
            return null;
        }

        return JSON.parse(data) as WorkItem[];
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
        sessionStorage.setItem(STORAGE_KEYS.WORK_ITEMS, JSON.stringify(workItems));
    } catch (error) {
        console.error("Failed to save work items to sessionStorage:", error);
    }
}

/**
 * WorkItem一覧をセッションストレージから削除
 */
export function clearWorkItems(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.WORK_ITEMS);
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
