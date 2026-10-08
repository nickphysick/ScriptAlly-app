/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactDesk — Contact list v15 §3: the desk's three cards, as data.
 */
import { describe, it, expect } from "vitest";
import type { Agent, Query } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { deskModel, monthStamp } from "./contactDesk";

const NOW = new Date(2026, 9, 15, 12); // Thu 15 Oct 2026, local
let n = 0;
const ag = (p: Partial<Agent> = {}): Agent => ({
  id: `a${++n}`, name: `Agent ${n}`, agency: "", genres: ["thriller"], submissionStatus: SubmissionStatus.OPEN,
  dateAdded: "2026-01-10T10:00:00.000Z", ...p,
}) as Agent;
const q = (agentId: string, status: QueryStatus, dateSent: string | undefined, p: Partial<Query> = {}): Query =>
  ({ id: `q-${agentId}-${status}-${dateSent}`, agentId, manuscriptId: "ms1", status, dateSent, ...p }) as unknown as Query;
const HK = { complete: 31, total: 41, gaps: 14, gapAgents: 10 };

describe("the desk (v15 §3)", () => {
  it("On file: N, the open and the closed, the agents added this calendar month as the stamp", () => {
    const agents = [ag({ dateAdded: "2026-10-02T09:00:00.000Z" }), ag({ dateAdded: "2026-10-09T09:00:00.000Z" }), ag({ submissionStatus: SubmissionStatus.CLOSED })];
    const m = deskModel({ agents, queries: [], msId: "ms1", now: NOW, hk: HK });
    expect([m.file.big, m.file.small, m.file.stamp]).toEqual(["3", "agents", "+2 this month"]);
    expect(m.file.rows.map((r) => [r.n, r.text])).toEqual([[2, "open to submissions"], [1, "closed for now"]]);
  });
  it("On file's trend is six month-end points, the last being now, from dateAdded", () => {
    const agents = [ag({ dateAdded: "2026-04-20T09:00:00.000Z" }), ag({ dateAdded: "2026-06-03T09:00:00.000Z" }), ag({ dateAdded: "2026-10-01T09:00:00.000Z" })];
    const m = deskModel({ agents, queries: [], msId: "ms1", now: NOW, hk: HK });
    expect(m.file.trend.values).toEqual([1, 2, 2, 2, 2, 3]); // end of May, Jun, Jul, Aug, Sep — then now
    expect(m.file.trend.startLabel).toBe("May");
  });
  it("Queried: agents with any query for this book, each read by its LATEST query; withdrawn counts as closed (ruling Q1)", () => {
    const a = ag(), b = ag(), c = ag(), d = ag(), e = ag();
    const queries = [
      q(a.id, QueryStatus.REJECTED, "2026-06-01"), q(a.id, QueryStatus.FULL_REQUESTED, "2026-09-10"),
      q(b.id, QueryStatus.NO_RESPONSE, "2026-07-01"),
      q(c.id, QueryStatus.WITHDRAWN, "2026-08-01"),
      q(d.id, QueryStatus.QUERIED, "2026-10-05"),
      q(e.id, QueryStatus.QUERIED, "2026-10-05", { manuscriptId: "ms2" }),
    ];
    const m = deskModel({ agents: [a, b, c, d, e], queries, msId: "ms1", now: NOW, hk: HK });
    expect([m.queried.big, m.queried.small]).toEqual(["4", "of 5"]);
    expect(m.queried.rows.map((r) => [r.n, r.text])).toEqual([[2, "active now"], [2, "closed"]]);
    /* d's first query for this book went out this month */
    expect(m.queried.stamp).toBe("+1 this month");
  });
  it("a query with no sent date counts as queried and lands in no week (ruling 5–6)", () => {
    const a = ag(), b = ag();
    const m = deskModel({ agents: [a, b], queries: [q(a.id, QueryStatus.QUERIED, undefined), q(b.id, QueryStatus.QUERIED, "2026-10-13")], msId: "ms1", now: NOW, hk: HK });
    expect(m.queried.big).toBe("2");
    expect(m.queried.bars.values.reduce((x, y) => x + y, 0)).toBe(1);
  });
  it("Queried's bars: thirteen weeks, Monday-based, this week last; the axis starts at the first week's month", () => {
    const a = ag();
    /* Mon 12 Oct is this week's start; Mon 20 Jul is the first of the thirteen (12 weeks before) */
    const queries = [q(a.id, QueryStatus.QUERIED, "2026-10-12"), q(a.id, QueryStatus.QUERIED, "2026-10-14", { id: "x2" }), q(a.id, QueryStatus.QUERIED, "2026-07-20", { id: "x3" }), q(a.id, QueryStatus.QUERIED, "2026-07-21", { id: "x4" })];
    const m = deskModel({ agents: [a], queries, msId: "ms1", now: NOW, hk: HK });
    expect(m.queried.bars.values).toHaveLength(13);
    expect(m.queried.bars.values[12]).toBe(2);
    /* the first week is Mon 20 Jul – Sun 26 Jul: both July queries sit in it */
    expect(m.queried.bars.values[0]).toBe(2);
    expect(m.queried.bars.startLabel).toBe("Jul");
  });
  it("Profiles complete: Housekeeping's own measure; the stamp is hidden (no history to state it from)", () => {
    const m = deskModel({ agents: [ag()], queries: [], msId: "ms1", now: NOW, hk: HK });
    expect([m.profiles.big, m.profiles.small, m.profiles.stamp]).toEqual(["76%", null, null]);
    expect(m.profiles.rows.map((r) => [r.n, r.text])).toEqual([[14, "gaps to fill"], [10, "agents affected"]]);
    expect(m.profiles.bar.label).toBe("31 of 41 profiles complete");
  });
  it("a zero month says so, the Query Centre desk's way", () => {
    expect(monthStamp(0)).toBe("No change this month");
    expect(monthStamp(3)).toBe("+3 this month");
  });
  it("no card states one fact twice: no row repeats the stamp's figure and words", () => {
    const agents = [ag({ dateAdded: "2026-10-02T09:00:00.000Z" }), ag()];
    const m = deskModel({ agents, queries: [q(agents[0].id, QueryStatus.QUERIED, "2026-10-05")], msId: "ms1", now: NOW, hk: HK });
    for (const c of [m.file, m.queried, m.profiles]) {
      for (const r of c.rows) expect(/this month|added/.test(r.text), `${c.title}: ${r.text}`).toBe(false);
    }
  });
});
