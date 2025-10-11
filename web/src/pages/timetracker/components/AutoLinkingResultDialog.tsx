import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    makeStyles,
    ProgressBar,
    tokens,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    surface: {
        maxWidth: "500px",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: tokens.spacingVerticalM,
        alignItems: "center",
        padding: tokens.spacingVerticalL,
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
    },
    statIcon: {
        fontSize: tokens.fontSizeBase500,
        width: "32px",
        textAlign: "center",
    },
    statLabel: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    statValue: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        textAlign: "right",
    },
    progressBarWrapper: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
    },
    progressLabel: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        textAlign: "center",
    },
    message: {
        fontSize: tokens.fontSizeBase300,
        lineHeight: tokens.lineHeightBase400,
        color: tokens.colorNeutralForeground2,
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        paddingTop: tokens.spacingVerticalM,
    },
    divider: {
        height: "1px",
        backgroundColor: tokens.colorNeutralStroke2,
        margin: `${tokens.spacingVerticalS} 0`,
    },
});

export type AutoLinkingResultDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function AutoLinkingResultDialog({ open, onClose }: AutoLinkingResultDialogProps) {
    const styles = useStyles();

    const result = undefined as any;
    if (!result) return null;

    const totalEvents = result.linked.length + result.unlinked.length + result.excluded.length;
    const hasUnlinked = result.unlinked.length > 0;
    const linkedPercentage =
        result.linked.length + result.unlinked.length > 0
            ? Math.round((result.linked.length / (result.linked.length + result.unlinked.length)) * 100)
            : 0;

    // タイトルとメッセージの決定
    const getDialogInfo = () => {
        if (result.linked.length === 0 && result.unlinked.length === 0) {
            return {
                title: "⚠️ 紐づけ対象なし",
                message: "処理可能なイベントが見つかりませんでした",
                type: "error" as const,
            };
        }

        if (!hasUnlinked) {
            return {
                title: "🎉 自動紐づけ完了",
                message: "すべてのイベントを自動紐づけしました！「登録実行」ボタンで TimeTracker に登録できます。",
                type: "success" as const,
            };
        }

        return {
            title: "⚠️ 自動紐づけ完了（要確認）",
            message: "一部のイベントは手動で紐づけが必要です。テーブルで未紐づけイベントを選択してください。",
            type: "warning" as const,
        };
    };

    const dialogInfo = getDialogInfo();

    return (
        <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface className={styles.surface}>
                <DialogBody>
                    <DialogTitle
                        action={
                            <Button
                                appearance="subtle"
                                aria-label="close"
                                icon={<Dismiss24Regular />}
                                onClick={onClose}
                            />
                        }
                    >
                        {dialogInfo.title}
                    </DialogTitle>
                    <DialogContent className={styles.content}>
                        {/* プログレスバー */}
                        {(result.linked.length > 0 || result.unlinked.length > 0) && (
                            <div className={styles.progressBarWrapper}>
                                <div className={styles.progressLabel}>紐づけ進捗: {linkedPercentage}%</div>
                                <ProgressBar
                                    value={linkedPercentage / 100}
                                    color={hasUnlinked ? "warning" : "success"}
                                    thickness="large"
                                />
                            </div>
                        )}

                        {/* 統計情報 */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statLabel}>総イベント数</div>
                            <div className={styles.statValue}>{totalEvents}件</div>

                            <div className={styles.divider} style={{ gridColumn: "1 / -1" }} />

                            <div className={styles.statIcon}>✅</div>
                            <div className={styles.statLabel}>紐づけ済み</div>
                            <div className={styles.statValue}>{result.linked.length}件</div>

                            {result.unlinked.length > 0 && (
                                <>
                                    <div className={styles.statIcon}>❌</div>
                                    <div className={styles.statLabel}>未紐づけ</div>
                                    <div className={styles.statValue}>{result.unlinked.length}件</div>
                                </>
                            )}

                            {result.excluded.length > 0 && (
                                <>
                                    <div className={styles.statIcon}>🚫</div>
                                    <div className={styles.statLabel}>対象外</div>
                                    <div className={styles.statValue}>{result.excluded.length}件</div>
                                </>
                            )}
                        </div>

                        {/* メッセージ */}
                        <div className={styles.message}>{dialogInfo.message}</div>

                        {/* フッター */}
                        <div className={styles.footer}>
                            <Button appearance="primary" onClick={onClose}>
                                OK
                            </Button>
                        </div>
                    </DialogContent>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
