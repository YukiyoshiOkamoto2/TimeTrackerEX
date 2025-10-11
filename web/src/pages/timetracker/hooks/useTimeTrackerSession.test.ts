/**
 * Tests for useTimeTrackerSession hook (新API対応版)
 */

import type { Project, WorkItem } from "@/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as helper from "./timeTrackerSessionHelper";
import { AuthError, type StoredAuth } from "./timeTrackerSessionHelper";
import { useTimeTrackerSession } from "./useTimeTrackerSession";

// モック: AuthErrorなどクラス実装は本物を使用し、関数のみをmockする
vi.mock("./timeTrackerSessionHelper", async () => {
    const actual = await vi.importActual<typeof import("./timeTrackerSessionHelper")>("./timeTrackerSessionHelper");
    return {
        ...actual,
        loadAuth: vi.fn(),
        clearAllSession: vi.fn(),
        authenticateWithPasswordAsync: vi.fn(),
        fetchProjectAndWorkItemsAsync: vi.fn(),
        registerTaskWithAuthCheckAsync: vi.fn(),
    };
});

const mockStoredAuth: StoredAuth = {
    token: "test-token",
    userId: "user123",
    expiresAt: Date.now() + 3600000, // 1時間後
};

const mockProject: Project = {
    id: "proj-1",
    name: "Test Project",
    projectId: "proj-1",
    projectName: "Test Project",
    projectCode: "TEST",
};

const mockWorkItems: WorkItem[] = [
    {
        id: "wi-1",
        name: "Work Item 1",
        folderName: "Folder 1",
        folderPath: "/Folder 1",
    },
    {
        id: "wi-2",
        name: "Work Item 2",
        folderName: "Folder 2",
        folderPath: "/Folder 2",
    },
];

// ===================== テストユーティリティ =====================
type APIResult<T = any> = { isError: boolean; content?: T; errorMessage?: string };
function expectOk<T>(r: APIResult<T>): asserts r is { isError: false; content: T | undefined } {
    expect(r.isError).toBe(false);
}
function expectErr(r: APIResult): asserts r is { isError: true; errorMessage: string } {
    expect(r.isError).toBe(true);
    // @ts-expect-error 型ナロー
    expect(r.errorMessage).toBeTruthy();
}
async function withAct<T>(fn: () => Promise<T>): Promise<T> {
    let ret!: T;
    await act(async () => {
        ret = await fn();
    });
    return ret;
}

describe("useTimeTrackerSession (新API)", () => {
    const baseUrl = "https://timetracker.example.com";
    const userName = "testuser";

    beforeEach(() => {
        vi.clearAllMocks();

        // デフォルトのモック実装
        vi.mocked(helper.loadAuth).mockReturnValue(null);
        vi.mocked(helper.clearAllSession).mockImplementation(() => {
            vi.mocked(helper.loadAuth).mockReturnValue(null);
        });
        vi.mocked(helper.authenticateWithPasswordAsync).mockResolvedValue(mockStoredAuth);
        vi.mocked(helper.fetchProjectAndWorkItemsAsync).mockResolvedValue({
            project: mockProject,
            workItems: mockWorkItems,
        });
        vi.mocked(helper.registerTaskWithAuthCheckAsync).mockResolvedValue(undefined);
    });

    describe("初期化", () => {
        it("初期状態では未認証", () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.isLoading).toBe(false);
        });

        it("sessionStorageに認証情報がある場合は認証済み", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            expect(result.current.isAuthenticated).toBe(true);
        });
    });

    describe("logout", () => {
        it("ログアウトで全セッションをクリア", async () => {
            // 最初は認証済みの状態
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            expect(result.current.isAuthenticated).toBe(true);

            act(() => {
                result.current.logout();
            });

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
                expect(helper.clearAllSession).toHaveBeenCalled();
            });
        });
    });

    describe("fetchProjectAndWorkItemsAsync", () => {
        it("プロジェクトと作業項目を取得", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            const response = await withAct(() => result.current.fetchProjectAndWorkItemsAsync("proj-1"));
            expectOk(response);
            expect(response.content).toEqual({ project: mockProject, workItems: mockWorkItems });
            expect(helper.fetchProjectAndWorkItemsAsync).toHaveBeenCalledWith(baseUrl, "proj-1", userName);
        });

        it("AuthErrorの場合は自動ログアウト", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            // AuthErrorを作成（実際のクラスインスタンスとして）
            const authError = new AuthError("認証の有効期限が切れました。再度接続してください。");
            vi.mocked(helper.fetchProjectAndWorkItemsAsync).mockRejectedValueOnce(authError);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            const response = await withAct(() => result.current.fetchProjectAndWorkItemsAsync("proj-1"));
            expectErr(response);
            expect(response.errorMessage).toContain("認証の有効期限が切れました");
            // logout後はsessionStorageがクリアされた想定でloadAuthもnullに
            vi.mocked(helper.loadAuth).mockReturnValue(null);
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
            });
        });

        it("通常のエラーの場合はエラーメッセージを返す", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(helper.fetchProjectAndWorkItemsAsync).mockRejectedValueOnce(new Error("Network error"));

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            const response = await withAct(() => result.current.fetchProjectAndWorkItemsAsync("proj-1"));
            expectErr(response);
            expect(response.errorMessage).toBe("Network error");
            expect(result.current.isAuthenticated).toBe(true); // ログアウトしない
        });
    });

    describe("registerTaskAsync", () => {
        const mockTask = {
            workItemId: "wi-1",
            startTime: new Date("2025-10-09T09:00:00"),
            endTime: new Date("2025-10-09T10:00:00"),
            memo: "Test task",
        };

        it("タスクを登録", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            const response = await withAct(() => result.current.registerTaskAsync(mockTask));
            expectOk(response);
            expect(helper.registerTaskWithAuthCheckAsync).toHaveBeenCalledWith(baseUrl, mockTask);
        });

        it("AuthErrorの場合は自動ログアウト", async () => {
            vi.mocked(helper.loadAuth).mockReturnValue(mockStoredAuth);

            // AuthErrorを作成（実際のクラスインスタンスとして）
            const authError = new AuthError("認証の有効期限が切れました。再度接続してください。");
            vi.mocked(helper.registerTaskWithAuthCheckAsync).mockRejectedValueOnce(authError);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            const response = await withAct(() => result.current.registerTaskAsync(mockTask));
            expectErr(response);
            expect(response.errorMessage).toContain("認証の有効期限が切れました");

            // clearAllSessionモックがloadAuthをnullに設定済み
            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(false);
            });
        });
    });
});
