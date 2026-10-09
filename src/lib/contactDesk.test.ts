/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactDesk — Contact list v15.2 §2: the desk's three icon cards, as data.
 */
import { describe, it, expect } from "vitest";
import type { Agent, Query } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { deskModel, monthOnMonth, weekOnWeek } from "./contactDesk";
import { facesModel } from "./contactFaces";
import { nextStep } from "./contactNextStep";

const NOW = new Date(2026, 9, 15, 12); // Thu 15 Oct 2026, local
let n = 0;
const ag = (p: Partial<Agent> = {}): Agent => ({
  id: `a${++n}`, name: `Agent ${n}`, agency: "", genres: ["thriller"], submissionStatus: SubmissionStatus.OPEN,
  dateAdded: "2026-01-10T10:00:00.000Z", ...p,
}) as Agent;
const q = (agentId: string, status: QueryStatus, dateSent: string | undefined, p: Partial<Query> = {}): Query =>
  ({ id: `q-${agentId}-${status}-${dateSent}`, agentId, manuscriptId: "ms1", status, dateSent, ...p }) as unknown as Query;
const HK = { complete: 31, total: 41, gaps: 14, gapAgents: 10 };

describe("the desk (v15.2 §2)", () => {
  /* NOW is Thu 15 Oct 2026: this London week began Mon 12 Oct, last week Mon 5 Oct */
  const wk = (thisW: number, lastW: number) => [
    ...Array.from({ length: thisW }, () => ag({ dateAdded: "2026-10-13T09:00:00.000Z" })),
    ...Array.from({ length: lastW }, () => ag({ dateAdded: "2026-10-07T09:00:00.000Z" })),
    ag({ dateAdded: "2026-08-26T09:00:00.000Z" }), ag(),
  ];
  it("the first card is about THIS WEEK: '{n} added this week', and never the count on file (v15.3 N6)", () => {
    const m = deskModel({ agents: wk(2, 1), queries: [], msId: "ms1", now: NOW, hk: HK });
    expect([m.week.figure, m.week.rest]).toEqual(["2", "added this week"]);
    expect(m.week.label).toBe("2 agents added this week, 4 in the last 8 weeks");
    for (const c of [m.week, m.queried, m.profiles]) expect(`${c.figure} ${c.rest}`).not.toMatch(/on file/);
    expect(deskModel({ agents: wk(0, 0), queries: [], msId: "ms1", now: NOW, hk: HK }).week.figure).toBe("0");
    expect(deskModel({ agents: wk(1, 0), queries: [], msId: "ms1", now: NOW, hk: HK }).week.label).toMatch(/^1 agent added this week/);
  });
  it("the comparison names more, fewer and same, each entered (v15.3 N6)", () => {
    const of = (t: number, l: number) => deskModel({ agents: wk(t, l), queries: [], msId: "ms1", now: NOW, hk: HK }).week.mom;
    expect(of(3, 1)).toEqual({ dir: "up", n: 2, text: "2 more than last week" });
    expect(of(1, 4)).toEqual({ dir: "down", n: 3, text: "3 fewer than last week" });
    expect(of(2, 2)).toEqual({ dir: "none", n: 0, text: "Same as last week" });
    expect(of(0, 0).text).toBe("Same as last week");
    expect(new Set([weekOnWeek(2, 1).dir, weekOnWeek(1, 2).dir, weekOnWeek(1, 1).dir]).size).toBe(3);
  });
  it("8 weekly bars, oldest first, this week last; weeks are Monday to Sunday by the London calendar", () => {
    const agents = [
      ag({ dateAdded: "2026-10-11T22:30:00.000Z" }), // Sun 11 Oct 23:30 BST: LAST week
      ag({ dateAdded: "2026-10-11T23:30:00.000Z" }), // Mon 12 Oct 00:30 BST: THIS week, though still Sunday in UTC
      ag({ dateAdded: "2026-08-26T09:00:00.000Z" }), // the week of 24 Aug: the first of the eight
      ag({ dateAdded: "2026-08-20T09:00:00.000Z" }), // before the eight weeks: in no bar
      ag({ dateAdded: "2026-10-20T09:00:00.000Z" }), // after now: in no bar
      ag({ dateAdded: "" }),                          // no readable date: in no bar
    ];
    const m = deskModel({ agents, queries: [], msId: "ms1", now: NOW, hk: HK });
    expect(m.week.bars).toEqual([1, 0, 0, 0, 0, 0, 1, 1]);
    expect(m.week.total).toBe(3);
    expect(m.week.figure).toBe(String(m.week.bars[7]));
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
    expect([m.queried.figure, m.queried.rest]).toEqual(["4", "of 5 queried"]);
    expect([m.queried.active, m.queried.closed, m.queried.total]).toEqual([2, 2, 5]);
    /* the ring's parts: active + closed = queried, and the rest of N is not yet queried */
    expect(m.queried.active + m.queried.closed).toBe(m.queried.queried);
    /* d's first query for this book went out this month */
    expect(m.queried.mom).toEqual({ dir: "up", n: 1, text: "1 since last month" });
    expect(m.queried.label).toBe("4 of 5 agents queried: 2 active, 2 closed");
  });
  it("a query with no sent date counts as queried, and never as this month's change (ruling 5–6)", () => {
    const a = ag(), b = ag();
    const m = deskModel({ agents: [a, b], queries: [q(a.id, QueryStatus.QUERIED, undefined), q(b.id, QueryStatus.QUERIED, "2026-10-13")], msId: "ms1", now: NOW, hk: HK });
    expect(m.queried.figure).toBe("2");
    expect(m.queried.mom?.n).toBe(1);
  });
  it("Profiles complete: Housekeeping's own measure; its month on month is hidden (no snapshot to state it from)", () => {
    const m = deskModel({ agents: [ag()], queries: [], msId: "ms1", now: NOW, hk: HK });
    expect([m.profiles.figure, m.profiles.rest, m.profiles.mom]).toEqual(["76%", "profiles complete", null]);
    expect([m.profiles.pct, m.profiles.filled, m.profiles.total]).toEqual([76, 31, 41]);
  });
  it("the desk's Queried figure IS the next step's queried count (v15 lock 6) — two derivations against each other", () => {
    const a = ag(), b = ag({ genres: ["romance"] }), c = ag({ submissionStatus: SubmissionStatus.CLOSED }), d = ag(), e = ag({ genres: [] });
    const agents = [a, b, c, d, e];
    const queries = [
      q(a.id, QueryStatus.QUERIED, "2026-10-05"), q(a.id, QueryStatus.REJECTED, "2026-06-01"),
      q(b.id, QueryStatus.WITHDRAWN, "2026-08-01"), q(c.id, QueryStatus.NO_RESPONSE, undefined),
      q(d.id, QueryStatus.QUERIED, "2026-10-05", { manuscriptId: "ms2" }),
      /* a query whose agent has left the list counts on neither side */
      q("gone", QueryStatus.QUERIED, "2026-10-05"),
    ];
    for (const msId of ["ms1", "ms2", null]) {
      const desk = deskModel({ agents, queries, msId, now: NOW, hk: HK });
      const step = nextStep({ agents, queries, msId, book: ["Thriller"], todayIso: "2026-10-15" });
      expect(Number(desk.queried.figure), `msId ${msId}`).toBe(step.queried);
      expect(desk.queried.rest).toBe(`of ${step.total} queried`);
    }
  });
  /* K3 — the three branches, by fixture: on today's data neither count can fall, so the down branch is only reachable here */
  it("month on month: up, down and none, each in its own words; Profiles' unit is points", () => {
    expect(monthOnMonth(4)).toEqual({ dir: "up", n: 4, text: "4 since last month" });
    expect(monthOnMonth(-3)).toEqual({ dir: "down", n: 3, text: "3 since last month" });
    expect(monthOnMonth(0)).toEqual({ dir: "none", n: 0, text: "No change since last month" });
    expect(monthOnMonth(5, "pts").text).toBe("5 pts since last month");
    const seen = new Set([monthOnMonth(4).dir, monthOnMonth(-3).dir, monthOnMonth(0).dir]);
    expect([...seen].sort()).toEqual(["down", "none", "up"]);
  });
  it("no card states one fact twice: the line never carries the month's change, and the change never restates the figure", () => {
    const agents = [ag({ dateAdded: "2026-10-02T09:00:00.000Z" }), ag()];
    const m = deskModel({ agents, queries: [q(agents[0].id, QueryStatus.QUERIED, "2026-10-05")], msId: "ms1", now: NOW, hk: HK });
    for (const c of [m.week, m.queried, m.profiles]) {
      expect(/month/.test(`${c.figure} ${c.rest}`), c.rest).toBe(false);
      if (c.mom) expect(c.mom.text.includes(c.rest), c.mom.text).toBe(false);
    }
  });
});

