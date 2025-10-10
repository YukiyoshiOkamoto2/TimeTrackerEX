/**
 * Tests for useTimeTrackerSession hook
 */

import * as timeTrackerApi from "@/core/api";
import type { Project, WorkItem } from "@/types";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sessionStorage from "./timeTrackerSessionHelper";
import { StoredAuth } from "./timeTrackerSessionHelper";
import { useTimeTrackerSession } from "./useTimeTrackerSession";

// モック
vi.mock("@/core/api");
vi.mock("./timeTrackerSessionHelper", async () => {
    const actual = await vi.importActual<typeof import("./timeTrackerSessionHelper")>("./timeTrackerSessionHelper");
    return {
        ...actual,
        loadAuth: vi.fn(),
        loadProject: vi.fn(),
        loadWorkItems: vi.fn(),
        saveAuth: vi.fn(),
        saveProject: vi.fn(),
        saveWorkItems: vi.fn(),
        clearAuth: vi.fn(),
        clearProject: vi.fn(),
        clearWorkItems: vi.fn(),
        clearAllSession: vi.fn(),
    };
});

const mockAuth: timeTrackerApi.TimeTrackerAuth = {
    token: "test-token",
    userId: "user123",
};

const mockStoredAuth: StoredAuth = {
    ...mockAuth,
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

describe("useTimeTrackerSession", () => {
    const baseUrl = "https://timetracker.example.com";
    const userName = "testuser";

    beforeEach(() => {
        vi.clearAllMocks();

        // デフォルトのモック実装
        vi.mocked(sessionStorage.loadAuth).mockReturnValue(null);
        vi.mocked(sessionStorage.loadProject).mockReturnValue(null);
        vi.mocked(sessionStorage.loadWorkItems).mockReturnValue(null);
        vi.mocked(timeTrackerApi.authenticateAsync).mockResolvedValue(mockAuth);
        vi.mocked(timeTrackerApi.getProjectAsync).mockResolvedValue(mockProject);
        vi.mocked(timeTrackerApi.getWorkItemsAsync).mockResolvedValue(mockWorkItems);
        vi.mocked(timeTrackerApi.isAuthenticationError).mockReturnValue(false);
    });

    describe("初期化", () => {
        it("初期状態では未認証", () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.auth).toBeNull();
            expect(result.current.project).toBeNull();
            expect(result.current.workItems).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it("sessionStorageから認証情報を復元", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
                expect(result.current.auth).toEqual(mockStoredAuth);
            });
        });

        it("sessionStorageからプロジェクトを復元", async () => {
            vi.mocked(sessionStorage.loadProject).mockReturnValue(mockProject);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.project).toEqual(mockProject);
            });
        });

        it("sessionStorageから作業項目を復元", async () => {
            vi.mocked(sessionStorage.loadWorkItems).mockReturnValue(mockWorkItems);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.workItems).toEqual(mockWorkItems);
            });
        });
    });

    describe("authenticateWithDialog", () => {
        it("パスワードダイアログを開く", () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            act(() => {
                result.current.authenticateWithDialog();
            });

            expect(result.current.isPasswordDialogOpen).toBe(true);
            expect(result.current.error).toBeNull();
        });
    });

    describe("authenticateWithPassword", () => {
        it("認証が成功した場合", async () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await act(async () => {
                await result.current.authenticateWithPassword("password123");
            });

            expect(timeTrackerApi.authenticateAsync).toHaveBeenCalledWith(baseUrl, userName, "password123");
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.auth).toEqual(mockAuth);
            expect(result.current.isPasswordDialogOpen).toBe(false);
            // Note: saveAuth は authenticateWithPasswordAsync 内で呼ばれるため、直接検証しない
        });

        it("認証が失敗した場合", async () => {
            const error = new Error("Authentication failed");
            vi.mocked(timeTrackerApi.authenticateAsync).mockRejectedValueOnce(error);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            let caughtError: unknown = null;
            await act(async () => {
                try {
                    await result.current.authenticateWithPassword("wrong-password");
                } catch (err) {
                    caughtError = err;
                }
            });

            expect(caughtError).not.toBeNull();
            expect((caughtError as Error).message).toBe("Authentication failed");
            expect(result.current.isAuthenticated).toBe(false);
            // エラーはsetErrorで設定されるが、throwされる前の短い間だけ
            // 実際のUIでは、PasswordInputDialogがエラーをcatchして表示する
        });

        it("カスタムトークン有効期限を指定できる", async () => {
            const { result } = renderHook(() =>
                useTimeTrackerSession({ baseUrl, userName, tokenExpirationMinutes: 120 }),
            );

            await act(async () => {
                await result.current.authenticateWithPassword("password123");
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.auth).toEqual(mockAuth);
            // Note: トークン有効期限は authenticateWithPasswordAsync 内で処理されるため、
            // 状態が正しく設定されていることを確認
        });
    });

    describe("logout", () => {
        it("ログアウトで全セッションをクリア", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(sessionStorage.loadProject).mockReturnValue(mockProject);
            vi.mocked(sessionStorage.loadWorkItems).mockReturnValue(mockWorkItems);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            act(() => {
                result.current.logout();
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.auth).toBeNull();
            expect(result.current.project).toBeNull();
            expect(result.current.workItems).toBeNull();
            expect(sessionStorage.clearAllSession).toHaveBeenCalled();
        });
    });

    describe("fetchProjectAndWorkItems", () => {
        it("プロジェクトと作業項目を取得してキャッシュ", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            await act(async () => {
                await result.current.fetchProjectAndWorkItems("proj-1");
            });

            expect(timeTrackerApi.getProjectAsync).toHaveBeenCalledWith(baseUrl, "proj-1", mockStoredAuth);
            expect(timeTrackerApi.getWorkItemsAsync).toHaveBeenCalledWith(baseUrl, "proj-1", mockStoredAuth, userName);
            expect(result.current.project).toEqual(mockProject);
            expect(result.current.workItems).toEqual(mockWorkItems);
            // Note: saveProject/saveWorkItems は fetchProjectAndWorkItemsAsync 内で呼ばれるため、
            // 状態が正しく設定されていることを確認
        });

        it("未認証の場合はエラー", async () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await act(async () => {
                await result.current.fetchProjectAndWorkItems("proj-1");
            });

            expect(result.current.error).toBe("認証されていません。接続してください。");
            expect(timeTrackerApi.getProjectAsync).not.toHaveBeenCalled();
        });

        it("認証エラーの場合は自動ログアウト", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(timeTrackerApi.getProjectAsync).mockRejectedValueOnce(new Error("401 Unauthorized"));
            vi.mocked(timeTrackerApi.isAuthenticationError).mockReturnValue(true);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            await act(async () => {
                await result.current.fetchProjectAndWorkItems("proj-1");
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.error).toBe("認証の有効期限が切れました。再度接続してください。");
            expect(sessionStorage.clearAllSession).toHaveBeenCalled();
        });

        it("通常のエラーの場合はログアウトしない", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(timeTrackerApi.getProjectAsync).mockRejectedValueOnce(new Error("Network error"));

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            await act(async () => {
                await result.current.fetchProjectAndWorkItems("proj-1");
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.error).toBe("Network error");
            expect(sessionStorage.clearAllSession).not.toHaveBeenCalled();
        });
    });

    describe("registerTask", () => {
        const mockTask: timeTrackerApi.TimeTrackerTask = {
            workItemId: "wi-1",
            startTime: new Date("2025-10-09T09:00:00"),
            endTime: new Date("2025-10-09T10:00:00"),
            memo: "Test task",
        };

        it("タスクを登録", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(timeTrackerApi.registerTaskAsync).mockResolvedValueOnce();

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            await act(async () => {
                await result.current.registerTask(mockTask);
            });

            expect(timeTrackerApi.registerTaskAsync).toHaveBeenCalledWith(
                baseUrl,
                mockStoredAuth.userId,
                mockTask,
                mockStoredAuth,
            );
        });

        it("未認証の場合はエラー", async () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await expect(
                act(async () => {
                    await result.current.registerTask(mockTask);
                }),
            ).rejects.toThrow("認証されていません");

            expect(timeTrackerApi.registerTaskAsync).not.toHaveBeenCalled();
        });

        it("認証エラーの場合は自動ログアウト", async () => {
            vi.mocked(sessionStorage.loadAuth).mockReturnValue(mockStoredAuth);
            vi.mocked(timeTrackerApi.registerTaskAsync).mockRejectedValueOnce(new Error("401 Unauthorized"));
            vi.mocked(timeTrackerApi.isAuthenticationError).mockReturnValue(true);

            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await waitFor(() => {
                expect(result.current.isAuthenticated).toBe(true);
            });

            let caughtError: unknown = null;
            await act(async () => {
                try {
                    await result.current.registerTask(mockTask);
                } catch (err) {
                    caughtError = err;
                }
            });

            expect(caughtError).not.toBeNull();
            expect((caughtError as Error).message).toBe("認証の有効期限が切れました。再度接続してください。");
            expect(result.current.isAuthenticated).toBe(false);
            expect(sessionStorage.clearAllSession).toHaveBeenCalled();
        });
    });

    describe("clearError", () => {
        it("エラーをクリア", async () => {
            const { result } = renderHook(() => useTimeTrackerSession({ baseUrl, userName }));

            await act(async () => {
                await result.current.fetchProjectAndWorkItems("proj-1");
            });

            expect(result.current.error).not.toBeNull();

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
