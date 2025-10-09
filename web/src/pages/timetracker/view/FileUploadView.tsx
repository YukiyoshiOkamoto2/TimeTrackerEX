import { Card } from "@/components/card";
import { CheckedTable, CheckedTableItem } from "@/components/checked-table";
import { InteractiveCard } from "@/components/interactive-card";
import { appMessageDialogRef } from "@/components/message-dialog";
import { HistoryManager } from "@/core/history";
import { parseICS } from "@/core/ics";
import { parsePDF } from "@/core/pdf";
import { getLogger } from "@/lib";
import { useSettings } from "@/store/settings/SettingsProvider";
import { Event, EventUtils, Schedule, ScheduleUtils } from "@/types";
import { Button, makeStyles, Popover, PopoverSurface, PopoverTrigger, tokens } from "@fluentui/react-components";
import {
    ArrowUpload20Regular,
    Calendar24Regular,
    Dismiss24Regular,
    Document24Regular,
    Link24Regular,
    QuestionCircle20Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { PasswordInputDialog } from "../components/PasswordInputDialog";
import { useTimeTrackerSession } from "../hooks/useTimeTrackerSession";
import { ICS, PDF, UploadInfo } from "../models";

const logger = getLogger("FileUploadView");

const useStyles = makeStyles({
    uploadSection: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: tokens.spacingHorizontalL,
    },
    dropZone: {
        position: "relative",
        "&:hover .drop-hint": {
            opacity: 1,
        },
    },
    uploadCardContent: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    uploadCardHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    uploadCardInner: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
    },
    dropHint: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXXS,
        marginTop: tokens.spacingVerticalXXS,
        opacity: 0.7,
        transition: "opacity 0.2s ease",
    },
    dropIcon: {
        fontSize: tokens.fontSizeBase300,
    },
    uploadCardTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXXS,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    uploadCardIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorBrandForeground1,
    },
    uploadCardDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        lineHeight: tokens.lineHeightBase200,
    },
    fileInfo: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalL,
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        wordBreak: "break-all",
        borderBottomWidth: tokens.strokeWidthThin,
        borderBottomStyle: "solid",
        borderBottomColor: tokens.colorNeutralStroke2,
        borderTopWidth: tokens.strokeWidthThin,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorNeutralStroke2,
        borderLeftWidth: tokens.strokeWidthThin,
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorNeutralStroke2,
        borderRightWidth: tokens.strokeWidthThin,
        borderRightStyle: "solid",
        borderRightColor: tokens.colorNeutralStroke2,
        lineHeight: tokens.lineHeightBase400,
    },
    actionSection: {
        display: "flex",
        flexDirection: "column",
        paddingTop: tokens.spacingVerticalL,
        marginTop: tokens.spacingVerticalXS,
        gap: tokens.spacingVerticalL,
    },
    infoSectionContainer: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: tokens.spacingHorizontalXXL,
    },
    infoSection: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
        maxHeight: "420px",
    },
    infoSectionHeader: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    helpIcon: {
        color: tokens.colorNeutralForeground3,
        cursor: "help",
        "&:hover": {
            color: tokens.colorBrandForeground1,
        },
    },
    popoverContent: {
        maxWidth: "300px",
        padding: tokens.spacingVerticalM,
        fontSize: tokens.fontSizeBase200,
        lineHeight: tokens.lineHeightBase300,
    },
    hiddenInput: {
        display: "none",
    },
});

export type FileUploadViewProps = {
    pdf?: PDF;
    ics?: ICS;
    onPdfUpdate: (pdf?: PDF) => void;
    onIcsUpdate: (ics?: ICS) => void;
    onSubmit: (info: UploadInfo) => void;
};

// ファイルバリデータ
const isPdfFile = (file: File) => file.type === "application/pdf";
const isIcsFile = (file: File) => file.name.endsWith(".ics") || file.type === "text/calendar";

