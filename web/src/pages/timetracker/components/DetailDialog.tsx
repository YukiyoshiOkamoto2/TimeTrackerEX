/**
 * LinkingProcessView用の詳細表示ダイアログコンポーネント
 */

import {
    Button,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { Link24Regular } from "@fluentui/react-icons";
import type {
    ExcludedEventRow,
    ExcludedStats,
    LinkedEventRow,
    PaidLeaveRow,
    TargetEventRow,
    UnlinkedEventRow,
} from "../models";

// 型定義
export type DetailDialogType = "paidLeave" | "targetEvents" | "deleteEvents" | "linked" | "unlinked" | null;

export interface DetailDialogStats {
    paidLeaveDays: number;
    normalEventCount: number;
    convertedEventCount: number;
    totalLinked: number;
    timeOffCount: number;
    historyCount: number;
    manualCount: number;
}

interface DetailDialogProps {
    dialogType: DetailDialogType;
    onClose: () => void;
    stats: DetailDialogStats;
    excludedStats: ExcludedStats;
    paidLeaveRows: PaidLeaveRow[];
    targetEventRows: TargetEventRow[];
    excludedEventRows: ExcludedEventRow[];
    linkedEventsRows: LinkedEventRow[];
    unlinkedEventsRows: UnlinkedEventRow[];
}

const useStyles = makeStyles({
    dialogContent: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    dialogDescription: {
        fontSize: "14px",
        color: tokens.colorNeutralForeground2,
        marginBottom: "8px",
    },
    dialogStats: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
        marginBottom: "16px",
    },
    dialogStatItem: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    dialogStatLabel: {
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
    },
    dialogStatValue: {
        fontSize: "18px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    emptyMessage: {
        textAlign: "center",
        color: tokens.colorNeutralForeground3,
        marginTop: "16px",
    },
});

/**
 * 詳細表示ダイアログコンポーネント
 */
