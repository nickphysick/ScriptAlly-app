/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 §B — the strip's figures: the weekly bars, the two windows, and the lines' words.
 */
import { describe, expect, it } from "vitest";
import { STRIP_WEEKS, sentLine, stripLine, stripSent, stripTotal } from "./qcStrip";
import { weekStart } from "./qcDeskWeeks";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-08T12:00:00Z"); /* a Thursday */
const sent = (...daysAgo: (number | null)[]) => daysAgo.map((d) => ({ sentMs: d === null ? null : NOW - d * DAY }));

describe("stripSent", () => {
  it("twenty weeks, oldest first, the last is this week (Monday to Sunday, London)", () => {
    const s = stripSent([], NOW);
    expect(s.weeks).toHaveLength(STRIP_WEEKS);
    expect(s.weeks[STRIP_WEEKS - 1].start).toBe(weekStart(NOW));
    for (let i = 1; i < s.weeks.length; i++) expect(s.weeks[i].start).toBeGreaterThan(s.weeks[i - 1].start);
  });
  it("a send lands in its own week's bar; this week's is the last bar and `nWeek`", () => {
    const s = stripSent(sent(0, 1, 3, 4, 11, 29, 31), NOW);
    /* Thursday: 0, 1 and 3 days ago are this week (Mon–Thu); 4 days ago was Sunday, last week; 11 days ago the week before */
    expect(s.nWeek).toBe(3);
    expect(s.weeks[STRIP_WEEKS - 1].n).toBe(3);
    expect(s.weeks[STRIP_WEEKS - 2].n).toBe(1);
    expect(s.weeks.reduce((n, w) => n + w.n, 0)).toBe(7);
  });
  it("the last 30 days is a window of its own, not a sum of bars", () => {
    expect(stripSent(sent(0, 29, 29.9, 30.1, 45), NOW).n30).toBe(3);
  });
  it("an undated send, one from the future and one before the chart are in no bar", () => {
    const s = stripSent(sent(null, -2, STRIP_WEEKS * 7 + 9), NOW);
    expect(s.weeks.reduce((n, w) => n + w.n, 0)).toBe(0);
    expect(s.n30).toBe(0);
  });
  it("a bar's popup reads “{n} sent · w/c {date}”", () => {
    const s = stripSent(sent(0), NOW);
    expect(s.weeks[STRIP_WEEKS - 1].tip).toBe("1 sent · w/c 5 Oct");
  });
});

describe("the lines", () => {
  const line = (n: number, m: number) => [{ n, text: "", hot: false }, { n: m, text: "", hot: false }] as never;
  it("with you: offers are hot when there is one; singular and plural agree", () => {
    expect(stripLine({ key: "you", lines: line(1, 12) })).toEqual([{ n: 1, text: "offer to consider", hot: true }, { n: 12, text: "requests to send", hot: false }]);
    expect(stripLine({ key: "you", lines: line(0, 1) })).toEqual([{ n: 0, text: "offers to consider", hot: false }, { n: 1, text: "request to send", hot: false }]);
  });
  it("with agents: past their reply time is hot when there is one", () => {
    expect(stripLine({ key: "agent", lines: line(31, 0) })).toEqual([{ n: 31, text: "past their reply time", hot: true }, { n: 0, text: "due this week", hot: false }]);
    expect(stripLine({ key: "agent", lines: line(0, 2) })[0].hot).toBe(false);
  });
  it("closed: passed and no reply, never hot", () => {
    expect(stripLine({ key: "closed", lines: line(11, 2) })).toEqual([{ n: 11, text: "passed", hot: false }, { n: 2, text: "no reply", hot: false }]);
  });
  it("cell 1: the two windows", () => {
    expect(sentLine({ weeks: [], n30: 7, nWeek: 2 })).toEqual([{ n: 7, text: "in the last 30 days", hot: false }, { n: 2, text: "this week", hot: false }]);
  });
  it("the total is the three courts added up", () => {
    expect(stripTotal([{ total: 13 }, { total: 46 }, { total: 13 }])).toBe(72);
  });
});
