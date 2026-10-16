/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { ActivityType, QueryStatus, SubmissionMethod, type Activity, type Agent, type Query } from "../types";
import { agentHistory, historySummary, methodWords, monthLabel } from "./agentHistory";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const agent = { id: "a1", name: "Rosa Calder", agency: "Penhallow", dateAdded: "2026-03-02T09:00:00Z" } as unknown as Agent;
const q = (o: Partial<Query>): Query => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, sendMethod: SubmissionMethod.EMAIL, ...o } as Query);
const act = (o: Partial<Activity>): Activity => ({ id: "x", userId: "u", queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED, description: "", date: "", details: "", ...o } as Activity);
const titleOf = (id: string) => (id === "m1" ? "Murphy’s Day Out" : id === "m2" ? "The Second Book" : null);

describe("agentHistory", () => {
  const queries = [
    q({ id: "q1", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-09-01T10:00:00Z", partialRequestedDate: "2026-09-20T10:00:00Z", expectedSendDate: "2026-09-30T10:00:00Z", materialsWanted: ["Query letter"] }),
    q({ id: "q2", manuscriptId: "m2", status: QueryStatus.REJECTED, dateSent: "2025-03-01T10:00:00Z", rejectedDate: "2025-04-01T10:00:00Z", agentComments: "Not for my list" }),
  ];
  const activities = [
    act({ id: "n1", queryId: "q1", activityType: ActivityType.NUDGE_SENT, date: "2026-10-01T10:00:00Z", eventKey: "nudge_sent" }),
    act({ id: "z", queryId: "other", activityType: ActivityType.NUDGE_SENT, date: "2026-10-02T10:00:00Z" }),
  ];
  const notes = [{ id: "no1", text: "Met at the fair", createdAt: "2026-10-05T10:00:00Z" }];
  const h = agentHistory({ agent, queries, activities, notes, titleOf, nowMs: NOW });

  it("lists every stored event, newest first, across both manuscripts", () => {
    expect(h.map((e) => e.title)).toEqual([
      "You added a note", "You nudged Rosa", "Rosa asked for a partial", "You queried Rosa",
      "You added Rosa to your contact list", "Rosa passed", "You queried Rosa",
    ]);
    for (let i = 1; i < h.length; i++) expect(h[i - 1].ms).toBeGreaterThanOrEqual(h[i].ms);
  });
  it("says who did it, and keeps another query's feed rows out", () => {
    expect(h.find((e) => e.title === "Rosa asked for a partial")!.dir).toBe("in");
    expect(h.find((e) => e.title === "You nudged Rosa")!.dir).toBe("out");
    expect(h.find((e) => e.title === "You added a note")!.dir).toBe("you");
    expect(h.filter((e) => e.icon === "nudge")).toHaveLength(1);
  });
  it("details are stored values: method, materials, the due date, the response type and the writer's note", () => {
    const sent = h.find((e) => e.title === "You queried Rosa" && e.manuscript === "Murphy’s Day Out")!;
    expect(sent.detail).toBe("By email");
    expect(sent.chips.length).toBe(1);
    expect(h.find((e) => e.title === "Rosa asked for a partial")!.detail).toBe("By 30 Sep");
    const pass = h.find((e) => e.title === "Rosa passed")!;
    expect(pass.detail).toBe("Passed");
    expect(pass.quote).toBe("Not for my list");
    expect(pass.manuscript).toBe("The Second Book");
  });
  it("leaves out a current stage nothing dates", () => {
    const undated = agentHistory({ agent, queries: [q({ id: "q9", status: QueryStatus.FULL_SENT, dateSent: "2026-09-01T10:00:00Z" })], activities: [], notes: [], titleOf, nowMs: NOW });
    expect(undated.map((e) => e.title)).not.toContain("You sent the full manuscript");
    expect(undated.map((e) => e.title)).toContain("You queried Rosa");
  });
  it("summary counts letters and replies, not your own records", () => {
    expect(historySummary(h, 2, "Rosa")).toBe("2 queries · 5 letters and replies");
    expect(historySummary([], 0, "Rosa")).toBe("Nothing sent to Rosa yet");
  });
  it("method and month words", () => {
    expect(methodWords(SubmissionMethod.ONLINE_FORM)).toBe("By online form");
    expect(monthLabel(Date.parse("2025-03-10T00:00:00Z"), NOW)).toBe("March 2025");
    expect(monthLabel(Date.parse("2026-09-10T00:00:00Z"), NOW)).toBe("September");
  });
});