export function DetailDialog({
    dialogType,
    onClose,
    stats,
    excludedStats,
    paidLeaveRows,
    targetEventRows,
    excludedEventRows,
    linkedEventsRows,
    unlinkedEventsRows,
}: DetailDialogProps) {
    const styles = useStyles();

    // テーブル列定義
    const paidLeaveColumns: TableColumnDefinition<PaidLeaveRow>[] = [
        createTableColumn<PaidLeaveRow>({
            columnId: "date",
            renderHeaderCell: () => "日付",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.date} {item.dayOfWeek}
                </TableCellLayout>
            ),
        }),
    ];

    const targetEventColumns: TableColumnDefinition<TargetEventRow>[] = [
        createTableColumn<TargetEventRow>({
            columnId: "name",
            compare: (a, b) => a.name.localeCompare(b.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<TargetEventRow>({
            columnId: "status",
            compare: (a, b) => a.status.localeCompare(b.status),
            renderHeaderCell: () => "ステータス",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.status === "紐づけ済み" ? "✅ " : "❌ "}
                    {item.status}
                </TableCellLayout>
            ),
        }),
    ];

    const excludedEventsColumns: TableColumnDefinition<ExcludedEventRow>[] = [
        createTableColumn<ExcludedEventRow>({
            columnId: "name",
            compare: (a, b) => a.name.localeCompare(b.name),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.name}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "reason",
            compare: (a, b) => a.reason.localeCompare(b.reason),
            renderHeaderCell: () => "除外理由",
            renderCell: (item) => <TableCellLayout>{item.reason}</TableCellLayout>,
        }),
        createTableColumn<ExcludedEventRow>({
            columnId: "reasonDetail",
            compare: (a, b) => a.reasonDetail.localeCompare(b.reasonDetail),
            renderHeaderCell: () => "詳細",
            renderCell: (item) => <TableCellLayout>{item.reasonDetail}</TableCellLayout>,
        }),
    ];

    const linkedEventsColumns: TableColumnDefinition<LinkedEventRow>[] = [
        createTableColumn<LinkedEventRow>({
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.eventName}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "workItemName",
            compare: (a, b) => a.workItemName.localeCompare(b.workItemName),
            renderHeaderCell: () => "作業項目",
            renderCell: (item) => <TableCellLayout>{item.workItemName}</TableCellLayout>,
        }),
        createTableColumn<LinkedEventRow>({
            columnId: "source",
            compare: (a, b) => a.source.localeCompare(b.source),
            renderHeaderCell: () => "紐付けソース",
            renderCell: (item) => <TableCellLayout media={<Link24Regular />}>{item.source}</TableCellLayout>,
        }),
    ];

    const unlinkedEventsColumns: TableColumnDefinition<UnlinkedEventRow>[] = [
        createTableColumn<UnlinkedEventRow>({
            columnId: "eventName",
            compare: (a, b) => a.eventName.localeCompare(b.eventName),
            renderHeaderCell: () => "イベント名",
            renderCell: (item) => <TableCellLayout>{item.eventName}</TableCellLayout>,
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "startTime",
            compare: (a, b) => a.startTime.localeCompare(b.startTime),
            renderHeaderCell: () => "開始時刻",
            renderCell: (item) => <TableCellLayout>{item.startTime}</TableCellLayout>,
        }),
        createTableColumn<UnlinkedEventRow>({
            columnId: "endTime",
            compare: (a, b) => a.endTime.localeCompare(b.endTime),
            renderHeaderCell: () => "終了時刻",
            renderCell: (item) => <TableCellLayout>{item.endTime}</TableCellLayout>,
        }),
    ];

    // ダイアログタイトルの取得
    const getDialogTitle = () => {
        switch (dialogType) {
            case "paidLeave":
                return "📅 有給休暇の詳細";
            case "targetEvents":
                return "🔗 対象イベントの詳細";
            case "deleteEvents":
                return "🗑️ 削除対象イベントの詳細";
            case "linked":
                return "✅ 紐づけ済みイベントの詳細";
            case "unlinked":
                return "❌ 未紐づけイベントの詳細";
            default:
                return "";
        }
    };

    return (
        <Dialog open={dialogType !== null} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface style={{ maxWidth: "800px" }}>
                <DialogBody>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                    <DialogContent className={styles.dialogContent}>
                        {/* 有給休暇の詳細 */}
                        {dialogType === "paidLeave" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    有給休暇として認識された日付の一覧です。これらの日は勤務実績として扱われます。
                                </div>
                                <div className={styles.dialogStats}>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>有給日数</div>
                                        <div className={styles.dialogStatValue}>{stats.paidLeaveDays}日</div>
                                    </div>
                                </div>
                                {paidLeaveRows.length > 0 ? (
                                    <DataGrid
                                        items={paidLeaveRows}
                                        columns={paidLeaveColumns}
                                        sortable
                                        getRowId={(item) => item.id}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<PaidLeaveRow>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<PaidLeaveRow> key={rowId}>
                                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                ) : (
                                    <p className={styles.emptyMessage}>有給休暇として認識された日付はありません</p>
                                )}
                            </div>
                        )}

                        {/* 対象イベントの詳細 */}
                        {dialogType === "targetEvents" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    処理対象となったイベントの一覧です。無視設定や勤務時間外のイベントは含まれません。
                                </div>
                                <div className={styles.dialogStats}>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>合計イベント数</div>
                                        <div className={styles.dialogStatValue}>{targetEventRows.length}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>元のイベント数</div>
                                        <div className={styles.dialogStatValue}>{stats.normalEventCount}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>変換イベント数</div>
                                        <div className={styles.dialogStatValue}>{stats.convertedEventCount}件</div>
                                    </div>
                                </div>
                                {targetEventRows.length > 0 ? (
                                    <DataGrid
                                        items={targetEventRows}
                                        columns={targetEventColumns}
                                        sortable
                                        getRowId={(item) => item.id}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<TargetEventRow>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<TargetEventRow> key={rowId}>
                                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                ) : (
                                    <p className={styles.emptyMessage}>処理対象のイベントはありません</p>
                                )}
                            </div>
                        )}

                        {/* 削除対象イベントの詳細 */}
                        {dialogType === "deleteEvents" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    以下の理由により処理から除外されたイベントです。
                                </div>
                                <div className={styles.dialogStats}>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>無視イベント</div>
                                        <div className={styles.dialogStatValue}>{excludedStats.ignored}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>勤務日範囲外</div>
                                        <div className={styles.dialogStatValue}>{excludedStats.outOfSchedule}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>不正イベント</div>
                                        <div className={styles.dialogStatValue}>{excludedStats.invalid}件</div>
                                    </div>
                                </div>
                                {excludedEventRows.length > 0 ? (
                                    <DataGrid
                                        items={excludedEventRows}
                                        columns={excludedEventsColumns}
                                        sortable
                                        resizableColumns
                                        style={{ marginTop: "16px" }}
                                        getRowId={(item) => item.id}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<ExcludedEventRow>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<ExcludedEventRow> key={rowId}>
                                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                ) : (
                                    <p className={styles.emptyMessage}>除外されたイベントはありません</p>
                                )}
                            </div>
                        )}

                        {/* 紐づけ済みイベントの詳細 */}
                        {dialogType === "linked" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    WorkItemに紐づけ済みのイベント一覧です。これらは登録実行時に勤務実績として記録されます。
                                </div>
                                <div className={styles.dialogStats}>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>合計</div>
                                        <div className={styles.dialogStatValue}>{stats.totalLinked}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>休暇</div>
                                        <div className={styles.dialogStatValue}>{stats.timeOffCount}件</div>
                                    </div>
                                    <div className={styles.dialogStatItem}>
                                        <div className={styles.dialogStatLabel}>履歴</div>
                                        <div className={styles.dialogStatValue}>{stats.historyCount}件</div>
                                    </div>
                                    {stats.manualCount > 0 && (
                                        <div className={styles.dialogStatItem}>
                                            <div className={styles.dialogStatLabel}>手動</div>
                                            <div className={styles.dialogStatValue}>{stats.manualCount}件</div>
                                        </div>
                                    )}
                                </div>
                                {linkedEventsRows.length > 0 ? (
                                    <DataGrid
                                        items={linkedEventsRows}
                                        columns={linkedEventsColumns}
                                        sortable
                                        getRowId={(item) => item.id}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<LinkedEventRow>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<LinkedEventRow> key={rowId}>
                                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                ) : (
                                    <p className={styles.emptyMessage}>紐づけ済みのイベントはありません</p>
                                )}
                            </div>
                        )}

                        {/* 未紐づけイベントの詳細 */}
                        {dialogType === "unlinked" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    まだWorkItemに紐づけられていないイベントの一覧です。登録前に紐づけを完了してください。
                                </div>
                                {unlinkedEventsRows.length > 0 ? (
                                    <DataGrid
                                        items={unlinkedEventsRows}
                                        columns={unlinkedEventsColumns}
                                        sortable
                                        getRowId={(item) => item.id}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<UnlinkedEventRow>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<UnlinkedEventRow> key={rowId}>
                                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                ) : (
                                    <p className={styles.emptyMessage}>未紐づけのイベントはありません</p>
                                )}
                            </div>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={onClose}>
                            閉じる
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
