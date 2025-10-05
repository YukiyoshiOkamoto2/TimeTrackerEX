import { appMessageDialogRef } from "@/components/message-dialog";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    DialogTrigger,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { useState } from "react";
import { Page } from "../../components/page";
import { CompletionView, FileUploadView, LinkingProcessView, ScheduleItem } from "./components";
import { ICS, PDF, UploadInfo } from "./models";

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

export function TimeTrackerPage() {
    const styles = useStyles();

    const [pdf, setPdf] = useState<PDF | undefined>(undefined);
    const [ics, setIcs] = useState<ICS | undefined>(undefined);
    const [uploadInfo, setUploadInfo] = useState<UploadInfo | undefined>(undefined);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentView, setCurrentView] = useState<"upload" | "linking" | "completion">("upload");
    const [isLoading, setIsLoading] = useState(false);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");

    // ビュー遷移ヘルパー
    const transitionToView = (view: typeof currentView, direction: "left" | "right") => {
        setSlideDirection(direction);
        setCurrentView(view);
    };

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
        transitionToView("linking", "right");
    };

    const handleBackToUploadFromCompletion = () => {
        transitionToView("upload", "left");
        setUploadInfo(undefined);
    };

    const handleLinkingProcessSubmit = (schedules: ScheduleItem[]) =>
        withLoading(async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            console.log("登録実行", schedules);
            transitionToView("completion", "right");
        });

    return (
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
                        onBack={handleBackToUploadFromCompletion}
                        onBackToLinking={() => transitionToView("linking", "left")}
                    />
                ) : currentView === "linking" ? (
                    <LinkingProcessView
                        uploadInfo={uploadInfo}
                        setIsLoading={setIsLoading}
                        onBack={() => transitionToView("upload", "left")}
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

            {/* Export Success Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>エクスポート完了</DialogTitle>
                        <DialogContent>データのエクスポートが完了しました。</DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="primary">閉じる</Button>
                            </DialogTrigger>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </Page>
    );
}
