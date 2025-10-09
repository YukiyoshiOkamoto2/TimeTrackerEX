/**
 * LinkingProcessView用の詳細表示ダイアログコンポーネント
 */

import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Divider,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { CheckmarkCircle24Regular, Dismiss24Regular, Info24Regular, Link24Regular } from "@fluentui/react-icons";
import { TaskStatistics } from "../models/statistics";
import { LinkedEventRow, TargetEventRow, UnlinkedEventRow } from "../models/table";

const useStyles = makeStyles({
    dialogSurface: {
        maxWidth: "900px",
        minHeight: "500px",
    },
    dialogContent: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        paddingTop: "8px",
    },
    dialogHeader: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
    },
    dialogIcon: {
        fontSize: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "48px",
        height: "48px",
        borderRadius: tokens.borderRadiusCircular,
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground1,
    },
    dialogTitleText: {
        flex: 1,
        fontSize: "20px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    dialogDescription: {
        fontSize: "14px",
        lineHeight: "1.5",
        color: tokens.colorNeutralForeground2,
        padding: "12px 16px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
        borderLeft: `3px solid ${tokens.colorBrandForeground1}`,
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
    },
    descriptionIcon: {
        marginTop: "2px",
        color: tokens.colorBrandForeground1,
    },
    dialogStats: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginTop: "8px",
    },
    tableContainer: {
        marginTop: "8px",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
    },
    emptyMessage: {
        textAlign: "center",
        padding: "48px 24px",
        color: tokens.colorNeutralForeground3,
        fontSize: "14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
    },
    emptyIcon: {
        fontSize: "48px",
        opacity: 0.5,
    },
    divider: {
        marginTop: "8px",
        marginBottom: "8px",
    },
});

// 型定義
export type DetailDialogType = "targetEvents" | "linked" | "unlinked" | undefined;

interface DetailDialogProps {
    dialogType: DetailDialogType;
    openDialog: boolean;
    taskStatistics: TaskStatistics;
    onClose: () => void;
}

/**
 * 詳細表示ダイアログコンポーネント
 */
export function DetailDialog({ dialogType, openDialog, taskStatistics, onClose }: DetailDialogProps) {
    const styles = useStyles();

    // テーブル列定義
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

    // ダイアログタイトルとアイコンの取得
    const getDialogInfo = () => {
        switch (dialogType) {
            case "targetEvents":
                return {
                    title: "対象イベントの詳細",
                    icon: <Info24Regular />,
                };
            case "linked":
                return {
                    title: "紐づけ済みイベントの詳細",
                    icon: <CheckmarkCircle24Regular />,
                };
            case "unlinked":
                return {
                    title: "未紐づけイベントの詳細",
                    icon: <Dismiss24Regular />,
                };
            default:
                return { title: "", icon: null };
        }
    };

    const dialogInfo = getDialogInfo();

    return (
        <Dialog open={openDialog} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface className={styles.dialogSurface}>
                <DialogBody>
                    <DialogTitle>
                        <div className={styles.dialogHeader}>
                            <div className={styles.dialogIcon}>{dialogInfo.icon}</div>
                            <div className={styles.dialogTitleText}>{dialogInfo.title}</div>
                        </div>
                    </DialogTitle>
                    <DialogContent className={styles.dialogContent}>
                        {/* 対象イベントの詳細 */}
                        {dialogType === "targetEvents" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    <Info24Regular className={styles.descriptionIcon} />
                                    <span>
                                        処理対象となったイベントの一覧です。無視設定や勤務時間外のイベントは含まれません。
                                    </span>
                                </div>
                                <div className={styles.dialogStats}>
                                    <StatCard icon={<Info24Regular />} label="合計イベント数" value={1} unit="件" />
                                </div>
                                <Divider className={styles.divider} />
                                {[].length > 0 ? (
                                    <DataTable
                                        items={[]}
                                        columns={targetEventColumns}
                                        getRowId={(item) => item.id}
                                        sortable
                                        className={styles.tableContainer}
                                    />
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <Info24Regular className={styles.emptyIcon} />
                                        <div>処理対象のイベントはありません</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 紐づけ済みイベントの詳細 */}
                        {dialogType === "linked" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    <Info24Regular className={styles.descriptionIcon} />
                                    <span>
                                        WorkItemに紐づけ済みのイベント一覧です。これらは登録実行時に勤務実績として記録されます。
                                    </span>
                                </div>
                                <div className={styles.dialogStats}>
                                    <StatCard icon={<CheckmarkCircle24Regular />} label="合計" value={2} unit="件" />
                                </div>
                                <Divider className={styles.divider} />
                                {[].length > 0 ? (
                                    <DataTable
                                        items={[]}
                                        columns={linkedEventsColumns}
                                        getRowId={(item) => item.id}
                                        sortable
                                        className={styles.tableContainer}
                                    />
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <CheckmarkCircle24Regular className={styles.emptyIcon} />
                                        <div>紐づけ済みのイベントはありません</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 未紐づけイベントの詳細 */}
                        {dialogType === "unlinked" && (
                            <div>
                                <div className={styles.dialogDescription}>
                                    <Info24Regular className={styles.descriptionIcon} />
                                    <span>
                                        まだWorkItemに紐づけられていないイベントの一覧です。登録前に紐づけを完了してください。
                                    </span>
                                </div>
                                <div className={styles.dialogStats}>
                                    <StatCard icon={<Dismiss24Regular />} label="未紐づけ数" value={3} unit="件" />
                                </div>
                                <Divider className={styles.divider} />
                                {[].length > 0 ? (
                                    <DataTable
                                        items={[]}
                                        columns={unlinkedEventsColumns}
                                        getRowId={(item) => item.id}
                                        sortable
                                        className={styles.tableContainer}
                                    />
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <CheckmarkCircle24Regular className={styles.emptyIcon} />
                                        <div>未紐づけのイベントはありません</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="primary" onClick={onClose} size="large">
                            閉じる
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
