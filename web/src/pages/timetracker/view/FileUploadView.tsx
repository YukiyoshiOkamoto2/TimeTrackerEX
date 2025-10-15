import { Card, InteractiveCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import { HistoryManager } from "@/core/history";
import { parseICS } from "@/core/ics";
import { parsePDF } from "@/core/pdf";
import { getLogger } from "@/lib";
import { formatDateTime } from "@/lib/dateUtil";
import { useSettings } from "@/store/settings/SettingsProvider";
import { Event, Schedule, ScheduleUtils, WorkItem } from "@/types";
import {
    Button,
    createTableColumn,
    makeStyles,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    TableCellLayout,
    tokens,
} from "@fluentui/react-components";
import {
    ArrowUpload20Regular,
    Calendar24Regular,
    Dismiss24Regular,
    Document24Regular,
    Link24Regular,
    QuestionCircle20Regular,
} from "@fluentui/react-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectAndWorkItem, useTimeTrackerSession } from "../hooks/useTimeTrackerSession";
import { ICS, PDF, UploadInfo } from "../models";
import { validateAndCleanupSettings } from "../services/validate";

// CheckedTableItemの型定義
type CheckedTableItem = {
    key: string;
    content: string;
};

// ============================================================================
// メモ化サブコンポーネント
// ============================================================================

/** テーブルセルコンポーネント（メモ化） */
const TableContentCell = memo(function TableContentCell({ content }: { content: string }) {
    return <TableCellLayout>{content}</TableCellLayout>;
});

/** ファイル情報表示コンポーネント（メモ化） */
// テーブル列定義（共通）
const tableColumns = [
    createTableColumn<CheckedTableItem>({
        columnId: "content",
        renderHeaderCell: () => "日付情報",
        renderCell: (item) => <TableContentCell content={item.content} />,
    }),
];

const columnSizingOptions = {
    content: { minWidth: 300, idealWidth: 520 },
};

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
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
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
        overflow: "hidden",
    },
    tableWrapper: {
        flex: 1,
        overflow: "auto",
        maxHeight: "calc(100vh - 480px)",
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
    setIsLoading: (isLoading: boolean) => void;
    onSubmit: (info: UploadInfo) => void;
};

// ファイルバリデータ
const isPdfFile = (file: File) => file.type === "application/pdf";
const isIcsFile = (file: File) => file.name.endsWith(".ics") || file.type === "text/calendar";

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

// イベントキー生成（メモ化用）
const getEventKey = (e: Event): string => {
    const dateTime = formatDateTime(new Date(e.schedule.start), e.schedule.end ? new Date(e.schedule.end) : null);
    return `${dateTime}　${e.name}`;
};

// スケジュールステータスを取得
const getScheduleStatus = (s: Schedule): string => {
    if (!s.isHoliday) return "";
    return s.isPaidLeave ? "（有給休暇）" : "（休日）";
};

// スケジュールをテーブルアイテムに変換（パフォーマンス最適化）
const scheduleToCheckItem = (schedule: Schedule[]): CheckedTableItem[] => {
    return schedule.map((s) => {
        const dateTime = formatDateTime(new Date(s.start), s.end ? new Date(s.end) : null);
        const status = getScheduleStatus(s);

        return {
            key: ScheduleUtils.getText(s),
            content: status ? `${dateTime} ${status}` : dateTime,
        };
    });
};

// イベントをテーブルアイテムに変換（重複計算を削減）
const eventToCheckItem = (event: Event[]): CheckedTableItem[] => {
    return event.map((e) => {
        const key = getEventKey(e);
        return {
            key,
            content: key,
        };
    });
};

// ヘルプコンテンツ（共通）
const helpContent = (
    <>
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
    </>
);

/** 情報セクションコンポーネント（メモ化） */
const InfoSection = memo(function InfoSection({
    title,
    items,
    selectedKeys,
    onSelectionChange,
    styles,
}: {
    title: string;
    items: CheckedTableItem[];
    selectedKeys: Set<string>;
    onSelectionChange: (keys: Set<string>) => void;
    styles: ReturnType<typeof useStyles>;
}) {
    return (
        <div className={styles.infoSection}>
            <div className={styles.infoSectionHeader}>
                {title}
                <Popover withArrow positioning="above-start">
                    <PopoverTrigger disableButtonEnhancement>
                        <QuestionCircle20Regular className={styles.helpIcon} />
                    </PopoverTrigger>
                    <PopoverSurface>
                        <div className={styles.popoverContent}>{helpContent}</div>
                    </PopoverSurface>
                </Popover>
            </div>
            {items.length > 0 && (
                <div className={styles.tableWrapper}>
                    <DataTable
                        items={items}
                        columns={tableColumns}
                        getRowId={(item) => item.key}
                        selectable
                        columnSizingOptions={columnSizingOptions}
                        selectedKeys={selectedKeys}
                        onSelectionChange={onSelectionChange}
                    />
                </div>
            )}
        </div>
    );
});

