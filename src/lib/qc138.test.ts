/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 — the pure model's locks: the glyph row's counts, the headings' sort, and the peek chain.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import {
  GLYPHS, glyphCounts, glyphFor, gapWords, pressGlyph, pressedGlyph, pressHeading, sort138, stagePillLabel,
  DEFAULT_SORT_138, sentenceCase, trackLevel, dialOf, peekSummary, peekTone,
} from "./qc138";
import { tl4Stops } from "./qcTl4";

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

describe("v138.2 · the summary reads the peek's own dates", () => {
  const now = new Date(2026, 9, 8, 14).getTime();
  const d = (n: number) => now + n * 86_400_000;
  it("says how long it has been out and where it stands, in the chain's own words", () => {
    expect(peekSummary({ sent: d(-98), due: d(-8), closedAt: null, closed: false, yours: true, now })).toEqual({ head: "Out 3 months", line: "8 days past the date", hot: true });
    expect(peekSummary({ sent: d(-70), due: d(2), closedAt: null, closed: false, yours: false, now })).toEqual({ head: `Out ${gapWords(70)}`, line: "2 days until their reply date", hot: false });
    expect(peekSummary({ sent: d(-20), due: d(9), closedAt: null, closed: false, yours: true, now }).line).toBe("9 days until your send-by date");
    expect(peekSummary({ sent: d(-938), due: d(-882), closedAt: null, closed: false, yours: true, now })).toEqual({ head: "Out 2 yrs 7 mo", line: `${gapWords(882)} past the date`, hot: true });
    expect(peekSummary({ sent: d(-49), due: null, closedAt: d(-3), closed: true, yours: false, now })).toEqual({ head: "Closed", line: "closed 7 weeks after you queried", hot: false });
    expect(peekSummary({ sent: d(-10), due: null, closedAt: null, closed: false, yours: false, now }).line).toBe("No reply date yet");
  });
  it("its overdue test is the tint's and the track's", () => {
    for (const n of [-30, -1, 0, 1, 30]) {
      const s0 = peekSummary({ sent: d(-60), due: d(n), closedAt: null, closed: false, yours: false, now });
      const tone = peekTone(d(n), now, false);
      const chain = { overdue: tl4Stops([{ name: "Queried", ms: d(-60) }], { due: d(n), now, closed: false, yours: false }).some((x) => x.kind === "was") };
      expect(s0.hot).toBe(tone === "over");
      expect(chain.overdue).toBe(tone === "over");
    }
  });
});

describe("v138.3 · a same-day stop shows the stage the day ended at", () => {
  it("a nudge on the same day as a send changes no stage", () => {
    const now = new Date(2026, 9, 14, 12).getTime(), d = (n: number) => now + n * 86_400_000;
    const S = tl4Stops([{ name: "Queried", ms: d(-30), status: "Queried" }, { name: "Full sent", ms: d(-5), status: "Full Sent" }, { name: "Nudged", ms: d(-5) + 3_600_000, status: null }], { due: d(20), now, closed: false, yours: false });
    expect(S[1].names).toEqual(["Full sent", "Nudged"]);
    expect(S[1].status).toBe("Full Sent");
    expect(S[1].glyph).toBe("fs");
  });
});
