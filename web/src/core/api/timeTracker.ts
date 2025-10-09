/**
 * TimeTracker API Client
 *
 * Pythonのapi.pyをTypeScriptに移植したものです。
 * TimeTracker APIとの通信を行います。
 */

import { HttpRequestQueue, type HttpRequestQueueResponse } from "@/lib/asyncQueue";
import type { Project, WorkItem } from "@/types";

/**
 * TimeTrackerタスク
 */
export interface TimeTrackerTask {
    workItemId: string;
    startTime: Date;
    endTime: Date;
    memo?: string;
}

/**
 * TimeTrackerタスクのバリデーション
 */
export function validateTimeTrackerTask(task: TimeTrackerTask): void {
    if (task.startTime >= task.endTime) {
        throw new Error("start_time is greater than end_time");
    }
    if (task.startTime.getMinutes() % 30 !== 0) {
        throw new Error("start_time is not multiple of 30 minutes");
    }
    if (task.endTime.getMinutes() % 30 !== 0) {
        throw new Error("end_time is not multiple of 30 minutes");
    }
}

/**
 * TimeTracker APIクライアント
 *
 * @deprecated ステートレスな関数（authenticateAsync, getProjectAsync, getWorkItemsAsync, registerTaskAsync）を使用してください
 */
export class TimeTracker {
    private token: string | null = null;
    private userId: string | null = null;
    private userName: string;
    private baseUrl: string;
    private projectId: string;
    private queue: HttpRequestQueue;

    constructor(baseUrl: string, userName: string, projectId: string) {
        this.baseUrl = baseUrl;
        this.userName = userName;
        this.projectId = projectId;
        this.queue = new HttpRequestQueue(100);
    }

    /**
     * 認証処理
     */
    async connectAsync(password: string): Promise<void> {
        console.debug("Start connectAsync.");

        if (this.token) {
            console.info("Already connected");
            this.token = null;
        }

        const response = await this.requestAsync("/auth/token", false, { loginname: this.userName, password });

        if (response.status === 200 && response.body) {
            const data = JSON.parse(response.body);
            this.token = data.token ?? null;
        }

        if (!this.token) {
            this.throwError(`TimeTrackerへの認証処理でエラー応答が返却されました。: ${this.getErrorMessage(response)}`);
        }

        const userResponse = await this.requestAsync("/system/users/me", true);

        if (userResponse.status === 200 && userResponse.body) {
            const userData = JSON.parse(userResponse.body);
            if (userData.loginName === this.userName) {
                this.userId = userData.id ?? null;
            }
        }

        if (!this.userId) {
            this.throwError("TimeTrackerへの認証処理で失敗しました。");
        }
    }

    /**
     * プロジェクト情報を取得
     */
    async getProjectsAsync(): Promise<Project> {
        console.debug("Start getProjectsAsync.");

        const response = await this.requestAsync(`/workitem/workItems/${this.projectId}`, true);

        if (response.status === 200 && response.body) {
            const data = JSON.parse(response.body);
            if (Array.isArray(data) && data[0]?.fields) {
                const fields = data[0].fields;
                return {
                    id: fields.Id,
                    name: fields.Name,
                    projectId: fields.ProjectId,
                    projectName: fields.ProjectName,
                    projectCode: fields.ProjectCode,
                };
            }
        }

        this.throwError(
            `TimeTrackerへのProject取得処理でエラー応答が返却されました。: ${this.getErrorMessage(response)}`,
        );
    }

    /**
     * 作業項目を取得
     */
    async getWorkItemsAsync(): Promise<WorkItem[]> {
        console.debug("Start getWorkItemsAsync");

        const response = await this.requestAsync(
            `/workitem/workItems/${this.projectId}/subItems?fields=FolderName,Name&assignedUsers=${this.userName}&includeDeleted=false`,
            true,
        );

        if (response.status === 200 && response.body) {
            const data = JSON.parse(response.body);
            if (Array.isArray(data)) {
                const workItems = data.map((item) => this.parseWorkItem(item));
                workItems.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
                return workItems;
            }
        }

        this.throwError(
            `TimeTrackerへのWorkItem取得処理でエラー応答が返却されました。: ${this.getErrorMessage(response)}`,
        );
    }

