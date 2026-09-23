/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Birds-eye view's arithmetic — the groups, the day count, and the seventy-day track.
 */
import { describe, it, expect } from "vitest";
import { Agent, Query, QueryStatus } from "../types";
import { buildQcRows, type QcRow } from "./qcSummary";
import {
  ATTENTION_HINT, ATTENTION_LABEL, ATTENTION_ORDER, EYE_FOCUS, TRACK_DAYS, UNDATED_LEAD_DAYS, UPCOMING_DAYS,
  attentionGroup, dayCount, eyeBar, eyeFaded, eyeGroups, eyeRows,
} from "./qcBirdsEye";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 23, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over,
});
const agent = (over: Partial<Agent> = {}): Agent => ({ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8, ...over } as Agent);
const rowsOf = (qs: Query[], a: Agent = agent()) => buildQcRows(qs, [a], [], NOW);
const one = (over: Partial<Query>, a: Agent = agent()): QcRow => rowsOf([mkQ(over)], a)[0];
/** A row with its dates written straight in — the geometry's inputs, without the derivation. */
const at = (expectedMs: number | null, stageStartMs: number | null, over: Partial<QcRow> = {}): QcRow =>
  ({ ...one({}), expectedMs, stageStartMs, ...over });

describe("§1.9 · the three attention groups", () => {
  it("the order and the words — and Overdue is the only place the app says 'overdue'", () => {
    expect(ATTENTION_ORDER).toEqual(["overdue", "upcoming", "watch"]);
    expect(ATTENTION_ORDER.map((k) => ATTENTION_LABEL[k])).toEqual(["Overdue", "Upcoming", "Watch and wait"]);
    expect(ATTENTION_ORDER.map((k) => ATTENTION_HINT[k])).toEqual(["to nudge", "next two weeks", "nothing needed"]);
    expect(UPCOMING_DAYS).toBe(14);
  });
  it("a date that has gone by is Overdue", () => {
    expect(attentionGroup(at(NOW - DAY, NOW - 30 * DAY), NOW)).toBe("overdue");
    expect(attentionGroup(at(NOW - 1, NOW - 30 * DAY), NOW)).toBe("overdue");
  });
  it("⚠️ anything WITH YOU is Upcoming whatever its date says — and an offer counts as yours", () => {
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER]) {
      /* a date months away, which would otherwise be Watch and wait */
      expect(attentionGroup(at(NOW + 90 * DAY, NOW - 3 * DAY, { status: s }), NOW), s).toBe("upcoming");
      /* …and with no date at all */
      expect(attentionGroup(at(null, NOW - 3 * DAY, { status: s }), NOW), `${s}, undated`).toBe("upcoming");
    }
  });
  it("⚠️ …but an OVERDUE with-you query is Overdue, because that test comes first", () => {
    const r = at(NOW - 2 * DAY, NOW - 30 * DAY, { status: QueryStatus.FULL_REQUESTED });
    expect(attentionGroup(r, NOW)).toBe("overdue");
  });
  it("an agent-side date inside a fortnight is Upcoming; past that, Watch and wait", () => {
    expect(attentionGroup(at(NOW + UPCOMING_DAYS * DAY, NOW - DAY), NOW)).toBe("upcoming");
    expect(attentionGroup(at(NOW + (UPCOMING_DAYS + 1) * DAY, NOW - DAY), NOW)).toBe("watch");
    /* an agent-side query with NO date is not upcoming — nothing is promised */
    expect(attentionGroup(at(null, NOW - DAY), NOW)).toBe("watch");
  });
});

describe("§6.2 · the day count", () => {
  it("the four wordings, and only the past one is urgent", () => {
    expect(dayCount(at(NOW + 3 * DAY, null), NOW)).toEqual({ text: "3d", urgent: false });
    expect(dayCount(at(NOW, null), NOW)).toEqual({ text: "today", urgent: false });
    expect(dayCount(at(NOW - 10 * DAY, null), NOW)).toEqual({ text: "10d ago", urgent: true });
    /* ⚠️ A DATE NOBODY PROMISED IS "—", NOT "0d" — a number where there is no fact */
    expect(dayCount(at(null, null), NOW)).toEqual({ text: "—", urgent: false });
  });
});

