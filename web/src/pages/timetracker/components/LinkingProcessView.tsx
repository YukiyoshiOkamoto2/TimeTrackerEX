import {
    Button,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    Input,
    makeStyles,
    Switch,
    tokens,
} from "@fluentui/react-components";
import {
    CheckmarkCircle24Regular,
    Dismiss24Regular,
    DocumentBulletList24Regular,
    History24Regular,
    Settings24Regular,
    Sparkle24Regular,
} from "@fluentui/react-icons";
import { useState } from "react";
import { Card } from "../../../components/card";
import { ExpandableSection } from "../../../components/expandable-section";
import { PageHeader } from "./PageHeader";
import { ItemCodeOption, ScheduleItem, ScheduleTable } from "./index";

const useStyles = makeStyles({
    headerContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
    },
    headerLeft: {
        flex: 1,
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        margin: "8px 0px",
    },
    infoContent: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    infoItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
    },
    infoIcon: {
        fontSize: "18px",
    },
    infoLabel: {
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        minWidth: "120px",
    },
    historyButton: {
        minWidth: "100px",
    },
    drawer: {
        width: "480px",
        maxWidth: "90vw",
    },
    historyItem: {
        padding: "12px 16px",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    historyTime: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
        marginBottom: "4px",
    },
    historyAction: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "500",
    },
    historyDetails: {
        fontSize: "13px",
        color: tokens.colorNeutralForeground2,
        marginTop: "4px",
    },

    submitButtonContainer: {
        marginTop: "24px",
        display: "flex",
        justifyContent: "flex-end",
    },
    submitButton: {
        minWidth: "200px",
        height: "48px",
        fontSize: "16px",
        fontWeight: "600",
    },
    optionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        "&:last-child": {
            borderBottomWidth: "0",
        },
    },
    optionLabel: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground1,
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    optionControl: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    optionIcon: {
        fontSize: "18px",
        color: tokens.colorNeutralForeground2,
    },
    submitButtonIcon: {
        fontSize: "20px",
    },
    infoCard: {
        padding: tokens.spacingVerticalL,
    },
    optionInput: {
        width: "200px",
    },
    autoLinkButton: {
        minWidth: "120px",
    },
    autoLinkButtonContainer: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: tokens.spacingVerticalL,
        paddingTop: tokens.spacingVerticalL,
    },
    scheduleIcon: {
        marginRight: tokens.spacingHorizontalXS,
        verticalAlign: "middle",
    },
});

export type LinkingProcessViewProps = {
    onBack: () => void;
    pdfFileName?: string;
    icsFileName?: string;
    onSubmit?: (itemCodes: string[]) => void;
    onAutoLink?: () => void;
};

// Mock history data
const historyData = [
    {
        time: "2025年10月4日 14:30",
        action: "自動紐づけ実行",
        details: "59件のスケジュールを処理完了",
    },
    {
        time: "2025年10月3日 16:45",
        action: "手動紐づけ",
        details: "15件のスケジュールを手動で紐づけ",
    },
    {
        time: "2025年10月2日 10:20",
        action: "自動紐づけ実行",
        details: "42件のスケジュールを処理完了",
    },
    {
        time: "2025年10月1日 09:15",
        action: "詳細設定変更",
        details: "マッチング精度を80%に設定",
    },
];

// Mock item code options
const itemCodeOptions: ItemCodeOption[] = [
    { code: "001", name: "会議" },
    { code: "002", name: "開発作業" },
    { code: "003", name: "レビュー" },
    { code: "004", name: "打ち合わせ" },
    { code: "005", name: "調査" },
];

// Mock schedule data
const schedules: ScheduleItem[] = [
    { date: "10月20日", time: "10:00 30分", name: "スケジュール名", organizer: "" },
    { date: "10月21日", time: "10:00 30分", name: "スケジュール名", organizer: "" },
    { date: "10月22日", time: "10:00 30分", name: "スケジュール名", organizer: "" },
    { date: "10月23日", time: "10:00 30分", name: "スケジュール名", organizer: "" },
];

