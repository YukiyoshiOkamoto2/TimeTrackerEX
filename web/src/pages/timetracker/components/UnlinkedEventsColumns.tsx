import type { WorkItem } from "@/types";
import {
    type TableColumnDefinition,
    TableCellLayout,
    createTableColumn,
    Dropdown,
    Option,
} from "@fluentui/react-components";
import type { UnlinkedEventRow } from "../models";

/**
 * 未紐付けイベントテーブルの列定義を作成（インタラクティブ用）
 */
export function createUnlinkedEventsColumns(
    workItems: WorkItem[],
    handleWorkItemSelect: (eventId: string, workItemId: string) => void,
): TableColumnDefinition<UnlinkedEventRow>[] {
    return [
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
        createTableColumn<UnlinkedEventRow>({
            columnId: "workItem",
            renderHeaderCell: () => "作業項目を選択",
            renderCell: (item) => {
                const selectedWorkItemId = item.selectedWorkItemId;
                const selectedWorkItem = workItems.find((w) => w.id === selectedWorkItemId);

                return (
                    <TableCellLayout>
                        <Dropdown
                            placeholder="作業項目を選択..."
                            value={selectedWorkItem?.name || ""}
                            selectedOptions={selectedWorkItemId ? [selectedWorkItemId] : []}
                            onOptionSelect={(_, data) => {
                                if (data.optionValue) {
                                    handleWorkItemSelect(item.id, data.optionValue);
                                }
                            }}
                        >
                            {workItems.map((workItem) => (
                                <Option key={workItem.id} value={workItem.id}>
                                    {workItem.name}
                                </Option>
                            ))}
                        </Dropdown>
                    </TableCellLayout>
                );
            },
        }),
    ];
}
