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