/**
 * ファイルアップロードビューコンポーネント
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - InfoSectionコンポーネントを分離してメモ化
 * - すべてのハンドラーをuseCallbackでメモ化
 * - 計算値をuseMemoで最適化
 */
export const FileUploadView = memo(function FileUploadView({
    pdf,
    ics,
    onPdfUpdate,
    onIcsUpdate,
    setIsLoading,
    onSubmit,
}: FileUploadViewProps) {
    const styles = useStyles();
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const icsInputRef = useRef<HTMLInputElement>(null);

    // 設定を取得
    const { settings, updateSettings } = useSettings();
    const timeTrackerSettings = settings.timetracker!;

    // セッション管理（メモ化）
    const sessionConfig = useMemo(
        () => ({
            baseUrl: timeTrackerSettings?.baseUrl || "",
            userName: timeTrackerSettings?.userName || "",
        }),
        [timeTrackerSettings?.baseUrl, timeTrackerSettings?.userName],
    );

    const { Dialog, isAuthenticated, ...sessionHook } = useTimeTrackerSession(sessionConfig);

    // テーブルデータの状態管理
    const [scheduleTableItems, setScheduleTableItems] = useState<CheckedTableItem[]>([]);
    const [eventTableItems, setEventTableItems] = useState<CheckedTableItem[]>([]);
    const [selectedScheduleKeys, setSelectedScheduleKeys] = useState<Set<string>>(new Set());
    const [selectedEventKeys, setSelectedEventKeys] = useState<Set<string>>(new Set());

    // 処理可能かどうかを判定（メモ化）
    const canProcess = useMemo(
        () => selectedScheduleKeys.size > 0 || selectedEventKeys.size > 0,
        [selectedScheduleKeys.size, selectedEventKeys.size],
    );

    // ファイルクリア処理（メモ化）
    const clearPdfFile = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            if (pdfInputRef.current) pdfInputRef.current.value = "";
            onPdfUpdate(undefined);
        },
        [onPdfUpdate],
    );

    const clearIcsFile = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            if (icsInputRef.current) icsInputRef.current.value = "";
            onIcsUpdate(undefined);
        },
        [onIcsUpdate],
    );

    // PDFファイルアップロード処理（メモ化）
    const uploadPdfFile = useCallback(
        async (file: File) => {
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
        },
        [onPdfUpdate, clearPdfFile],
    );

    // ICSファイルアップロード処理（メモ化）
    const uploadIcsFile = useCallback(
        async (file: File) => {
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
        },
        [onIcsUpdate, clearIcsFile],
    );

    // ドラッグオーバーハンドラー（メモ化）
    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    // PDFファイルハンドラー（メモ化）
    const pdfHandlers = useMemo(
        () => ({
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (file && isPdfFile(file)) uploadPdfFile(file);
            },
            onDrop: (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.stopPropagation();
                const file = event.dataTransfer.files?.[0];
                if (file && isPdfFile(file)) uploadPdfFile(file);
            },
        }),
        [uploadPdfFile],
    );

    // ICSファイルハンドラー（メモ化）
    const icsHandlers = useMemo(
        () => ({
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (file && isIcsFile(file)) uploadIcsFile(file);
            },
            onDrop: (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.stopPropagation();
                const file = event.dataTransfer.files?.[0];
                if (file && isIcsFile(file)) uploadIcsFile(file);
            },
        }),
        [uploadIcsFile],
    );

    // プロジェクト情報取得（メモ化）
    const fetchProjectData = useCallback(
        async (projectId: string): Promise<ProjectAndWorkItem | undefined> => {
            const result = await sessionHook.fetchProjectAndWorkItemsAsync(projectId, async () => {
                // プロジェクトID取得失敗時は設定をクリア
                if (timeTrackerSettings) {
                    updateSettings({
                        timetracker: {
                            ...timeTrackerSettings,
                            baseProjectId: -1,
                        },
                    });
                }
                await appMessageDialogRef.showMessageAsync(
                    "設定エラー",
                    `プロジェクトID ( ${projectId} ) が無効なため設定をクリアしました。\n設定画面で正しいプロジェクトIDを設定してください。`,
                    "ERROR",
                );
            });

            if (result.isError) {
                await appMessageDialogRef.showMessageAsync("TimeTrackerデータ取得エラー", result.errorMessage, "ERROR");
                return;
            }

            return result.content;
        },
        [sessionHook, timeTrackerSettings, updateSettings],
    );

    // 履歴管理の更新（メモ化）
    const updateHistory = useCallback((workItems: WorkItem[]) => {
        const historyManager = new HistoryManager();
        historyManager.load();
        historyManager.checkWorkItemId(workItems);
        historyManager.dump();
    }, []);

    // 選択済みスケジュールのフィルタリング（メモ化）
    const filterSelectedSchedule = useCallback((): PDF | undefined => {
        if (!pdf || scheduleTableItems.length === 0) return undefined;

        const enabledSchedule = pdf.schedule.filter((s) => selectedScheduleKeys.has(ScheduleUtils.getText(s)));

        return enabledSchedule.length > 0 ? { ...pdf, schedule: enabledSchedule } : undefined;
    }, [pdf, scheduleTableItems.length, selectedScheduleKeys]);

    // 選択済みイベントのフィルタリング（メモ化）
    const filterSelectedEvents = useCallback((): ICS | undefined => {
        if (!ics || eventTableItems.length === 0) return undefined;

        const enabledEvents = ics.event.filter((e) => selectedEventKeys.has(getEventKey(e)));

        return enabledEvents.length > 0 ? { ...ics, event: enabledEvents } : undefined;
    }, [ics, eventTableItems.length, selectedEventKeys]);

    // 紐づけ開始処理（メモ化）
    const handleLinkedClick = useCallback(async () => {
        setIsLoading(true);
        try {
            // 認証チェック
            if (!isAuthenticated) {
                const authResult = await sessionHook.authenticateAsync();
                if (authResult.isError) {
                    await appMessageDialogRef.showMessageAsync(
                        "認証エラー",
                        "TimeTrackerの認証に失敗しました。",
                        "ERROR",
                    );
                    return;
                }
            }

            // プロジェクト情報取得
            const itemResult = await fetchProjectData(String(timeTrackerSettings.baseProjectId));
            if (!itemResult) {
                return;
            }

            // 履歴の更新
            updateHistory(itemResult.workItems);

            // 設定の検証とクリーンアップ
            const cleanResult = validateAndCleanupSettings(timeTrackerSettings, itemResult.workItems);
            if (cleanResult.items.length > 0) {
                await appMessageDialogRef.showMessageAsync(
                    "設定エラー",
                    `設定項目に不正なIDが存在します。削除します。（ ${cleanResult.items.length}件 ）\n\n` +
                        cleanResult.items.map((i) => "・ " + i).join("\n"),
                    "ERROR",
                );
                updateSettings({
                    timetracker: cleanResult.settings,
                });
                return;
            }

            // 選択済みデータのフィルタリング
            const filteredPdf = filterSelectedSchedule();
            const filteredIcs = filterSelectedEvents();

            // データ送信
            if (filteredPdf || filteredIcs) {
                onSubmit({
                    pdf: filteredPdf,
                    ics: filteredIcs,
                    project: itemResult.project,
                    workItems: itemResult.workItems,
                });
            }
        } catch (error) {
            logger.error("Error in handleLinkedClick:", error);
            await appMessageDialogRef.showMessageAsync(
                "処理エラー",
                error instanceof Error ? error.message : "不明なエラーが発生しました。",
                "ERROR",
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        isAuthenticated,
        sessionHook,
        timeTrackerSettings,
        fetchProjectData,
        updateHistory,
        updateSettings,
        filterSelectedSchedule,
        filterSelectedEvents,
        onSubmit,
        setIsLoading,
    ]);

    // PDFデータが変更されたらテーブルデータを更新（最適化）
    useEffect(() => {
        if (pdf?.schedule && pdf.schedule.length > 0) {
            const items = scheduleToCheckItem(pdf.schedule);
            setScheduleTableItems(items);
            // デフォルトで全選択（パフォーマンス改善：直接Setを作成）
            const keys = new Set(items.map((item) => item.key));
            setSelectedScheduleKeys(keys);
        } else {
            setScheduleTableItems([]);
            setSelectedScheduleKeys(new Set());
        }
    }, [pdf?.schedule]);

    // ICSデータが変更されたらテーブルデータを更新（最適化）
    useEffect(() => {
        if (ics?.event && ics.event.length > 0) {
            const items = eventToCheckItem(ics.event);
            setEventTableItems(items);
            // デフォルトで全選択（パフォーマンス改善：直接Setを作成）
            const keys = new Set(items.map((item) => item.key));
            setSelectedEventKeys(keys);
        } else {
            setEventTableItems([]);
            setSelectedEventKeys(new Set());
        }
    }, [ics?.event]);

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
                    <InfoSection
                        title="📋 処理対象日時"
                        items={scheduleTableItems}
                        selectedKeys={selectedScheduleKeys}
                        onSelectionChange={setSelectedScheduleKeys}
                        styles={styles}
                    />

                    {/* スケジュール情報 */}
                    <InfoSection
                        title="📅 スケジュール情報"
                        items={eventTableItems}
                        selectedKeys={selectedEventKeys}
                        onSelectionChange={setSelectedEventKeys}
                        styles={styles}
                    />
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
            <Dialog />
        </>
    );
});
