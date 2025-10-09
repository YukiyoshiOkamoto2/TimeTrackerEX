/**
 * TimeTracker API (Stateless Functions) Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    type TimeTrackerAuth,
    type TimeTrackerTask,
    authenticateAsync,
    getProjectAsync,
    getWorkItemsAsync,
    isAuthenticationError,
    registerTaskAsync,
    validateTimeTrackerTask,
} from "./timeTracker";

// HttpRequestQueueをモック
vi.mock("@/lib/asyncQueue", () => ({
    HttpRequestQueue: vi.fn().mockImplementation(() => ({
        enqueueAsync: vi.fn(),
    })),
}));

describe("TimeTracker API (Stateless)", () => {
    let mockEnqueue: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const asyncQueue = await import("@/lib/asyncQueue");
        mockEnqueue = vi.fn();
        vi.mocked(asyncQueue.HttpRequestQueue).mockImplementation(
            () =>
                ({
                    enqueueAsync: mockEnqueue,
                }) as any,
        );
    });

    describe("validateTimeTrackerTask", () => {
        it("should throw error if start time >= end time", () => {
            const task: TimeTrackerTask = {
                workItemId: "1",
                startTime: new Date("2025-10-09T10:00:00"),
                endTime: new Date("2025-10-09T09:00:00"),
            };

            expect(() => validateTimeTrackerTask(task)).toThrow("start_time is greater than end_time");
        });

        it("should throw error if start time is not multiple of 30 minutes", () => {
            const task: TimeTrackerTask = {
                workItemId: "1",
                startTime: new Date("2025-10-09T09:15:00"),
                endTime: new Date("2025-10-09T10:00:00"),
            };

            expect(() => validateTimeTrackerTask(task)).toThrow("start_time is not multiple of 30 minutes");
        });

        it("should throw error if end time is not multiple of 30 minutes", () => {
            const task: TimeTrackerTask = {
                workItemId: "1",
                startTime: new Date("2025-10-09T09:00:00"),
                endTime: new Date("2025-10-09T10:15:00"),
            };

            expect(() => validateTimeTrackerTask(task)).toThrow("end_time is not multiple of 30 minutes");
        });

        it("should not throw error for valid task", () => {
            const task: TimeTrackerTask = {
                workItemId: "1",
                startTime: new Date("2025-10-09T09:00:00"),
                endTime: new Date("2025-10-09T10:30:00"),
            };

            expect(() => validateTimeTrackerTask(task)).not.toThrow();
        });
    });

    describe("authenticateAsync", () => {
        it("should authenticate successfully", async () => {
            mockEnqueue
                .mockResolvedValueOnce({
                    status: 200,
                    body: JSON.stringify({ token: "test-token" }),
                })
                .mockResolvedValueOnce({
                    status: 200,
                    body: JSON.stringify({ id: "user-123", loginName: "testuser" }),
                });

            const result = await authenticateAsync("https://test.example.com", "testuser", "password123");

            expect(result).toEqual({
                token: "test-token",
                userId: "user-123",
            });
        });

        it("should throw error if token request fails", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 401,
                body: JSON.stringify([{ message: "Invalid credentials" }]),
            });

            await expect(authenticateAsync("https://test.example.com", "testuser", "wrongpass")).rejects.toThrow(
                "TimeTrackerへの認証処理でエラー応答が返却されました",
            );
        });

        it("should throw error if user info request fails", async () => {
            mockEnqueue
                .mockResolvedValueOnce({
                    status: 200,
                    body: JSON.stringify({ token: "test-token" }),
                })
                .mockResolvedValueOnce({
                    status: 401,
                    body: JSON.stringify([{ message: "Unauthorized" }]),
                });

            await expect(authenticateAsync("https://test.example.com", "testuser", "password123")).rejects.toThrow(
                "ユーザー情報の取得でエラー応答が返却されました",
            );
        });

        it("should throw error if user name does not match", async () => {
            mockEnqueue
                .mockResolvedValueOnce({
                    status: 200,
                    body: JSON.stringify({ token: "test-token" }),
                })
                .mockResolvedValueOnce({
                    status: 200,
                    body: JSON.stringify({ id: "user-123", loginName: "otheruser" }),
                });

            await expect(authenticateAsync("https://test.example.com", "testuser", "password123")).rejects.toThrow(
                "ユーザー情報の取得に失敗しました",
            );
        });
    });

    describe("getProjectAsync", () => {
        const auth: TimeTrackerAuth = { token: "test-token", userId: "user-123" };

        it("should get project successfully", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 200,
                body: JSON.stringify([
                    {
                        fields: {
                            Id: "1",
                            Name: "Test Project",
                            ProjectId: "PROJ001",
                            ProjectName: "Test Project",
                            ProjectCode: "PROJ",
                        },
                    },
                ]),
            });

            const result = await getProjectAsync("https://test.example.com", "1", auth);

            expect(result).toEqual({
                id: "1",
                name: "Test Project",
                projectId: "PROJ001",
                projectName: "Test Project",
                projectCode: "PROJ",
            });
        });

        it("should throw error if request fails", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 404,
                body: JSON.stringify([{ message: "Not found" }]),
            });

            await expect(getProjectAsync("https://test.example.com", "999", auth)).rejects.toThrow(
                "プロジェクト情報の取得でエラー応答が返却されました",
            );
        });
    });

    describe("getWorkItemsAsync", () => {
        const auth: TimeTrackerAuth = { token: "test-token", userId: "user-123" };

        it("should get work items successfully", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 200,
                body: JSON.stringify([
                    {
                        fields: {
                            Id: "100",
                            Name: "Task 1",
                            FolderName: "Folder1",
                            SubItems: [
                                {
                                    fields: {
                                        Id: "101",
                                        Name: "Sub Task 1",
                                        FolderName: "SubFolder1",
                                        SubItems: [],
                                    },
                                },
                            ],
                        },
                    },
                ]),
            });

            const result = await getWorkItemsAsync("https://test.example.com", "1", auth);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("100");
            expect(result[0].name).toBe("Task 1");
            expect(result[0].subItems).toHaveLength(1);
            expect(result[0].subItems?.[0].id).toBe("101");
        });

        it("should throw error if request fails", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 401,
                body: JSON.stringify([{ message: "Unauthorized" }]),
            });

            await expect(getWorkItemsAsync("https://test.example.com", "1", auth)).rejects.toThrow(
                "WorkItem一覧の取得でエラー応答が返却されました",
            );
        });
    });

    describe("registerTaskAsync", () => {
        const auth: TimeTrackerAuth = { token: "test-token", userId: "user-123" };

        it("should register task successfully", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 200,
                body: JSON.stringify({ success: true }),
            });

            const task: TimeTrackerTask = {
                workItemId: "100",
                startTime: new Date("2025-10-09T09:00:00"),
                endTime: new Date("2025-10-09T10:00:00"),
                memo: "テストタスク",
            };

            await expect(
                registerTaskAsync("https://test.example.com", "user-123", task, auth),
            ).resolves.not.toThrow();
        });

        it("should throw error for invalid task", async () => {
            const task: TimeTrackerTask = {
                workItemId: "100",
                startTime: new Date("2025-10-09T09:15:00"),
                endTime: new Date("2025-10-09T10:00:00"),
            };

            await expect(registerTaskAsync("https://test.example.com", "user-123", task, auth)).rejects.toThrow(
                "start_time is not multiple of 30 minutes",
            );
        });

        it("should throw error if request fails", async () => {
            mockEnqueue.mockResolvedValueOnce({
                status: 400,
                body: JSON.stringify([{ message: "Bad request" }]),
            });

            const task: TimeTrackerTask = {
                workItemId: "100",
                startTime: new Date("2025-10-09T09:00:00"),
                endTime: new Date("2025-10-09T10:00:00"),
            };

            await expect(registerTaskAsync("https://test.example.com", "user-123", task, auth)).rejects.toThrow(
                "タスクの登録でエラー応答が返却されました",
            );
        });
    });

    describe("isAuthenticationError", () => {
        it("should return true for 401 error", () => {
            const error = new Error("StatusCode: 401");
            expect(isAuthenticationError(error)).toBe(true);
        });

        it("should return true for Not connected error", () => {
            const error = new Error("Not connected.");
            expect(isAuthenticationError(error)).toBe(true);
        });

        it("should return false for other errors", () => {
            const error = new Error("StatusCode: 500");
            expect(isAuthenticationError(error)).toBe(false);
        });

        it("should return false for non-Error objects", () => {
            expect(isAuthenticationError("error string")).toBe(false);
            expect(isAuthenticationError(null)).toBe(false);
            expect(isAuthenticationError(undefined)).toBe(false);
        });
    });
});
