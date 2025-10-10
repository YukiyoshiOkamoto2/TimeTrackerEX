import { Card } from "@/components/card";
import { registerTasks, type RegisterTasksRequest } from "@/core/api";
import { getLogger } from "@/lib/logger";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import {
    ArrowLeft24Regular,
    ArrowSync24Regular,
    CheckmarkCircle24Regular,
    DocumentBulletList24Regular,
    Warning24Regular,
} from "@fluentui/react-icons";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ItemCodeOption, ScheduleItem, ScheduleTable } from "../components/index";
import { SectionTitle, ViewHeader, ViewSection } from "../components/ViewLayout";


const logger = getLogger("CompletionView");

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
    onBack: () => void;
    onBackToLinking: () => void;
    onRegisterSuccess: () => void;
    onShowMessage: (type: "success" | "error", title: string, message: string) => void;
};

export function CompletionView({
    schedules,
    itemCodes,
    itemCodeOptions,
    onBack,
    onBackToLinking,
    onRegisterSuccess,
    onShowMessage,
}: CompletionViewProps) {
    const styles = useStyles();
    const [isRegistering, setIsRegistering] = useState(false);

    const breadcrumbs = ["TimeTracker", "紐づけ処理", "スケジュール確認"];

    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) {
            onBack(); // TimeTrackerに戻る
        } else if (index === 1) {
            onBackToLinking(); // 紐づけ処理に戻る
        }
    };

    /**
     * タスク登録処理
     */
    const handleRegister = async () => {
        setIsRegistering(true);

        try {
            // 作業項目コード未設定チェック
            const missingCodes = schedules.filter((s) => !s.itemCode || s.itemCode.trim() === "");
            if (missingCodes.length > 0) {
                const errorMsg = `${missingCodes.length}件の作業項目コードが未設定です。\n全てのスケジュールに作業項目コードを設定してください。`;
                logger.warn("作業項目コード未設定エラー", { missingCount: missingCodes.length });
                onShowMessage("error", "入力エラー", errorMsg);
                return;
            }

            // 作業項目コードの存在チェック
            const invalidCodes = schedules.filter((s) => !itemCodes.includes(s.itemCode || ""));
            if (invalidCodes.length > 0) {
                const invalidList = invalidCodes.map((s) => `- ${s.itemCode}: ${s.name}`).join("\n");
                const errorMsg = `${invalidCodes.length}件の作業項目コードが無効です。\n以下の作業項目コードを確認してください:\n${invalidList}`;
                logger.warn("無効な作業項目コード", { invalidCodes: invalidCodes.map((s) => s.itemCode) });
                onShowMessage("error", "入力エラー", errorMsg);
                return;
            }

            // ScheduleItemからAPIリクエスト形式に変換
            const request: RegisterTasksRequest = {
                schedules: schedules.map((item) => {
                    // time: "09:00-10:30" を startTime, endTime に分解
                    const [startTime, endTime] = item.time.split("-");
                    return {
                        date: item.date,
                        startTime: startTime.trim(),
                        endTime: endTime ? endTime.trim() : startTime.trim(),
                        itemCode: item.itemCode || "",
                        title: item.name,
                    };
                }),
            };

            // API呼び出し
            const response = await registerTasks(request);

            if (response.success) {
                onShowMessage(
                    "success",
                    "タスク登録完了",
                    `${response.registeredCount || schedules.length}件のタスクを登録しました。`,
                );

                // 成功後、FileUploadViewへ戻る
                onRegisterSuccess();
            } else {
                const errorMsg = response.message || "タスク登録に失敗しました";
                logger.error("タスク登録失敗", { response });
                onShowMessage("error", "タスク登録エラー", errorMsg);

                // エラー詳細がある場合はログ出力
                if (response.errors && response.errors.length > 0) {
                    logger.error("タスク登録エラー詳細", { errors: response.errors });
                }
            }
        } catch (error) {
            logger.error("タスク登録API呼び出しエラー", { error });
            const errorMsg = error instanceof Error ? error.message : "不明なエラーが発生しました";
            onShowMessage("error", "タスク登録エラー", errorMsg);
        } finally {
            setIsRegistering(false);
        }
    };

    // 未設定の作業項目コード数をカウント
    const missingCodesCount = schedules.filter((s) => !s.itemCode || s.itemCode.trim() === "").length;
    const hasErrors = missingCodesCount > 0;

    return (
        <>
            <ViewHeader
                left={<PageHeader breadcrumbs={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />}
                right={
                    <>
                        <Button appearance="secondary" icon={<ArrowLeft24Regular />} onClick={onBackToLinking}>
                            戻る
                        </Button>
                        <Button
                            appearance="primary"
                            icon={<ArrowSync24Regular />}
                            onClick={handleRegister}
                            disabled={isRegistering || hasErrors}
                        >
                            {isRegistering ? "登録中..." : "タスク登録"}
                        </Button>
                    </>
                }
            />

            <ViewSection>
                {/* 警告メッセージ */}
                {hasErrors && (
                    <Card className={`${styles.completionMessage} ${styles.statusCard}`}>
                        <Warning24Regular
                            className={styles.completionIcon}
                            style={{ color: tokens.colorPaletteRedForeground1 }}
                        />
                        <div className={styles.completionText}>
                            {missingCodesCount}
                            件の作業項目コードが未設定です。全てのスケジュールに作業項目コードを設定してください。
                        </div>
                    </Card>
                )}

                {/* 確認メッセージ */}
                {!hasErrors && (
                    <Card className={`${styles.completionMessage} ${styles.statusCard}`}>
                        <CheckmarkCircle24Regular className={styles.completionIcon} />
                        <div className={styles.completionText}>
                            {schedules.length}件のスケジュールを登録します。内容を確認してください。
                        </div>
                    </Card>
                )}

                {/* スケジュール一覧 */}
                <div>
                    <SectionTitle icon={<DocumentBulletList24Regular />}>スケジュール一覧</SectionTitle>
                    <ScheduleTable schedules={schedules} itemCodeOptions={itemCodeOptions} itemCodeMode="editable" />
                </div>
            </ViewSection>
        </>
    );
}
