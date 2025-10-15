import { StatCard } from "@/components/card";
import type { Event, WorkItem } from "@/types";
import { EventUtils, WorkItemUtils } from "@/types";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    makeStyles,
    ProgressBar,
    tokens,
} from "@fluentui/react-components";
import {
    Checkmark24Regular,
    CheckmarkCircle24Filled,
    Dismiss24Regular,
    ErrorCircle24Filled,
    HourglassHalf24Regular,
    PauseCircle24Filled,
    TaskListSquareLtr24Regular,
} from "@fluentui/react-icons";
import { memo, useMemo } from "react";

// ============================================================================
// スタイル定義
// ============================================================================

const useStyles = makeStyles({
    dialogSurface: {
        width: "800px",
        maxWidth: "95vw",
        minHeight: "600px",
    },
    progressContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalM,
    },
    progressSection: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
    },
    progressBarContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
    progressText: {
        textAlign: "center",
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
    },
    statsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: tokens.spacingHorizontalM,
    },
    successIcon: {
        color: tokens.colorPaletteGreenForeground1,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
    },
    pendingIcon: {
        color: tokens.colorNeutralForeground3,
    },
    processingIcon: {
        color: tokens.colorBrandForeground1,
    },
    taskList: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        maxHeight: "400px",
        overflowY: "auto",
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    taskItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: tokens.spacingHorizontalM,
        padding: tokens.spacingVerticalM,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        transition: "all 0.2s ease",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            boxShadow: tokens.shadow4,
        },
    },
    taskItemProcessing: {
        borderLeftWidth: "4px",
        borderLeftColor: tokens.colorBrandStroke1,
        backgroundColor: tokens.colorBrandBackground2,
    },
    taskItemSuccess: {
        borderLeftWidth: "4px",
        borderLeftColor: tokens.colorPaletteGreenBorder1,
    },
    taskItemError: {
        borderLeftWidth: "4px",
        borderLeftColor: tokens.colorPaletteRedBorder1,
        backgroundColor: tokens.colorPaletteRedBackground1,
    },
    taskIcon: {
        flexShrink: 0,
        fontSize: "24px",
        marginTop: "2px",
    },
    taskContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
        minWidth: 0,
    },
    taskEvent: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    taskWorkItem: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    taskStatus: {
        display: "inline-flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        borderRadius: tokens.borderRadiusSmall,
        flexShrink: 0,
    },
    statusPending: {
        backgroundColor: tokens.colorNeutralBackground4,
        color: tokens.colorNeutralForeground3,
    },
    statusProcessing: {
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground1,
    },
    statusSuccess: {
        backgroundColor: tokens.colorPaletteGreenBackground2,
        color: tokens.colorPaletteGreenForeground1,
    },
    statusError: {
        backgroundColor: tokens.colorPaletteRedBackground2,
        color: tokens.colorPaletteRedForeground1,
    },
    errorMessage: {
        color: tokens.colorPaletteRedForeground1,
        fontSize: tokens.fontSizeBase200,
        marginTop: tokens.spacingVerticalXXS,
        padding: tokens.spacingVerticalXS,
        backgroundColor: tokens.colorPaletteRedBackground1,
        borderRadius: tokens.borderRadiusSmall,
    },
});

// ============================================================================
// 型定義
// ============================================================================

export interface TaskProgress {
    id: string;
    event: Event;
    workItem: WorkItem;
    status: "pending" | "processing" | "success" | "error";
    errorMessage?: string;
}

export interface RegistrationProgressDialogProps {
    open: boolean;
    tasks: TaskProgress[];
    onClose?: () => void;
    onCancel?: () => void;
}

// ============================================================================
// メインコンポーネント
// ============================================================================

/**
 * TimeTracker登録処理の進捗を表示するダイアログ
 * リアルタイムで各タスクの登録状況をモニタリング
 */
