/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { notifyGroups, reminderFields, alreadyCovered, NotifyRow } from "./offerNotify";
import { Agent, Query, QueryStatus, UserTask } from "../types";

const q = (id: string, agentId: string, status: QueryStatus, over: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "m1", status, ...over } as unknown as Query);
const ag = (id: string, name: string, over: Partial<Agent> = {}): Agent =>
  ({ id, name, agency: `${name} Lit`, ...over } as unknown as Agent);
const ut = (agentId: string, queryId: string, done = false): UserTask =>
  ({ id: `t-${agentId}`, userId: "u", text: "x", done, createdAt: "", updatedAt: "", agentId, queryId } as unknown as UserTask);

const OFFER = q("qo", "a0", QueryStatus.OFFER, { responseDeadline: "2026-07-31T11:00:00.000Z" });

describe("notifyGroups — every other open query, pages-first, cautions only where held", () => {
  const queries = [
    OFFER,
    q("q1", "a1", QueryStatus.FULL_SENT),
    q("q2", "a2", QueryStatus.REVISE_RESUBMIT),
    q("q3", "a3", QueryStatus.QUERIED, { dateSent: "2026-06-28T10:00:00.000Z" }),
    q("q4", "a4", QueryStatus.PARTIAL_REQUESTED),
    q("q5", "a5", QueryStatus.REJECTED), // terminal — excluded
    q("q6", "a6", QueryStatus.QUERIED, { manuscriptId: "m2" } as Partial<Query>), // other ms — excluded
  ];
  const agents = [ag("a1", "Daniel"), ag("a2", "Sophie"), ag("a3", "Priya", { noResponseMeansNo: true }), ag("a4", "Will")];

  it("groups HAVE YOUR PAGES (full/partial sent, R&R) then QUERY ONLY; terminal + other-ms excluded", () => {
    const g = notifyGroups(OFFER, queries, agents, []);
    expect(g.pages.map((r) => r.queryId)).toEqual(["q1", "q2"]);
    expect(g.queryOnly.map((r) => r.queryId)).toEqual(["q3", "q4"]);
  });

  it("status lines: sent statuses verbatim, R&R prose, queried with its day", () => {
    const g = notifyGroups(OFFER, queries, agents, []);
    expect(g.pages.find((r) => r.queryId === "q1")!.statusLine).toBe("FULL SENT");
    expect(g.pages.find((r) => r.queryId === "q2")!.statusLine).toBe("R&R IN PROGRESS");
    expect(g.queryOnly.find((r) => r.queryId === "q3")!.statusLine).toBe("QUERIED 28 JUN");
  });

  it("the caution renders ONLY where the policy is actually held — never invented", () => {
    const g = notifyGroups(OFFER, queries, agents, []);
    expect(g.queryOnly.find((r) => r.queryId === "q3")!.caution).toBe("“no reply means no” agency");
    expect(g.queryOnly.find((r) => r.queryId === "q4")!.caution).toBeUndefined();
  });

  it("the duplicate guard: a live reminder for agent+offer marks the row covered; done ones don't", () => {
    const g = notifyGroups(OFFER, queries, agents, [ut("a1", "qo"), ut("a2", "qo", true)]);
    expect(g.pages.find((r) => r.queryId === "q1")!.covered).toBe(true);
    expect(g.pages.find((r) => r.queryId === "q2")!.covered).toBe(false);
    expect(alreadyCovered([ut("a1", "OTHER-offer")], "a1", "qo")).toBe(false); // keyed on THIS offer
  });
});

describe("reminderFields — one task per selected agent, no activities anywhere", () => {
  const rows: NotifyRow[] = [
    { queryId: "q1", agentId: "a1", name: "Daniel O’Rourke", statusLine: "FULL SENT", covered: false },
    { queryId: "q3", agentId: "a3", name: "Priya Raman", statusLine: "QUERIED", covered: false },
  ];
  it("title, links and the reply-by due date per agent", () => {
    expect(reminderFields(rows, "qo", "2026-07-31T11:00:00.000Z")).toEqual([
      { text: "Tell Daniel O’Rourke about the offer", agentId: "a1", queryId: "qo", dueDate: "2026-07-31" },
      { text: "Tell Priya Raman about the offer", agentId: "a3", queryId: "qo", dueDate: "2026-07-31" },
    ]);
  });
  it("reply-by unset → dueDate omitted (no invented deadline); zero selection → nothing", () => {
    expect(reminderFields(rows.slice(0, 1), "qo", undefined)[0]).toEqual({ text: "Tell Daniel O’Rourke about the offer", agentId: "a1", queryId: "qo" });
    expect(reminderFields([], "qo", "2026-07-31")).toEqual([]);
  });
});