describe("§6.3 · the track — seventy days, the expected date on the line", () => {
  const pcPerDay = 100 / TRACK_DAYS;
  /**
   * ⚠️ THE CONSTANT IS PINNED SEPARATELY FROM THE RELATIONSHIPS, and that is not belt-and-braces.
   * Every assertion below derives its expected value from `TRACK_DAYS`, so changing 70 to 60 moves
   * BOTH sides and the whole block stays green — measured: it did. The scale is a design decision
   * (§6.3: seventy days, thirty-five each side of the line) and a decision is pinned; the geometry
   * built on it is derived, so a retune of the scale fails HERE and nowhere else.
   */
  it("⚠️ the track is seventy days — the design's own number, pinned", () => {
    expect(TRACK_DAYS).toBe(70);
  });
  it("the expected date is at 50%, whatever the date is", () => {
    for (const d of [-40, -1, 0, 1, 40]) {
      /* a bar that ENDS on its expected date: stage start well before, today AT the date */
      const b = eyeBar(at(NOW, NOW - 20 * DAY), NOW);
      expect(Math.round((b.left + b.width) * 100) / 100, `${d}`).toBe(50);
    }
  });
  it("⚠️ time left is the GAP between the bar's end and the line, at 70 days across", () => {
    const b = eyeBar(at(NOW + 14 * DAY, NOW - 7 * DAY), NOW);
    /* today is 14 days before the date, so the bar ends 14 × (100/70) % left of the line */
    expect(Math.round((50 - (b.left + b.width)) * 100) / 100).toBe(Math.round(14 * pcPerDay * 100) / 100);
    /* …and it began 7 days before today, which is 21 days before the DATE the line carries */
    expect(Math.round((50 - b.left) * 100) / 100).toBe(Math.round(21 * pcPerDay * 100) / 100);
    expect(b.over, "nothing is past a date that has not come").toBeNull();
  });
  it("⚠️ a bar past its date crosses the line, and the part beyond it is the overrun", () => {
    const b = eyeBar(at(NOW - 7 * DAY, NOW - 21 * DAY), NOW);
    expect(b.over, "the date has gone and nothing is drawn past the line").toBeTruthy();
    expect(Math.round(b.over!.left)).toBe(50);
    expect(Math.round(b.over!.width * 100) / 100).toBe(Math.round(7 * pcPerDay * 100) / 100);
    expect(Math.round((b.left + b.width) * 100) / 100).toBe(Math.round((50 + 7 * pcPerDay) * 100) / 100);
  });
  it("⚠️ a bar that began before the track is CUT FLAT rather than shortened out of existence", () => {
    /* 60 days before the date is 25 days off the left end of a 70-day track */
    const b = eyeBar(at(NOW + 5 * DAY, NOW - 60 * DAY), NOW);
    expect(b.cut).toBe(true);
    expect(b.left).toBe(0);
    expect(b.width).toBeGreaterThan(0);
    /* and one that fits is not cut */
    expect(eyeBar(at(NOW + 5 * DAY, NOW - 10 * DAY), NOW).cut).toBe(false);
  });
  it("⚠️ no expected date: the row anchors on TODAY, ends at the line, and is drawn dashed", () => {
    const b = eyeBar(at(null, NOW - 14 * DAY), NOW);
    expect(b.dashed).toBe(true);
    expect(Math.round((b.left + b.width) * 100) / 100).toBe(50);
    expect(b.over, "there is no date to be past").toBeNull();
  });
  it("⚠️ no stage start either: a stated lead rather than a bar with no beginning", () => {
    const b = eyeBar(at(null, null), NOW);
    expect(b.dashed).toBe(true);
    expect(UNDATED_LEAD_DAYS).toBe(10);
    expect(Math.round(b.width * 100) / 100).toBe(Math.round(UNDATED_LEAD_DAYS * pcPerDay * 100) / 100);
  });
  /**
   * ⚠️ FOUND BY THE RENDERED PAGE, NOT BY THIS FILE — twenty-five rows were past their date and
   * several had nothing drawn at all, because a query that entered its current stage TODAY spans no
   * time. The zero-width bar then carried a zero-width overrun, which has a POSITION, and a probe
   * that finds one believes the overrun is there: it reported 37px right of the line it is meant to
   * start on. Two faults, one shape — a thing that draws nothing but can still be measured.
   */
  it("⚠️ a bar is at least ONE DAY wide, and it still ends on today", () => {
    const b = eyeBar(at(NOW - 12 * DAY, NOW), NOW);
    expect(Math.round(b.width * 100) / 100).toBe(Math.round(pcPerDay * 100) / 100);
    /* and it still ends where today is — the floor takes its width from the LEFT */
    const today = 50 + (12 * pcPerDay);
    expect(Math.round((b.left + b.width) * 100) / 100).toBe(Math.round(Math.min(100, today) * 100) / 100);
  });
  it("⚠️ an overrun starts at the LINE, or at the bar's own left when the bar begins past it", () => {
    /* the ordinary case: the bar crosses the line, so the ink starts there */
    const crossing = eyeBar(at(NOW - 7 * DAY, NOW - 21 * DAY), NOW);
    expect(Math.round(crossing.over!.left)).toBe(50);
    /* ⚠️ AND THE CASE THE PAGE FOUND: a query that entered its current stage AFTER the date had
       gone. The whole bar is past the line, so the whole bar is ink and the overrun begins where
       the BAR does — not at the line, which is behind it. An assertion that the ink always starts
       at 50 is wrong here, and it was: it reported 37px of disagreement about a correct bar. */
    const beyond = eyeBar(at(NOW - 12 * DAY, NOW), NOW);
    expect(beyond.left, "the precondition: this bar begins past the line").toBeGreaterThan(50);
    expect(beyond.over!.left).toBe(beyond.left);
    expect(Math.round(beyond.over!.width * 100) / 100).toBe(Math.round(beyond.width * 100) / 100);
  });
  it("⚠️ an overrun exists only where a date has GONE — not where it falls today", () => {
    /* a date landing exactly on today is not past: nothing is drawn beyond the line */
    expect(eyeBar(at(NOW, NOW - 10 * DAY), NOW).over).toBeNull();
    expect(eyeBar(at(NOW + DAY, NOW - 10 * DAY), NOW).over).toBeNull();
    expect(eyeBar(at(NOW - 1, NOW - 10 * DAY), NOW).over, "a second past the date is past it").toBeTruthy();
    /* ⚠️ AND NO WIDTH TEST GUARDS IT, deliberately: past a date, `right` is beyond 50 by
       construction and the one-day floor guarantees a drawable width, so a width test would be a
       branch nothing can enter. Every overrun this can produce has width. */
    for (const [e, st] of [[NOW - DAY, NOW - 40 * DAY], [NOW - 40 * DAY, NOW], [NOW - 200 * DAY, NOW - 400 * DAY]] as const) {
      const o = eyeBar(at(e, st), NOW).over;
      expect(o, `${e}`).toBeTruthy();
      expect(o!.width, `${e} drew an overrun with no width`).toBeGreaterThan(0);
    }
  });
  it("nothing is ever drawn outside the track", () => {
    for (const [e, s] of [[NOW + 200 * DAY, NOW - 400 * DAY], [NOW - 200 * DAY, NOW - 400 * DAY], [NOW, NOW]] as const) {
      const b = eyeBar(at(e, s), NOW);
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.left + b.width).toBeLessThanOrEqual(100.001);
      if (b.over) expect(b.over.left + b.over.width).toBeLessThanOrEqual(100.001);
    }
  });
});

