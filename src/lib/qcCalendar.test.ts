/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcCalendar — positions asserted against KNOWN DATES (11px a day from the month of the earliest
 * query), and the words a bar says. Built from real rows (`buildQcRows`), never hand-made bars, so an
 * input the page cannot produce is not what is being tested.
 */
import { describe, it, expect } from "vitest";
import { Activity, Agent, Query, QueryStatus } from "../types";
import { buildQcRows } from "./qcSummary";
import { DAYLIGHT_PX, PX_PER_DAY, TODAY_AT, calAxis, calGroups, calTrack, laneBars, rangeLabel, todayScrollLeft, xOf } from "./qcCalendar";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const iso = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString();
const NOW = at(2026, 9, 19);
let n = 0;
const q = (over: Partial<Query>): Query => ({ id: `q${++n}`, userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "", sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: iso(8, 14), ...over });
const agent = (weeks: number | null) => ({ id: "a", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: weeks ?? undefined } as Agent);
const act = (id: string, s: QueryStatus, date: string): Activity => ({ id: `${id}-${s}`, userId: "u", queryId: id, manuscriptId: "m", activityType: "x" as never, description: "", details: "", date, resultingStatus: s });
/* `null` = the agency states no window. (NOT `undefined`: a default parameter would swallow it and hand back 6 weeks.) */
const rows = (qs: Query[], weeks: number | null = 6, acts: Activity[] = []) => buildQcRows(qs, [agent(weeks)], acts, NOW);

describe("the track", () => {
  it("runs from the start of the month of the EARLIEST query to the end of the third month after today, at 11px a day", () => {
    const t = calTrack(rows([q({ dateSent: iso(3, 14) }), q({})]), NOW);
    expect(new Date(t.startMs).toDateString()).toBe(new Date(2026, 2, 1).toDateString());
    expect(new Date(t.endMs).toDateString()).toBe(new Date(2027, 0, 1).toDateString());
    expect(PX_PER_DAY).toBe(11);
    expect(xOf(t, at(2026, 3, 1))).toBe(0);
    expect(xOf(t, at(2026, 3, 2))).toBe(11);
    expect(t.todayX).toBe(xOf(t, NOW));
    expect(t.todayX).toBe(202 * 11);           /* 1 Mar → 19 Sep is 202 days */
    expect(t.widthPx).toBe(306 * 11);          /* 1 Mar → 1 Jan */
  });
  it("it opens with today 46% of the way across, and the range is stated as text", () => {
    const t = calTrack(rows([q({ dateSent: iso(1, 5) })]), NOW);
    expect(TODAY_AT).toBe(0.46);
    expect(todayScrollLeft(t, 714)).toBe(Math.round(t.todayX - 714 * 0.46));
    expect(todayScrollLeft(t, 100000)).toBe(0);
    expect(rangeLabel(t, todayScrollLeft(t, 714), 714)).toMatch(/^\d{1,2} [A-Z][a-z]{2} to \d{1,2} [A-Z][a-z]{2}$/);
  });
  it("the axis: a label at each month start, a date at each MONDAY, and today", () => {
    const t = calTrack(rows([q({})]), NOW);
    const a = calAxis(t, NOW);
    expect(a.months.map((m) => m.label)).toEqual(["Aug", "Sep", "Oct", "Nov", "Dec"]);
    expect(a.months[0].x).toBe(0);
    expect(a.mondays.slice(0, 3).map((d) => d.label)).toEqual(["3", "10", "17"]);
    for (const d of a.mondays) expect((d.x / 11) % 7).toBe(a.mondays[0].x / 11 % 7);
    expect(a.today).toEqual({ x: t.todayX, label: "19" });
  });
});

