import { Card, StatCard } from "@/components/card";
import { DataTable } from "@/components/data-table";
import { appMessageDialogRef } from "@/components/message-dialog";
import { PageHeader } from "@/components/page";
import { formatDateTime } from "@/lib/dateUtil";
import { getLogger } from "@/lib/logger";
import type { Event, WorkItem } from "@/types";
import {
    Badge,
    createTableColumn,
    makeStyles,
    mergeClasses,
    SelectTabData,
    SelectTabEvent,
    Tab,
    TableCellLayout,
    TableColumnDefinition,
    TabList,
    tokens,
    Toolbar,
    ToolbarButton,
} from "@fluentui/react-components";
import {
    ArrowDownload24Regular,
    Calendar20Regular,
    CheckmarkCircle24Regular,
    DismissCircle24Regular,
    DocumentBulletList24Regular,
} from "@fluentui/react-icons";
import { memo, useCallback, useMemo, useState } from "react";
import { SectionTitle, ViewHeader, ViewSection } from "../components/ViewLayout";
import { useTableStyles } from "../styles/tableStyles";

const logger = getLogger("CompletionView");

// ==================== 型定義 ====================

/** 登録結果のステータス */
type RegisterStatus = "success" | "error";

/** 登録結果の型 */
export type RegisterResult = {
    /** 登録されたイベント */
    event: Event;
    /** 紐づけられたWorkItem */
    workItem: WorkItem;
    /** 登録ステータス */
    status: RegisterStatus;
    /** エラーメッセージ（status が error の場合） */
    errorMessage?: string;
};

/** タブの種類 */
type TabValue = "success" | "error";

/** テーブル行の型 */
type TableRow = {
    event: Event;
    workItem: WorkItem;
    status: RegisterStatus;
    errorMessage?: string;
};

// ==================== 定数 ====================

/** カラム幅の設定 */
const COLUMN_SIZING_OPTIONS = {
    status: { minWidth: 100, idealWidth: 100 },
    dateTime: { minWidth: 250, idealWidth: 250 },
    eventName: { minWidth: 300, idealWidth: 400 },
    workItemId: { minWidth: 140, idealWidth: 160 },
    workItemName: { minWidth: 250, idealWidth: 400 },
    errorMessage: { minWidth: 300, idealWidth: 500 },
} as const;

// ==================== スタイル定義 ====================

const useStyles = makeStyles({
    completionMessage: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalM,
        marginBottom: tokens.spacingVerticalL,
        padding: "22px",
        backgroundColor: tokens.colorNeutralBackground3,
        borderTopWidth: tokens.strokeWidthThick,
        borderTopStyle: "solid",
        borderTopColor: tokens.colorBrandForeground1,
        borderRadius: tokens.borderRadiusMedium,
        borderBottomWidth: "0",
        borderLeftWidth: "0",
        borderRightWidth: "0",
    },
    completionIcon: {
        fontSize: tokens.fontSizeBase500,
        color: tokens.colorPaletteGreenForeground1,
    },
    completionText: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground1,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: tokens.spacingVerticalL,
        marginBottom: tokens.spacingVerticalS,
    },
    statusBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
    },
    successBadge: {
        backgroundColor: tokens.colorPaletteGreenBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    errorBadge: {
        backgroundColor: tokens.colorPaletteRedBorderActive,
        color: tokens.colorNeutralForegroundOnBrand,
    },
    errorText: {
        color: tokens.colorPaletteRedForeground1,
    },
});

// ==================== Props型定義 ====================

export type CompletionViewProps = {
    /** 登録結果のリスト */
    results: RegisterResult[];
    /** 戻るボタンのハンドラー */
    onBack: (index: 1 | 2) => void;
};

// ==================== ヘルパー関数 ====================

