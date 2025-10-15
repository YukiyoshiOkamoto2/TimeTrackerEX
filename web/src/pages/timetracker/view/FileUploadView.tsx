import { Card, InteractiveCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import { parseICS } from "@/core/ics";
import { parsePDF } from "@/core/pdf";
import { getLogger } from "@/lib";
import { formatDateTime } from "@/lib/dateUtil";
import { Event, EventUtils, Schedule, ScheduleUtils } from "@/types";
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
import { UploadInfo } from "../models";

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

// ファイルバリデータ
const isPdfFile = (file: File) => file.type === "application/pdf";
const isIcsFile = (file: File) => file.name.endsWith(".ics") || file.type === "text/calendar";

// イベントキー生成（メモ化用）
const getEventKey = (e: Event): string => {
    const dateTime = formatDateTime(new Date(e.schedule.start), e.schedule.end ? new Date(e.schedule.end) : null);
    return `${dateTime}　${EventUtils.getKey(e)}`;
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

// スケジュールをテーブルアイテムに変換（パフォーマンス最適化）
const scheduleToCheckItem = (schedule: Schedule[]): CheckedTableItem[] => {
    return schedule.map((s) => {
        const dateTime = formatDateTime(new Date(s.start), s.end ? new Date(s.end) : null);
        let status = "";
        if (s.isHoliday) {
            status = s.isPaidLeave ? "（有給休暇）" : "（休日）";
        }
        return {
            key: ScheduleUtils.getText(s),
            content: status ? `${dateTime} ${status}` : dateTime,
        };
    });
};

// イベントをテーブルアイテムに変換（重複計算を削減）
const eventToCheckItem = (event: Event[]): CheckedTableItem[] => {
    return event.map((e) => {
        const dateTime = formatDateTime(new Date(e.schedule.start), e.schedule.end ? new Date(e.schedule.end) : null);
        return {
            key: getEventKey(e),
            content: `${dateTime}　${e.name}`,
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

type SelectedInfo = {
    schedules: Schedule[]
    events: Event[]
}

export type FileUploadViewProps = {
    uploadInfo?: UploadInfo,
    onChangeUploadInfo: (info: UploadInfo) => void;
    onLinking: (info: SelectedInfo) => void;
};

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
    uploadInfo,
    onChangeUploadInfo,
    onLinking,
}: FileUploadViewProps) {
    const styles = useStyles();
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const icsInputRef = useRef<HTMLInputElement>(null);

    const pdf = uploadInfo?.pdf;
    const ics = uploadInfo?.ics;

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
            onChangeUploadInfo({
                ...uploadInfo,
                pdf: undefined,
            });
        },
        [uploadInfo, onChangeUploadInfo],
    );

    const clearIcsFile = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            if (icsInputRef.current) icsInputRef.current.value = "";
            onChangeUploadInfo({
                ...uploadInfo,
                ics: undefined,
            });
        },
        [uploadInfo, onChangeUploadInfo],
    );

    // PDFファイルアップロード処理（メモ化）
    const uploadPdfFile = useCallback(
        async (file: File) => {
            const schedule = await getScheduleAsync(file);
            if (schedule) {
                onChangeUploadInfo({
                    ...uploadInfo,
                    pdf: {
                        schedule,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                    },
                });
            } else {
                clearPdfFile();
            }
        },
        [uploadInfo, onChangeUploadInfo, clearPdfFile],
    );

    // ICSファイルアップロード処理（メモ化）
    const uploadIcsFile = useCallback(
        async (file: File) => {
            const event = await getEventAsync(file);
            if (event) {
                onChangeUploadInfo({
                    ...uploadInfo,
                    ics: {
                        event,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                    },
                });
            } else {
                clearIcsFile();
            }
        },
        [uploadInfo, onChangeUploadInfo, clearIcsFile],
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

    const handleLinkedClick = useCallback(async () => {
        let enabledSchedule: Schedule[] = [];
        if (pdf && scheduleTableItems.length > 0) {
            enabledSchedule = pdf.schedule.filter((s) => selectedScheduleKeys.has(ScheduleUtils.getText(s)));
        }

        let enabledEvents: Event[] = [];
        if (ics && eventTableItems.length > 0) {
            enabledEvents = ics.event.filter((e) => selectedEventKeys.has(getEventKey(e)));
        }

        onLinking({
            schedules: enabledSchedule,
            events: enabledEvents,
        });
    }, [pdf, ics, onLinking, scheduleTableItems.length, selectedScheduleKeys, eventTableItems.length, selectedEventKeys])

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
        </>
    );
});