    /**
     * タスクを登録
     */
    async registerTaskAsync(task: TimeTrackerTask): Promise<string> {
        console.debug("Start registerTaskAsync");

        validateTimeTrackerTask(task);

        if (!this.userId) {
            this.throwError("User ID is not set. Please connect first.");
        }

        const response = await this.requestAsync(`/system/users/${this.userId}/timeEntries`, true, {
            workItemId: task.workItemId,
            startTime: this.formatDateTime(task.startTime),
            finishTime: this.formatDateTime(task.endTime),
            memo: task.memo,
        });

        if (response.status === 200) {
            return response.body || "";
        }

        this.throwError(
            `TimeTrackerへのタスクの登録処理でエラー応答が返却されました。: ${this.getErrorMessage(response)}`,
        );
    }

    /**
     * エラーメッセージを取得
     */
    private getErrorMessage(response: HttpRequestQueueResponse | null): string {
        if (!response) {
            return "Response is None";
        }

        let msg = `Status: ${response.status}`;
        if (response.body) {
            try {
                const data = JSON.parse(response.body);
                const errorMsg = Array.isArray(data) ? data[0]?.message : null;
                msg += `, Message: ${errorMsg || `Unknown response ${response.body}`}`;
            } catch {
                msg += `, Message: Unknown response ${response.body}`;
            }
        }
        return msg;
    }

    /**
     * WorkItemをパース
     */
    private parseWorkItem(workItemDict: Record<string, unknown>, parentFolderPath?: string): WorkItem {
        const fields = workItemDict.fields as Record<string, unknown> | undefined;

        if (!fields) {
            this.throwError(`Unknown response: ${JSON.stringify(workItemDict)}`);
        }

        const folderPath = parentFolderPath
            ? `${parentFolderPath}/${fields.FolderName}`
            : (fields.FolderName as string);

        const subItemsData = (fields.SubItems as Record<string, unknown>[]) || [];

        return {
            id: fields.Id as string,
            name: fields.Name as string,
            folderName: fields.FolderName as string,
            folderPath,
            subItems: subItemsData.map((subItem) => this.parseWorkItem(subItem, folderPath)),
        };
    }

