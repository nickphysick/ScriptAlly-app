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
  ALLOWANCE_FLOOR, ATTENTION_HINT, ATTENTION_LABEL, ATTENTION_ORDER, EYE_FOCUS, PROGRESS_FLOOR, UPCOMING_DAYS,
  attentionGroup, dayCount, eyeProgress, eyeFaded, eyeGroups, eyeRows,
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

describe("§3.2 · the progress bar — how far through the agency's own window", () => {
  /**
   * ⚠️ THE FRACTION IS THE WHOLE MODEL, AND EVERY ASSERTION DERIVES ITS EXPECTED VALUE FROM IT.
   * `f = (today − stage entry) / (expected − stage entry)`. A test that typed 0.5 beside a fixture
   * built to be half way through would pass on a function that returned 0.5 for everything.
   */
  it("up to the date the allowance is the whole track and the fill is f", () => {
    /* entered 10 days ago, due in 10 — exactly half way */
    const p = eyeProgress(at(NOW + 10 * DAY, NOW - 10 * DAY), NOW);
    expect(p.dated).toBe(true);
    expect(p.f).toBeCloseTo(0.5, 6);
    expect(p.allowance, "the allowance is the whole track up to the date").toBe(1);
    expect(p.fill).toBeCloseTo(0.5, 6);
    expect(p.over, "nothing is past a date that has not come").toBe(0);
  });
  it("⚠️ a stage entered TODAY still draws — the 3% floor, and it is of the TRACK", () => {
    const p = eyeProgress(at(NOW + 20 * DAY, NOW), NOW);
    expect(p.f).toBe(0);
    expect(p.fill).toBe(PROGRESS_FLOOR);
    expect(PROGRESS_FLOOR, "the floor is a design decision and is pinned on its own").toBe(0.03);
  });
  it("⚠️ past the date the bar RESCALES: the allowance is 1/f and the rest is ink", () => {
    /* entered 31 days ago against a 25-day window: f = 31/25 = 1.24 */
    const p = eyeProgress(at(NOW - 6 * DAY, NOW - 31 * DAY), NOW);
    expect(p.f).toBeCloseTo(31 / 25, 6);
    expect(p.allowance).toBeCloseTo(25 / 31, 6);
    expect(p.over).toBeCloseTo(1 - 25 / 31, 6);
    /* the fill fills the allowance once the date has gone — there is no unspent window left */
    expect(p.fill).toBeCloseTo(p.allowance, 6);
    /* …and the three parts are the whole track, which is what makes the notch the due date */
    expect(p.allowance + p.over).toBeCloseTo(1, 6);
  });
  it("the notch sits at the allowance, which is where the mock draws it", () => {
    /* the ref renders an allowance of 56.5 in a 70px track: f = 70/56.5 */
    const f = 70 / 56.5;
    const windowDays = 25;
    const p = eyeProgress(at(NOW - (f - 1) * windowDays * DAY, NOW - f * windowDays * DAY), NOW);
    expect(p.allowance).toBeCloseTo(56.5 / 70, 3);
  });
  it("⚠️ an overrun exists only where a date has GONE — not where it falls today", () => {
    expect(eyeProgress(at(NOW, NOW - 10 * DAY), NOW).over, "a date landing today is not past").toBe(0);
    expect(eyeProgress(at(NOW + DAY, NOW - 10 * DAY), NOW).over).toBe(0);
    expect(eyeProgress(at(NOW - 1, NOW - 10 * DAY), NOW).over, "a second past the date is past it").toBeGreaterThan(0);
  });
  it("⚠️ a missing stage entry falls back to the SEND DATE — the date the end was computed from", () => {
    /* the expected date IS `last send + the agency's window`, so the send is the window's own start;
       found on the page, where a row read "60d over" beside an empty track */
    const r = { expectedMs: NOW + 10 * DAY, stageStartMs: null, sentMs: NOW - 10 * DAY } as never as QcRow;
    const p = eyeProgress(r, NOW);
    expect(p.dated, "a send and an expected date are a window").toBe(true);
    expect(p.f).toBeCloseTo(0.5, 6);
  });
  it("⚠️ either end missing is UNDATED — a window needs a beginning and an end", () => {
    /* ⚠️ AND THE SEND IS CLEARED TOO, or the fallback above quietly supplies the missing end and
       this case measures a window rather than the absence of one. */
    for (const [e, st] of [[null, NOW - 14 * DAY], [NOW + 5 * DAY, null], [null, null]] as const) {
      const p = eyeProgress(at(e, st, { sentMs: null }), NOW);
      expect(p.dated, `${e} / ${st}`).toBe(false);
      expect(p.f).toBeNull();
      expect(p.fill, "an undated track is empty, not floored").toBe(0);
      expect(p.over).toBe(0);
    }
  });
  it("⚠️ a window of zero or less is fully overrun, never a division by zero", () => {
    const p = eyeProgress(at(NOW - 10 * DAY, NOW - 10 * DAY), NOW);
    expect(p.dated).toBe(true);
    expect(p.f).toBe(Infinity);
    expect(p.allowance, "clamped so the notch still has somewhere to stand").toBe(ALLOWANCE_FLOOR);
    expect(p.over).toBeCloseTo(1 - ALLOWANCE_FLOOR, 6);
    expect(Number.isFinite(p.fill) && p.fill > 0, "and it still draws something").toBe(true);
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
