/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.1 — the pure parts (lib/qc1511): the Next column's one phrase in every group, the year mark, the
 * Day line, the summary card's count, words and pills, and the pill row's grouping.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { WRITER_EXPECTED_FIELD } from "./expectedDate";
import { dayLine, nextText, pillGroups, pillWords, weekSummary, yearSplit } from "./qc1511";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 8, 12).getTime(); /* Thu 8 Oct 2026, noon */
const at = (d: number) => NOW + d * DAY;
const COURT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "you", [QueryStatus.FULL_REQUESTED]: "you", [QueryStatus.REVISE_RESUBMIT]: "you",
  [QueryStatus.OFFER]: "offer", [QueryStatus.REJECTED]: "closed", [QueryStatus.NO_RESPONSE]: "closed", [QueryStatus.WITHDRAWN]: "closed",
};
const row = (o: { status: QueryStatus; expected?: number | null; stage?: number | null; sent?: number | null; name?: string; writerDate?: boolean; offerAt?: number }): QcRow => ({
  id: o.name ?? "x", agentName: o.name ?? "Clara Beaumont", status: o.status, court: COURT[o.status] ?? "agent",
  expectedMs: o.expected === undefined ? null : o.expected, stageStartMs: o.stage ?? null, sentMs: o.sent === undefined ? at(-90) : o.sent,
  query: { id: "q", ...(o.writerDate ? { [WRITER_EXPECTED_FIELD]: "2026-10-10" } : {}) },
  history: { spans: o.offerAt != null ? [{ status: QueryStatus.OFFER, startMs: o.offerAt }] : [] },
} as unknown as QcRow);

describe("the Next column (v151.1 §7)", () => {
  it("the writer's turn: late, due today, due tomorrow, otherwise the weekday date", () => {
    expect(nextText(row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-8) }), NOW)).toEqual({ text: "8 days late", tone: "late" });
    expect(nextText(row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-1) }), NOW)).toEqual({ text: "1 day late", tone: "late" });
    expect(nextText(row({ status: QueryStatus.OFFER, expected: at(0) }), NOW)).toEqual({ text: "Due today", tone: "late" });
    expect(nextText(row({ status: QueryStatus.OFFER, expected: at(1) }), NOW)).toEqual({ text: "Due tomorrow", tone: "late" });
    expect(nextText(row({ status: QueryStatus.FULL_REQUESTED, expected: at(7) }), NOW)).toEqual({ text: "Due Thu 15 Oct", tone: "ink" });
  });
  it("with the agent: the writer's own date is a set deadline; the agency's window is 'by'", () => {
    expect(nextText(row({ status: QueryStatus.PARTIAL_SENT, expected: at(2), writerDate: true }), NOW)).toEqual({ text: "Reply due Sat 10 Oct", tone: "faint" });
    expect(nextText(row({ status: QueryStatus.QUERIED, expected: at(14) }), NOW)).toEqual({ text: "Reply by 22 Oct", tone: "faint" });
  });
  it("gone quiet (and a nudge-window row): the reply's lateness; undated, the days without one", () => {
    expect(nextText(row({ status: QueryStatus.QUERIED, expected: at(-37) }), NOW)).toEqual({ text: "Reply 37 days overdue", tone: "late" });
    expect(nextText(row({ status: QueryStatus.QUERIED, expected: at(-5) }), NOW)).toEqual({ text: "Reply 5 days overdue", tone: "late" });
    expect(nextText(row({ status: QueryStatus.QUERIED, expected: null, stage: at(-120) }), NOW)).toEqual({ text: "No reply in 120 days", tone: "late" });
  });
  it("closed: a dash", () => {
    expect(nextText(row({ status: QueryStatus.REJECTED, expected: at(3) }), NOW)).toEqual({ text: "—", tone: "none" });
  });
});

