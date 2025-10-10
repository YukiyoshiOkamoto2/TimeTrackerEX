import { appMessageDialogRef } from "@/components/message-dialog";
import { useSettings } from "@/store";
import type { DayTask } from "@/types";
import { makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { Page } from "../../components/page";
import { ScheduleItem } from "./components";
import { ICS, PDF, UploadInfo } from "./models";
import { CompletionView } from "./view/CompletionView";
import { FileUploadView } from "./view/FileUploadView";
import { LinkingProcessView } from "./view/LinkingProcessView";
import { ValidationErrorDialog } from "./components/ValidationErrorDialog";


// const logger = getLogger("TimeTrackerPage");

const useStyles = makeStyles({
    viewContainer: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
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

    // Phase 6: データフロー用のstate
    // @ts-expect-error Phase 7: TimeTracker API登録で使用予定
    const [dayTasks, setDayTasks] = useState<DayTask[]>([]);
    // @ts-expect-error Phase 7: TimeTracker API登録で使用予定
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

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

    // アニメーションクラス取得
    const getAnimationClass = () =>
        slideDirection === "right" ? styles.slideInRight : slideDirection === "left" ? styles.slideInLeft : "";

    // イベントハンドラー
    const handleFileUploadViewSubmit = (uploadInfo: UploadInfo) => {
        setUploadInfo(uploadInfo);
        nextTo();
    };

    const handleLinkingProcessSubmit = (_tasks: any[]) => {};

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
                            schedules={scheduleItems}
                            itemCodes={[]} // TODO: Phase 7 - 必要に応じて実装
                            itemCodeOptions={[]}
                            onBack={() => backTo(2)}
                            onBackToLinking={backTo}
                            onRegisterSuccess={() => backTo(2)} // 登録成功後FileUploadViewへ
                            onShowMessage={(type, title, message) => {
                                appMessageDialogRef.showMessageAsync(
                                    title,
                                    message,
                                    type === "success" ? "INFO" : "ERROR",
                                );
                            }}
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

            <ValidationErrorDialog open={showErrorDialog} errors={validationErrors.timeTracker} />
        </>
    );
}
