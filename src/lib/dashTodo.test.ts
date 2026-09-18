/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `dashTodo` — the dashboard's to-do rows (v16, 18 Sep).
 *
 * ⚠️ THE GUESSED-WINDOW CASE IS WHY THIS FILE EXISTS. The bar is days elapsed over the window the
 * AGENCY stated; where no window is stated the house assumption fills in and the bar drops to 55% so
 * a guess cannot be mistaken for a fact. **The harness account states a reply window for every
 * agent**, so the rendered page cannot exercise the faint branch at all — it would be a probe over a
 * fixture where every case is the same case, which is the monoculture this repo keeps paying for.
 * Both branches are entered here, and the tally is asserted.
 *
 * ⚠️ AND THE EXPECTED FIGURES ARE DERIVED, NEVER TYPED. `listRowInputs` reads `Date.now()`, so a
 * hand-written "14 days" would be wrong the day after it was written; the expectation is built from
 * the same accessor the row is built from, which is the house form — two derivations against each
 * other rather than a literal on both sides.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import type { BoardCard } from "./todoBoard";
import { listRowInputs, type TaskData } from "./taskCardFacts";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { moreWaiting, splitTitle, todoRows } from "./dashTodo";

const DAY = 86400000;
const ago = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const agent = (id: string, weeks?: number): Agent =>
  ({ id, userId: "u", name: id, agency: `${id} Lit`,
     ...(weeks === undefined ? {} : { responseTimeWeeks: weeks }) } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, sentDaysAgo: number): Query =>
  ({ id, userId: "u", agentId, manuscriptId: "m1", status, dateSent: ago(sentDaysAgo) } as unknown as Query);
/**
 * ⚠️ THE CARD CARRIES `taskType: "nudge_overdue"` BY DEFAULT, AND THAT IS NOT DECORATION. The anchor
 * a row counts from is `waitAnchorMs(cardBucket(c), c.taskType, …)`, and `cardBucket` falls through
 * to `"fix"` — a housekeeping gap, which by design has NOTHING to measure from and returns `NaN`. A
 * fixture without a task type therefore produces a row with no day figure and no bar, which is
 * correct behaviour and proves nothing about the bar. `nudge_overdue` is the `chase` bucket, whose
 * anchor is the query's own send date.
 */
const card = (key: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key, stream: "todo", title: "Follow up with Jonathan Marsh", who: "Jonathan Marsh", subtitle: "",
     due: "", warn: false, snoozes: 0, hk: false, initials: "JM", record: "Marsh Lit",
     taskType: "nudge_overdue", committed: false, done: false, ...over } as BoardCard);

const data = (queries: Query[], agents: Agent[]): TaskData =>
  ({ queries, agents, manuscripts: [], userTasks: [], activities: [] });

describe("splitTitle", () => {
  it("splits the sentence around the person the board emphasised", () => {
    expect(splitTitle("Send your full to Jonathan Marsh", "Jonathan Marsh"))
      .toEqual({ pre: "Send your full to ", who: "Jonathan Marsh", post: "" });
    expect(splitTitle("Jonathan Marsh asked for more", "Jonathan Marsh"))
      .toEqual({ pre: "", who: "Jonathan Marsh", post: " asked for more" });
  });

  /* ⚠️ A NAME THAT IS NOT IN THE TITLE LEAVES THE TITLE WHOLE. The board builds both from one
     record, so this is a lookup rather than a guess — and where the lookup misses, the row states
     what it would have stated anyway rather than inventing a split. */
  it("leaves the title whole when the name is absent or empty", () => {
    expect(splitTitle("Record what you sent", "Jonathan Marsh"))
      .toEqual({ pre: "Record what you sent", who: "", post: "" });
    expect(splitTitle("Record what you sent", ""))
      .toEqual({ pre: "Record what you sent", who: "", post: "" });
  });
});

describe("moreWaiting", () => {
  it("is the remainder, and never negative", () => {
    expect(moreWaiting(23, 8)).toBe(15);
    expect(moreWaiting(3, 3)).toBe(0);
    /* a card showing more than the board holds is a bug elsewhere; it must not print "-2 more" */
    expect(moreWaiting(3, 5)).toBe(0);
  });
});