describe("dates and the Day line", () => {
  it("a lighter ’25 only in another year", () => {
    expect(yearSplit(new Date(2026, 6, 2).getTime(), NOW)).toEqual({ dm: "2 Jul", yr: null });
    expect(yearSplit(new Date(2025, 2, 20).getTime(), NOW)).toEqual({ dm: "20 Mar", yr: "’25" });
  });
  it("Day N from the send; none for a closed query", () => {
    expect(dayLine(row({ status: QueryStatus.QUERIED, sent: at(-98) }), NOW)).toBe("Day 98");
    expect(dayLine(row({ status: QueryStatus.REJECTED, sent: at(-98) }), NOW)).toBeNull();
    expect(dayLine(row({ status: QueryStatus.QUERIED, sent: null }), NOW)).toBeNull();
  });
});

describe("the summary card (v151.1 §2)", () => {
  const rows = [
    row({ status: QueryStatus.OFFER, expected: at(1), name: "Tom Ellery", offerAt: new Date(2026, 9, 2).getTime() }),
    row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-8), name: "Clara Beaumont" }),
    row({ status: QueryStatus.PARTIAL_REQUESTED, expected: at(-7), name: "Marcus Reed" }),
    row({ status: QueryStatus.FULL_REQUESTED, expected: at(7), name: "Jonathan Marsh" }),
    row({ status: QueryStatus.QUERIED, expected: at(20), name: "Sophie Dunn" }),
    row({ status: QueryStatus.REJECTED, name: "George Ashworth" }),
  ];
  it("N is the Your move set; the line names the offer, then what is late; a pill per kind and lateness", () => {
    const s = weekSummary(rows, NOW);
    expect(s.n).toBe(4);
    expect(s.heading).toBe("4 queries need you this week");
    expect(s.detail).toBe("Tom Ellery made an offer on 2 Oct, and two partials are late.");
    expect(s.pills.map((p) => [p.text, p.late])).toEqual([["1 offer to answer", false], ["2 partials late", true], ["1 full to send", false]]);
    expect(s.pills.map((p) => p.status)).toEqual([QueryStatus.OFFER, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);
  });
  it("one query: singular", () => {
    expect(weekSummary([rows[3]], NOW).heading).toBe("1 query needs you this week");
    expect(weekSummary([rows[3]], NOW).detail).toBe("Jonathan Marsh’s full is due Thu 15 Oct.");
  });
  it("nothing: the zero state names the next reply due, and draws no pills", () => {
    const s = weekSummary([rows[4], rows[5]], NOW);
    expect(s).toEqual({ n: 0, heading: "Nothing needs you this week", detail: "Next reply due 28 Oct.", pills: [], todo: [] });
  });
});

describe("the pill row (v151.1 §5)", () => {
  const noop = () => {};
  it("one pill per group; Status and Package are fields; the rest stand alone; Where it stands is the quick filter's", () => {
    const g = pillGroups([
      { key: "qp:over", label: "Overdue", off: noop }, { key: "st:pr", label: "Partial requested", off: noop }, { key: "st:ps", label: "Partial sent", off: noop },
      { key: "where:you", label: "With you", off: noop }, { key: "find", label: "“ma”", off: noop }, { key: "qp:offers", label: "Offers", off: noop },
      { key: "sent:abc", label: "Light", off: noop }, { key: "more:dueWeek", label: "Due this week", off: noop },
    ]);
    expect(g.map((x) => [x.key, x.field, x.values])).toEqual([
      ["most", null, ["Overdue", "Offers"]], ["status", "Status", ["Partial requested", "Partial sent"]], ["sent", "Package", ["Light"]], ["more", null, ["Due this week"]],
    ]);
    expect(pillWords(g[0])).toEqual({ field: null, op: null, value: "Overdue or Offers" });
    expect(pillWords(g[1])).toEqual({ field: "Status", op: "is any of", value: "Partial requested, Partial sent" });
    expect(pillWords(g[2])).toEqual({ field: "Package", op: "is", value: "Light" });
    expect(pillWords({ field: "Status", values: ["a", "b", "c"] }).value).toBe("3 selected");
    expect(pillWords({ field: null, values: ["a", "b", "c"] }).value).toBe("3 selected");
  });
  it("× on a group removes every value in it", () => {
    const off: string[] = [];
    const g = pillGroups([{ key: "st:pr", label: "Partial requested", off: () => off.push("pr") }, { key: "st:ps", label: "Partial sent", off: () => off.push("ps") }]);
    g[0].off();
    expect(off).toEqual(["pr", "ps"]);
  });
});