export function LinkingProcessView({
    onBack,
    pdfFileName,
    icsFileName,
    onSubmit,
    onAutoLink,
}: LinkingProcessViewProps) {
    const styles = useStyles();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [option1Value, setOption1Value] = useState("");
    const [option2Enabled, setOption2Enabled] = useState(true);

    const [itemCodes, setItemCodes] = useState<string[]>(new Array(schedules.length).fill(""));

    const handleItemCodeChange = (rowIndex: number, value: string) => {
        const newCodes = [...itemCodes];
        newCodes[rowIndex] = value;
        setItemCodes(newCodes);
    };

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(itemCodes);
        }
    };

    return (
        <>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <PageHeader onBack={onBack} breadcrumbs={["TimeTracker", "紐づけ処理"]} />
                </div>
                <Button
                    appearance="secondary"
                    icon={<History24Regular />}
                    onClick={() => setIsDrawerOpen(true)}
                    className={styles.historyButton}
                >
                    履歴
                </Button>
            </div>

            <div className={styles.section}>
                <Card className={styles.infoCard}>
                    <div className={styles.infoContent}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📄</span>
                            <span className={styles.infoLabel}>勤怠情報:</span>
                            <span>{pdfFileName || "未選択"}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoIcon}>📅</span>
                            <span className={styles.infoLabel}>スケジュール情報:</span>
                            <span>{icsFileName || "未選択"}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className={styles.section}>
                <ExpandableSection
                    title="✨ AIによる自動紐づけ"
                    description="スケジュールとItemコードを自動的にマッチング"
                    defaultExpanded={false}
                >
                    <div className={styles.optionRow}>
                        <span className={styles.optionLabel}>
                            <Sparkle24Regular className={styles.optionIcon} />
                            オプション 1
                        </span>
                        <div className={styles.optionControl}>
                            <Input
                                placeholder="入力"
                                value={option1Value}
                                onChange={(e) => setOption1Value(e.target.value)}
                                className={styles.optionInput}
                            />
                        </div>
                    </div>
                    <div className={styles.optionRow}>
                        <span className={styles.optionLabel}>
                            <Settings24Regular className={styles.optionIcon} />
                            オプション 2
                        </span>
                        <div className={styles.optionControl}>
                            <Switch checked={option2Enabled} onChange={(_, data) => setOption2Enabled(data.checked)} />
                        </div>
                    </div>
                    <div className={styles.autoLinkButtonContainer}>
                        <Button
                            appearance="primary"
                            icon={<Sparkle24Regular />}
                            className={styles.autoLinkButton}
                            onClick={onAutoLink}
                        >
                            適用
                        </Button>
                    </div>
                </ExpandableSection>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>
                    <DocumentBulletList24Regular className={styles.scheduleIcon} />
                    スケジュール一覧
                </div>

                <ScheduleTable
                    schedules={schedules}
                    itemCodes={itemCodes}
                    itemCodeOptions={itemCodeOptions}
                    itemCodeMode="editable"
                    onItemCodeChange={handleItemCodeChange}
                />
            </div>

            <div className={styles.submitButtonContainer}>
                <Button
                    appearance="primary"
                    className={styles.submitButton}
                    icon={<CheckmarkCircle24Regular className={styles.submitButtonIcon} />}
                    onClick={handleSubmit}
                >
                    登録実行
                </Button>
            </div>

            <Drawer
                type="overlay"
                position="end"
                open={isDrawerOpen}
                onOpenChange={(_, { open }) => setIsDrawerOpen(open)}
                className={styles.drawer}
            >
                <DrawerHeader>
                    <DrawerHeaderTitle
                        action={
                            <Button
                                appearance="subtle"
                                aria-label="閉じる"
                                icon={<Dismiss24Regular />}
                                onClick={() => setIsDrawerOpen(false)}
                            />
                        }
                    >
                        処理履歴
                    </DrawerHeaderTitle>
                </DrawerHeader>

                <DrawerBody>
                    {historyData.map((item, index) => (
                        <div key={index} className={styles.historyItem}>
                            <div className={styles.historyTime}>{item.time}</div>
                            <div className={styles.historyAction}>{item.action}</div>
                            <div className={styles.historyDetails}>{item.details}</div>
                        </div>
                    ))}
                </DrawerBody>
            </Drawer>
        </>
    );
}