describe("the progress bar", () => {
  /* ⚠️ FOUR, NOT EIGHT, AND THE VALUE IS THE POINT. `STAGE_RESPONSE_WINDOWS.query` IS eight weeks,
     so a stated eight makes the two branches produce the same percentage — a fixture in which the
     assertion cannot tell a stated window from a guessed one, and it passed. */
  const STATED_WEEKS = 4;
  const cards = [
    card("k-stated", { relatedRecordId: "q-stated", agentId: "a-stated", status: QueryStatus.QUERIED }),
    card("k-guess", { relatedRecordId: "q-guess", agentId: "a-guess", status: QueryStatus.QUERIED }),
  ];
  const db = data(
    [query("q-stated", "a-stated", QueryStatus.QUERIED, 28), query("q-guess", "a-guess", QueryStatus.QUERIED, 28)],
    [agent("a-stated", STATED_WEEKS), agent("a-guess")],
  );
  const rows = todoRows({ cards, data: db });
  const byKey = (k: string) => rows.find((r) => r.key === k)!;

  /* ⚠️ THE TALLY: both branches must be ENTERED, or a fixture that drifts into one state passes
     while proving half the behaviour. */
  it("⚠️ the fixture exercises both windows", () => {
    expect(rows.map((r) => r.bar?.stated)).toEqual([true, false]);
  });

  it("a stated window is the agency's own, and the bar is the row's own day figure over it", () => {
    const r = byKey("k-stated");
    const days = listRowInputs(cards[0], db).days!;
    expect(days, "the fixture must have a clock running").toBeGreaterThan(0);
    expect(r.days).toBe(days);
    expect(r.bar).toEqual({ pct: (days / (STATED_WEEKS * 7)) * 100, stated: true });
  });

  /**
   * ⚠️ A WINDOW NOBODY STATED IS THE HOUSE ASSUMPTION, AND IT IS FLAGGED AS ONE. The figure is
   * `STAGE_RESPONSE_WINDOWS` for the stage the query is at, and `stated: false` is what takes the
   * bar to 55% on the page. Without the flag a guess would be drawn exactly like a fact.
   */
  it("an unstated window falls back to the stage's house figure, and says so", () => {
    const r = byKey("k-guess");
    const days = listRowInputs(cards[1], db).days!;
    expect(r.bar).toEqual({ pct: (days / (STAGE_RESPONSE_WINDOWS.query * 7)) * 100, stated: false });
    /* and the two disagree — a fallback equal to the stated window would prove nothing */
    expect(r.bar!.pct).not.toBe(byKey("k-stated").bar!.pct);
  });

  /* ⚠️ THE STAGE DECIDES WHICH HOUSE WINDOW APPLIES — a partial out is not on the query's clock */
  it("the house window follows the stage the query is at", () => {
    const c = card("k-partial", { relatedRecordId: "q-p", agentId: "a-guess", status: QueryStatus.PARTIAL_SENT });
    const pdb = data([query("q-p", "a-guess", QueryStatus.PARTIAL_SENT, 28)], [agent("a-guess")]);
    const r = todoRows({ cards: [c], data: pdb })[0];
    const days = listRowInputs(c, pdb).days!;
    expect(r.bar).toEqual({ pct: (days / (STAGE_RESPONSE_WINDOWS.partial * 7)) * 100, stated: false });
  });

  /* ⚠️ A WINDOW THAT HAS RUN OUT IS FULL, NEVER OVER — a bar past 100% draws outside its track */
  it("clamps at 100 rather than overflowing", () => {
    const c = card("k-old", { relatedRecordId: "q-old", agentId: "a-stated", status: QueryStatus.QUERIED });
    const odb = data([query("q-old", "a-stated", QueryStatus.QUERIED, 400)], [agent("a-stated", 2)]);
    expect(todoRows({ cards: [c], data: odb })[0].bar).toEqual({ pct: 100, stated: true });
  });

  /* ⚠️ NO QUERY, NO BAR. A housekeeping card has no window to be through, and drawing an empty track
     under it would state that it has one and is at nought. */
  it("a card with no query draws no bar and states no status", () => {
    const c = card("k-house", { hk: true, title: "Add your manuscript", who: "", taskType: "agent_missing_wishlist" });
    const r = todoRows({ cards: [c], data: data([], []) })[0];
    expect(r.bar).toBeNull();
    expect(r.status).toBeNull();
    expect(r.queryId).toBeNull();
  });
});

describe("the row's words", () => {
  /* ⚠️ THE TICKET'S OWN VOCABULARY — "Asked on 22 August". A second wording for the same fact is how
     two surfaces come to call one date two things. */
  it("the meta line is the ticket's date phrase where there is a date", () => {
    const c = card("k1", { relatedRecordId: "q1", agentId: "a1", status: QueryStatus.QUERIED });
    const db = data([query("q1", "a1", QueryStatus.QUERIED, 20)], [agent("a1", 8)]);
    const r = todoRows({ cards: [c], data: db })[0];
    /* the ticket's own phrase, whatever it is for this bucket, ending in the date it anchors on */
    expect(r.meta).toMatch(/ \d+ (January|February|March|April|May|June|July|August|September|October|November|December)$/);
    expect(r.meta, "the row must not restate the agency where there is a date").not.toBe(c.record);
  });

  /* ⚠️ AND WHERE THERE IS NO DATE, THE ROW STATES THE CARD'S OWN META RATHER THAN INVENTING ONE. A
     housekeeping gap is raised from a flag that records every date except when it was raised — so
     there is genuinely nothing to measure from, and the honest answer is the agency line. */
  it("falls back to the card's own record line where there is no anchor", () => {
    const c = card("k1", { taskType: "agent_missing_wishlist", record: "Marsh Lit" });
    const r = todoRows({ cards: [c], data: data([], []) })[0];
    expect(r.days).toBeNull();
    expect(r.meta).toBe("Marsh Lit");
  });

  /* ⚠️ URGENT IS THE BOARD'S, NOT THE ROW'S — the row reports it and never decides it, or a task
     would change category as time passed and the list would redraw itself overnight. */
  it("urgent is whatever the caller's predicate says, and false when none is given", () => {
    const c = card("k1");
    const db = data([], []);
    expect(todoRows({ cards: [c], data: db })[0].urgent).toBe(false);
    expect(todoRows({ cards: [c], data: db, isUrgent: () => true })[0].urgent).toBe(true);
    /* and the predicate is handed the card, so it can only ever answer about the card it is given */
    const seen: string[] = [];
    todoRows({ cards: [c], data: db, isUrgent: (x) => { seen.push(x.key); return false; } });
    expect(seen).toEqual(["k1"]);
  });
});
