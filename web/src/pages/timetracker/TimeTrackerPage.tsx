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
import { CompletionView, FileUploadView, ItemCodeOption, LinkingProcessView, ScheduleItem } from "./components";

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

type FileData = {
    name: string;
    size: number;
    type: string;
};

type Content = {
    shedule: ScheduleItem[],
    pdfFile?: FileData,
    icsFile?: FileData,
    currentView: "upload" | "linking" | "completion"
}

export function TimeTrackerPage() {
    const styles = useStyles();
    const [pdfFile, setPdfFile] = useState<FileData | null>(null);
    const [icsFile, setIcsFile] = useState<FileData | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentView, setCurrentView] = useState<"upload" | "linking" | "completion">("upload");
    const [isLoading, setIsLoading] = useState(false);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");

    // Mock data for completion view
    const [completedSchedules] = useState<ScheduleItem[]>([
        { date: "2025/10/04", time: "09:00-10:00", name: "朝会", organizer: "田中太郎" },
        { date: "2025/10/04", time: "13:00-14:30", name: "プロジェクト会議", organizer: "佐藤花子" },
        { date: "2025/10/05", time: "10:00-12:00", name: "開発作業", organizer: "山田次郎" },
    ]);
    const [completedItemCodes] = useState<string[]>(["PROJ-001", "PROJ-002", "PROJ-003"]);
    const [itemCodeOptions] = useState<ItemCodeOption[]>([
        { code: "PROJ-001", name: "プロジェクトA" },
        { code: "PROJ-002", name: "プロジェクトB" },
        { code: "PROJ-003", name: "プロジェクトC" },
    ]);

    const handlePdfUpload = (file: File) => {
        setPdfFile({
            name: file.name,
            size: file.size,
            type: file.type,
        });
    };

    const handleIcsUpload = (file: File) => {
        setIcsFile({
            name: file.name,
            size: file.size,
            type: file.type,
        });
    };

    const handlePdfClear = () => {
        setPdfFile(null);
    };

    const handleIcsClear = () => {
        setIcsFile(null);
    };

    const handleProcess = () => {
        setSlideDirection("right");
        setCurrentView("linking");
    };

    const handleBackToUpload = () => {
        setSlideDirection("left");
        setCurrentView("upload");
    };

    const handleSubmit = async (schedules: ScheduleItem[]) => {
        setIsLoading(true);
        try {
            // Mock API call - 実際の処理に置き換えてください
            await new Promise((resolve) => setTimeout(resolve, 2000));
            console.log("登録実行", schedules);
            setSlideDirection("right");
            setCurrentView("completion");
        } catch (error) {
            console.error("登録エラー", error);
        } finally {
            setIsLoading(false);
        }
    };
    const { navigate } = useNavigation();
    const handleExport = async () => {
        navigate("Settings", null, "timetracker");
        setIsLoading(true);
        try {
            // Mock export process
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("エクスポート実行");
            setDialogOpen(true);
        } catch (error) {
            console.error("エクスポートエラー", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToUploadFromCompletion = () => {
        setSlideDirection("left");
        setCurrentView("upload");
        // Reset files and data
        setPdfFile(null);
        setIcsFile(null);
    };

    const handleBackToLinkingFromCompletion = () => {
        setSlideDirection("left");
        setCurrentView("linking");
    };

    const handleAutoLink = async () => {
        setIsLoading(true);
        try {
            // Mock AI auto-linking process
            await new Promise((resolve) => setTimeout(resolve, 3000));
            console.log("AIによる自動紐づけ完了");
            // ここで自動紐づけされたデータを更新する処理を追加
        } catch (error) {
            console.error("自動紐づけエラー", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getAnimationClass = () => {
        if (slideDirection === "right") return styles.slideInRight;
        if (slideDirection === "left") return styles.slideInLeft;
        return "";
    };

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
                        schedules={completedSchedules}
                        itemCodes={completedItemCodes}
                        itemCodeOptions={itemCodeOptions}
                        onExport={handleExport}
                        onBack={handleBackToUploadFromCompletion}
                        onBackToLinking={handleBackToLinkingFromCompletion}
                    />
                ) : currentView === "linking" ? (
                    <LinkingProcessView
                        onBack={handleBackToUpload}
                        pdfFileName={pdfFile?.name}
                        icsFileName={icsFile?.name}
                        onSubmit={handleSubmit}
                        onAutoLink={handleAutoLink}
                    />
                ) : (
                    <FileUploadView
                        pdfFile={pdfFile}
                        icsFile={icsFile}
                        onPdfUpload={handlePdfUpload}
                        onIcsUpload={handleIcsUpload}
                        onPdfClear={handlePdfClear}
                        onIcsClear={handleIcsClear}
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
