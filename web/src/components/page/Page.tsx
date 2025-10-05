import { makeStyles, Spinner, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(20px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
        overflow: "hidden",
    },
    header: {
        paddingTop: tokens.spacingVerticalXXL,
        paddingBottom: tokens.spacingVerticalXXL,
        paddingLeft: tokens.spacingHorizontalXXXL,
        paddingRight: tokens.spacingHorizontalXXXL,
        borderBottomWidth: tokens.strokeWidthThin,
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke1,
        animationName: {
            from: {
                opacity: 0,
                transform: "translateY(-10px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
        animationDuration: tokens.durationSlow,
        animationDelay: "0.05s",
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    title: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXS,
    },
    subtitle: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
    },
    body: {
        paddingTop: tokens.spacingVerticalXXXL,
        paddingBottom: tokens.spacingVerticalXXXL,
        paddingLeft: tokens.spacingHorizontalXXXL,
        paddingRight: tokens.spacingHorizontalXXXL,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
        flex: 1,
        maxWidth: "1400px",
        width: "100%",
        margin: "0 auto",
        overflowY: "auto",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animationName: {
            from: {
                opacity: 0,
            },
            to: {
                opacity: 1,
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveLinear,
        animationFillMode: "both",
    },
    loadingContent: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: tokens.spacingVerticalL,
        backgroundColor: tokens.colorNeutralBackground1,
        paddingTop: tokens.spacingVerticalXXXL,
        paddingBottom: tokens.spacingVerticalXXXL,
        paddingLeft: "48px",
        paddingRight: "48px",
        borderRadius: tokens.borderRadiusLarge,
        boxShadow: tokens.shadow28,
    },
    loadingText: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
        fontWeight: tokens.fontWeightMedium,
    },
});

export type PageProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    maxWidth?: string;
    loading?: boolean;
    loadingText?: string;
};

export function Page({ title, subtitle, children, maxWidth, loading = false, loadingText = "処理中..." }: PageProps) {
    const styles = useStyles();

    return (
        <div className={styles.container} style={{ position: "relative" }}>
            <div className={styles.header}>
                <div className={styles.title}>{title}</div>
                {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            <div className={styles.body} style={maxWidth ? { maxWidth } : undefined}>
                {children}
            </div>
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingContent}>
                        <Spinner size="extra-large" />
                        <div className={styles.loadingText}>{loadingText}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
