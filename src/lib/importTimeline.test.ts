/**
 * The import review's timeline strip (ref design-refs/import-timeline-strip-v1.html) — the pure model
 * and the typed-date reader. Locks TS-A1…TS-A9 (reports/import-timeline-strip-v1/REPORT.md).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { ReviewQuery } from "./smartImportReviewModel";
import {
  stripEligible, stripEvents, stripOrder, latestStatus, nextEventType, whereItStands, eventBeforeSent,
  stripNeed, stripButton, setSentDate, waiveSentDate, addEvent, editEvent, removeEvent, confirmStrip,
  calendarStart, STRIP_WORDS,
} from "./importTimeline";
import { readTypedDate, tileDate, longDate, monthGrid, stepMonth } from "./importTypedDate";

const Q = (p: Partial<ReviewQuery> = {}): ReviewQuery => ({
  id: "q0", agentRef: "a1", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: null, timeline: [], reasons: [], notes: "", removed: false, ...p,
});
/* Kirsten Vale, as the photo read gives her: no sent date, Full requested 15/9, Full sent 22/9. */
const KIRSTEN = Q({
  status: QueryStatus.FULL_SENT,
  timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: "15/9" }, { type: QueryStatus.FULL_SENT, date: "2026-09-22", raw: "22/9" }],
  reasons: [{ code: "no-date", resolved: false }],
});

describe("TS-A1 which queries get the strip", () => {
  it("an open two-dates question, or an event with an open sent-date question", () => {
    expect(stripEligible(Q({ timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: null }], reasons: [{ code: "two-dates", resolved: false }] }))).toBe(true);
    expect(stripEligible(KIRSTEN)).toBe(true);
    for (const code of ["missing-day", "unreadable-date", "ambiguous-date", "serial-outlier"] as const)
      expect(stripEligible({ ...KIRSTEN, reasons: [{ code, resolved: false }] })).toBe(true);
  });
  it("not with no events and one date question, not once answered, not for a status question", () => {
    expect(stripEligible(Q({ reasons: [{ code: "no-date", resolved: false }] }))).toBe(false);
    expect(stripEligible({ ...KIRSTEN, reasons: [{ code: "no-date", resolved: true }] })).toBe(false);
    expect(stripEligible({ ...KIRSTEN, reasons: [{ code: "status-wording", resolved: false }] })).toBe(false);
  });
});

describe("TS-A2 the steps, in date order", () => {
  it("an event added with an earlier date sorts into place", () => {
    const q = addEvent(Q({ sentDate: "2026-08-01", status: QueryStatus.FULL_REQUESTED, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: null }] }), QueryStatus.PARTIAL_REQUESTED, "2026-08-20");
    expect(stripOrder(q.timeline).map((i) => q.timeline[i].type)).toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);
    expect(q.status).toBe(QueryStatus.FULL_REQUESTED);
  });
  it("an undated event sits at the end, in the order it was added", () => {
    const evs = [{ type: QueryStatus.OFFER, date: null, raw: null }, { type: QueryStatus.FULL_SENT, date: "2026-09-22", raw: null }, { type: QueryStatus.REJECTED, date: null, raw: null }];
    expect(stripOrder(evs)).toEqual([1, 0, 2]);
  });
  it("a status no event carries is shown as an undated last step", () => {
    const evs = stripEvents(Q({ status: QueryStatus.FULL_SENT, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: null }] }));
    expect(evs.map((e) => [e.type, e.date])).toEqual([[QueryStatus.FULL_REQUESTED, "2026-09-15"], [QueryStatus.FULL_SENT, null]]);
    expect(stripEvents(Q()).length).toBe(0);
  });
});

describe("TS-A3 the latest step drives where it stands, and the status follows it", () => {
  it("names the stage and the court", () => {
    expect(whereItStands(KIRSTEN)).toEqual({ stage: "Full sent", court: "with the agent" });
    expect(whereItStands(Q())).toEqual({ stage: "Queried, no reply yet", court: "with the agent" });
    expect(whereItStands(Q({ status: QueryStatus.FULL_REQUESTED }))).toEqual({ stage: "Full requested", court: "your move" });
    expect(whereItStands(Q({ status: QueryStatus.REJECTED }))).toEqual({ stage: "Passed", court: "closed" });
  });
  it("adding a later event moves the stage; removing it moves it back", () => {
    const one = Q({ sentDate: "2026-08-30", status: QueryStatus.FULL_REQUESTED, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: "15/9" }] });
    const two = addEvent(one, QueryStatus.FULL_SENT, "2026-09-22");
    expect(two.status).toBe(QueryStatus.FULL_SENT);
    expect(whereItStands(two).stage).toBe("Full sent");
    const back = removeEvent(two, 1);
    expect(back.status).toBe(QueryStatus.FULL_REQUESTED);
    expect(latestStatus(removeEvent(back, 0).timeline)).toBe(QueryStatus.QUERIED);
  });
  it("editing an event's type and date changes the status with it", () => {
    const q = editEvent(KIRSTEN, 1, QueryStatus.OFFER, "2026-10-01");
    expect(q.status).toBe(QueryStatus.OFFER);
    expect(q.timeline[1]).toEqual({ type: QueryStatus.OFFER, date: "2026-10-01", raw: null });
  });
});

