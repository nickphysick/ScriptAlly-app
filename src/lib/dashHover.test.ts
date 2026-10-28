/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v116 — the pure halves of the hover detail: the week callout's figures, the stepped
 * stack's geometry and on-screen rule, the closed and agent card lists, and the founding header swap.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import {
  agentCards, closedCards, fitStack, founderSwap, stackCap, stepAt, weekCallout, STACK_MAX,
} from "./dashHover";
import { closedTile } from "./dashClosed";
import { ZERO_STATS } from "./foundingStats";

const iso = (d: string) => new Date(`${d}T12:00:00Z`).toISOString();
const agent = (id: string, name: string, agency: string, genres: string[] = [], added = "2026-08-01"): Agent =>
  ({ id, name, agency, genres, dateAdded: iso(added) } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, sent: string, last?: string, ms = "m1"): Query =>
  ({ id, agentId, manuscriptId: ms, status, dateSent: iso(sent), lastStatusChange: last ? iso(last) : undefined } as unknown as Query);

describe("weekCallout", () => {
  const mix = (rows: [QueryStatus, number][], undated = 0) => ({ total: rows.reduce((s, r) => s + r[1], 0) + undated, rows: rows.map(([status, count]) => ({ status, count })), undated });
  it("folds the stages into Queried / Partial out / Full out, and they sum to the count", () => {
    const c = weekCallout(mix([[QueryStatus.QUERIED, 11], [QueryStatus.PARTIAL_REQUESTED, 1], [QueryStatus.PARTIAL_SENT, 2], [QueryStatus.FULL_SENT, 1], [QueryStatus.OFFER, 1]]), 16);
    expect(c.groups.map((g) => [g.label, g.n])).toEqual([["Queried", 11], ["Partial out", 3], ["Full out", 2]]);
    expect(c.groups.reduce((s, g) => s + g.n, 0) + c.undated).toBe(c.total);
  });
  it("says the change on the previous week: up, down and none", () => {
    expect(weekCallout(mix([[QueryStatus.QUERIED, 18]]), 16).delta).toEqual({ kind: "up", text: "▲ 2 on last week" });
    expect(weekCallout(mix([[QueryStatus.QUERIED, 14]]), 16).delta).toEqual({ kind: "down", text: "▼ 2 on last week" });
    expect(weekCallout(mix([[QueryStatus.QUERIED, 16]]), 16).delta).toEqual({ kind: "same", text: "no change" });
    expect(weekCallout(mix([[QueryStatus.QUERIED, 16]]), null).delta.kind).toBe("same");
  });
  it("keeps a query whose stage is not dated as its own row, never folded into a known one", () => {
    const c = weekCallout(mix([[QueryStatus.QUERIED, 3]], 2), 5);
    expect(c.undated).toBe(2);
    expect(c.groups.reduce((s, g) => s + g.n, 0)).toBe(3);
  });
});

describe("the stepped stack", () => {
  it("places card i at (14i, 38i), tilted about the middle card", () => {
    expect(stepAt(0, 5)).toEqual({ x: 0, y: 0, rot: -1.6 });
    expect(stepAt(4, 5)).toEqual({ x: 56, y: 152, rot: 1.6 });
    expect(stepAt(1, 3).rot).toBeCloseTo(0);
  });
  it("shows at most five, and fewer when five would not fit the height", () => {
    expect(STACK_MAX).toBe(5);
    expect(stackCap(9, 116, 22, 900)).toBe(5);
    expect(stackCap(3, 116, 22, 900)).toBe(3);
    /* 116 + 8 + 22 + 24 of margin = 170: room for (h − 170)/38 + 1 cards */
    const few = stackCap(9, 116, 22, 290);
    expect(few).toBeGreaterThan(0);
    expect(few).toBeLessThan(5);
    expect((few - 1) * 38 + 116 + 8 + 22).toBeLessThanOrEqual(290 - 24);
    expect(stackCap(9, 116, 22, 60)).toBe(1);
  });
  it("moves a stack that would cross the bottom or right edge to 12px inside, never above or left of 12", () => {
    expect(fitStack({ left: 1300, top: 700, w: 270, h: 300 }, 1440, 900)).toEqual({ dx: 1440 - 12 - 1570, dy: 900 - 12 - 1000 });
    expect(fitStack({ left: 100, top: 100, w: 200, h: 200 }, 1440, 900)).toEqual({ dx: 0, dy: 0 });
    expect(fitStack({ left: 5, top: 5, w: 200, h: 2000 }, 1440, 900)).toEqual({ dx: 7, dy: 7 });
  });
});

