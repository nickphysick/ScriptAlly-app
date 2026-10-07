/**
 * Query Centre v131 — the desk's facts and foot (§2), its bar heights, and the Coming-up chip's class
 * (§5), from the data rather than the string.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { barHeights, deskSections } from "./qcDesk";
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

describe("§2 · the desk's facts", () => {
  const rows = [
    row("o1", QueryStatus.OFFER, { expectedMs: NOW + 9 * DAY }),
    row("p1", QueryStatus.PARTIAL_REQUESTED, { expectedMs: NOW + 2 * DAY }),
    row("f1", QueryStatus.FULL_REQUESTED),
    row("a1", QueryStatus.QUERIED, { expectedMs: NOW - DAY, pastExpected: true }),
    row("a2", QueryStatus.FULL_SENT, { expectedMs: NOW + 3 * DAY }),
    row("a3", QueryStatus.PARTIAL_SENT, { expectedMs: NOW + 20 * DAY }),
    row("c1", QueryStatus.REJECTED, { stageStartMs: Date.parse("2025-10-20T09:00:00Z"), closedHow: "passed" }),
    row("c2", QueryStatus.NO_RESPONSE, { stageStartMs: Date.parse("2025-10-28T09:00:00Z"), closedHow: "noReply" }),
  ];
  const [you, agent, closed] = deskSections(rows, NOW);

  it("with you: offers to decide, and the rest to send; the foot is the earliest due action", () => {
    expect(you.total).toBe(3);
    expect(you.facts).toEqual([{ n: 1, text: "offer to decide" }, { n: 2, text: "to send" }]);
    expect(you.foot).toEqual({ label: "NEXT DUE", date: "5 NOV" });
    expect(you.caption).toBe("REQUESTS & OFFERS IN");
  });
  it("with the agent: past the date, and due within seven days; the foot is the next reply due", () => {
    expect(agent.total).toBe(3);
    expect(agent.facts).toEqual([{ n: 1, text: "past the date" }, { n: 1, text: "due this week" }]);
    expect(agent.foot).toEqual({ label: "NEXT REPLY DUE", date: "6 NOV" });
  });
  it("closed: passed and no reply; the foot is the most recent close", () => {
    expect(closed.facts).toEqual([{ n: 1, text: "passed" }, { n: 1, text: "no reply" }]);
    expect(closed.foot).toEqual({ label: "LAST CLOSED", date: "28 OCT" });
  });
  it("an offer leads the with-you foot when it is the earliest", () => {
    const [y] = deskSections([row("o", QueryStatus.OFFER, { expectedMs: NOW + DAY }), row("p", QueryStatus.FULL_REQUESTED, { expectedMs: NOW + 5 * DAY })], NOW);
    expect(y.foot).toEqual({ label: "OFFER DUE", date: "4 NOV" });
    expect(y.facts[0]).toEqual({ n: 1, text: "offer to decide" });
  });
  it("no date to state is an em dash, not a dropped clause", () => {
    const [, a] = deskSections([], NOW);
    expect(a.foot.date).toBeNull();
  });
});

describe("§2 · bar heights", () => {
  it("the tallest is 30, others to scale (never under 4), an empty week 2", () => {
    expect(barHeights([0, 1, 4, 2])).toEqual([2, 7.5, 30, 15]);
    expect(barHeights([0, 1, 20])[1]).toBe(4);
    expect(barHeights([0, 0])).toEqual([2, 2]);
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
