/**
 * DataTable Component
 *
 * Fluent UI DataGridをラップした共通テーブルコンポーネント
 */
import {
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    TableColumnDefinition,
    makeStyles,
    tokens,
} from "@fluentui/react-components";

export interface DataTableProps<T> {
    items: T[];
    columns: TableColumnDefinition<T>[];
    getRowId: (item: T) => string;
    sortable?: boolean;
    resizableColumns?: boolean;
    onColumnHeaderClick?: (columnId: string) => void;
    className?: string;
}

const useStyles = makeStyles({
    tableContainer: {
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1,
    },
});

/**
 * 汎用DataTableコンポーネント
 *
 * @example
 * ```tsx
 * <DataTable
 *   items={data}
 *   columns={columns}
 *   getRowId={(item) => item.id}
 *   sortable
 * />
 * ```
 */
export function DataTable<T>({
    items,
    columns,
    getRowId,
    sortable = false,
    resizableColumns = false,
    onColumnHeaderClick,
    className,
}: DataTableProps<T>) {
    const styles = useStyles();

    return (
        <div className={className || styles.tableContainer}>
            <DataGrid
                items={items}
                columns={columns}
                sortable={sortable}
                resizableColumns={resizableColumns}
                getRowId={getRowId}
            >
                <DataGridHeader>
                    <DataGridRow>
                        {({ renderHeaderCell, columnId }) => (
                            <DataGridHeaderCell
                                onClick={
                                    onColumnHeaderClick ? () => onColumnHeaderClick(columnId as string) : undefined
                                }
                            >
                                {renderHeaderCell()}
                            </DataGridHeaderCell>
                        )}
                    </DataGridRow>
                </DataGridHeader>
                <DataGridBody<T>>
                    {({ item, rowId }) => (
                        <DataGridRow<T> key={rowId}>
                            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                        </DataGridRow>
                    )}
                </DataGridBody>
            </DataGrid>
        </div>
    );
}