describe("closedCards", () => {
  const agents = [agent("a1", "Tom Okafor", "Okafor & Reid"), agent("a2", "Harriet Vane", "Vane Literary"), agent("a3", "Priya Raman", "Raman Associates")];
  const queries = [
    query("q1", "a1", QueryStatus.NO_RESPONSE, "2026-06-21", "2026-10-04"),
    query("q2", "a3", QueryStatus.NO_RESPONSE, "2026-07-02", "2026-10-08"),
    query("q3", "a2", QueryStatus.REJECTED, "2026-08-12", "2026-10-03"),
  ];
  const tile = closedTile(queries, []);
  it("lists one category, newest closed first, with what the card needs", () => {
    const q = closedCards(tile, "quiet", queries, agents);
    expect(q.map((c) => c.name)).toEqual(["Priya Raman", "Tom Okafor"]);
    expect(q[1]).toMatchObject({ agency: "Okafor & Reid", outcome: "quiet", queried: "21 Jun", end: "15 wks" });
    const p = closedCards(tile, "letter", queries, agents);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ name: "Harriet Vane", outcome: "passed", queried: "12 Aug", end: "Passed 3 Oct" });
    expect(closedCards(tile, "full", queries, agents)).toEqual([]);
  });
});

describe("agentCards", () => {
  const agents = [agent("a1", "Jonathan Marsh", "The Marsh Agency", ["Crime", "Thriller"]), agent("a2", "Tom Okafor", "Okafor & Reid", ["Thriller"]), agent("a3", "Priya Raman", "Raman Associates", ["Crime"], "2026-09-01")];
  const queries = [query("q1", "a1", QueryStatus.QUERIED, "2026-09-01"), query("q2", "a2", QueryStatus.REJECTED, "2026-08-01", "2026-09-10")];
  it("lists the agents with one status, with their genres", () => {
    expect(agentCards(agents, queries, "m1", "querying").map((a) => a.name)).toEqual(["Jonathan Marsh"]);
    expect(agentCards(agents, queries, "m1", "closed").map((a) => a.name)).toEqual(["Tom Okafor"]);
    const n = agentCards(agents, queries, "m1", "none");
    expect(n).toEqual([{ id: "a3", name: "Priya Raman", agency: "Raman Associates", genres: ["Crime"], status: "none" }]);
  });
});

describe("founderSwap", () => {
  it("names the contributions and the distance to the next rank", () => {
    expect(founderSwap({ ...ZERO_STATS, contributions: 4, tier: "archivist", nextTier: "scout", toNext: 4 })).toBe("4 CONTRIBUTIONS · 4 TO SCOUT");
    expect(founderSwap({ ...ZERO_STATS, contributions: 1, tier: "fledgling", nextTier: "archivist", toNext: 2 })).toBe("1 CONTRIBUTION · 2 TO ARCHIVIST");
    expect(founderSwap({ ...ZERO_STATS, contributions: 27, tier: "queryhawk", nextTier: null, toNext: null })).toBe("27 CONTRIBUTIONS · TOP RANK");
    expect(founderSwap({ ...ZERO_STATS })).toBe("NO CONTRIBUTIONS YET");
  });
});
