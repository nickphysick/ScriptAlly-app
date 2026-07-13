import { describe, it, expect } from "vitest";
import { TaskFlag } from "../types";
import { taskFlagId, flagKeyForTask, flagMatchesTask, isFlagSuppressing, buildTaskFlagFromDismissed, MUTED_UNTIL } from "./taskFlags";
import { DismissedTask } from "../types";

const flag = (over: Partial<TaskFlag>): TaskFlag => ({ id: "x", userId: "u", taskType: "nudge_overdue", snoozeCount: 0, ...over });

describe("taskFlagId — deterministic composite", () => {
  it("is stable for the same components", () => {
    const k = { taskType: "nudge_overdue", queryId: "q1" };
    expect(taskFlagId(k)).toBe(taskFlagId(k));
  });
  it("distinguishes taskType, query, agent, rule", () => {
    expect(taskFlagId({ taskType: "nudge_overdue", queryId: "q1" })).not.toBe(taskFlagId({ taskType: "no_response_close", queryId: "q1" }));
    expect(taskFlagId({ taskType: "data_quality_poor", agentId: "a1" })).not.toBe(taskFlagId({ taskType: "data_quality_poor", agentId: "a2" }));
    expect(taskFlagId({ taskType: "data_quality_poor", rule: "mswl" })).not.toBe(taskFlagId({ taskType: "data_quality_poor", rule: "window" }));
  });
});

describe("flagKeyForTask — classifies the related record", () => {
  it("agent tasks key on agentId", () => {
    expect(flagKeyForTask("data_quality_poor", "a1")).toEqual({ taskType: "data_quality_poor", agentId: "a1" });
  });
  it("query tasks key on queryId", () => {
    expect(flagKeyForTask("nudge_overdue", "q1")).toEqual({ taskType: "nudge_overdue", queryId: "q1" });
    expect(flagKeyForTask("offer_received", "q9")).toEqual({ taskType: "offer_received", queryId: "q9" });
  });
});

describe("flagMatchesTask", () => {
  it("matches on taskType + queryId/agentId", () => {
    expect(flagMatchesTask(flag({ taskType: "nudge_overdue", queryId: "q1" }), "nudge_overdue", "q1")).toBe(true);
    expect(flagMatchesTask(flag({ taskType: "data_quality_poor", agentId: "a1" }), "data_quality_poor", "a1")).toBe(true);
  });
  it("rejects a different type or record", () => {
    expect(flagMatchesTask(flag({ taskType: "nudge_overdue", queryId: "q1" }), "no_response_close", "q1")).toBe(false);
    expect(flagMatchesTask(flag({ taskType: "nudge_overdue", queryId: "q1" }), "nudge_overdue", "q2")).toBe(false);
  });
});

describe("isFlagSuppressing", () => {
  const now = Date.parse("2026-07-09T12:00:00Z");
  it("hides while snoozed into the future", () => {
    expect(isFlagSuppressing(flag({ snoozedUntil: new Date(now + 86400000).toISOString() }), now)).toBe(true);
  });
  it("does not hide once the snooze has passed", () => {
    expect(isFlagSuppressing(flag({ snoozedUntil: new Date(now - 86400000).toISOString() }), now)).toBe(false);
  });
  it("does not hide with no snooze", () => {
    expect(isFlagSuppressing(flag({}), now)).toBe(false);
  });
});

describe("buildTaskFlagFromDismissed — migration", () => {
  const dsm = (over: Partial<DismissedTask>): DismissedTask =>
    ({ id: "d", userId: "u", taskType: "nudge_overdue", relatedRecordId: "q1", dismissedDate: "2026-07-01T00:00:00Z", dismissType: "fixed snooze", ...over });

  it("carries a fixed-snooze resurfaceDate into snoozedUntil, keyed by query", () => {
    const f = buildTaskFlagFromDismissed(dsm({ resurfaceDate: "2026-07-20T00:00:00Z" }), "u");
    expect(f.snoozedUntil).toBe("2026-07-20T00:00:00Z");
    expect(f.queryId).toBe("q1");
    expect(f.snoozeCount).toBe(1);
  });
  it("maps a permanent dismiss to an indefinite mute", () => {
    expect(buildTaskFlagFromDismissed(dsm({ dismissType: "permanent" }), "u").snoozedUntil).toBe(MUTED_UNTIL);
  });
  it("keys agent tasks by agentId", () => {
    const f = buildTaskFlagFromDismissed(dsm({ taskType: "data_quality_poor", relatedRecordId: "a1", resurfaceDate: "2026-07-20T00:00:00Z" }), "u");
    expect(f.agentId).toBe("a1");
    expect(f.queryId).toBeUndefined();
  });
});
