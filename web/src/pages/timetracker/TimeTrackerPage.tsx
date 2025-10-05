import { useNavigation } from "@/store/navigation";
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
import { CompletionView, FileUploadView, LinkingProcessView, ScheduleItem, PDF, ICS } from "./components";
import { appMessageDialogRef } from "@/components/message-dialog";

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
    const { navigate } = useNavigation();
    const [pdf, setPdf] = useState<PDF | undefined>(undefined);
    const [ics, setIcs] = useState<ICS | undefined>(undefined);
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
                "ERROR"
            );
        } finally {
            setIsLoading(false);
        }
    };

    // アニメーションクラス取得
    const getAnimationClass = () =>
        slideDirection === "right" ? styles.slideInRight :
        slideDirection === "left" ? styles.slideInLeft : "";

    // イベントハンドラー
    const handleProcess = () => transitionToView("linking", "right");

    const handleBackToUpload = () => transitionToView("upload", "left");

    const handleBackToUploadFromCompletion = () => {
        transitionToView("upload", "left");
        setPdf(undefined);
        setIcs(undefined);
    };

    const handleBackToLinking = () => transitionToView("linking", "left");

    const handleSubmit = (schedules: ScheduleItem[]) => withLoading(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("登録実行", schedules);
        transitionToView("completion", "right");
    });

    const handleExport = () => withLoading(async () => {
        navigate("Settings", null, "timetracker");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("エクスポート実行");
        setDialogOpen(true);
    });

    const handleAutoLink = () => withLoading(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log("AIによる自動紐づけ完了");
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
                        onExport={handleExport}
                        onBack={handleBackToUploadFromCompletion}
                        onBackToLinking={handleBackToLinking}
                    />
                ) : currentView === "linking" ? (
                    <LinkingProcessView
                        onBack={handleBackToUpload}
                        pdfFileName={pdf?.name}
                        icsFileName={ics?.name}
                        onSubmit={handleSubmit}
                        onAutoLink={handleAutoLink}
                    />
                ) : (
                    <FileUploadView
                        pdf={pdf}
                        ics={ics}
                        onPdfUpdate={setPdf}
                        onIcsUpdate={setIcs}
                        onProcess={handleProcess}
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
