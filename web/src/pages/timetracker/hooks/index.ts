/**
 * TimeTracker Hooks
 */

export { useTimeTrackerSession } from "./useTimeTrackerSession";
export type {
    TimeTrackerSessionState,
    TimeTrackerSessionActions,
    TimeTrackerSessionHook,
    UseTimeTrackerSessionOptions,
} from "./useTimeTrackerSession";

export { loadAuth, saveAuth, clearAuth, loadProject, saveProject, clearProject, loadWorkItems, saveWorkItems, clearWorkItems, clearAllSession } from "./sessionStorage";
export type { StoredAuth } from "./sessionStorage";