    /**
     * HTTPリクエストを送信
     */
    private async requestAsync(
        uri: string,
        addAuthHeader: boolean,
        jsonData?: unknown,
        headers?: Record<string, string>,
    ): Promise<HttpRequestQueueResponse> {
        const reqHeaders: Record<string, string> = {};

        if (addAuthHeader) {
            Object.assign(reqHeaders, this.getAuthHeader());
        }

        if (headers) {
            Object.assign(reqHeaders, headers);
        }

        try {
            const response = await this.queue.enqueueAsync({
                url: this.baseUrl + uri,
                headers: reqHeaders,
                json: jsonData,
            });
            return response;
        } catch (error) {
            this.throwError(
                `${uri}へのリクエスト処理に失敗しました。: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * 認証ヘッダーを取得
     */
    private getAuthHeader(): Record<string, string> {
        if (!this.token) {
            throw new Error("Not connected.");
        }
        return { Authorization: `Bearer ${this.token}` };
    }

    /**
     * 日時をフォーマット
     */
    private formatDateTime(date: Date): string {
        return date.toISOString().slice(0, 19); // "2025-10-04T09:30:00"
    }

    /**
     * エラーをスロー
     */
    private throwError(message: string): never {
        console.error(message);
        throw new Error(message);
    }
}

// ============================================================================
// ステートレスAPI関数（推奨）
// ============================================================================

/**
 * 認証情報
 */
export interface TimeTrackerAuth {
    token: string;
    userId: string;
}

/**
 * エラーレスポンスかどうかをチェック
 */
function isErrorResponse(response: HttpRequestQueueResponse): boolean {
    return response.status < 200 || response.status >= 300;
}

/**
 * エラーメッセージを取得
 */
function getErrorMessage(response: HttpRequestQueueResponse): string {
    let msg = `StatusCode: ${response.status}`;
    if (response.body) {
        try {
            const data = JSON.parse(response.body);
            const errorMsg = Array.isArray(data) ? data[0]?.message : null;
            msg += `, Message: ${errorMsg || `Unknown response ${response.body}`}`;
        } catch {
            msg += `, Message: Unknown response ${response.body}`;
        }
    }
    return msg;
}

/**
 * HTTPリクエストを送信（ステートレス）
 */
async function requestAsync(
    baseUrl: string,
    uri: string,
    auth: TimeTrackerAuth | null,
    jsonData?: unknown,
    headers?: Record<string, string>,
): Promise<HttpRequestQueueResponse> {
    const queue = new HttpRequestQueue(100);
    const reqHeaders: Record<string, string> = { ...headers };

    if (auth) {
        reqHeaders.Authorization = `Bearer ${auth.token}`;
    }

    try {
        const response = await queue.enqueueAsync({
            url: baseUrl + uri,
            headers: reqHeaders,
            json: jsonData,
        });
        return response;
    } catch (error) {
        throw new Error(
            `${uri}へのリクエスト処理に失敗しました。: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * WorkItemをパース（ステートレス）
 */
function parseWorkItem(workItemDict: Record<string, unknown>, parentFolderPath?: string): WorkItem {
    const fields = workItemDict.fields as Record<string, unknown> | undefined;

    if (!fields) {
        throw new Error(`Unknown response: ${JSON.stringify(workItemDict)}`);
    }

    const folderPath = parentFolderPath ? `${parentFolderPath}/${fields.FolderName}` : (fields.FolderName as string);

    const subItemsData = (fields.SubItems as Record<string, unknown>[]) || [];

    return {
        id: fields.Id as string,
        name: fields.Name as string,
        folderName: fields.FolderName as string,
        folderPath,
        subItems: subItemsData.map((subItem) => parseWorkItem(subItem, folderPath)),
    };
}

/**
 * 日時をフォーマット
 */
function formatDateTime(date: Date): string {
    return date.toISOString().slice(0, 19); // "2025-10-04T09:30:00"
}

/**
 * 認証処理（ステートレス）
 *
 * @param baseUrl - TimeTrackerのベースURL
 * @param userName - ユーザー名（ログイン名）
 * @param password - パスワード
 * @returns 認証情報（token, userId）
 * @throws 認証に失敗した場合
 */
export async function authenticateAsync(baseUrl: string, userName: string, password: string): Promise<TimeTrackerAuth> {
    console.debug("Start authenticateAsync.");

    // トークン取得
    const tokenResponse = await requestAsync(baseUrl, "/auth/token", null, { loginname: userName, password });

    if (isErrorResponse(tokenResponse)) {
        throw new Error(`TimeTrackerへの認証処理でエラー応答が返却されました。: ${getErrorMessage(tokenResponse)}`);
    }

    if (!tokenResponse.body) {
        throw new Error("TimeTrackerへの認証処理で失敗しました。");
    }

    const tokenData = JSON.parse(tokenResponse.body);
    const token = tokenData.token ?? null;

    if (!token) {
        throw new Error("TimeTrackerへの認証処理で失敗しました。");
    }

    // ユーザー情報取得
    const auth: TimeTrackerAuth = { token, userId: "" };
    const userResponse = await requestAsync(baseUrl, "/system/users/me", auth);

    if (isErrorResponse(userResponse)) {
        throw new Error(`ユーザー情報の取得でエラー応答が返却されました。: ${getErrorMessage(userResponse)}`);
    }

    if (!userResponse.body) {
        throw new Error("ユーザー情報の取得に失敗しました。");
    }

    const userData = JSON.parse(userResponse.body);
    if (userData.loginName !== userName) {
        throw new Error("ユーザー情報の取得に失敗しました。");
    }

    auth.userId = userData.id ?? null;

    if (!auth.userId) {
        throw new Error("ユーザーIDの取得に失敗しました。");
    }

    return auth;
}

/**
 * プロジェクト情報を取得（ステートレス）
 *
 * @param baseUrl - TimeTrackerのベースURL
 * @param projectId - プロジェクトID
 * @param auth - 認証情報
 * @returns プロジェクト情報
 * @throws プロジェクト情報の取得に失敗した場合
 */
export async function getProjectAsync(baseUrl: string, projectId: string, auth: TimeTrackerAuth): Promise<Project> {
    console.debug("Start getProjectAsync.");

    const response = await requestAsync(baseUrl, `/workitem/workItems/${projectId}`, auth);

    if (isErrorResponse(response)) {
        throw new Error(`プロジェクト情報の取得でエラー応答が返却されました。: ${getErrorMessage(response)}`);
    }

    if (!response.body) {
        throw new Error("プロジェクト情報の取得に失敗しました。");
    }

    const data = JSON.parse(response.body);
    if (!Array.isArray(data) || !data[0]?.fields) {
        throw new Error(`プロジェクト情報の取得に失敗しました。: Unknown response ${response.body}`);
    }

    const fields = data[0].fields as Record<string, unknown>;

    return {
        id: fields.Id as string,
        name: fields.Name as string,
        projectId: fields.ProjectId as string,
        projectName: fields.ProjectName as string,
        projectCode: fields.ProjectCode as string,
    };
}

/**
 * WorkItem一覧を取得（ステートレス）
 *
 * @param baseUrl - TimeTrackerのベースURL
 * @param projectId - プロジェクトID
 * @param auth - 認証情報
 * @returns WorkItem一覧
 * @throws WorkItem一覧の取得に失敗した場合
 */
export async function getWorkItemsAsync(
    baseUrl: string,
    projectId: string,
    auth: TimeTrackerAuth,
    userName?: string,
): Promise<WorkItem[]> {
    console.debug("Start getWorkItemsAsync.");

    // api.pyと同じURLパターンに修正
    const uri = `/workitem/workItems/${projectId}/subItems?fields=FolderName,Name${
        userName ? `&assignedUsers=${userName}` : ""
    }&includeDeleted=false`;
    const response = await requestAsync(baseUrl, uri, auth);

    if (isErrorResponse(response)) {
        throw new Error(`WorkItem一覧の取得でエラー応答が返却されました。: ${getErrorMessage(response)}`);
    }

    if (!response.body) {
        throw new Error("WorkItem一覧の取得に失敗しました。");
    }

    const data = JSON.parse(response.body);
    if (!Array.isArray(data)) {
        throw new Error(`WorkItem一覧の取得に失敗しました。: Unknown response ${response.body}`);
    }

    return data.map((item) => parseWorkItem(item));
}

/**
 * タスクを登録（ステートレス）
 *
 * @param baseUrl - TimeTrackerのベースURL
 * @param userId - ユーザーID
 * @param task - 登録するタスク
 * @param auth - 認証情報
 * @throws タスクの登録に失敗した場合
 */
export async function registerTaskAsync(
    baseUrl: string,
    userId: string,
    task: TimeTrackerTask,
    auth: TimeTrackerAuth,
): Promise<void> {
    console.debug("Start registerTaskAsync.");

    validateTimeTrackerTask(task);

    // api.pyと同じJSONフィールド名・URL（camelCase）
    const jsonData = {
        workItemId: task.workItemId,
        startTime: formatDateTime(task.startTime),
        finishTime: formatDateTime(task.endTime),
        memo: task.memo || "",
    };

    const response = await requestAsync(baseUrl, `/system/users/${userId}/timeEntries`, auth, jsonData);

    if (isErrorResponse(response)) {
        throw new Error(`タスクの登録でエラー応答が返却されました。: ${getErrorMessage(response)}`);
    }
}

/**
 * 認証エラーかどうかをチェック
 *
 * @param error - エラーオブジェクト
 * @returns 認証エラーの場合true
 */
export function isAuthenticationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    return error.message.includes("StatusCode: 401") || error.message.includes("Not connected");
}

// ==================== Phase 7: タスク一括登録API ====================

/**
 * タスク一括登録リクエスト
 */
export interface RegisterTasksRequest {
    /** 登録するスケジュールリスト */
    schedules: Array<{
        /** 日付 (例: "2024/01/15") */
        date: string;
        /** 開始時刻 (例: "09:00") */
        startTime: string;
        /** 終了時刻 (例: "10:30") */
        endTime: string;
        /** 作業項目コード (例: "PROJ001-001") */
        itemCode: string;
        /** タイトル（イベント名） */
        title: string;
    }>;
}

/**
 * タスク一括登録レスポンス
 */
export interface RegisterTasksResponse {
    /** 成功フラグ */
    success: boolean;
    /** メッセージ */
    message?: string;
    /** 登録成功件数 */
    registeredCount?: number;
    /** エラー詳細 */
    errors?: Array<{
        /** エラーが発生した日付 */
        date: string;
        /** エラーメッセージ */
        error: string;
    }>;
}

/**
 * タスク一括登録API
 *
 * CompletionViewから複数のスケジュールアイテムをまとめて登録します。
 *
 * @param request - 登録リクエスト
 * @returns 登録結果
 * @throws API呼び出しに失敗した場合
 */
export async function registerTasks(request: RegisterTasksRequest): Promise<RegisterTasksResponse> {
    console.debug("Start registerTasks.", { schedulesCount: request.schedules.length });

    try {
        const response = await fetch("/api/register-task", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data: RegisterTasksResponse = await response.json();
        console.debug("registerTasks success.", { data });
        return data;
    } catch (error) {
        console.error("タスク一括登録APIエラー", { error });
        throw error;
    }
}
