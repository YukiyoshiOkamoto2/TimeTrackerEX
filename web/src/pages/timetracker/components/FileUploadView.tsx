import {
    Button,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    ArrowUpload20Regular,
    Calendar24Regular,
    Dismiss24Regular,
    Document24Regular,
    Link24Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { ActionButton } from "../../../components/action-button";
import { Card } from "../../../components/card";
import { Schedule, Event } from "@/types";
import { parsePDF } from "@/core/pdf";
import { parseICS } from "@/core/ics";
import { getLogger } from "@/lib";
import { appMessageDialogRef } from "@/components/message-dialog";
import { CheckedTable, CheckedTableItem } from "./CheckedTable";

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
        paddingTop: tokens.spacingVerticalXXXL,
        marginTop: tokens.spacingVerticalXS,
        gap: tokens.spacingVerticalXXL,
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
        maxHeight: "320px",
    },
    infoSectionHeader: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    hiddenInput: {
        display: "none",
    },
});

export type FileData = {
    name: string;
    size: number;
    type: string;
};

export type PDF = {
    schedule: Schedule[]
} & FileData

export type ICS = {
    event: Event[]
} & FileData

export type FileUploadViewProps = {
    pdf?: PDF;
    ics?: ICS;
    onPdfUpdate: (pdf?: PDF) => void;
    onIcsUpdate: (ics?: ICS) => void;
    onProcess: () => void;
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
            "ERROR"
        );
        return undefined;
    }

    if (result.errorMessage) {
        await appMessageDialogRef?.showMessageAsync(
            "PDFファイルエラー",
            `PDFファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${result.errorMessage}`,
            "ERROR"
        );

        return undefined;
    }

    return result.schedule.filter(s => !s.errorMessage)
}

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
            "ERROR"
        );
        return undefined;
    }

    if (result.errorMessages) {
        await appMessageDialogRef?.showMessageAsync(
            "ICSファイルエラー",
            `ICSファイルの読み込みに失敗しました。\n\nファイル名: ${file.name}\nエラー: ${result.errorMessages}`,
            "ERROR"
        );
        return undefined;
    }

    return result.events.filter(e => !e.isCancelled && !e.isPrivate)
}

export function FileUploadView({
    pdf,
    ics,
    onPdfUpdate,
    onIcsUpdate,
    onProcess,
}: FileUploadViewProps) {
    const styles = useStyles();
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const icsInputRef = useRef<HTMLInputElement>(null);

    // テーブルデータの状態管理
    const [scheduleTableItems, setScheduleTableItems] = useState<CheckedTableItem[]>([]);
    const [eventTableItems, setEventTableItems] = useState<CheckedTableItem[]>([]);

    // PDFファイルアップロード処理
    const uploadPdfFile = async (file: File) => {
        const schedule = await getScheduleAsync(file);
        if (schedule) {
            onPdfUpdate({
                schedule,
                ...file
            })
        }
    };

    // ICSファイルアップロード処理
    const uploadIcsFile = async (file: File) => {
        const event = await getEventAsync(file);
        if (event) {
            onIcsUpdate({
                event,
                ...file
            });
        }
    };

    // 汎用イベントハンドラー
    const createFileHandler = (
        uploadFn: (file: File) => Promise<void>,
        validator: (file: File) => boolean
    ) => ({
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
        onClick: (ref: React.RefObject<HTMLInputElement>) => () => ref.current?.click(),
        onClear: (ref: React.RefObject<HTMLInputElement>, clearFn: () => void) => (e: React.MouseEvent) => {
            e.stopPropagation();
            clearFn();
            if (ref.current) ref.current.value = "";
        },
    });

    const pdfHandlers = createFileHandler(uploadPdfFile, isPdfFile);
    const icsHandlers = createFileHandler(uploadIcsFile, isIcsFile);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const canProcess = pdf !== undefined || ics !== undefined;

    // PDFデータが変更されたらテーブルデータを更新
    useEffect(() => {
        if (pdf?.schedule && pdf.schedule.length > 0) {
            const items: CheckedTableItem[] = pdf.schedule.map((schedule) => {
                const { dateStr, timeStr } = formatDateTime(
                    new Date(schedule.start),
                    schedule.end ? new Date(schedule.end) : null
                );

                const status = schedule.isHoliday
                    ? schedule.isPaidLeave
                        ? "（有給休暇）"
                        : "（休日）"
                    : "";

                return {
                    content: `${dateStr}　${timeStr} ${status}`,
                    checked: true,
                };
            });
            setScheduleTableItems(items);
        } else {
            setScheduleTableItems([]);
        }
    }, [pdf]);

    // ICSデータが変更されたらテーブルデータを更新
    useEffect(() => {
        if (ics?.event && ics.event.length > 0) {
            const items: CheckedTableItem[] = ics.event.map((event) => {
                const { dateStr, timeStr } = formatDateTime(
                    new Date(event.schedule.start),
                    event.schedule.end ? new Date(event.schedule.end) : null
                );

                return {
                    content: `${dateStr}　${timeStr}　${event.name}`,
                    checked: true,
                };
            });
            setEventTableItems(items);
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
                    onClick={pdfHandlers.onClick(pdfInputRef)}
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
                                        onClick={pdfHandlers.onClear(pdfInputRef, () => onPdfUpdate(undefined))}
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
                    onClick={icsHandlers.onClick(icsInputRef)}
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
                                        onClick={icsHandlers.onClear(icsInputRef, () => onIcsUpdate(undefined))}
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
                        <div className={styles.infoSectionHeader}>📋 処理対象日時</div>
                        {scheduleTableItems.length > 0 && (
                            <CheckedTable items={scheduleTableItems} onItemUpdate={setScheduleTableItems} />
                        )}
                    </div>

                    {/* スケジュール情報 */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionHeader}>📅 スケジュール情報</div>
                        {eventTableItems.length > 0 && (
                            <CheckedTable items={eventTableItems} onItemUpdate={setEventTableItems} />
                        )}
                    </div>
                </div>
                <ActionButton
                    title="紐づけ開始"
                    description="アップロードしたファイルを基に勤怠情報とスケジュールを紐づけます"
                    disabled={!canProcess}
                    onClick={onProcess}
                    icon={<Link24Regular />}
                />
            </div>
        </>
    );
}
