/**
 * 除外イベントの統計
 */
export interface ExcludedStatistics {
    ignored: number;
    outOfSchedule: number;
    invalid: number;
}

export interface LinkingStatistics {
    /** AI */
    aiLinked: number;
    /** 休暇イベント数 */
    timeOffCount: number;
    /** 履歴から紐づけされたイベント数 */
    historyCount: number;
    /** 勤務時間紐づけイベント数 */
    workSheduleCount: number;
    /** 手動紐づけイベント数 */
    manualCount: number;
    /** 未紐づけイベント数 */
    unlinkedCount: number;
}

export interface DayStatistics {
    from: Date;
    end: Date;
    /** 通常勤務の日数 */
    normalDays: number;
    /** 有給休暇の日数 */
    paidLeaveDays: number;
}

/**
 * 統計データの型定義
 */
export interface TaskStatistics {
    day: DayStatistics;
    linked: LinkingStatistics;
    excluded: ExcludedStatistics;
}
