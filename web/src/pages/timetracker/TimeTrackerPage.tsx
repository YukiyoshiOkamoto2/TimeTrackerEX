import { appMessageDialogRef } from "@/components/message-dialog";
import { useSettings } from "@/store";
import { usePageContent } from "@/store/content";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../../components/page";
import { ScheduleItem } from "./components";
import { ValidationErrorDialog } from "./components/ValidationErrorDialog";
import type { ICS, PDF, UploadInfo } from "./models";
import { CompletionView } from "./view/CompletionView";
import { FileUploadView } from "./view/FileUploadView";
import { LinkingProcessView } from "./view/LinkingProcessView";

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

/** ビュー種別 */
type View = "upload" | "linking" | "completion";

/** ビューインデックス */
type ViewIndex = 0 | 1 | 2;

/** TimeTrackerのビュー状態を管理するカスタムフック */
interface UseTimeTrackerViewStateReturn {
    /** 現在のビュー */
    currentView: View;
    /** スライド方向 */
    slideDirection: "left" | "right" | "none";
    /** 前のビューに戻る */
    backTo: (back?: ViewIndex) => void;
    /** 次のビューに進む */
    nextTo: (next?: ViewIndex) => void;
}

/** 利用可能なビューのリスト */
const VIEWS: View[] = ["upload", "linking", "completion"];

/**
 * TimeTrackerページのビュー状態を管理するカスタムフック
 * ビューの切り替えとスライドアニメーションの方向を管理します
 */
const useTimeTrackerViewState = (): UseTimeTrackerViewStateReturn => {
    const [currentIndex, setCurrentIndex] = useState<ViewIndex>(0);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");

    // 現在のビューを計算
    const currentView = useMemo(() => VIEWS[currentIndex], [currentIndex]);

    // 前のビューに戻る関数（useCallbackでメモ化）
    const backTo = useCallback(
        (back: ViewIndex = 1) => {
            const backIndex = currentIndex - back;
            if (backIndex < 0) {
                throw new Error(`TimeTrackerPage invalid back.: current ${VIEWS[currentIndex]}`);
            }
            setCurrentIndex(backIndex as ViewIndex);
            setSlideDirection("left");
        },
        [currentIndex],
    );

    // 次のビューに進む関数（useCallbackでメモ化）
    const nextTo = useCallback(
        (next: ViewIndex = 1) => {
            const nextIndex = currentIndex + next;
            if (nextIndex > VIEWS.length - 1) {
                throw new Error(`TimeTrackerPage invalid next.: current ${VIEWS[currentIndex]}`);
            }
            setCurrentIndex(nextIndex as ViewIndex);
            setSlideDirection("right");
        },
        [currentIndex],
    );

    return { currentView, slideDirection, backTo, nextTo };
};

/**
 * TimeTrackerページの永続化データ型定義
 * uploadInfoにpdfとicsが含まれているため、uploadInfoのみを管理
 */
interface TimeTrackerPageContent {
    uploadInfo?: UploadInfo;
}

/**
 * TimeTrackerページコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - ハンドラーをuseCallbackでメモ化
 * - 計算値をuseMemoで最適化
 * - ContentProviderでpdf、ics、uploadInfoを永続化
 */
export const TimeTrackerPage = memo(function TimeTrackerPage() {
    const styles = useStyles();
    const { validationErrors } = useSettings();
    const [pageContent, setPageContent] = usePageContent<TimeTrackerPageContent>("TimeTracker");

    const [isLoading, setIsLoading] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // 永続化データから状態を取得（ページ遷移時も保持される）
    const uploadInfo = pageContent?.uploadInfo;
    const pdf = uploadInfo?.pdf;
    const ics = uploadInfo?.ics;

    // PDF更新用のセッター（uploadInfoを更新してContentProviderに保存）
    const setPdf = useCallback(
        (pdf: PDF | undefined) => {
            setPageContent({
                uploadInfo: {
                    ...uploadInfo,
                    pdf,
                },
            });
        },
        [uploadInfo, setPageContent],
    );

    // ICS更新用のセッター（uploadInfoを更新してContentProviderに保存）
    const setIcs = useCallback(
        (ics: ICS | undefined) => {
            setPageContent({
                uploadInfo: {
                    ...uploadInfo,
                    ics,
                },
            });
        },
        [uploadInfo, setPageContent],
    );

    // UploadInfo更新用のセッター（ContentProviderに保存）
    const setUploadInfo = useCallback(
        (uploadInfo: UploadInfo | undefined) => {
            setPageContent({
                uploadInfo,
            });
        },
        [setPageContent],
    );

    // @ts-expect-error Phase 7: TimeTracker API登録で使用予定
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

    const { currentView, slideDirection, backTo, nextTo } = useTimeTrackerViewState();

    /**
     * TimeTracker設定のバリデーションチェック
     * エラーがある場合はFileUploadViewに戻り、エラーダイアログを表示
     */
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

    /**
     * アニメーションクラスを取得（スライド方向に応じたクラスを返す）
     */
    const animationClass = useMemo(
        () => (slideDirection === "right" ? styles.slideInRight : slideDirection === "left" ? styles.slideInLeft : ""),
        [slideDirection, styles.slideInLeft, styles.slideInRight],
    );

    /**
     * ファイルアップロード完了時のハンドラー
     */
    const handleFileUploadViewSubmit = useCallback(
        (uploadInfo: UploadInfo) => {
            setUploadInfo(uploadInfo);
            nextTo();
        },
        [nextTo],
    );

    /**
     * 紐づけ処理完了時のハンドラー
     * @todo Phase 7で実装予定
     */
    const handleLinkingProcessSubmit = useCallback((_tasks: any[]) => {
        // TODO: Phase 7 - 紐づけ処理の実装
    }, []);

    /**
     * CompletionViewの「戻る」ボタン押下時のハンドラー
     */
    const handleCompletionBack = useCallback(() => backTo(2), [backTo]);

    /**
     * CompletionViewの登録成功時のハンドラー
     */
    const handleRegisterSuccess = useCallback(() => backTo(2), [backTo]);

    /**
     * CompletionViewのメッセージ表示ハンドラー
     */
    const handleShowMessage = useCallback((type: "success" | "error", title: string, message: string) => {
        appMessageDialogRef.showMessageAsync(title, message, type === "success" ? "INFO" : "ERROR");
    }, []);

    return (
        <>
            <Page
                title="TimeTracker"
                subtitle="勤怠情報とスケジュールの紐づけ管理"
                loading={isLoading}
                loadingText="処理中..."
            >
                <div className={mergeClasses(styles.viewContainer, animationClass)} key={currentView}>
                    {currentView === "completion" ? (
                        <CompletionView
                            schedules={scheduleItems}
                            itemCodes={[]} // TODO: Phase 7 - 必要に応じて実装
                            itemCodeOptions={[]}
                            onBack={handleCompletionBack}
                            onBackToLinking={backTo}
                            onRegisterSuccess={handleRegisterSuccess}
                            onShowMessage={handleShowMessage}
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
                            setIsLoading={setIsLoading}
                            onSubmit={handleFileUploadViewSubmit}
                        />
                    )}
                </div>
            </Page>

            <ValidationErrorDialog open={showErrorDialog} errors={validationErrors.timeTracker} />
        </>
    );
});
