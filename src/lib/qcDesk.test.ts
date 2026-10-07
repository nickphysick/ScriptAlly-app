/**
 * Query Centre v131.1 — the desk's lines, its trend and stamp; and (v131 §5) the Coming-up chip's class,
 * from the data rather than the string.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { deskSections, trendLabel, trendStartLabel, trendTip } from "./qcDesk";
import { stampText } from "./qcCourtHistory";
import { comingTone, type ComingUp } from "./qcComingUp";
import type { QcRow } from "./qcSummary";

const NOW = Date.parse("2025-11-03T12:00:00Z");
const DAY = 86_400_000;

function row(id: string, status: QueryStatus, o: Partial<Pick<QcRow, "expectedMs" | "pastExpected" | "stageStartMs" | "closedHow">> = {}): QcRow {
  return {
    id, query: { id, status } as Query, status, history: { spans: [], currentStartMs: null, dated: false },
    sentMs: null, stageStartMs: o.stageStartMs ?? null, expectedMs: o.expectedMs ?? null, pastExpected: o.pastExpected ?? false,
    closedHow: o.closedHow ?? null,
  } as unknown as QcRow;
}

describe("v131.1 · the desk's lines", () => {
  /* Mon 3 Nov 2025 12:00 GMT: this London week runs Mon 3 Nov 00:00 to Mon 10 Nov 00:00 */
  const rows = [
    row("o1", QueryStatus.OFFER, { expectedMs: NOW + 9 * DAY }),
    row("p1", QueryStatus.PARTIAL_REQUESTED, { expectedMs: NOW + 2 * DAY }),
    row("f1", QueryStatus.FULL_REQUESTED),
    row("a1", QueryStatus.QUERIED, { expectedMs: NOW - DAY, pastExpected: true }),
    row("a2", QueryStatus.FULL_SENT, { expectedMs: NOW + 3 * DAY }),
    row("a3", QueryStatus.PARTIAL_SENT, { expectedMs: NOW + 6.4 * DAY }),    /* Sun 9 Nov, evening — this week */
    row("a4", QueryStatus.QUERIED, { expectedMs: NOW + 7 * DAY }),          /* Mon 10 Nov — next week */
    row("c1", QueryStatus.REJECTED, { closedHow: "passed" }),
    row("c2", QueryStatus.NO_RESPONSE, { closedHow: "noReply" }),
    row("w1", QueryStatus.WITHDRAWN, { closedHow: "withdrawn" }),
  ];
  const [you, agent, closed] = deskSections(rows, NOW);

  it("with you: offers to consider (rust when any), then what is owed, by kind", () => {
    expect(you.label).toBe("With you");
    expect(you.total).toBe(3);
    expect(you.lines).toEqual([{ n: 1, text: "offer to consider", hot: true }, { n: 2, text: "requests to send", hot: false }]);
  });
  it("what is owed is named by kind: all partials, all fulls, else requests; singular at 1", () => {
    const owedOf = (st: QueryStatus[]) => deskSections(st.map((x, i) => row(`r${i}`, x)), NOW)[0].lines[1].text;
    expect(owedOf([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_REQUESTED])).toBe("partials to send");
    expect(owedOf([QueryStatus.PARTIAL_REQUESTED])).toBe("partial to send");
    expect(owedOf([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_REQUESTED])).toBe("fulls to send");
    expect(owedOf([QueryStatus.FULL_REQUESTED])).toBe("full to send");
    expect(owedOf([QueryStatus.PARTIAL_REQUESTED, QueryStatus.REVISE_RESUBMIT])).toBe("requests to send");
    expect(owedOf([QueryStatus.REVISE_RESUBMIT])).toBe("request to send");
    expect(owedOf([])).toBe("requests to send");
  });
  it("with agents: responses overdue (rust when any), and due inside this London week, Monday to Sunday", () => {
    expect(agent.label).toBe("With agents");
    expect(agent.total).toBe(4);
    expect(agent.lines).toEqual([{ n: 1, text: "response overdue", hot: true }, { n: 2, text: "due this week", hot: false }]);
  });
  it("closed: rejections and no response — a withdrawal on neither line; the big number is v131's", () => {
    expect(closed.lines).toEqual([{ n: 1, text: "rejection", hot: false }, { n: 1, text: "no response", hot: false }]);
    expect(closed.total).toBe(2);
  });
  it("no count is rust at zero", () => {
    const [y, a] = deskSections([], NOW);
    expect(y.lines[0]).toEqual({ n: 0, text: "offers to consider", hot: false });
    expect(a.lines[0]).toEqual({ n: 0, text: "responses overdue", hot: false });
  });
  it("the trend has ten points and its last is the big number; the stamp is a true minus", () => {
    for (const s of [you, agent, closed]) {
      expect(s.trend.values.length).toBe(10);
      expect(s.trend.values[9]).toBe(s.total);
    }
    expect(stampText(3)).toBe("+3 this month");
    expect(stampText(-3)).toBe("\u22123 this month");
    expect(stampText(0)).toBe("No change this month");
  });
  it("the chart's words: the first month, the label and the tooltip", () => {
    const mon = Date.parse("2025-08-04T00:00:00+01:00");
    expect(trendStartLabel(mon)).toBe("Aug");
    expect(trendLabel("With agents", mon, 14, 19)).toBe("With agents: 14 in early August, 19 now");
    expect(trendLabel("With agents", Date.parse("2025-08-25T00:00:00+01:00"), 14, 19)).toBe("With agents: 14 in late August, 19 now");
    expect(trendTip("agent", Date.parse("2025-09-29T00:00:00+01:00"), 20)).toBe("W/C 29 SEP · 20 with agents");
  });
});

describe("§5 · the chip is classed from the data", () => {
  const next = (bucket: ComingUp["bucket"]): ComingUp => ({ bucket, verb: "x", tail: null, over: false, action: "y" });
  it("past its date: over; today or within seven days: soon; later: plain", () => {
    expect(comingTone(next("send"), row("r", QueryStatus.FULL_REQUESTED, { expectedMs: NOW - 1 }), NOW)).toBe("over");
    expect(comingTone(next("send"), row("r", QueryStatus.FULL_REQUESTED, { expectedMs: NOW + 1 }), NOW)).toBe("soon");
    expect(comingTone(next("chase"), row("r", QueryStatus.QUERIED, { expectedMs: NOW + 7 * DAY - 1 }), NOW)).toBe("soon");
    expect(comingTone(next("chase"), row("r", QueryStatus.QUERIED, { expectedMs: NOW + 7 * DAY }), NOW)).toBe("plain");
    expect(comingTone(next("decide"), row("r", QueryStatus.OFFER, { expectedMs: NOW + 3 * DAY }), NOW)).toBe("soon");
  });
  it("a close is a passive wait, never overdue; no date is plain; no line is no chip", () => {
    expect(comingTone(next("close"), row("r", QueryStatus.QUERIED, { expectedMs: NOW - 90 * DAY }), NOW)).toBe("quiet");
    expect(comingTone(next("send"), row("r", QueryStatus.FULL_REQUESTED), NOW)).toBe("plain");
    expect(comingTone(null, row("r", QueryStatus.QUERIED), NOW)).toBeNull();
  });
});
