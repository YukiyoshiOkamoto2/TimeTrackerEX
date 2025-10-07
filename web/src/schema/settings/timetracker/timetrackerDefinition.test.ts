/**
 * TimeTracker Definition Tests
 *
 * TimeTracker設定定義とバリデーションのテストです。
 */

import type { MatchMode, RoundingMethod, StartEndType, TimeCompare, TimeTrackerSettings } from "@/types";
import { describe, expect, it } from "vitest";
import { TIMETRACKER_SETTINGS_DEFINITION } from "./timetrackerDefinition";

describe("timetrackerDefinition", () => {
    describe("TIMETRACKER_SETTINGS_DEFINITION", () => {
        it("定義が存在する", () => {
            expect(TIMETRACKER_SETTINGS_DEFINITION).toBeDefined();
            expect(TIMETRACKER_SETTINGS_DEFINITION.type).toBe("object");
            expect(TIMETRACKER_SETTINGS_DEFINITION.name).toBe("TimeTracker設定");
        });

        it("すべての必須フィールドが定義されている", () => {
            const children = TIMETRACKER_SETTINGS_DEFINITION.children;
            expect(children).toBeDefined();
            expect(children?.userName).toBeDefined();
            expect(children?.baseUrl).toBeDefined();
            expect(children?.baseProjectId).toBeDefined();
            expect(children?.isHistoryAutoInput).toBeDefined();
            expect(children?.roundingTimeTypeOfEvent).toBeDefined();
            expect(children?.eventDuplicatePriority).toBeDefined();
            expect(children?.scheduleAutoInputInfo).toBeDefined();
        });

        it("オプションフィールドが定義されている", () => {
            const children = TIMETRACKER_SETTINGS_DEFINITION.children;
            expect(children?.timeOffEvent).toBeDefined();
            expect(children?.ignorableEvents).toBeDefined();
            expect(children?.paidLeaveInputInfo).toBeDefined();
        });
    });

    describe("validateTimeTrackerSettings", () => {
        it("有効な設定を受け入れる", () => {
            const validSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                timeOffEvent: {
                    namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                    workItemId: 789,
                },
                paidLeaveInputInfo: {
                    enabled: true,
                    startTime: "09:00",
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(validSettings);
            expect(result.isError).toBe(false);
        });

        it("必須フィールドが欠けている場合は拒否する", () => {
            const invalidSettings = {
                userName: "testuser",
                // baseUrlが欠けている
                baseProjectId: 123,
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings as TimeTrackerSettings);
            expect(result.isError).toBe(true);
        });

        it("型が正しくない場合は拒否する", () => {
            const invalidSettings = {
                userName: 123, // 文字列であるべき
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings as unknown as TimeTrackerSettings);
            expect(result.isError).toBe(true);
        });

        it("URL形式のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "not-a-url",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("列挙型のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "invalid" as RoundingMethod,
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("正の整数のバリデーション", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: -1, // 負の値は不可
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("配列のminItems検証", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                timeOffEvent: {
                    namePatterns: [], // 空配列は不可
                    workItemId: 789,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("正規表現パターンの検証", () => {
            const invalidSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                paidLeaveInputInfo: {
                    startTime: "9:00", // HH:MM形式でないので不可
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(invalidSettings);
            expect(result.isError).toBe(true);
        });

        it("オプションフィールドは省略可能", () => {
            const minimalSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(minimalSettings);
            expect(result.isError).toBe(false);
        });

        it("ネストされたオブジェクトを正しく検証", () => {
            const validSettings: TimeTrackerSettings = {
                userName: "testuser",
                baseUrl: "https://timetracker.example.com",
                baseProjectId: 123,
                roundingTimeTypeOfEvent: "nonduplicate",
                isHistoryAutoInput: true,
                eventDuplicatePriority: {
                    timeCompare: "small",
                },
                scheduleAutoInputInfo: {
                    startEndType: "both",
                    roundingTimeTypeOfSchedule: "half",
                    startEndTime: 30,
                    workItemId: 456,
                },
                timeOffEvent: {
                    namePatterns: [
                        { pattern: "有給", matchMode: "partial" },
                        { pattern: "休暇", matchMode: "prefix" },
                    ],
                    workItemId: 789,
                },
                paidLeaveInputInfo: {
                    startTime: "09:00",
                    endTime: "18:00",
                    workItemId: 1011,
                },
            };

            const result = TIMETRACKER_SETTINGS_DEFINITION.validate(validSettings);
            expect(result.isError).toBe(false);
        });
    });

    describe("validatePartialTimeTrackerSettings", () => {
        describe("単一フィールドの部分更新", () => {
            it("userNameのみの更新を受け入れる", () => {
                const partialSettings = {
                    userName: "newuser",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("baseUrlのみの更新を受け入れる", () => {
                const partialSettings = {
                    baseUrl: "https://new.example.com",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("baseProjectIdのみの更新を受け入れる", () => {
                const partialSettings = {
                    baseProjectId: 999,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("roundingTimeTypeOfEventのみの更新を受け入れる", () => {
                const partialSettings = {
                    roundingTimeTypeOfEvent: "half" as RoundingMethod,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("isHistoryAutoInputのみの更新を受け入れる", () => {
                const partialSettings = {
                    isHistoryAutoInput: false,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });
        });

        describe("ネストされたオブジェクトの部分更新", () => {
            it("eventDuplicatePriorityの一部フィールドのみの更新を受け入れる", () => {
                const partialSettings = {
                    eventDuplicatePriority: {
                        timeCompare: "large" as TimeCompare,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("scheduleAutoInputInfoの一部フィールドのみの更新を受け入れる（workItemIdなし）", () => {
                const partialSettings = {
                    scheduleAutoInputInfo: {
                        startEndType: "start" as StartEndType,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("scheduleAutoInputInfoの複数フィールドを更新（必須のworkItemIdなし）", () => {
                const partialSettings = {
                    scheduleAutoInputInfo: {
                        startEndType: "both" as StartEndType,
                        roundingTimeTypeOfSchedule: "half" as RoundingMethod,
                        startEndTime: 60,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("paidLeaveInputInfoのenabledのみの更新を受け入れる（必須のworkItemIdなし）", () => {
                const partialSettings = {
                    paidLeaveInputInfo: {
                        enabled: true,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("paidLeaveInputInfoの時刻のみの更新を受け入れる（必須のworkItemIdなし）", () => {
                const partialSettings = {
                    paidLeaveInputInfo: {
                        startTime: "08:00",
                        endTime: "17:00",
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("timeOffEventの一部フィールドのみの更新を受け入れる（必須のworkItemIdなし）", () => {
                const partialSettings = {
                    timeOffEvent: {
                        namePatterns: [{ pattern: "休暇", matchMode: "partial" as MatchMode }],
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });
        });

        describe("複数フィールドの同時更新", () => {
            it("複数の独立したフィールドの同時更新を受け入れる", () => {
                const partialSettings = {
                    userName: "updateduser",
                    baseProjectId: 888,
                    isHistoryAutoInput: true,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("トップレベルとネストされたフィールドの同時更新を受け入れる", () => {
                const partialSettings = {
                    userName: "newuser",
                    eventDuplicatePriority: {
                        timeCompare: "small" as const,
                    },
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("複数のネストオブジェクトの同時更新を受け入れる", () => {
                const partialSettings = {
                    scheduleAutoInputInfo: {
                        startEndType: "end" as StartEndType,
                    },
                    paidLeaveInputInfo: {
                        enabled: false,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });
        });

        describe("バリデーションエラー", () => {
            it("不正な型のuserNameを拒否する", () => {
                const partialSettings = {
                    userName: 123, // 数値は不正
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings as any);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("userName");
                }
            });

            it("不正なURLのbaseUrlを拒否する", () => {
                const partialSettings = {
                    baseUrl: "invalid-url",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("baseUrl");
                }
            });

            it("不正な型のbaseProjectIdを拒否する", () => {
                const partialSettings = {
                    baseProjectId: "not-a-number",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings as any);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("baseProjectId");
                }
            });

            it("不正な値のroundingTimeTypeOfEventを拒否する", () => {
                const partialSettings = {
                    roundingTimeTypeOfEvent: "invalid" as RoundingMethod,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("roundingTimeTypeOfEvent");
                }
            });

            it("ネストされたオブジェクトの不正な値を拒否する", () => {
                const partialSettings = {
                    eventDuplicatePriority: {
                        timeCompare: "invalid" as any,
                    },
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("timeCompare");
                }
            });

            it("未定義のフィールドを拒否する", () => {
                const partialSettings = {
                    unknownField: "value",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings as any);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("unknownField");
                    expect(result.errorMessage).toContain("不明なフィールド");
                }
            });

            it("複数のエラーをすべて報告する", () => {
                const partialSettings = {
                    userName: 123, // 不正な型
                    baseUrl: "invalid-url", // 不正なURL
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings as any);
                expect(result.isError).toBe(true);
                if (result.isError) {
                    expect(result.errorMessage).toContain("userName");
                    expect(result.errorMessage).toContain("baseUrl");
                }
            });
        });

        describe("エッジケース", () => {
            it("空のオブジェクトを受け入れる", () => {
                const partialSettings = {};

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("nullを拒否する", () => {
                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(null as any);
                expect(result.isError).toBe(true);
            });

            it("配列を拒否する", () => {
                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial([] as any);
                expect(result.isError).toBe(true);
            });

            it("完全な設定オブジェクトも受け入れる", () => {
                const fullSettings: TimeTrackerSettings = {
                    userName: "testuser",
                    baseUrl: "https://timetracker.example.com",
                    baseProjectId: 123,
                    roundingTimeTypeOfEvent: "nonduplicate",
                    isHistoryAutoInput: true,
                    eventDuplicatePriority: {
                        timeCompare: "small",
                    },
                    scheduleAutoInputInfo: {
                        startEndType: "both",
                        roundingTimeTypeOfSchedule: "half",
                        startEndTime: 30,
                        workItemId: 456,
                    },
                    timeOffEvent: {
                        namePatterns: [{ pattern: "有給", matchMode: "partial" }],
                        workItemId: 789,
                    },
                    paidLeaveInputInfo: {
                        enabled: true,
                        startTime: "09:00",
                        endTime: "18:00",
                        workItemId: 1011,
                    },
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(fullSettings as any);
                expect(result.isError).toBe(false);
            });
        });

        describe("実際のユースケース", () => {
            it("UIでのuserName変更シナリオ", () => {
                // ユーザーがUIでユーザー名だけを変更
                const partialSettings = {
                    userName: "newloginname",
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("UIでのscheduleAutoInputInfo有効化シナリオ", () => {
                // ユーザーがスケジュール自動入力を有効化（workItemIdは既存値を使用）
                const partialSettings = {
                    scheduleAutoInputInfo: {
                        startEndType: "both" as StartEndType,
                        roundingTimeTypeOfSchedule: "half" as RoundingMethod,
                        startEndTime: 30,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("UIでのpaidLeaveInputInfoトグルシナリオ", () => {
                // ユーザーが有給休暇入力機能のトグルを切り替え
                const partialSettings = {
                    paidLeaveInputInfo: {
                        enabled: true,
                    },
                } as Partial<TimeTrackerSettings>;

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });

            it("UIでの基本設定変更シナリオ", () => {
                // ユーザーが基本設定を変更（URL、プロジェクトID）
                const partialSettings = {
                    baseUrl: "https://newdomain.example.com",
                    baseProjectId: 999,
                };

                const result = TIMETRACKER_SETTINGS_DEFINITION.validatePartial(partialSettings);
                expect(result.isError).toBe(false);
            });
        });
    });
});
