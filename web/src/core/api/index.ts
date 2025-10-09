/**
 * TimeTracker API Module
 *
 * このモジュールは、PythonのAPI関連コードをTypeScriptに移植したものです。
 * TimeTracker APIとの通信機能を提供します。
 */

// ステートレス関数（推奨）
export {
    authenticateAsync,
    getProjectAsync,
    getWorkItemsAsync,
    registerTaskAsync,
    registerTasks,
    isAuthenticationError,
    validateTimeTrackerTask,
} from "./timeTracker";
export type { TimeTrackerAuth, TimeTrackerTask, RegisterTasksRequest, RegisterTasksResponse } from "./timeTracker";

// 旧クラスベースAPI（非推奨）
export { TimeTracker } from "./timeTracker";
