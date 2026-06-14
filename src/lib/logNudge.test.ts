import { describe, it, expect } from "vitest";
import { buildNudgeWrites } from "./logNudge";
import { ActivityType, QueryStatus, type Query, type Agent } from "../types";

// Minimal fixtures — only the fields buildNudgeWrites reads.
const query = {
  id: "q1",
  userId: "u1",
  manuscriptId: "m1",
  agentId: "a1",
  packageId: "p1",
  status: QueryStatus.QUERIED,
  dateSent: "2026-01-01T00:00:00.000Z",
  responseDeadline: "2026-02-01T00:00:00.000Z",
  personalisationNotes: "",
  sendMethod: "Email",
} as unknown as Query;

const agent = { id: "a1", name: "Margaret Holloway", agency: "Pemberton Literary" } as unknown as Agent;

const NOW = new Date("2026-06-14T09:00:00.000Z");
const CHECK_BACK = "2026-06-28T00:00:00.000Z";

describe("buildNudgeWrites — the Log-nudge payloads", () => {
  it("writes a non-status NUDGE_SENT activity with the glyph-detected description prefix", () => {
    const { activity } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(activity.activityType).toBe(ActivityType.NUDGE_SENT);
    expect(activity.description.startsWith("Nudge sent to Margaret Holloway at Pemberton Literary")).toBe(true);
    expect(activity.queryId).toBe("q1");
    expect(activity.date).toBe(NOW.toISOString());
    // Non-status: recomputeQuery must ignore it → no resultingStatus.
    expect("resultingStatus" in activity).toBe(false);
    expect(activity.details).toContain("Follow-up reminder set for");
  });

  it("puts the optional note in details (no dedicated field — rules forbid one)", () => {
    const { activity } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK, note: "Polite bump, attached the synopsis." }, NOW);
    expect(activity.details).toContain("Follow-up reminder set for");
    expect(activity.details).toContain("Polite bump, attached the synopsis.");
  });

  it("sets nudgeDate + lastNudgeSentDate and NOTHING else on the query (no status / responseDeadline)", () => {
    const { queryUpdates } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(Object.keys(queryUpdates).sort()).toEqual(["lastNudgeSentDate", "nudgeDate"]);
    expect(queryUpdates.nudgeDate).toBe(new Date(CHECK_BACK).toISOString());
    expect(queryUpdates.lastNudgeSentDate).toBe(NOW.toISOString());
    expect(queryUpdates).not.toHaveProperty("status");
    expect(queryUpdates).not.toHaveProperty("responseDeadline");
    expect(queryUpdates).not.toHaveProperty("hasAgentResponded");
  });

  it("creates a custom-date resurface dismissal on the check-back date", () => {
    const { dismissal } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(dismissal.taskType).toBe("nudge_overdue");
    expect(dismissal.relatedRecordId).toBe("q1");
    expect(dismissal.dismissType).toBe("custom date");
    expect(dismissal.resurfaceDate).toBe(new Date(CHECK_BACK).toISOString());
  });

  it("falls back gracefully when no agent is on record", () => {
    const { activity } = buildNudgeWrites(query, null, { checkBackDate: CHECK_BACK }, NOW);
    expect(activity.description.startsWith("Nudge sent to agent at agency")).toBe(true);
  });
});
