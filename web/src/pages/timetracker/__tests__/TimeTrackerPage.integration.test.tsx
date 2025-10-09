/**
 * TimeTrackerPage 統合テスト
 * 
 * FileUploadView → LinkingProcessView → CompletionView の
 * 完全なフローをテストします。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TimeTrackerPage } from "../TimeTrackerPage";

// TODO: Mocking setup
// - useTimeTrackerSession
// - registerTasks API
// - appMessageDialogRef

describe("TimeTrackerPage Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.todo("FileUpload → Linking → Completion の完全フローが動作する", async () => {
        // 1. TimeTrackerPageをレンダリング
        // 2. FileUploadView表示確認
        // 3. ファイルアップロード実行（モック）
        // 4. LinkingProcessView遷移確認
        // 5. 送信ボタンクリック
        // 6. CompletionView遷移確認
        // 7. タスク登録実行（APIモック）
        // 8. FileUploadViewへ戻る確認
    });

    it.todo("バックボタンで前の画面へ戻れる", async () => {
        // 各ビュー間のナビゲーションテスト
    });

    it.todo("エラー時は適切なメッセージが表示される", async () => {
        // APIエラー、変換エラー等のハンドリング確認
    });
});