describe("the bars — one per stage, placed by date", () => {
  const journey = () => {
    const query = q({ dateSent: iso(8, 1), status: QueryStatus.PARTIAL_SENT, partialRequestedDate: iso(8, 11), partialSentDate: iso(8, 21) });
    const r = rows([query], 4)[0];
    const t = calTrack([r], NOW);
    return { r, t, bars: laneBars(r, t, NOW) };
  };
  it("a past stage runs from the day it was entered to the day it was left, less 4px of daylight; the current one runs to the expected date", () => {
    const { t, bars } = journey();
    expect(bars.map((b) => [b.status, b.current, b.left, b.width])).toEqual([
      [QueryStatus.QUERIED, false, 0, 10 * 11 - DAYLIGHT_PX],
      [QueryStatus.PARTIAL_REQUESTED, false, 10 * 11, 10 * 11 - DAYLIGHT_PX],
      [QueryStatus.PARTIAL_SENT, true, 20 * 11, 28 * 11],     /* 21 Aug + the agency's 4 weeks */
    ]);
    expect(xOf(t, at(2026, 8, 21))).toBe(220);
  });
  it("⚠️ 4px of daylight wherever the status changes — between EVERY pair, including a stage that lasted under a day", () => {
    const query = q({ dateSent: iso(8, 1), status: QueryStatus.PARTIAL_SENT, partialRequestedDate: iso(8, 11), partialSentDate: iso(8, 11) });
    const r = rows([query], 4)[0];
    const bars = laneBars(r, calTrack([r], NOW), NOW);
    expect(bars).toHaveLength(3);
    for (let i = 1; i < bars.length; i++) expect(bars[i].left - (bars[i - 1].left + bars[i - 1].width), `gap before bar ${i}`).toBe(DAYLIGHT_PX);
    expect(bars[1].width, "the same-day stage keeps its sliver").toBe(8);
  });
  it("⚠️ rust is per BAR, by that bar's stage — a past Partial requested is rust on a lane whose current stage is the agent's", () => {
    const { bars, r } = journey();
    expect(r.withYou).toBe(false);
    expect(bars.map((b) => b.you)).toEqual([false, true, false]);
  });
  it("no date promised: the bar ends at TODAY, open on the right, and carries no end marker", () => {
    const r = rows([q({ dateSent: iso(8, 14) })], null)[0];
    const t = calTrack([r], NOW);
    const [b] = laneBars(r, t, NOW);
    expect(b.openRight).toBe(true);
    expect(b.left + b.width).toBe(t.todayX);
    expect(b.end).toBeNull();
    expect([b.line, b.note, b.tail]).toEqual(["No date promised", "5 weeks waiting", "no date promised"]);
  });
  it("the end marker says whose date it is: a ring for the agent's, a diamond for the writer's; none on a past bar or a close", () => {
    expect(laneBars(rows([q({})], 8)[0], calTrack(rows([q({})]), NOW), NOW)[0].end).toBe("agent");
    const mine = rows([q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: iso(9, 1), expectedSendDate: iso(10, 3) })])[0];
    const bars = laneBars(mine, calTrack([mine], NOW), NOW);
    expect(bars.map((b) => b.end)).toEqual([null, "you"]);
    expect([bars[1].line, bars[1].note]).toEqual(["Due 3 Oct", "14 days left"]);
    const closed = rows([q({ status: QueryStatus.REJECTED, rejectedDate: iso(9, 2) })])[0];
    const cb = laneBars(closed, calTrack([closed], NOW), NOW);
    expect(cb[cb.length - 1].end).toBeNull();
    expect(cb[cb.length - 1].width).toBe(3 * 11);      /* a close is a moment; the view gives it three days */
    expect(cb[cb.length - 1].line).toBe("Passed 2 Sep");
  });
  it("past the expected date it says how far past the WINDOW, and the bar still ends on the date", () => {
    const r = rows([q({ dateSent: iso(7, 1) })], 4)[0];
    const t = calTrack([r], NOW);
    const [b] = laneBars(r, t, NOW);
    expect(b.left + b.width).toBe(xOf(t, at(2026, 7, 29)));
    expect([b.line, b.note]).toEqual(["Reply expected 29 Jul", "7 weeks past the window"]);
  });
  it("⚠️ a stage nothing dates gets NO lane — it is listed under its group, never given a bar", () => {
    const undated = q({ dateSent: iso(6, 1), status: QueryStatus.FULL_SENT });
    const rs = rows([undated, q({ status: QueryStatus.FULL_SENT, fullSentDate: iso(9, 1), fullRequestedDate: iso(8, 25) })]);
    const g = calGroups(rs, calTrack(rs, NOW), NOW).find((x) => x.key === QueryStatus.FULL_SENT)!;
    expect([g.count, g.lanes.length, g.undated.map((r) => r.id)]).toEqual([2, 1, [undated.id]]);
    expect(laneBars(rs[0], calTrack(rs, NOW), NOW)).toEqual([]);
  });
  it("a past bar's title states the stage and its dates; its words are the dates and how long it lasted", () => {
    const { bars } = journey();
    expect(bars[0].title).toBe("Queried, 1 Aug to 11 Aug");
    expect([bars[0].line, bars[0].note]).toEqual(["1 Aug to 11 Aug", "10 days"]);
  });
});

describe("the groups", () => {
  it("by CURRENT status, in the calendar's order, Closed (Withdrawn included) last; empty groups are not drawn", () => {
    const rs = rows([q({ status: QueryStatus.WITHDRAWN, lastStatusChange: iso(9, 1) }), q({}), q({ status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: iso(9, 5) }),
      q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: iso(9, 1) }), q({ status: QueryStatus.OFFER, offerDate: iso(9, 10) })], 6,
      []);
    expect(calGroups(rs, calTrack(rs, NOW), NOW).map((g) => g.label)).toEqual(["Full requested", "Revise & resubmit", "Offer", "Queried", "Closed"]);
  });
  it("within a group, the soonest date first; a query with no date sorts as today", () => {
    const soon = q({ dateSent: iso(8, 1) }), later = q({ dateSent: iso(9, 1) });
    const rs = rows([later, soon], 6);
    expect(calGroups(rs, calTrack(rs, NOW), NOW)[0].lanes.map((l) => l.id)).toEqual([soon.id, later.id]);
  });
  it("no appraisal language in anything a bar can say", () => {
    const said: string[] = [];
    for (const s of Object.values(QueryStatus) as QueryStatus[]) for (const since of [3, 200]) {
      const d = new Date(NOW - since * 86_400_000).toISOString();
      const r = rows([q({ status: s, dateSent: new Date(NOW - 220 * 86_400_000).toISOString(), partialRequestedDate: d, partialSentDate: d, fullRequestedDate: d, fullSentDate: d, rejectedDate: d, offerDate: d, lastStatusChange: d, expectedSendDate: new Date(NOW - 5 * 86_400_000).toISOString() })], 2)[0];
      for (const b of laneBars(r, calTrack([r], NOW), NOW)) said.push(b.line, b.note, b.tail, b.title, b.court);
    }
    expect(said.length).toBeGreaterThan(60);
    for (const s of said) expect(s, s).not.toMatch(/overdue|\blate\b|rejected|urgent/i);
  });
});
