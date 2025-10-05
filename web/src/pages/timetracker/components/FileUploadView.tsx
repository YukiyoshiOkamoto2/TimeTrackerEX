import { Button, makeStyles, tokens } from "@fluentui/react-components";
import {
    ArrowUpload20Regular,
    Calendar24Regular,
    Dismiss24Regular,
    Document24Regular,
    Link24Regular,
} from "@fluentui/react-icons";
import { useRef } from "react";
import { ActionButton } from "../../../components/action-button";
import { Card } from "../../../components/card";
import { Schedule, Event } from "@/types";
import { parsePDF } from "@/core/pdf";
import { parseICS } from "@/core/ics";
import { getLogger } from "@/lib";

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
    },
    infoSectionHeader: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
    },
    infoCard: {
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL,
        paddingLeft: tokens.spacingHorizontalXL,
        paddingRight: tokens.spacingHorizontalXL,
    },
    infoList: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
        listStyle: "none",
        margin: "0",
        padding: "0",
    },
    infoListItem: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground1,
        lineHeight: tokens.lineHeightBase300,
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

    const onPdfUpload = async (file: File) => {
        try {
            const result = await parsePDF(file);
            const pdfData: PDF = {
                schedule: result.schedule,
                name: file.name,
                size: file.size,
                type: file.type,
            };
            onPdfUpdate(pdfData);
        } catch (error) {
            logger.error("PDFのパースに失敗しました:", error);
        }
    };

    const onIcsUpload = async (file: File) => {
        try {
            const text = await file.text();
            const result = parseICS(text);
            const icsData: ICS = {
                event: result.events,
                name: file.name,
                size: file.size,
                type: file.type,
            };
            onIcsUpdate(icsData);
        } catch (error) {
            logger.error("ICSのパースに失敗しました:", error);
        }
    };

    const onPdfClear = () => {
        onPdfUpdate(undefined);
    };

    const onIcsClear = () => {
        onIcsUpdate(undefined);
    };

    const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onPdfUpload(file);
        }
    };

    const handleIcsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.name.endsWith(".ics") || file.type === "text/calendar")) {
            onIcsUpload(file);
        }
    };

    const handlePdfDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file && file.type === "application/pdf") {
            onPdfUpload(file);
        }
    };

    const handleIcsDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file && (file.name.endsWith(".ics") || file.type === "text/calendar")) {
            onIcsUpload(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handlePdfCardClick = () => {
        pdfInputRef.current?.click();
    };

    const handleIcsCardClick = () => {
        icsInputRef.current?.click();
    };

    const handleClearPdf = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPdfClear();
        if (pdfInputRef.current) {
            pdfInputRef.current.value = "";
        }
    };

    const handleClearIcs = (e: React.MouseEvent) => {
        e.stopPropagation();
        onIcsClear();
        if (icsInputRef.current) {
            icsInputRef.current.value = "";
        }
    };

    const canProcess = pdf !== undefined || ics !== undefined;
    return (
        <>
            <div className={styles.uploadSection}>
                {/* PDF Upload Card */}
                <div
                    className={styles.dropZone}
                    onDrop={handlePdfDrop}
                    onDragOver={handleDragOver}
                    onClick={handlePdfCardClick}
                >
                    <Card hoverable>
                        <div className={styles.uploadCardContent}>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfChange}
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
                                        onClick={handleClearPdf}
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
                    onDrop={handleIcsDrop}
                    onDragOver={handleDragOver}
                    onClick={handleIcsCardClick}
                >
                    <Card hoverable>
                        <div className={styles.uploadCardContent}>
                            <input
                                ref={icsInputRef}
                                type="file"
                                accept=".ics"
                                onChange={handleIcsChange}
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
                                        onClick={handleClearIcs}
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
                        {pdf && (
                            <Card className={styles.infoCard}>
                                <ul className={styles.infoList}>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                    <li className={styles.infoListItem}>2025年7月10日　10:00～18:00</li>
                                </ul>
                            </Card>
                        )}
                    </div>

                    {/* スケジュール情報 */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionHeader}>📅 スケジュール情報</div>
                        {ics && (
                            <Card className={styles.infoCard}>
                                <ul className={styles.infoList}>
                                    <li className={styles.infoListItem}>勤務時間内スケジュール: 59件</li>
                                    <li className={styles.infoListItem}>重複スケジュール: 10件</li>
                                </ul>
                            </Card>
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