describe("TS-A4 the answered rule", () => {
  it("asks for the sent date first, then every step's date, then the order", () => {
    expect(stripNeed(KIRSTEN)).toBe("sent");
    expect(stripButton("sent")).toBe(STRIP_WORDS.needSent);
    const undatedStep = setSentDate(Q({ status: QueryStatus.FULL_SENT, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: null }] }), "2026-08-30");
    expect(stripNeed(undatedStep)).toBe("dates");
    expect(stripButton("dates")).toBe(STRIP_WORDS.needDates);
  });
  it("an event dated before the query was sent blocks the answer", () => {
    const q = setSentDate(KIRSTEN, "2026-09-18");
    expect(eventBeforeSent(q)).toBe(true);
    expect(stripNeed(q)).toBe("order");
    expect(stripButton("order")).toBe(STRIP_WORDS.needOrder);
    expect(confirmStrip(q)).toBe(q); // nothing answered
  });
  it("waiving the sent date answers it", () => {
    const q = waiveSentDate(KIRSTEN);
    expect(q.sentWaived).toBe(true);
    expect(q.sentDate).toBeNull();
    expect(stripNeed(q)).toBeNull();
    expect(stripButton(null)).toBe(STRIP_WORDS.yes);
    const done = confirmStrip(q);
    expect(done.reasons.every((r) => r.resolved)).toBe(true);
    // pressing the tile again offers the date back
    expect(setSentDate(q, "2026-08-30").sentWaived).toBe(false);
  });
});

describe("TS-A5 Kirsten Vale's case answered", () => {
  it("sent 30 Aug, Full requested 15 Sep, Full sent 22 Sep: answered, status Full Sent, every strip reason resolved", () => {
    const q = confirmStrip(setSentDate({ ...KIRSTEN, reasons: [{ code: "no-date", resolved: false }, { code: "crossed-out", resolved: false }] }, "2026-08-30"));
    expect(q.sentDate).toBe("2026-08-30");
    expect(q.status).toBe(QueryStatus.FULL_SENT);
    expect(q.timeline.map((t) => [t.type, t.date])).toEqual([[QueryStatus.FULL_REQUESTED, "2026-09-15"], [QueryStatus.FULL_SENT, "2026-09-22"]]);
    expect(q.reasons).toEqual([{ code: "no-date", resolved: true }, { code: "crossed-out", resolved: false }]);
  });
});

describe("TS-A6 the pop-over's defaults", () => {
  it("+ Add an event pre-chooses the step after the latest one", () => {
    expect(nextEventType([])).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(nextEventType([{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: null }])).toBe(QueryStatus.FULL_SENT);
    expect(nextEventType([{ type: QueryStatus.WITHDRAWN, date: "2026-09-15", raw: null }])).toBe(QueryStatus.WITHDRAWN);
  });
  it("the calendar opens on the chosen date, else the adjacent step's, else today", () => {
    expect(calendarStart(KIRSTEN, "sent", "2026-11-04")).toBe("2026-09-15");
    expect(calendarStart(setSentDate(KIRSTEN, "2026-08-30"), "sent", "2026-11-04")).toBe("2026-08-30");
    expect(calendarStart(KIRSTEN, "new", "2026-11-04")).toBe("2026-09-22");
    expect(calendarStart(KIRSTEN, 0, "2026-11-04")).toBe("2026-09-15");
    expect(calendarStart(Q(), "sent", "2026-11-04")).toBe("2026-11-04");
    const undated = Q({ sentDate: "2026-08-01", status: QueryStatus.OFFER, timeline: [{ type: QueryStatus.FULL_SENT, date: "2026-09-22", raw: null }] });
    expect(calendarStart(undated, 1, "2026-11-04")).toBe("2026-09-22");
  });
});

describe("TS-A7 the typed date: day first, UK forms", () => {
  const T = "2026-11-04";
  it.each([
    ["22/9", "2026-09-22"], ["22-9-26", "2026-09-22"], ["22 Sept", "2026-09-22"], ["22 September 2026", "2026-09-22"],
    ["22nd Sept", "2026-09-22"], ["today", "2026-11-04"], ["yesterday", "2026-11-03"], ["30/8", "2026-08-30"],
    ["3/2", "2026-02-03"], ["12.4.24", "2024-04-12"], ["1st Oct", "2026-10-01"], ["22 sep", "2026-09-22"], ["  22 Sept, 2026 ", "2026-09-22"],
  ])("%s → %s", (typed, want) => expect(readTypedDate(typed, T)).toBe(want));
  it("is nothing for what is not a date, or is in the future", () => {
    for (const s of ["", "last spring", "22", "31/2", "32/1", "22/13", "22 Smarch", "5/11/2026", "today-ish"]) expect(readTypedDate(s, T)).toBeNull();
  });
  it("a year-less date takes the most recent one not in the future", () => {
    expect(readTypedDate("4/11", T)).toBe("2026-11-04");
    expect(readTypedDate("5/11", T)).toBe("2025-11-05");
    expect(readTypedDate("22/9", "2026-09-21")).toBe("2025-09-22");
    expect(readTypedDate("22/9", "2026-09-22")).toBe("2026-09-22");
    expect(readTypedDate("31/12", "2027-01-01")).toBe("2026-12-31");
    expect(readTypedDate("yesterday", "2027-01-01")).toBe("2026-12-31");
  });
});

describe("TS-A8 the date said back, and on the tile", () => {
  it("in full under the field; short on the tile", () => {
    expect(longDate("2026-09-22")).toBe("Tuesday, 22 September 2026");
    expect(tileDate("2026-09-15")).toBe("15 Sep 2026");
    expect(tileDate("2026-08-30")).toBe("30 Aug 2026");
  });
});

describe("TS-A9 the calendar's month", () => {
  it("Monday first: September 2026 starts on a Tuesday", () => {
    const g = monthGrid(2026, 9);
    expect(g.lead).toBe(1);
    expect(g.days.length).toBe(30);
    expect(monthGrid(2026, 11).lead).toBe(6); // 1 Nov 2026 is a Sunday
    expect(stepMonth(2026, 12, 1)).toEqual([2027, 1]);
    expect(stepMonth(2026, 1, -1)).toEqual([2025, 12]);
  });
});
