/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactDesk — Contact list v15.2 §2: the desk's three icon cards, as data.
 */
import { describe, it, expect } from "vitest";
import type { Agent, Query } from "../types";
import { QueryStatus, SubmissionStatus } from "../types";
import { deskModel, monthOnMonth } from "./contactDesk";
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
  it("On file: the line, and the agents added this calendar month as its month on month", () => {
    const agents = [ag({ dateAdded: "2026-10-02T09:00:00.000Z" }), ag({ dateAdded: "2026-10-09T09:00:00.000Z" }), ag({ submissionStatus: SubmissionStatus.CLOSED })];
    const m = deskModel({ agents, queries: [], msId: "ms1", now: NOW, hk: HK });
    expect([m.file.figure, m.file.rest]).toEqual(["3", "agents on file"]);
    expect(m.file.mom).toEqual({ dir: "up", n: 2, text: "2 since last month" });
    expect(deskModel({ agents: [ag()], queries: [], msId: "ms1", now: NOW, hk: HK }).file.rest).toBe("agent on file");
  });
  it("On file's line is six month-end points, the last being now (= N), from dateAdded; and its change is the last step", () => {
    const agents = [ag({ dateAdded: "2026-04-20T09:00:00.000Z" }), ag({ dateAdded: "2026-06-03T09:00:00.000Z" }), ag({ dateAdded: "2026-10-01T09:00:00.000Z" })];
    const m = deskModel({ agents, queries: [], msId: "ms1", now: NOW, hk: HK });
    expect(m.file.trend.values).toEqual([1, 2, 2, 2, 2, 3]); // end of May, Jun, Jul, Aug, Sep — then now
    expect(m.file.trend.values[5]).toBe(agents.length);
    expect(m.file.trend.startLabel).toBe("May");
    /* two derivations against each other: the month on month IS now minus the end of last month */
    expect(m.file.mom?.n).toBe(m.file.trend.values[5] - m.file.trend.values[4]);
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
    for (const c of [m.file, m.queried, m.profiles]) {
      expect(/month/.test(`${c.figure} ${c.rest}`), c.rest).toBe(false);
      if (c.mom) expect(c.mom.text.includes(c.rest), c.mom.text).toBe(false);
    }
  });
});
