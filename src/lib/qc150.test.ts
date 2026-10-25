/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 — the stat cards' model and Birds-eye's groups and bars. The counts are asserted EQUAL to
 * `whereCounts` (the retired chips' own numbers), never to literals on both sides.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { whereCounts, type QcRow } from "./qcSummary";
import { eyeRows } from "./qcBirdsEye";
import { beGroups, beLine, beScale, beTicks, closedCount, statCards } from "./qc150";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 24, 12).getTime();
let n = 0;
const row = (status: QueryStatus, expectedMs: number | null, o: { name?: string; court?: string; nudged?: boolean; stage?: number | null; spans?: QcRow["history"]["spans"] } = {}): QcRow => {
  n++;
  const name = o.name ?? `Agent ${n}`;
  const court = o.court ?? (status === QueryStatus.QUERIED || status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT ? "agent"
    : status === QueryStatus.REJECTED || status === QueryStatus.WITHDRAWN || status === QueryStatus.NO_RESPONSE ? "closed" : status === QueryStatus.OFFER ? "offer" : "you");
  return {
    id: `q${n}`, query: { id: `q${n}`, agentId: `a${n}`, lastNudgeSentDate: o.nudged ? "2026-09-01" : undefined } as unknown as Query,
    status, court, withYou: court === "you", agentName: name, agency: "An Agency", agencyKey: "An Agency",
    initials: name.split(" ").map((w) => w[0]).join(""), expectedMs, stageStartMs: o.stage === undefined ? NOW - 30 * DAY : o.stage,
    sentMs: NOW - 60 * DAY, lastMs: NOW - n * DAY,
    history: { spans: o.spans ?? [{ status, startMs: NOW - 30 * DAY, endMs: null, current: true }], currentStartMs: NOW - 30 * DAY, dated: true },
  } as unknown as QcRow;
};

const rows = [
  row(QueryStatus.OFFER, NOW + 1 * DAY, { name: "Tom Ellery" }),
  row(QueryStatus.FULL_REQUESTED, NOW + 7 * DAY, { name: "Jonathan Marsh" }),
  row(QueryStatus.QUERIED, NOW + 3 * DAY),                 /* with the agent, due this week */
  row(QueryStatus.QUERIED, NOW + 30 * DAY),                /* with the agent, later */
  row(QueryStatus.QUERIED, NOW - 10 * DAY),                /* past the reply date, inside the nudge window: Your move */
  row(QueryStatus.QUERIED, NOW - 60 * DAY),                /* gone quiet, never nudged */
  row(QueryStatus.FULL_SENT, NOW - 90 * DAY, { nudged: true }), /* gone quiet, nudged */
  row(QueryStatus.REJECTED, null), row(QueryStatus.REJECTED, null), row(QueryStatus.WITHDRAWN, null),
];

describe("v150 B — the stat cards", () => {
  const cards = statCards(rows, NOW);
  it("four cards, in order, each count equal to the retired chip's (whereCounts)", () => {
    expect(cards.map((c) => c.key)).toEqual(["you", "agent", "quiet", "closed"]);
    const w = whereCounts(rows, NOW);
    expect(cards.map((c) => c.count)).toEqual([w.you, w.agent, w.quiet, w.closed]);
    expect(cards.reduce((s, c) => s + c.count, 0)).toBe(rows.length);
  });
  it("one face per query, capped, the rest as +N", () => {
    for (const c of cards) expect(c.faces.length + c.more).toBe(c.count);
    const many = statCards(Array.from({ length: 9 }, () => row(QueryStatus.QUERIED, NOW + 40 * DAY)), NOW);
    expect(many[1].faces.length).toBe(5);
    expect(many[1].more).toBe(4);
  });
  it("Your move names the most urgent: the agent's thing and when", () => {
    expect(cards[0].next).toEqual({ who: expect.stringContaining("nudge"), what: "10 days over" });
  });
  it("With the agent counts replies due within 7 days", () => {
    expect(cards[1].detail).toEqual({ kind: "due", n: 1 });
  });
  it("Gone quiet counts the ones with no nudge on record (Nick's ruling)", () => {
    expect(cards[2].count).toBe(2);
    expect(cards[2].detail).toEqual({ kind: "nudge", n: 1 });
  });
  it("Closed splits into its non-zero parts", () => {
    expect(cards[3].detail).toEqual({ kind: "split", parts: [{ n: 2, word: "passes" }, { n: 1, word: "withdrawn" }] });
  });
});

describe("v150 D — Birds-eye", () => {
  it("never draws a closed query; the footer counts them over the same set", () => {
    const g = beGroups(rows, "urgency", "due", NOW);
    expect(g.flatMap((x) => x.rows).length).toBe(rows.length - 3);
    expect(closedCount(rows, NOW)).toBe(3);
  });
  it("Status groups follow the pipeline and hide empty stages", () => {
    const g = beGroups(rows, "status", "due", NOW);
    expect(g.map((x) => x.label)).toEqual(["Queried", "Full requested", "Full sent", "Offer"]);
  });
  it("a query with three dated stages draws two past bars and the current, in date order, never overlapping", () => {
    const r = row(QueryStatus.FULL_SENT, NOW + 20 * DAY, { stage: NOW - 10 * DAY, spans: [
      { status: QueryStatus.QUERIED, startMs: NOW - 60 * DAY, endMs: NOW - 40 * DAY, current: false },
      { status: QueryStatus.FULL_REQUESTED, startMs: NOW - 40 * DAY, endMs: NOW - 10 * DAY, current: false },
      { status: QueryStatus.FULL_SENT, startMs: NOW - 10 * DAY, endMs: null, current: true },
    ] });
    const l = beLine(eyeRows([r], NOW)[0], NOW);
    expect(l.past.length).toBe(2);
    expect(l.cur).not.toBeNull();
    const all = [...l.past, l.cur!];
    for (let i = 1; i < all.length; i++) expect(all[i].fromMs).toBeGreaterThanOrEqual(all[i - 1].toMs);
  });
  it("ticks keep 44px clear of today", () => {
    const lines = eyeRows(rows, NOW).map((r) => beLine(r, NOW));
    const s = beScale(lines, 91, 714, NOW);
    const tx = ((new Date(NOW).setHours(0, 0, 0, 0) - s.r0) / DAY) * s.ppd;
    for (const t of beTicks(s, NOW)) expect(Math.abs(t.x - tx)).toBeGreaterThanOrEqual(44);
  });
});
