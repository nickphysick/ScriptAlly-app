/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 — the pure model's locks: the glyph row's counts, the headings' sort, and the peek chain.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import {
  GLYPHS, glyphCounts, glyphFor, gapWords, peekChain, pressGlyph, pressedGlyph, pressHeading, sort138, stagePillLabel,
  DEFAULT_SORT_138, sentenceCase, trackLevel, dialOf, gapShort, tickPlan,
} from "./qc138";

const ALL = Object.values(QueryStatus);

describe("A · the glyph row", () => {
  it("every status counts under exactly one glyph, so the seven counts sum to N", () => {
    const rows = ALL.map((s) => ({ status: s }));
    const c = glyphCounts(rows);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(rows.length);
    for (const s of ALL) expect(GLYPHS.filter((g) => g.statuses.includes(s)).length, s).toBe(1);
  });
  it("a glyph filters to exactly what it counts, and pressing it again clears", () => {
    const set = pressGlyph([], "fr");
    expect(pressedGlyph(set)).toBe("fr");
    expect(stagePillLabel(set)).toBe("Full requested");
    for (const s of ALL) expect(set.includes(s), s).toBe(glyphFor(s) === "fr");
    expect(pressGlyph(set, "fr")).toEqual([]);
  });
  it("the dashed ring marks exactly the your-move stages", () => {
    expect(GLYPHS.filter((g) => g.yours).map((g) => g.key)).toEqual(["pr", "fr", "of"]);
  });
});

describe("C · the headings sort, within groups, empties last", () => {
  const row = (id: string, name: string, due: number | null) => ({
    id, agentName: name, status: QueryStatus.QUERIED, expectedMs: due, court: due == null ? "agent" : "agent", pastExpected: false, sentMs: 1, materialsRecorded: true, query: {},
  });
  const ctx = { packageName: () => null, nextLabel: () => null };
  it("Due ascending is the default, an undated row last either way", () => {
    expect(DEFAULT_SORT_138).toEqual({ key: "due", reversed: false });
    const rows = [row("a", "A Z", 30), row("b", "B Y", null), row("c", "C X", 10)];
    expect(sort138(rows, { key: "due", reversed: false }, ctx).map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sort138(rows, { key: "due", reversed: true }, ctx).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
  it("agent sorts by surname, and a second press reverses", () => {
    const rows = [row("a", "Ann Zed", 1), row("b", "Bo Able", 1)];
    expect(sort138(rows, { key: "agent", reversed: false }, ctx).map((r) => r.id)).toEqual(["b", "a"]);
    expect(pressHeading({ key: "agent", reversed: false }, "agent")).toEqual({ key: "agent", reversed: true });
    expect(pressHeading({ key: "agent", reversed: true }, "due")).toEqual({ key: "due", reversed: false });
  });
});

describe("E · rows", () => {
  it("details are in sentence case, never mono capitals", () => {
    expect(sentenceCase("OVERDUE SINCE 11 JUN")).toBe("Overdue since 11 Jun");
    expect(sentenceCase("BY FRI 9 OCT · 2 DAYS LEFT")).toBe("By Fri 9 Oct · 2 days left");
  });
  it("the track's level is the furthest stage", () => {
    expect(trackLevel({ status: QueryStatus.QUERIED, furthest: "query" })).toBe(0);
    expect(trackLevel({ status: QueryStatus.REJECTED, furthest: "full" })).toBe(2);
    expect(trackLevel({ status: QueryStatus.OFFER, furthest: "full" })).toBe(3);
  });
  it("the dial: a 4% floor, and over once the day has passed", () => {
    const now = Date.parse("2026-10-14T12:00:00");
    const base = { status: QueryStatus.QUERIED, court: "agent", pastExpected: false, sentMs: 0, materialsRecorded: true, query: {}, lastMs: now };
    expect(dialOf({ ...base, expectedMs: now + 1e9, stageStartMs: now }, now)!.frac).toBe(0.04);
    expect(dialOf({ ...base, expectedMs: now - 3 * 86_400_000, stageStartMs: now - 9e9 }, now)!.over).toBe(true);
    expect(dialOf({ ...base, court: "closed", expectedMs: now, stageStartMs: now }, now)).toBeNull();
  });
});

describe("F · the peek is a chain, never a scale", () => {
  const now = Date.parse("2026-10-14T12:00:00");
  const D = 86_400_000;
  it("never more than five stops; the first, the latest and the end stops always show", () => {
    const events = Array.from({ length: 9 }, (_, i) => ({ name: `E${i}`, ms: now - (40 - i * 4) * D }));
    const ch = peekChain(events, { due: now - 2 * D, now, closed: false, yours: false });
    expect(ch.stops.length).toBeLessThanOrEqual(5);
    expect(ch.stops[0].name).toBe("E0");
    expect(ch.stops.map((s) => s.kind)).toEqual(["event", "more", "event", "wasdue", "today"]);
    expect(ch.stops[2].name).toBe("E8");
    expect(ch.segs[2].kind).toBe("done");
    expect(ch.segs[3]).toMatchObject({ kind: "over", label: "2 days over" });
  });
  it("same-day events merge, and an event today takes the Today ring", () => {
    const ch = peekChain([{ name: "Queried", ms: now - 3_600_000 }], { due: now, now, closed: false, yours: false });
    expect(ch.stops).toHaveLength(1);
    expect(ch.stops[0]).toMatchObject({ name: "Queried · Due today", today: true });
  });
  it("a closed query ends at its closing event, with no Today", () => {
    const ch = peekChain([{ name: "Queried", ms: now - 90 * D }, { name: "Passed", ms: now - 10 * D }], { due: null, now, closed: true, yours: false });
    expect(ch.stops.map((s) => s.kind)).toEqual(["event", "event"]);
  });
  /* v138.1 §D re-point: drawn to scale, a gap grows linearly with its days (floor 0.35), no longer log2 */
  it("a segment's flex is its length in days, floored at 0.35, and the gap words follow the pack", () => {
    const ch = peekChain([{ name: "Queried", ms: now - 30 * D }], { due: now + 20 * D, now, closed: false, yours: false });
    expect(ch.segs[0].grow).toBe(30);
    expect(peekChain([{ name: "A", ms: now - 3_600_000 }, { name: "B", ms: now - 1_800_000 }], { due: null, now, closed: true, yours: false }).stops.length).toBe(1);
    expect([gapShort(3), gapShort(20), gapShort(100), gapShort(3846)]).toEqual(["3d", "3w", "3mo", "10y"]);
    expect([gapWords(0), gapWords(3), gapWords(20), gapWords(100), gapWords(3846)]).toEqual(["same day", "3 days", "3 weeks", "3 months", "10 yrs 6 mo"]);
  });
  it("the ruler: the smallest unit whose ticks sit 6px apart on the widest gap; none under 4px or under one unit", () => {
    const p = tickPlan([{ days: 60, px: 44 }, { days: 3846, px: 1380 }]);
    expect(p.unit?.name).toBe("month");
    expect(p.ticks[1].n).toBe(126);
    expect(p.ticks[0].step).toBeCloseTo((30.4375 * 44) / 60);
    expect(tickPlan([{ days: 5, px: 500 }]).ticks[0]).toEqual({ n: 0, step: 0 });
    expect(tickPlan([{ days: 2777, px: 300 }, { days: 2, px: 44 }]).unit?.name).toBe("quarter");
  });
});
