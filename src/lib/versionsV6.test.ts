/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — the pure helpers: the bands funnel's geometry (the ref's `fsvg`, style 2), the comparison's order and
 * each tile's leader, and the list's two sorts.
 */
import { describe, expect, it } from "vitest";
import type { V2Version } from "./bookVersions";
import { MIN_SENT_FOR_RATE, leagueOrder, type VersionFacts } from "./versionsV2";
import {
  FUNNEL_MIN, FUNNEL_PAD, MEASURES, MEASURE_LEAGUE, compareOrder, funnelGeometry, leaderFor, listOrder, ofSent, stageBandOf, stageHeight, toRank,
} from "./versionsV6";
import { QueryStatus } from "../types";

const V = (num: number, name = `V${num}`): V2Version => ({ id: `v${num}`, num, name, parentId: num ? "v0" : null, changes: [], original: !num, archived: false, archivedDate: null, createdDate: "2026-01-01", wordCount: null, raw: {} as never });
/** facts with only the fields the helpers read; `replied`, `more` are arrays of the right length */
const F = (num: number, n: number, rep: number, more: number, full: number, avg: number | null): VersionFacts => {
  const arr = (k: number) => Array.from({ length: k }, () => ({}) as never);
  const early = n < MIN_SENT_FOR_RATE;
  return { v: V(num), all: arr(n), qs: arr(n), n, replied: arr(rep), more: arr(more), offers: [], partial: more - full, full,
    avgReply: avg, replyN: avg == null ? 0 : rep, firstMs: null, lastMs: null,
    ratePct: early ? null : Math.round((more / n) * 100), repliedPct: early ? null : Math.round((rep / n) * 100), early };
};

describe("funnelGeometry — the ref's fsvg, style 2", () => {
  it("draws four stage heights in proportion to the counts across H − 6, sent full height", () => {
    const g = funnelGeometry({ sent: 9, replied: 4, more: 3, full: 1 }, 400, 120);
    const span = 120 - FUNNEL_PAD;
    expect(g.heights[0]).toBe(span);
    expect(g.heights[1]).toBeCloseTo((4 / 9) * span, 6);
    expect(g.heights[2]).toBeCloseTo((3 / 9) * span, 6);
    expect(g.heights[3]).toBeCloseTo((1 / 9) * span, 6);
  });
  it("three pieces across thirds, each starting where the last ended, centred on H/2, gaps at W/3 and 2W/3", () => {
    const g = funnelGeometry({ sent: 12, replied: 8, more: 3, full: 1 }, 300, 90);
    expect(g.pieces.map((p) => [p.x0, p.x1])).toEqual([[0, 100], [100, 200], [200, 300]]);
    expect(g.pieces[1].h0).toBe(g.pieces[0].h1);
    expect(g.pieces[2].h0).toBe(g.pieces[1].h1);
    expect(g.gaps).toEqual([100, 200]);
    expect(g.pieces[0].d.startsWith(`M0 ${45 - g.heights[0] / 2}`)).toBe(true);
    expect(g.pieces[0].d.endsWith("Z")).toBe(true);
  });
  it("each piece is no taller than the one before (monotone counts)", () => {
    const g = funnelGeometry({ sent: 14, replied: 9, more: 1, full: 0 }, 240, 88);
    for (let i = 1; i < 3; i++) expect(g.pieces[i].h0).toBeLessThanOrEqual(g.pieces[i - 1].h0);
  });
  it("a zero is still drawn, at the minimum, as the ref's thin line", () => {
    const g = funnelGeometry({ sent: 6, replied: 5, more: 0, full: 0 }, 240, 88);
    expect(g.heights[2]).toBe(FUNNEL_MIN);
    expect(g.heights[3]).toBe(FUNNEL_MIN);
  });
  it("Same scale: base is the largest sent, so a smaller version's first stage is shorter in proportion", () => {
    const a = funnelGeometry({ sent: 14, replied: 9, more: 1, full: 0 }, 240, 88, 14);
    const b = funnelGeometry({ sent: 7, replied: 4, more: 3, full: 1 }, 240, 88, 14);
    expect(b.heights[0] / a.heights[0]).toBeCloseTo(0.5, 6);
  });
  it("a base of zero draws only the minimum (never divides by zero)", () => {
    expect(stageHeight(0, 0, 88)).toBe(FUNNEL_MIN);
    expect(funnelGeometry({ sent: 0, replied: 0, more: 0, full: 0 }, 240, 88).heights).toEqual([4, 4, 4, 4]);
  });
  it("ofSent rounds to whole per cent and is null with nothing sent", () => {
    expect(ofSent(4, 9)).toBe(44);
    expect(ofSent(1, 9)).toBe(11);
    expect(ofSent(0, 0)).toBeNull();
  });
});

