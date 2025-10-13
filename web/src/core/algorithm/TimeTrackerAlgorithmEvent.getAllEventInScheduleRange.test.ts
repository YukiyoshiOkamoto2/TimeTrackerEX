/**
 * TimeTrackerAlgorithmEvent のテスト
 * scheduleToEvent, addStartToEndDate 関数のテスト
 */

import type { Event, Schedule } from "@/types";
import { describe, expect, it } from "vitest";
import { TimeTrackerAlgorithmEvent } from "./TimeTrackerAlgorithmEvent";

describe("TimeTrackerAlgorithmEvent", () => {
    const createTestSchedule = (start: Date, end: Date): Schedule => ({
        start,
        end,
    });

    const createTestEvent = (uuid: string, start: Date, end: Date): Event => ({
        uuid,
        name: `Event ${uuid}`,
        organizer: "test@example.com",
        isPrivate: false,
        isCancelled: false,
        location: "",
        schedule: { start, end },
    });

    describe("getAllEventInScheduleRange", () => { });
});
