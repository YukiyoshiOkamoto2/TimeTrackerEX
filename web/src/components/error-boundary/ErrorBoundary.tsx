import { getLogger, getLogHistory, type LogEntry, LogLevel } from "@/lib/logger";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ErrorCircle24Regular, Mail24Regular } from "@fluentui/react-icons";
import { Component, type ErrorInfo, type ReactNode } from "react";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: tokens.spacingVerticalXXXL,
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
    },
    errorIcon: {
        fontSize: "64px",
        color: tokens.colorPaletteRedForeground1,
        marginBottom: tokens.spacingVerticalXXL,
    },
    title: {
        fontSize: tokens.fontSizeHero900,
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: tokens.spacingVerticalL,
        color: tokens.colorNeutralForeground1,
    },
    message: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground2,
        marginBottom: tokens.spacingVerticalXXL,
        textAlign: "center",
        maxWidth: "600px",
        lineHeight: tokens.lineHeightBase400,
    },
    errorDetails: {
        backgroundColor: tokens.colorNeutralBackground3,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalL,
        marginBottom: tokens.spacingVerticalXXL,
        maxWidth: "800px",
        width: "100%",
        maxHeight: "300px",
        overflowY: "auto",
    },
    errorText: {
        fontSize: tokens.fontSizeBase200,
        fontFamily: tokens.fontFamilyMonospace,
        color: tokens.colorPaletteRedForeground1,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    },
    buttonGroup: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
    },
});

type ErrorBoundaryProps = {
    children: ReactNode;
    fallback?: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
};

const logger = getLogger("ErrorBoundary");

/**
 * エラー境界コンポーネント
 *
 * Reactコンポーネントツリー内のエラーをキャッチし、
 * エラー画面を表示してアプリケーションのクラッシュを防ぎます。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        logger.error("==================== エラー境界でエラーを検出しました ====================");
        logger.error(`エラー名: ${error.name}`);
        logger.error(`エラーメッセージ: ${error.message}`);

        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logger.error("==================== エラー詳細情報 ====================");
        logger.error(`エラーオブジェクト: ${error.toString()}`);

        if (error.stack) {
            logger.error("エラースタックトレース:");
            logger.error(error.stack);
        }

        if (errorInfo.componentStack) {
            logger.error("コンポーネントスタックトレース:");
            logger.error(errorInfo.componentStack);
        }

        // エラーが発生したコンポーネント情報を抽出
        const componentMatch = errorInfo.componentStack?.match(/at (\w+)/);
        if (componentMatch) {
            logger.error(`エラー発生コンポーネント: ${componentMatch[1]}`);
        }

        // タイムスタンプを記録
        logger.error(`エラー発生時刻: ${new Date().toLocaleString("ja-JP")}`);

        // ブラウザ情報を記録
        logger.error(`ユーザーエージェント: ${navigator.userAgent}`);
        logger.error(`画面サイズ: ${window.innerWidth}x${window.innerHeight}`);
        logger.error(`URL: ${window.location.href}`);

        logger.error("============================================================");

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReload = (): void => {
        logger.info("ユーザーがエラー画面から「ページをリロード」を選択しました");
        logger.info("ページ全体をリロードします");

        window.location.reload();
    };

    handleSendReport = (): void => {
        const { error, errorInfo } = this.state;

        logger.info("ユーザーがエラー画面から「エラー情報を送信」を選択しました");

        const logs = getLogHistory();
        const maxEntries = 100;
        const recentLogs = logs.slice(-maxEntries);

        const errorDetails = [
            "=== エラー情報 ===",
            `エラー名: ${error?.name ?? "不明"}`,
            `エラーメッセージ: ${error?.message ?? "不明"}`,
            `エラーオブジェクト: ${error ? error.toString() : "なし"}`,
            `エラースタック: ${error?.stack ?? "なし"}`,
            `コンポーネントスタック: ${errorInfo?.componentStack ?? "なし"}`,
            "",
            "=== 環境情報 ===",
            `発生時刻: ${new Date().toLocaleString("ja-JP")}`,
            `URL: ${window.location.href}`,
            `ユーザーエージェント: ${navigator.userAgent}`,
            `画面サイズ: ${window.innerWidth}x${window.innerHeight}`,
            "",
            `=== ログ履歴 (最新${recentLogs.length}件) ===`,
        ];

        const logLines = recentLogs.map((entry: LogEntry, index) => {
            const timestamp = entry.timestamp.toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            let argsText = "";
            if (entry.args.length > 0) {
                try {
                    argsText = `\n  args: ${JSON.stringify(entry.args, null, 2)}`;
                } catch (serializationError) {
                    argsText = `\n  args: [シリアライズ失敗: ${String(serializationError)}]`;
                }
            }

            return `${index + 1}. [${LogLevel[entry.level]}] ${timestamp} ${entry.message} (source: ${entry.source})${argsText}`;
        });

        const mailBody = [...errorDetails, ...logLines].join("\n");
        const subject = "TimeTrackerEX エラー報告";
        const mailtoLink = `mailto:yukiyoshi.okamoto@askul.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

        window.location.href = mailtoLink;
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    onReload={this.handleReload}
                    onSendReport={this.handleSendReport}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * デフォルトのエラー表示コンポーネント
 */
function ErrorFallback({
    error,
    onReload,
    onSendReport,
}: {
    error: Error | null;
    onReload: () => void;
    onSendReport: () => void;
}) {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <ErrorCircle24Regular className={styles.errorIcon} />
            <h1 className={styles.title}>エラーが発生しました</h1>
            <p className={styles.message}>
                申し訳ございません。アプリケーションでエラーが発生しました。
                <br />
                ページをリロードするか、ホームに戻ってお試しください。
            </p>

            {error && (
                <div className={styles.errorDetails}>
                    <div className={styles.errorText}>
                        {error.name}: {error.message}
                        {error.stack && (
                            <>
                                {"\n\n"}
                                {error.stack}
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.buttonGroup}>
                <Button appearance="primary" onClick={onReload}>
                    ページをリロード
                </Button>
                <Button appearance="secondary" icon={<Mail24Regular />} onClick={onSendReport}>
                    エラー情報を送信
                </Button>
            </div>
        </div>
    );
}
