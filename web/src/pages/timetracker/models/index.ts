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
    // Phase 4で追加: TimeTrackerセッションデータ
    project?: Project;
    workItems?: WorkItem[];
    // Phase 7で追加: タスク登録用パスワード
    // TODO: 将来的にはトークンベース認証に移行
    password?: string;
};

export * from "./LinkingModels";
