import { Event, Project, Schedule, WorkItem } from "@/types";

export type FileData = {
    name: string;
    size: number;
    type: string;
};

export type PDF = {
    schedule: Schedule[];
} & FileData;

export type ICS = {
    event: Event[];
} & FileData;

export type UploadInfo = {
    pdf?: PDF;
    ics?: ICS;
    project?: Project;
    workItems?: WorkItem[];
};

// テーブル行の型をエクスポート
export type { UnlinkedEventRow, LinkedEventRow, TargetEventRow } from "./table";
