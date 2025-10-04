import { makeStyles, tokens } from "@fluentui/react-components";
import { Card } from "../../components/card";
import { Page } from "../../components/page";

const useStyles = makeStyles({
    settingSection: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXS,
    },
    settingItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
        borderBottomWidth: tokens.strokeWidthThin,
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    settingLabel: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
    },
    settingDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
    },
});

export function SettingPage() {
    const styles = useStyles();

    return (
        <Page title="設定">
            <div className={styles.settingSection}>
                <div className={styles.sectionTitle}>一般設定</div>
                <Card>
                    <div className={styles.settingItem}>
                        <div>
                            <div className={styles.settingLabel}>アプリケーション設定</div>
                            <div className={styles.settingDescription}>TimeTracker EXの基本設定を管理します</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className={styles.settingSection}>
                <div className={styles.sectionTitle}>データ設定</div>
                <Card>
                    <div className={styles.settingItem}>
                        <div>
                            <div className={styles.settingLabel}>インポート/エクスポート</div>
                            <div className={styles.settingDescription}>データのバックアップと復元を行います</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className={styles.settingSection}>
                <div className={styles.sectionTitle}>情報</div>
                <Card>
                    <div className={styles.settingItem}>
                        <div>
                            <div className={styles.settingLabel}>バージョン情報</div>
                            <div className={styles.settingDescription}>TimeTracker EX v1.0.0</div>
                        </div>
                    </div>
                </Card>
            </div>
        </Page>
    );
}
