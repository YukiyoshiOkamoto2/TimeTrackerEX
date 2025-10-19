import { makeStyles, Spinner, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "400px",
        gap: tokens.spacingVerticalXL,
    },
    text: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground2,
    },
});

/**
 * Suspense用のローディング表示コンポーネント
 */
export function SuspenseFallback({ message = "読み込み中..." }: { message?: string }) {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <Spinner size="extra-large" label={message} />
            <span className={styles.text}>{message}</span>
        </div>
    );
}
