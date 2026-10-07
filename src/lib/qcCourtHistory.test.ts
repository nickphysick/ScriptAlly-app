/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D6 · the running count: which court a query stood in at the end of each of the last ten weeks, read
 * from its own dated status history — never from its current status.
 */
import { describe, it, expect } from "vitest";
import { Activity, Agent, Query, QueryStatus } from "../types";
import { buildQcRows } from "./qcSummary";
import { deskWeeks } from "./qcDeskWeeks";
import { courtAt, courtSeries, courtChange, TREND_WEEKS } from "./qcCourtHistory";

const DAY = 86_400_000;
/* a Wednesday afternoon in London, well clear of the clock change */
const NOW = Date.UTC(2026, 9, 7, 14);
const W = deskWeeks(NOW, TREND_WEEKS);
const mid = (i: number) => W[i] + 2 * DAY + 10 * 3_600_000;   /* Wednesday of week i */
const iso = (ms: number) => new Date(ms).toISOString();

let n = 0;
const agent = { id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8 } as Agent;
const mkQ = (over: Partial<Query>): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, ...over,
} as Query);
const act = (q: Query, status: QueryStatus, ms: number): Activity =>
  ({ id: `${q.id}-${status}`, userId: "u", queryId: q.id, manuscriptId: "m1", activityType: "x" as never, description: "", details: "", date: iso(ms), resultingStatus: status });

describe("D6 · the court a query stood in, week by week", () => {
  it("queried in week 1, partial requested in week 5: with agents for weeks 1–4, with you from week 5", () => {
    const q = mkQ({ dateSent: iso(mid(0)), status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: iso(mid(4)), lastStatusChange: iso(mid(4)) });
    const [r] = buildQcRows([q], [agent], [act(q, QueryStatus.QUERIED, mid(0)), act(q, QueryStatus.PARTIAL_REQUESTED, mid(4))], NOW);
    const s = courtSeries([r], NOW);
    expect(s.agent.slice(0, 4), "weeks 1–4 with agents").toEqual([1, 1, 1, 1]);
    expect(s.you.slice(0, 4), "…and not with you").toEqual([0, 0, 0, 0]);
    expect(s.you.slice(4), "with you from week 5").toEqual([1, 1, 1, 1, 1, 1]);
    expect(s.agent.slice(4)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("a query closed in week 7 counts as closed from week 7", () => {
    const q = mkQ({ dateSent: iso(mid(1)), status: QueryStatus.REJECTED, rejectedDate: iso(mid(6)), lastStatusChange: iso(mid(6)) });
    const [r] = buildQcRows([q], [agent], [act(q, QueryStatus.QUERIED, mid(1)), act(q, QueryStatus.REJECTED, mid(6))], NOW);
    const s = courtSeries([r], NOW);
    expect(s.closed, "closed from week 7").toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
    expect(s.agent, "with agents weeks 2–6, nowhere before it was sent").toEqual([0, 1, 1, 1, 1, 1, 0, 0, 0, 0]);
  });
  it("before it was sent a query is in no court", () => {
    const q = mkQ({ dateSent: iso(mid(8)) });
    const [r] = buildQcRows([q], [agent], [act(q, QueryStatus.QUERIED, mid(8))], NOW);
    expect(courtAt(r, mid(3), NOW)).toBeNull();
    expect(courtAt(r, mid(9), NOW)).toBe("agent");
  });
  it("the last point is now and equals today's court counts; the stamp is now minus four weeks ago", () => {
    const a = mkQ({ dateSent: iso(mid(0)) });
    const b = mkQ({ dateSent: iso(mid(7)) });
    const rows = buildQcRows([a, b], [agent], [act(a, QueryStatus.QUERIED, mid(0)), act(b, QueryStatus.QUERIED, mid(7))], NOW);
    const s = courtSeries(rows, NOW);
    expect(s.weeks.length).toBe(TREND_WEEKS);
    expect(s.agent[TREND_WEEKS - 1]).toBe(2);
    expect(courtChange(rows, "agent", NOW)).toBe(1);   /* b arrived inside the last four weeks */
  });
});
