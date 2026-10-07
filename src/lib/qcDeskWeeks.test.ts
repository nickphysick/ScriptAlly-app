/**
 * QC5 — the desk's weekly bars (Query Centre v131 §2): Monday-start weeks by the London calendar, each
 * section counting its own events, nothing outside the twelve weeks. The fixture straddles the clock
 * change of Sunday 26 October 2025 (BST → GMT at 02:00), and the now sits a week after it.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { bucket, deskBars, deskEvents, deskWeeks, weekLabel, weekStart, londonMidnight, barText } from "./qcDeskWeeks";
import type { QcRow } from "./qcSummary";
import type { StageHistory } from "./qcStages";

/** Mon 3 Nov 2025, 12:00 GMT — the week after the clock change. */
const NOW = Date.parse("2025-11-03T12:00:00Z");
const at = (iso: string) => Date.parse(iso);

function row(id: string, status: QueryStatus, opts: { sent?: string; spans?: [QueryStatus, string][]; dated?: boolean; stageStart?: string | null }): QcRow {
  const spans = (opts.spans ?? []).map(([s, iso], i, a) => ({ status: s, startMs: at(iso), endMs: null, current: i === a.length - 1 }));
  const history: StageHistory = { spans, currentStartMs: opts.dated === false ? null : spans.at(-1)?.startMs ?? null, dated: opts.dated !== false };
  return {
    id, query: { id, status } as Query, status, state: "live", court: "agent", withYou: false,
    agentName: id, agency: "", agencyKey: "", initials: "XX", manuscriptId: "m",
    sentMs: opts.sent ? at(opts.sent) : null, lastMs: 0, history,
    stageStartMs: opts.stageStart === undefined ? null : opts.stageStart === null ? null : at(opts.stageStart),
    expectedMs: null, expectedKind: null, pastExpected: false,
    materials: {} as QcRow["materials"], materialsRecorded: false, dayN: null, closedHow: null, furthest: "query",
  } as unknown as QcRow;
}

describe("QC5 · weeks start on Monday by the London calendar", () => {
  it("the week holding a moment starts at London Monday 00:00 — across BST and GMT", () => {
    /* Sun 26 Oct 2025 23:30 GMT is still the week of Mon 20 Oct; Mon 27 Oct 00:30 GMT starts the next */
    expect(weekStart(at("2025-10-26T23:30:00Z"))).toBe(at("2025-10-19T23:00:00Z")); // Mon 20 Oct 00:00 BST
    expect(weekStart(at("2025-10-27T00:30:00Z"))).toBe(at("2025-10-27T00:00:00Z")); // Mon 27 Oct 00:00 GMT
    /* 00:30 BST on a Monday is still SUNDAY in UTC — and it belongs to Monday's week */
    expect(weekStart(at("2025-10-19T23:30:00Z"))).toBe(at("2025-10-19T23:00:00Z"));
  });
  it("London midnight resolves the offset rather than assuming one", () => {
    expect(londonMidnight(2025, 10, 20)).toBe(at("2025-10-19T23:00:00Z")); // BST
    expect(londonMidnight(2025, 10, 27)).toBe(at("2025-10-27T00:00:00Z")); // GMT
  });
  it("twelve weeks, oldest first, the current week last, each a London Monday", () => {
    const w = deskWeeks(NOW);
    expect(w.length).toBe(12);
    expect(w[11]).toBe(at("2025-11-03T00:00:00Z"));
    expect(w[10]).toBe(at("2025-10-27T00:00:00Z"));
    expect(w[9]).toBe(at("2025-10-19T23:00:00Z")); // the week before the change: 169 hours long
    expect(w[0]).toBe(at("2025-08-17T23:00:00Z")); // Mon 18 Aug, BST — eleven calendar weeks back
    expect(weekLabel(w[0])).toBe("W/C 18 AUG");
    expect(weekLabel(w[11])).toBe("W/C 3 NOV");
  });
});