/** テーブル列定義を生成 */
function createResultColumns(
    styles: ReturnType<typeof useStyles>,
    showErrorColumn: boolean,
): TableColumnDefinition<TableRow>[] {
    const columns: TableColumnDefinition<TableRow>[] = [
        createTableColumn<TableRow>({
            columnId: "status",
            compare: (a, b) => a.status.localeCompare(b.status),
            renderHeaderCell: () => "ステータス",
            renderCell: (item) => (
                <TableCellLayout>
                    <span
                        className={`${styles.statusBadge} ${
                            item.status === "success" ? styles.successBadge : styles.errorBadge
                        }`}
                    >
                        {item.status === "success" ? (
                            <>
                                <CheckmarkCircle24Regular />
                                成功
                            </>
                        ) : (
                            <>
                                <DismissCircle24Regular />
                                失敗
                            </>
                        )}
                    </span>
                </TableCellLayout>
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "dateTime",
            compare: (a, b) => a.event.schedule.start.getTime() - b.event.schedule.start.getTime(),
            renderHeaderCell: () => "日時",
            renderCell: (item) => (
                <TableCellLayout>
                    <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS }}>
                        <Calendar20Regular />
                        {formatDateTime(item.event.schedule.start, item.event.schedule.end)}
                    </div>
                </TableCellLayout>
            ),
        }),
        createTableColumn<TableRow>({
            columnId: "eventName",
            compare: (a, b) => a.event.name.localeCompare(b.event.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.event.name}</TableCellLayout>,
        }),
        createTableColumn<TableRow>({
            columnId: "workItemId",
            compare: (a, b) => a.workItem.id.localeCompare(b.workItem.id),
            renderHeaderCell: () => "コード",
            renderCell: (item) => <TableCellLayout>{item.workItem.id}</TableCellLayout>,
        }),
        createTableColumn<TableRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItem.name.localeCompare(b.workItem.name),
            renderHeaderCell: () => "コード名称",
            renderCell: (item) => (
                <TableCellLayout>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ fontWeight: tokens.fontWeightSemibold }}>{item.workItem.name}</div>
                        {item.workItem.folderPath && (
                            <div
                                style={{
                                    fontSize: tokens.fontSizeBase200,
                                    color: tokens.colorNeutralForeground3,
                                }}
                            >
                                {item.workItem.folderPath}
                            </div>
                        )}
                    </div>
                </TableCellLayout>
            ),
        }),
    ];

    if (showErrorColumn) {
        columns.push(
            createTableColumn<TableRow>({
                columnId: "errorMessage",
                compare: (a, b) => (a.errorMessage || "").localeCompare(b.errorMessage || ""),
                renderHeaderCell: () => "エラー内容",
                renderCell: (item) => (
                    <TableCellLayout>
                        <div className={styles.errorText}>{item.errorMessage || "-"}</div>
                    </TableCellLayout>
                ),
            }),
        );
    }

    return columns;
}

// ==================== メインコンポーネント ====================

/**
 * 登録完了ビューコンポーネント
 *
 * 登録結果を成功/失敗で切り替えて表示し、エクスポート機能を提供する
 */