describe("the view's rows", () => {
  it("⚠️ closed queries are not drawn — a closed query has no time left to show", () => {
    const rows = rowsOf([QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.OFFER].map((status) => mkQ({ status })));
    const drawn = eyeRows(rows, NOW);
    expect(drawn.map((r) => r.row.status).sort()).toEqual([QueryStatus.OFFER, QueryStatus.QUERIED].sort());
  });
  it("⚠️ soonest first WITHIN a group, and an undated row LAST — never first", () => {
    const rows = [at(NOW + 30 * DAY, NOW - DAY), at(null, NOW - DAY, { agentName: "Zed" }), at(NOW + 20 * DAY, NOW - DAY)];
    const out = eyeRows(rows, NOW);
    expect(out.map((r) => r.row.expectedMs)).toEqual([NOW + 20 * DAY, NOW + 30 * DAY, null]);
  });
  it("every group renders only when it has something in it, in the stated order", () => {
    const rows = [at(NOW - DAY, NOW - 30 * DAY), at(NOW + 3 * DAY, NOW - DAY)];
    const gs = eyeGroups(rows, NOW);
    expect(gs.map((g) => g.key)).toEqual(["overdue", "upcoming"]);
    expect(gs.map((g) => g.count)).toEqual([1, 1]);
    expect(eyeGroups([], NOW)).toEqual([]);
    /* and the counts add up to what was drawn */
    expect(gs.reduce((a, g) => a + g.count, 0)).toBe(eyeRows(rows, NOW).length);
  });
  it("⚠️ the focus FADES the other court and never hides it — three states, and `all` fades nothing", () => {
    expect(EYE_FOCUS.map((f) => f.key)).toEqual(["all", "you", "agent"]);
    expect(EYE_FOCUS.map((f) => f.label)).toEqual(["Everything", "With you", "With the agent"]);
    const [mine] = eyeRows([at(NOW + 3 * DAY, NOW - DAY, { status: QueryStatus.FULL_REQUESTED })], NOW);
    const [theirs] = eyeRows([at(NOW + 3 * DAY, NOW - DAY)], NOW);
    expect([eyeFaded(mine, "all"), eyeFaded(theirs, "all")]).toEqual([false, false]);
    expect([eyeFaded(mine, "you"), eyeFaded(theirs, "you")]).toEqual([false, true]);
    expect([eyeFaded(mine, "agent"), eyeFaded(theirs, "agent")]).toEqual([true, false]);
  });
  it("⚠️ the row's title states a fact and never a verdict — 'overdue' is the GROUP's word, not a row's", () => {
    const past = eyeRows([at(NOW - 9 * DAY, NOW - 30 * DAY)], NOW)[0];
    expect(past.title).toContain("past the expected date");
    for (const r of eyeRows([at(NOW - 9 * DAY, NOW - 30 * DAY), at(null, null), at(NOW + 3 * DAY, NOW - DAY)], NOW)) {
      expect(r.title, r.title).not.toMatch(/overdue|late|behind/i);
    }
  });
});