// 日付フォーマット用ヘルパー
const formatDateTime = (start: Date, end: Date | null) => {
    const dateStr = start.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
    });

    const timeStr = end
        ? `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}～${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
        : start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    return { dateStr, timeStr };
};

const getScheduleAsync = async (file: File) => {
    let result;
    try {
        result = await parsePDF(file);
    } catch (error) {
        logger.error("PDFのパースに失敗しました:", error);
        await appMessageDialogRef?.showMessageAsync(
            "PDFファイルエラー",
            `PDFファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            "ERROR",
        );
        return undefined;
    }

    if (result.errorMessage) {
        await appMessageDialogRef?.showMessageAsync(
            "PDFファイルエラー",
            `PDFファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${result.errorMessage}`,
            "ERROR",
        );

        return undefined;
    }

    return result.schedule.filter((s: Schedule) => !s.errorMessage);
};

const getEventAsync = async (file: File) => {
    let result;
    try {
        const text = await file.text();
        result = parseICS(text);
    } catch (error) {
        logger.error("ICSのパースに失敗しました:", error);
        await appMessageDialogRef?.showMessageAsync(
            "ICSファイルエラー",
            `ICSファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            "ERROR",
        );
        return undefined;
    }

    const ev = result.events.filter((e: Event) => !e.isCancelled && !e.isPrivate);
    if (ev.length === 0 && result.errorMessages) {
        await appMessageDialogRef?.showMessageAsync(
            "ICSファイルエラー",
            `ICSファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${result.errorMessages}`,
            "ERROR",
        );
        return undefined;
    }

    return ev;
};

const scheduleToCheckItem = (schedule: Schedule[]) => {
    return schedule.map((s) => {
        const { dateStr, timeStr } = formatDateTime(new Date(s.start), s.end ? new Date(s.end) : null);

        const status = s.isHoliday ? (s.isPaidLeave ? "（有給休暇）" : "（休日）") : "";

        return {
            key: ScheduleUtils.getText(s),
            content: `${dateStr}　${timeStr} ${status}`,
            checked: status === "",
        };
    });
};

const eventToCheckItem = (event: Event[]) => {
    return event.map((e) => {
        const { dateStr, timeStr } = formatDateTime(
            new Date(e.schedule.start),
            e.schedule.end ? new Date(e.schedule.end) : null,
        );

        return {
            key: EventUtils.getKey(e),
            content: `${dateStr}　${timeStr}　${e.name}`,
            checked: true,
        };
    });
};

export function FileUploadView({ pdf, ics, onPdfUpdate, onIcsUpdate, onSubmit }: FileUploadViewProps) {
    const styles = useStyles();
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const icsInputRef = useRef<HTMLInputElement>(null);

    // 設定を取得
    const { settings, updateSettings } = useSettings();
    const timeTrackerSettings = settings.timetracker;

    // セッション管理
    const sessionHook = useTimeTrackerSession({
        baseUrl: timeTrackerSettings?.baseUrl || "",
        userName: timeTrackerSettings?.userName || "",
    });

    // テーブルデータの状態管理
    const [scheduleTableItems, setScheduleTableItems] = useState<CheckedTableItem[]>([]);
    const [eventTableItems, setEventTableItems] = useState<CheckedTableItem[]>([]);

    const canProcess =
        scheduleTableItems.filter((s) => s.checked).length > 0 || eventTableItems.filter((e) => e.checked).length > 0;

    const clearPdfFile = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        onPdfUpdate(undefined);
    };

    const clearIcsFile = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (icsInputRef.current) icsInputRef.current.value = "";
        onIcsUpdate(undefined);
    };
    // PDFファイルアップロード処理
    const uploadPdfFile = async (file: File) => {
        const schedule = await getScheduleAsync(file);
        if (schedule) {
            onPdfUpdate({
                schedule,
                name: file.name,
                type: file.type,
                size: file.size,
            });
        } else {
            clearPdfFile();
        }
    };

    // ICSファイルアップロード処理
    const uploadIcsFile = async (file: File) => {
        const event = await getEventAsync(file);
        if (event) {
            onIcsUpdate({
                event,
                name: file.name,
                type: file.type,
                size: file.size,
            });
        } else {
            clearIcsFile();
        }
    };

    // 汎用イベントハンドラー
    const createFileHandler = (uploadFn: (file: File) => Promise<void>, validator: (file: File) => boolean) => ({
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file && validator(file)) uploadFn(file);
        },
        onDrop: (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const file = event.dataTransfer.files?.[0];
            if (file && validator(file)) uploadFn(file);
        },
    });

    const pdfHandlers = createFileHandler(uploadPdfFile, isPdfFile);
    const icsHandlers = createFileHandler(uploadIcsFile, isIcsFile);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleLinkedClick = async () => {
        try {
            // Step 1: 認証チェック
            if (!sessionHook.isAuthenticated) {
                logger.info("Not authenticated. Opening password dialog...");
                await sessionHook.authenticateWithDialog();
                if (!sessionHook.isAuthenticated) {
                    logger.warn("Authentication cancelled or failed");
                    return;
                }
            }

            // Step 2: TimeTracker設定の検証
            if (!timeTrackerSettings?.baseProjectId) {
                await appMessageDialogRef.showMessageAsync(
                    "設定エラー",
                    "TimeTrackerのプロジェクトIDが設定されていません。\n設定画面でプロジェクトIDを設定してください。",
                    "ERROR",
                );
                return;
            }

            // Step 3: プロジェクトとWorkItemを取得
            if (!sessionHook.project || !sessionHook.workItems) {
                logger.info("Fetching project and work items...");
                await sessionHook.fetchProjectAndWorkItems(String(timeTrackerSettings.baseProjectId), async () => {
                    // プロジェクトID取得失敗時は設定をクリア
                    logger.warn("Invalid project ID. Clearing settings...");
                    updateSettings({
                        timetracker: {
                            ...timeTrackerSettings,
                            baseProjectId: null,
                        },
                    });
                    await appMessageDialogRef.showMessageAsync(
                        "設定エラー",
                        "プロジェクトIDが無効なため設定をクリアしました。\n設定画面で正しいプロジェクトIDを設定してください。",
                        "ERROR",
                    );
                });
                if (!sessionHook.project || !sessionHook.workItems) {
                    await appMessageDialogRef.showMessageAsync(
                        "データ取得エラー",
                        "TimeTrackerからプロジェクト情報を取得できませんでした。",
                        "ERROR",
                    );
                    return;
                }
            }

            // Step 4: 履歴の更新（WorkItem一覧でチェック）
            const { project, workItems } = sessionHook;
            const historyManager = new HistoryManager();
            historyManager.load();
            historyManager.checkWorkItemId(workItems);
            historyManager.dump();

            // Step 5: チェック済みデータのフィルタリング
            let newPdf;
            if (pdf && scheduleTableItems) {
                const enableKeys = scheduleTableItems.filter((s) => s.checked).map((s) => s.key);
                const enable = pdf.schedule.filter((s) => enableKeys.includes(ScheduleUtils.getText(s)));
                if (enable && enable.length > 0) {
                    newPdf = {
                        ...pdf,
                        schedule: enable,
                    };
                }
            }
            let newIcs;
            if (ics && eventTableItems) {
                const enableKeys = eventTableItems.filter((e) => e.checked).map((e) => e.key);
                const enable = ics.event.filter((e) => enableKeys.includes(EventUtils.getKey(e)));
                if (enable && enable.length > 0) {
                    newIcs = {
                        ...ics,
                        event: enable,
                    };
                }
            }

            // Step 6: データ送信
            if (newPdf || newIcs) {
                onSubmit({
                    pdf: newPdf,
                    ics: newIcs,
                    project,
                    workItems,
                    password: sessionHook.password || undefined, // Phase 7: パスワードを追加
                });
            }
        } catch (error) {
            logger.error("Error in handleLinkedClick:", error);
            await appMessageDialogRef.showMessageAsync(
                "処理エラー",
                error instanceof Error ? error.message : "不明なエラーが発生しました。",
                "ERROR",
            );
        }
    };

    // PDFデータが変更されたらテーブルデータを更新
    useEffect(() => {
        if (pdf?.schedule && pdf.schedule.length > 0) {
            setScheduleTableItems(scheduleToCheckItem(pdf.schedule));
        } else {
            setScheduleTableItems([]);
        }
    }, [pdf]);

    // ICSデータが変更されたらテーブルデータを更新
    useEffect(() => {
        if (ics?.event && ics.event.length > 0) {
            setEventTableItems(eventToCheckItem(ics.event));
        } else {
            setEventTableItems([]);
        }
    }, [ics]);

    return (
        <>
            <div className={styles.uploadSection}>
                {/* PDF Upload Card */}
                <div
                    className={styles.dropZone}
                    onDrop={pdfHandlers.onDrop}
                    onDragOver={handleDragOver}
                    onClick={() => pdfInputRef.current?.click()}
                >
                    <Card hoverable>
                        <div className={styles.uploadCardContent}>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={pdfHandlers.onChange}
                                className={styles.hiddenInput}
                            />
                            <div className={styles.uploadCardHeader}>
                                <div className={styles.uploadCardInner}>
                                    <div className={styles.uploadCardTitle}>
                                        <Document24Regular className={styles.uploadCardIcon} />
                                        勤怠情報（PDF）
                                    </div>
                                    <div className={styles.uploadCardDescription}>勤務実績データを含むPDFファイル</div>
                                    <div className={`${styles.dropHint} drop-hint`}>
                                        <ArrowUpload20Regular className={styles.dropIcon} />
                                        <span>クリックまたはドラッグ&ドロップ</span>
                                    </div>
                                </div>
                                {pdf && (
                                    <Button
                                        appearance="subtle"
                                        icon={<Dismiss24Regular />}
                                        onClick={clearPdfFile}
                                        size="medium"
                                        aria-label="PDFファイルを削除"
                                        title="PDFファイルを削除"
                                    />
                                )}
                            </div>
                            {pdf && (
                                <div className={styles.fileInfo}>
                                    <div>
                                        <strong>ファイル名:</strong> {pdf.name}
                                    </div>
                                    <div>
                                        <strong>サイズ:</strong> {(pdf.size / 1024).toFixed(2)} KB
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* ICS Upload Card */}
                <div
                    className={styles.dropZone}
                    onDrop={icsHandlers.onDrop}
                    onDragOver={handleDragOver}
                    onClick={() => icsInputRef.current?.click()}
                >
                    <Card hoverable>
                        <div className={styles.uploadCardContent}>
                            <input
                                ref={icsInputRef}
                                type="file"
                                accept=".ics"
                                onChange={icsHandlers.onChange}
                                className={styles.hiddenInput}
                            />
                            <div className={styles.uploadCardHeader}>
                                <div className={styles.uploadCardInner}>
                                    <div className={styles.uploadCardTitle}>
                                        <Calendar24Regular className={styles.uploadCardIcon} />
                                        スケジュール情報（ICS）
                                    </div>
                                    <div className={styles.uploadCardDescription}>
                                        カレンダーイベントを含むICSファイル
                                    </div>
                                    <div className={`${styles.dropHint} drop-hint`}>
                                        <ArrowUpload20Regular className={styles.dropIcon} />
                                        <span>クリックまたはドラッグ&ドロップ</span>
                                    </div>
                                </div>
                                {ics && (
                                    <Button
                                        appearance="subtle"
                                        icon={<Dismiss24Regular />}
                                        onClick={clearIcsFile}
                                        size="medium"
                                        aria-label="ICSファイルを削除"
                                        title="ICSファイルを削除"
                                    />
                                )}
                            </div>
                            {ics && (
                                <div className={styles.fileInfo}>
                                    <div>
                                        <strong>ファイル名:</strong> {ics.name}
                                    </div>
                                    <div>
                                        <strong>サイズ:</strong> {(ics.size / 1024).toFixed(2)} KB
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Action Section */}
            <div className={styles.actionSection}>
                <div className={styles.infoSectionContainer}>
                    {/* 処理対象日時 */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionHeader}>
                            📋 処理対象日時
                            <Popover withArrow positioning="above-start">
                                <PopoverTrigger disableButtonEnhancement>
                                    <QuestionCircle20Regular className={styles.helpIcon} />
                                </PopoverTrigger>
                                <PopoverSurface>
                                    <div className={styles.popoverContent}>
                                        <strong>📋 処理対象日時について</strong>
                                        <br />
                                        <br />
                                        勤怠PDFファイルから読み取った勤務実績の日時情報です。
                                        <br />
                                        <br />
                                        <strong>重要:</strong>
                                        <br />
                                        • チェックを外した項目は処理対象から除外されます
                                        <br />• <strong>勤務情報に含まれない日付</strong>
                                        のカレンダーイベントは自動的に削除されます
                                        <br />
                                        • 実際に出勤した日のみが登録対象となります
                                        <br />
                                        <br />
                                        <strong>例:</strong>
                                        <br />
                                        勤務情報: 10/1, 10/2, 10/4
                                        <br />
                                        カレンダー: 10/1（会議）, 10/3（会議）
                                        <br />→ 10/3の会議は削除されます
                                    </div>
                                </PopoverSurface>
                            </Popover>
                        </div>
                        {scheduleTableItems.length > 0 && (
                            <CheckedTable items={scheduleTableItems} onItemUpdate={setScheduleTableItems} />
                        )}
                    </div>

                    {/* スケジュール情報 */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionHeader}>
                            📅 スケジュール情報
                            <Popover withArrow positioning="above-start">
                                <PopoverTrigger disableButtonEnhancement>
                                    <QuestionCircle20Regular className={styles.helpIcon} />
                                </PopoverTrigger>
                                <PopoverSurface>
                                    <div className={styles.popoverContent}>
                                        <strong>📅 スケジュール情報について</strong>
                                        <br />
                                        <br />
                                        ICSファイルから読み取ったカレンダーイベント情報です。
                                        <br />
                                        <br />
                                        <strong>処理方法:</strong>
                                        <br />
                                        • チェックを外した項目は紐づけ処理から除外されます
                                        <br />
                                        • 勤務情報（PDF）に対応する日付のみ処理されます
                                        <br />
                                        • 勤務情報の日付範囲外のイベントは自動削除されます
                                        <br />
                                        <br />
                                        <strong>自動削除される例:</strong>
                                        <br />
                                        • 休日のイベント（勤務情報に含まれない日）
                                        <br />
                                        • 勤務期間外のイベント
                                        <br />• 有給休暇日のイベント（別途処理）
                                    </div>
                                </PopoverSurface>
                            </Popover>
                        </div>
                        {eventTableItems.length > 0 && (
                            <CheckedTable items={eventTableItems} onItemUpdate={setEventTableItems} />
                        )}
                    </div>
                </div>
                <InteractiveCard
                    title="紐づけ開始"
                    description="アップロードしたファイルを基に勤怠情報とスケジュールを紐づけます"
                    variant="action"
                    disabled={!canProcess}
                    onClick={handleLinkedClick}
                    icon={<Link24Regular />}
                />
            </div>
            <PasswordInputDialog
                open={sessionHook.isPasswordDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        sessionHook.clearError();
                    }
                }}
                onSubmit={sessionHook.authenticateWithPassword}
                baseUrl={timeTrackerSettings?.baseUrl || ""}
                userName={timeTrackerSettings?.userName || ""}
            />
        </>
    );
}
