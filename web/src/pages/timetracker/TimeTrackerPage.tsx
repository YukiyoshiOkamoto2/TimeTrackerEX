import { appMessageDialogRef } from "@/components/message-dialog";
import { makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { Page } from "../../components/page";
import { ScheduleItem } from "./components";
import { ICS, PDF, UploadInfo } from "./models";
import { useSettings } from "@/store";
import { ValidationErrorDialog } from "@/components/validation-error-dialog";
import { CompletionView } from "./view/CompletionView";
import { FileUploadView } from "./view/FileUploadView";
import { LinkingProcessView } from "./view/LinkingProcessView";

const useStyles = makeStyles({
    viewContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
        width: "100%",
    },
    slideInRight: {
        animationName: {
            from: {
                opacity: 0,
                transform: "translateX(60px)",
            },
            to: {
                opacity: 1,
                transform: "translateX(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
    slideInLeft: {
        animationName: {
            from: {
                opacity: 0,
                transform: "translateX(-60px)",
            },
            to: {
                opacity: 1,
                transform: "translateX(0)",
            },
        },
        animationDuration: tokens.durationNormal,
        animationTimingFunction: tokens.curveEasyEase,
        animationFillMode: "both",
    },
});

// Mock data
const MOCK_DATA = {
    completedSchedules: [
        { date: "2025/10/04", time: "09:00-10:00", name: "朝会", organizer: "田中太郎" },
        { date: "2025/10/04", time: "13:00-14:30", name: "プロジェクト会議", organizer: "佐藤花子" },
        { date: "2025/10/05", time: "10:00-12:00", name: "開発作業", organizer: "山田次郎" },
    ],
    completedItemCodes: ["PROJ-001", "PROJ-002", "PROJ-003"],
    itemCodeOptions: [
        { code: "PROJ-001", name: "プロジェクトA" },
        { code: "PROJ-002", name: "プロジェクトB" },
        { code: "PROJ-003", name: "プロジェクトC" },
    ],
};

type view = "upload" | "linking" | "completion";
const views: view[] = ["upload", "linking", "completion"];
type viewIndex = 0 | 1 | 2;

const useTimeTrackerViewState = (): [
    view,
    "left" | "right" | "none",
    (back?: viewIndex) => void,
    (back?: viewIndex) => void,
] => {
    const [currentIndex, setCurrentIndex] = useState<viewIndex>(0);
    const [currentView, setCurrentView] = useState<view>(views[currentIndex]);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");

    const backTo = (back?: viewIndex) => {
        const backIndex = currentIndex - (back ?? 1);
        if (backIndex < 0) {
            throw new Error(`TimeTrackerPage invalid back.: current ${views[currentIndex]}`);
        }
        setCurrentIndex(backIndex as viewIndex);
        setSlideDirection("left");
    };

    const nextTo = (next?: viewIndex) => {
        const nextIndex = currentIndex + (next ?? 1);
        if (nextIndex > views.length - 1) {
            throw new Error(`TimeTrackerPage invalid next.: current ${views[currentIndex]}`);
        }
        setCurrentIndex(nextIndex as viewIndex);
        setSlideDirection("right");
    };

    useEffect(() => {
        setCurrentView(views[currentIndex]);
    }, [currentIndex]);

    return [currentView, slideDirection, backTo, nextTo];
};

export function TimeTrackerPage() {
    const styles = useStyles();

    const { validationErrors } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [pdf, setPdf] = useState<PDF | undefined>(undefined);
    const [ics, setIcs] = useState<ICS | undefined>(undefined);
    const [uploadInfo, setUploadInfo] = useState<UploadInfo | undefined>(undefined);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const [currentView, slideDirection, backTo, nextTo] = useTimeTrackerViewState();

    // TimeTracker設定のバリデーションチェック
    useEffect(() => {
        const hasTimeTrackerErrors = validationErrors.timeTracker.length > 0;
        if (hasTimeTrackerErrors) {
            // FileUploadViewに戻る
            if (currentView === "completion") {
                backTo(2);
            } else if (currentView === "linking") {
                backTo(1);
            }

            // エラーダイアログを表示
            setShowErrorDialog(true);
        }
    }, [validationErrors.timeTracker, currentView, backTo]);


    // 非同期処理ヘルパー
    const withLoading = async (fn: () => Promise<void>) => {
        setIsLoading(true);
        try {
            await fn();
        } catch (error) {
            console.error("処理エラー:", error);
            await appMessageDialogRef?.showMessageAsync(
                "処理エラー",
                `処理中にエラーが発生しました。\n\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
                "ERROR",
            );
        } finally {
            setIsLoading(false);
        }
    };

    // アニメーションクラス取得
    const getAnimationClass = () =>
        slideDirection === "right" ? styles.slideInRight : slideDirection === "left" ? styles.slideInLeft : "";

    // イベントハンドラー
    const handleFileUploadViewSubmit = (uploadInfo: UploadInfo) => {
        setUploadInfo(uploadInfo);
        nextTo();
    };

    const handleLinkingProcessSubmit = (schedules: ScheduleItem[]) =>
        withLoading(async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            console.log("登録実行", schedules);
            nextTo();
        });

    return (
        <>
            <Page
                title="TimeTracker"
                subtitle="勤怠情報とスケジュールの紐づけ管理"
                loading={isLoading}
                loadingText="登録処理中..."
            >
                <div className={`${styles.viewContainer} ${getAnimationClass()}`} key={currentView}>
                    {currentView === "completion" ? (
                        <CompletionView
                            schedules={MOCK_DATA.completedSchedules}
                            itemCodes={MOCK_DATA.completedItemCodes}
                            itemCodeOptions={MOCK_DATA.itemCodeOptions}
                            onBack={() => backTo(2)}
                            onBackToLinking={backTo}
                        />
                    ) : currentView === "linking" ? (
                        <LinkingProcessView
                            uploadInfo={uploadInfo}
                            setIsLoading={setIsLoading}
                            onBack={backTo}
                            onSubmit={handleLinkingProcessSubmit}
                        />
                    ) : (
                        <FileUploadView
                            pdf={pdf}
                            ics={ics}
                            onPdfUpdate={setPdf}
                            onIcsUpdate={setIcs}
                            onSubmit={handleFileUploadViewSubmit}
                        />
                    )}
                </div>
            </Page>

            <ValidationErrorDialog
                open={showErrorDialog}
                errors={validationErrors.timeTracker}
            />
        </>
    );
}