describe("QC5 · each section counts its own events", () => {
  const rows: QcRow[] = [
    /* sent Sun 26 Oct 23:30 GMT (week of 20 Oct); a partial requested Mon 27 Oct 00:30 GMT (week of 27 Oct) */
    row("a", QueryStatus.PARTIAL_REQUESTED, { sent: "2025-10-26T23:30:00Z", spans: [[QueryStatus.QUERIED, "2025-10-26T23:30:00Z"], [QueryStatus.PARTIAL_REQUESTED, "2025-10-27T00:30:00Z"]] }),
    /* a full request in September, then an offer this week; it stands at Offer */
    row("b", QueryStatus.OFFER, { sent: "2025-09-01T09:00:00Z", spans: [[QueryStatus.QUERIED, "2025-09-01T09:00:00Z"], [QueryStatus.FULL_REQUESTED, "2025-09-15T09:00:00Z"], [QueryStatus.FULL_SENT, "2025-09-20T09:00:00Z"], [QueryStatus.OFFER, "2025-11-03T09:00:00Z"]] }),
    /* an R&R that has since gone back out: its R&R entry still counts in its own week */
    row("c", QueryStatus.RESUBMITTED, { sent: "2025-08-20T09:00:00Z", spans: [[QueryStatus.QUERIED, "2025-08-20T09:00:00Z"], [QueryStatus.REVISE_RESUBMIT, "2025-10-08T09:00:00Z"], [QueryStatus.RESUBMITTED, "2025-10-20T09:00:00Z"]] }),
    /* closed this week (counted), closed undated (not counted), withdrawn (not the closed section's) */
    row("d", QueryStatus.REJECTED, { sent: "2025-09-10T09:00:00Z", stageStart: "2025-11-03T10:00:00Z" }),
    row("e", QueryStatus.NO_RESPONSE, { sent: "2025-07-01T09:00:00Z", stageStart: null }),
    row("f", QueryStatus.WITHDRAWN, { sent: "2025-10-02T09:00:00Z", stageStart: "2025-10-30T09:00:00Z" }),
    /* a provisional import: no send date, and a with-you stage with no dated entry */
    row("g", QueryStatus.FULL_REQUESTED, { spans: [[QueryStatus.FULL_REQUESTED, "2025-10-30T09:00:00Z"]], dated: false }),
    /* a send long before the window */
    row("h", QueryStatus.QUERIED, { sent: "2025-05-05T09:00:00Z", spans: [[QueryStatus.QUERIED, "2025-05-05T09:00:00Z"]] }),
  ];

  it("with you counts entries into partial requested, full requested, offer and R&R — nothing else", () => {
    const ev = deskEvents(rows);
    expect(ev.you.sort()).toEqual([
      at("2025-09-15T09:00:00Z"), // b · full requested
      at("2025-10-08T09:00:00Z"), // c · R&R
      at("2025-10-27T00:30:00Z"), // a · partial requested
      at("2025-11-03T09:00:00Z"), // b · offer
    ].sort());
    expect(ev.undated.you, "g's undated full-requested is not placed").toBe(1);
  });

  it("with the agent counts sends; closed counts dated closes of the closed section only", () => {
    const ev = deskEvents(rows);
    expect(ev.agent.length).toBe(7);
    expect(ev.undated.agent).toBe(1);
    expect(ev.closed).toEqual([at("2025-11-03T10:00:00Z")]);
    expect(ev.undated.closed, "e is closed with no date").toBe(1);
  });

  it("buckets into the twelve London weeks, and nothing outside them", () => {
    const bars = deskBars(rows, NOW);
    /* weeks: 0 18 Aug · 1 25 Aug · 2 1 Sep · 3 8 Sep · 4 15 Sep · 5 22 Sep · 6 29 Sep · 7 6 Oct · 8 13 Oct · 9 20 Oct · 10 27 Oct · 11 3 Nov
       with you: b's full request (15 Sep → 4), c's R&R (8 Oct → 7), a's partial (Mon 27 Oct 00:30 GMT → 10), b's offer (→ 11) */
    expect(bars.you.counts).toEqual([0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1]);
    /* sends: c 20 Aug → 0 · b 1 Sep → 2 · d Wed 10 Sep → 3 · f Thu 2 Oct → 6 · a Sun 26 Oct 23:30 GMT → 9 (still the week of 20 Oct) */
    expect(bars.agent.counts).toEqual([1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
    expect(bars.agent.outside, "h (May) and e (July) were sent before the window").toBe(2);
    expect(bars.closed.counts).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it("a moment after now is outside, as is one before the first week", () => {
    const b = bucket([at("2025-08-17T22:59:59Z"), at("2025-08-17T23:00:00Z"), NOW + 1], NOW);
    expect(b.counts[0]).toBe(1);
    expect(b.outside).toBe(2);
  });

  it("the tooltip names the week and the count in the section's words", () => {
    expect(barText("agent", at("2025-08-10T23:00:00Z"), 4)).toBe("W/C 11 AUG · 4 queries sent");
    expect(barText("closed", at("2025-08-10T23:00:00Z"), 1)).toBe("W/C 11 AUG · 1 query closed");
  });
});