/* ── v15.3 §3: the header's faces ── */
describe("the header's faces (v15.3 N2, N4)", () => {
  const cast = (active: number, closed: number, none: number) => {
    const agents: Agent[] = [], queries: Query[] = [];
    for (let i = 0; i < active; i++) { const a = ag({ name: `Active ${i}` }); agents.push(a); queries.push(q(a.id, QueryStatus.QUERIED, `2026-09-${String(10 + i).padStart(2, "0")}`)); }
    for (let i = 0; i < closed; i++) { const a = ag({ name: `Closed ${i}` }); agents.push(a); queries.push(q(a.id, QueryStatus.REJECTED, `2026-08-${String(10 + i).padStart(2, "0")}`)); }
    for (let i = 0; i < none; i++) agents.push(ag({ name: `Fresh ${i}`, dateAdded: `2026-07-${String(10 + i).padStart(2, "0")}T09:00:00.000Z` }));
    /* arrive in an order that is none of the orders under test */
    return { agents: [...agents].reverse().sort((p, r) => p.name.length - r.name.length || (p.id < r.id ? 1 : -1)), queries };
  };
  it("6 active, 3 closed, 5 not queried: 4 ink, 2 grey, 2 white, in that order, each most recent first", () => {
    const { agents, queries } = cast(6, 3, 5);
    const m = facesModel(agents, queries, "ms1");
    expect(m.faces.map((f) => f.state)).toEqual(["active", "active", "active", "active", "closed", "closed", "none", "none"]);
    expect(m.faces.map((f) => f.name)).toEqual(["Active 5", "Active 4", "Active 3", "Active 2", "Closed 2", "Closed 1", "Fresh 4", "Fresh 3"]);
    expect(m.counts).toEqual({ active: 6, closed: 3, none: 5 });
  });
  it("1 active, 0 closed, 9 not queried: 1 ink and 2 white, no grey — a group never fills another's slots", () => {
    const { agents, queries } = cast(1, 0, 9);
    const m = facesModel(agents, queries, "ms1");
    expect(m.faces.map((f) => f.state)).toEqual(["active", "none", "none"]);
    expect(m.counts).toEqual({ active: 1, closed: 0, none: 9 });
  });
  it("the key counts EVERY agent and sums to the total — and equals the Queried desk card (two derivations against each other)", () => {
    for (const [a, c, n] of [[6, 3, 5], [1, 0, 9], [0, 0, 4], [12, 7, 0]] as const) {
      const { agents, queries } = cast(a, c, n);
      const m = facesModel(agents, queries, "ms1");
      expect(m.counts.active + m.counts.closed + m.counts.none).toBe(agents.length);
      const d = deskModel({ agents, queries, msId: "ms1", now: NOW, hk: HK }).queried;
      expect([m.counts.active, m.counts.closed]).toEqual([d.active, d.closed]);
      expect(m.total - m.faces.length).toBe(agents.length - Math.min(4, a) - Math.min(2, c) - Math.min(2, n));
    }
  });
  it("status is the LATEST query's: reopened after a pass is active; another book's query is not this book's", () => {
    const a = ag({ name: "Ada Vale" }), b = ag({ name: "Bo" });
    const m = facesModel([a, b], [q(a.id, QueryStatus.REJECTED, "2026-06-01"), q(a.id, QueryStatus.QUERIED, "2026-09-01"), q(b.id, QueryStatus.QUERIED, "2026-09-01", { manuscriptId: "ms2" })], "ms1");
    expect(m.faces.map((f) => [f.initials, f.state, f.tip])).toEqual([["AV", "active", "Ada Vale · query active"], ["B", "none", "Bo · not queried yet"]]);
  });
});
