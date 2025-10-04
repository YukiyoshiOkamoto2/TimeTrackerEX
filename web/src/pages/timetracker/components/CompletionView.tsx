import { Button, makeStyles, tokens } from "@fluentui/react-components";
import {
    ArrowDownload24Regular,
    CheckmarkCircle24Regular,
    ClipboardTask24Regular,
    DocumentBulletList24Regular,
} from "@fluentui/react-icons";
import { Card } from "../../../components/card";
import { ExpandableSection } from "../../../components/expandable-section";
import { PageHeader } from "./PageHeader";
import { ItemCodeOption, ScheduleItem, ScheduleTable } from "./index";

const useStyles = makeStyles({
    headerContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: tokens.spacingVerticalL,
    },
    headerLeft: {
        flex: 1,
    },
    exportButton: {
        minWidth: "120px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    completionMessage: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingHorizontalL,
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalM,
        paddingLeft: tokens.spacingHorizontalL,
        paddingRight: tokens.spacingHorizontalL,
        backgroundColor: tokens.colorNeutralBackground3,
        borderTopWidth: tokens.strokeWidthThick,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorBrandForeground1,
        borderBottomWidth: "0",
        borderLeftWidth: "0",
        borderRightWidth: "0",
        borderRadius: tokens.borderRadiusMedium,
    },
    completionIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorPaletteGreenForeground1,
    },
    completionText: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    statusCard: {
        marginBottom: tokens.spacingVerticalL,
    },
    logSection: {
        marginBottom: tokens.spacingVerticalL,
    },
    logItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground1,
    },
    logIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorPaletteGreenForeground1,
    },
    sectionTitle: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalM,
    },
    sectionIcon: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground2,
    },
});

export type CompletionViewProps = {
    schedules: ScheduleItem[];
    itemCodes: string[];
    itemCodeOptions: ItemCodeOption[];
    onExport: () => void;
    onBack: () => void;
    onBackToLinking: () => void;
};

export function CompletionView({
    schedules,
    itemCodes,
    itemCodeOptions,
    onExport,
    onBack,
    onBackToLinking,
}: CompletionViewProps) {
    const styles = useStyles();

    const breadcrumbs = ["TimeTracker", "紐づけ処理", "登録済みスケジュール"];

    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) {
            onBack(); // TimeTrackerに戻る
        } else if (index === 1) {
            onBackToLinking(); // 紐づけ処理に戻る
        }
    };

    return (
        <>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <PageHeader breadcrumbs={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
                </div>
                <Button
                    appearance="primary"
                    icon={<ArrowDownload24Regular />}
                    onClick={onExport}
                    className={styles.exportButton}
                >
                    エクスポート
                </Button>
            </div>

            <div className={styles.section}>
                <Card className={`${styles.completionMessage} ${styles.statusCard}`}>
                    <CheckmarkCircle24Regular className={styles.completionIcon} />
                    <div className={styles.completionText}>登録が完了しました</div>
                </Card>

                <div className={styles.logSection}>
                    <div className={styles.sectionTitle}>
                        <ClipboardTask24Regular className={styles.sectionIcon} />
                        <span>実行中の処理のログを表示</span>
                    </div>
                    <ExpandableSection title="ログ詳細" defaultExpanded={false}>
                        <div className={styles.logItem}>
                            <CheckmarkCircle24Regular className={styles.logIcon} />
                            <span>実行</span>
                        </div>
                        <div className={styles.logItem}>
                            <CheckmarkCircle24Regular className={styles.logIcon} />
                            <span>完了</span>
                        </div>
                    </ExpandableSection>
                </div>

                <div>
                    <div className={styles.sectionTitle}>
                        <DocumentBulletList24Regular className={styles.sectionIcon} />
                        <span>スケジュール一覧</span>
                    </div>
                    <ScheduleTable
                        schedules={schedules}
                        itemCodes={itemCodes}
                        itemCodeOptions={itemCodeOptions}
                        itemCodeMode="readonly"
                        onItemCodeChange={() => {}}
                    />
                </div>
            </div>
        </>
    );
}
