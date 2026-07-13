import { describe, it, expect } from "vitest";
import { ActivityType } from "../types";
import { clearedTodayCount } from "./clearedToday";

const NOW = Date.parse("2026-07-09T12:00:00Z");
const today = (h = 9) => new Date(Date.parse(`2026-07-09T${String(h).padStart(2, "0")}:00:00Z`)).toISOString();
const yesterday = new Date(NOW - 86400000).toISOString();

describe("clearedTodayCount — the union", () => {
  it("counts clearing activities dated today, ignores other types and days", () => {
    const activities = [
      { activityType: ActivityType.QUERY_SENT, date: today(8) },
      { activityType: ActivityType.MATERIALS_SENT, date: today(10) },
      { activityType: ActivityType.NUDGE_SENT, date: today(11) },
      { activityType: ActivityType.STATUS_CHANGED, date: today(7) },
      { activityType: ActivityType.AGENT_ADDED, date: today(9) }, // not a clearing type
      { activityType: ActivityType.QUERY_SENT, date: yesterday }, // wrong day
    ];
    expect(clearedTodayCount({ activities, userTasks: [], taskFlags: [], now: NOW })).toBe(4);
  });

  it("counts Your-tasks completed today, ignores open ones and other days", () => {
    const userTasks = [
      { done: true, completedAt: today(9) },
      { done: true, completedAt: yesterday }, // wrong day
      { done: false, completedAt: undefined }, // open
      { done: true, completedAt: undefined }, // done but no stamp — skip
    ];
    expect(clearedTodayCount({ activities: [], userTasks, taskFlags: [], now: NOW })).toBe(1);
  });

  it("counts housekeeping gaps resolved today", () => {
    const taskFlags = [{ resolvedAt: today(9) }, { resolvedAt: yesterday }, { resolvedAt: undefined }];
    expect(clearedTodayCount({ activities: [], userTasks: [], taskFlags, now: NOW })).toBe(1);
  });

  it("sums all three contributors", () => {
    expect(clearedTodayCount({
      activities: [{ activityType: ActivityType.QUERY_SENT, date: today(9) }],
      userTasks: [{ done: true, completedAt: today(9) }],
      taskFlags: [{ resolvedAt: today(9) }],
      now: NOW,
    })).toBe(3);
  });
});