/* the ref's everyday seed: 1 Original 14/9/1/0 34d · 2 Prologue cut 12/8/3/1 27d · 3 Fast 9/4/3/1 19d · 4 World 6/5/0/0 22d · 5 Dual 0 */
const SEED = [F(0, 14, 9, 1, 0, 34), F(2, 12, 8, 3, 1, 27), F(3, 9, 4, 3, 1, 19), F(4, 6, 5, 0, 0, 22), F(5, 0, 0, 0, 0, null)];

describe("compareOrder / leaderFor — the tiles and the cards agree", () => {
  it("ranked versions only, ordered by leagueOrder under each measure; unranked after, most sent first", () => {
    for (const k of MEASURES) {
      const o = compareOrder(SEED, k);
      expect(o.ranked.map((f) => f.v.num)).toEqual(leagueOrder(SEED.filter((f) => !f.early), MEASURE_LEAGUE[k]).map((f) => f.v.num));
      expect(o.unranked.map((f) => f.v.num)).toEqual([5]);
    }
  });
  it("the ref's leaders: 33% Fast-paced, 14 queries Original, 19 days Fast-paced", () => {
    expect(leaderFor(SEED, "rate")?.v.num).toBe(3);
    expect(leaderFor(SEED, "sent")?.v.num).toBe(0);
    expect(leaderFor(SEED, "fast")?.v.num).toBe(3);
  });
  it("the ref's card order by request rate: 3, 2, 1(Original), 4, then Dual", () => {
    const o = compareOrder(SEED, "rate");
    expect([...o.ranked, ...o.unranked].map((f) => f.v.num)).toEqual([3, 2, 0, 4, 5]);
  });
  it("each tile's leader is the first card under its measure", () => {
    for (const k of MEASURES) expect(leaderFor(SEED, k)).toBe(compareOrder(SEED, k).ranked[0]);
  });
  it("no ranked version: no leader", () => {
    expect(leaderFor([F(0, 3, 1, 1, 0, 12), F(1, 0, 0, 0, 0, null)], "rate")).toBeNull();
  });
  it("fastest replies puts a ranked version with no replies last, never first", () => {
    const fs = [F(0, 6, 0, 0, 0, null), F(1, 5, 2, 1, 0, 40)];
    expect(leaderFor(fs, "fast")?.v.num).toBe(1);
  });
  it("toRank counts down to MIN_SENT_FOR_RATE and stops at zero", () => {
    expect(toRank({ n: 3 })).toBe(MIN_SENT_FOR_RATE - 3);
    expect(toRank({ n: 9 })).toBe(0);
  });
});

describe("stageBandOf — one band per status, every status placed", () => {
  it("places each status on the ref's four bands", () => {
    const got = Object.fromEntries(Object.values(QueryStatus).map((s) => [s, stageBandOf(s)]));
    expect(got).toEqual({
      "Queried": "queried", "Partial Requested": "partial", "Partial Sent": "partial", "Full Requested": "full", "Full Sent": "full",
      "Revise & Resubmit": "full", "Offer": "full", "Rejected": "closed", "Withdrawn": "closed", "No Response": "closed", "Resubmitted": "full", "Signed": "full",
    });
  });
});

describe("listOrder — Newest first / Most requests first", () => {
  const live = SEED.map((f) => f.v);
  const facts = new Map(SEED.map((f) => [f.v.id, f]));
  it("newest first is by number, high first", () => {
    expect(listOrder(live, facts, "new").map((v) => v.num)).toEqual([5, 4, 3, 2, 0]);
  });
  it("most requests first: ranked by asked-for-more rate, then the unranked", () => {
    expect(listOrder(live, facts, "best").map((v) => v.num)).toEqual([3, 2, 0, 4, 5]);
  });
});