export const CompletionView = memo(function CompletionView({ results, onBack }: CompletionViewProps) {
    const styles = useStyles();
    const tableStyles = useTableStyles();
    const [selectedTab, setSelectedTab] = useState<TabValue>("success");

    // ==================== 統計情報 ====================

    const successResults = useMemo(() => results.filter((r) => r.status === "success"), [results]);
    const errorResults = useMemo(() => results.filter((r) => r.status === "error"), [results]);
    const successCount = successResults.length;
    const errorCount = errorResults.length;
    const totalCount = results.length;

    // ==================== 表示データ ====================

    const displayResults = useMemo(
        () => (selectedTab === "success" ? successResults : errorResults),
        [selectedTab, successResults, errorResults],
    );

    const tableRows: TableRow[] = useMemo(
        () =>
            displayResults.map((result) => ({
                event: result.event,
                workItem: result.workItem,
                status: result.status,
                errorMessage: result.errorMessage,
            })),
        [displayResults],
    );

    const columns = useMemo(() => createResultColumns(styles, selectedTab === "error"), [styles, selectedTab]);

    // ==================== イベントハンドラー ====================

    const breadcrumbs = ["TimeTracker", "紐づけ処理", "登録完了"];

    const handleBreadcrumbClick = useCallback(
        (index: number) => {
            if (index === 0) {
                onBack(2);
            } else if (index === 1) {
                onBack(1);
            }
        },
        [onBack],
    );

    const handleTabSelect = useCallback((_event: SelectTabEvent, data: SelectTabData) => {
        setSelectedTab(data.value as TabValue);
    }, []);

    /** 成功結果をCSVエクスポート */
    const handleExportSuccessCSV = useCallback(() => {
        logger.info("成功結果 CSV エクスポート開始");

        const csvContent = [
            ["日時（開始）", "日時（終了）", "イベント名", "コード", "コード名称", "フォルダパス"],
            ...successResults.map((result) => [
                result.event.schedule.start.toLocaleString("ja-JP"),
                result.event.schedule.end?.toLocaleString("ja-JP") || "",
                result.event.name,
                result.workItem.id,
                result.workItem.name,
                result.workItem.folderPath,
            ]),
        ]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `timetracker_success_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        logger.info("成功結果 CSV エクスポート完了");
        appMessageDialogRef.showMessageAsync("エクスポート完了", "成功結果をCSVファイルに保存しました", "INFO");
    }, [successResults]);

    /** エラー結果をCSVエクスポート */
    const handleExportErrorCSV = useCallback(() => {
        logger.info("エラー結果 CSV エクスポート開始");

        const csvContent = [
            ["日時（開始）", "日時（終了）", "イベント名", "コード", "コード名称", "フォルダパス", "エラー内容"],
            ...errorResults.map((result) => [
                result.event.schedule.start.toLocaleString("ja-JP"),
                result.event.schedule.end?.toLocaleString("ja-JP") || "",
                result.event.name,
                result.workItem.id,
                result.workItem.name,
                result.workItem.folderPath,
                result.errorMessage || "",
            ]),
        ]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `timetracker_error_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        logger.info("エラー結果 CSV エクスポート完了");
        appMessageDialogRef.showMessageAsync("エクスポート完了", "エラー結果をCSVファイルに保存しました", "INFO");
    }, [errorResults]);

    // ==================== レンダリング ====================

    return (
        <>
            <ViewHeader left={<PageHeader breadcrumbs={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />} />

            <ViewSection>
                {/* サマリーセクション */}
                <div>
                    {/* 完了メッセージ */}
                    <Card className={styles.completionMessage}>
                        {errorCount === 0 ? (
                            <>
                                <CheckmarkCircle24Regular className={styles.completionIcon} />
                                <div className={styles.completionText}>
                                    登録が完了しました。{successCount}件のイベントが正常に登録されました。
                                </div>
                            </>
                        ) : (
                            <>
                                <DismissCircle24Regular
                                    className={mergeClasses(styles.completionIcon, styles.errorIcon)}
                                />
                                <div className={styles.completionText}>
                                    登録が完了しました。{successCount}件が成功、{errorCount}
                                    件が失敗しました。
                                </div>
                            </>
                        )}
                    </Card>

                    {/* 統計カード */}
                    <div className={styles.statsGrid}>
                        <StatCard icon={<CheckmarkCircle24Regular />} label="成功" value={successCount.toString()} />
                        <StatCard icon={<DismissCircle24Regular />} label="失敗" value={errorCount.toString()} />
                        <StatCard icon={<DocumentBulletList24Regular />} label="合計" value={totalCount.toString()} />
                    </div>
                </div>

                {/* タブリストとツールバー */}
                <div>
                    <SectionTitle icon={<DocumentBulletList24Regular />}>登録結果</SectionTitle>

                    <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} size="large">
                        <Tab value="success" icon={<CheckmarkCircle24Regular />}>
                            成功 <Badge appearance="filled">{successCount}</Badge>
                        </Tab>
                        <Tab value="error" icon={<DismissCircle24Regular />}>
                            失敗 <Badge appearance="filled">{errorCount}</Badge>
                        </Tab>
                    </TabList>
                </div>

                {/* ツールバー */}
                <Toolbar className={tableStyles.toolbar}>
                    <ToolbarButton
                        appearance="primary"
                        icon={<ArrowDownload24Regular />}
                        onClick={handleExportSuccessCSV}
                        disabled={successCount === 0}
                    >
                        成功結果をエクスポート
                    </ToolbarButton>
                    <ToolbarButton
                        icon={<ArrowDownload24Regular />}
                        onClick={handleExportErrorCSV}
                        disabled={errorCount === 0}
                    >
                        エラー結果をエクスポート
                    </ToolbarButton>
                </Toolbar>

                {/* 結果テーブル */}
                <div className={tableStyles.tableContainer} style={{ maxHeight: "calc(100vh - 580px)" }}>
                    <DataTable
                        items={tableRows}
                        columns={columns}
                        getRowId={(item) => item.event.uuid}
                        sortable
                        resizableColumns
                        columnSizingOptions={COLUMN_SIZING_OPTIONS}
                    />
                </div>
            </ViewSection>
        </>
    );
});