export const RegistrationProgressDialog = memo(function RegistrationProgressDialog({
    open,
    tasks,
    onClose,
    onCancel,
}: RegistrationProgressDialogProps) {
    const styles = useStyles();

    // 統計情報を計算（useMemoで最適化）
    const stats = useMemo(
        () => ({
            total: tasks.length,
            completed: tasks.filter((t) => t.status === "success").length,
            failed: tasks.filter((t) => t.status === "error").length,
            pending: tasks.filter((t) => t.status === "pending" || t.status === "processing").length,
        }),
        [tasks],
    );

    const progress = stats.total > 0 ? (stats.completed + stats.failed) / stats.total : 0;
    const isComplete = stats.pending === 0 && stats.total > 0;
    const hasErrors = stats.failed > 0;

    // タスクアイコンを取得
    const getTaskIcon = (status: TaskProgress["status"]) => {
        switch (status) {
            case "success":
                return <CheckmarkCircle24Filled className={styles.successIcon} />;
            case "error":
                return <ErrorCircle24Filled className={styles.errorIcon} />;
            case "processing":
                return <ProgressBar thickness="medium" style={{ width: "24px" }} />;
            case "pending":
            default:
                return <PauseCircle24Filled className={styles.pendingIcon} />;
        }
    };

    // タスクアイテムのクラス名を取得
    const getTaskItemClassName = (status: TaskProgress["status"]) => {
        const baseClass = styles.taskItem;
        switch (status) {
            case "processing":
                return `${baseClass} ${styles.taskItemProcessing}`;
            case "success":
                return `${baseClass} ${styles.taskItemSuccess}`;
            case "error":
                return `${baseClass} ${styles.taskItemError}`;
            default:
                return baseClass;
        }
    };

    // ステータスバッジのクラス名を取得
    const getStatusClassName = (status: TaskProgress["status"]) => {
        const baseClass = styles.taskStatus;
        switch (status) {
            case "pending":
                return `${baseClass} ${styles.statusPending}`;
            case "processing":
                return `${baseClass} ${styles.statusProcessing}`;
            case "success":
                return `${baseClass} ${styles.statusSuccess}`;
            case "error":
                return `${baseClass} ${styles.statusError}`;
            default:
                return baseClass;
        }
    };

    // ステータステキストを取得
    const getStatusText = (status: TaskProgress["status"]) => {
        switch (status) {
            case "pending":
                return "待機中";
            case "processing":
                return "処理中...";
            case "success":
                return "完了";
            case "error":
                return "エラー";
        }
    };

    return (
        <Dialog open={open} modalType="modal">
            <DialogSurface className={styles.dialogSurface}>
                <DialogBody>
                    <DialogTitle>
                        {isComplete ? (hasErrors ? "登録完了（一部エラー）" : "登録完了") : "TimeTrackerへ登録中..."}
                    </DialogTitle>
                    <DialogContent>
                        <div className={styles.progressContainer}>
                            {/* プログレスバー */}
                            <div className={styles.progressSection}>
                                <div className={styles.progressBarContainer}>
                                    <ProgressBar value={progress} max={1} thickness="large" />
                                    <div className={styles.progressText}>{Math.round(progress * 100)}% 完了</div>
                                </div>
                            </div>

                            {/* 統計情報 - StatCardを使用 */}
                            <div className={styles.statsContainer}>
                                <StatCard icon={<TaskListSquareLtr24Regular />} label="合計" value={stats.total} />
                                <StatCard
                                    icon={<Checkmark24Regular />}
                                    label="成功"
                                    value={stats.completed}
                                    className={styles.successIcon}
                                />
                                <StatCard
                                    icon={<Dismiss24Regular />}
                                    label="失敗"
                                    value={stats.failed}
                                    className={styles.errorIcon}
                                />
                                <StatCard
                                    icon={<HourglassHalf24Regular />}
                                    label="待機中"
                                    value={stats.pending}
                                    className={styles.pendingIcon}
                                />
                            </div>

                            {/* タスクリスト */}
                            <div className={styles.taskList}>
                                {tasks.map((task) => (
                                    <div key={task.id} className={getTaskItemClassName(task.status)}>
                                        <div className={styles.taskIcon}>{getTaskIcon(task.status)}</div>
                                        <div className={styles.taskContent}>
                                            <div className={styles.taskEvent}>{EventUtils.getText(task.event)}</div>
                                            <div className={styles.taskWorkItem}>
                                                → {WorkItemUtils.getText(task.workItem)}
                                            </div>
                                            {task.status === "error" && task.errorMessage && (
                                                <div className={styles.errorMessage}>{task.errorMessage}</div>
                                            )}
                                        </div>
                                        <div className={getStatusClassName(task.status)}>
                                            {getStatusText(task.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        {isComplete ? (
                            <Button appearance="primary" onClick={onClose}>
                                閉じる
                            </Button>
                        ) : (
                            <>
                                <Button appearance="secondary" onClick={onCancel} icon={<Dismiss24Regular />}>
                                    キャンセル
                                </Button>
                            </>
                        )}
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
});
