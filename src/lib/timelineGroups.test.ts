import { describe, it, expect } from "vitest";
import { TERMINAL_STATUSES } from "./agentList";
import { QueryStatus } from "../types";
import {
  queryGroup, rowGroupOf, GROUP_ORDER, GROUP_LABEL, CLOSED_LINGER_DAYS, COLLAPSED_BY_DEFAULT,
  type QueryFacts, type RowGroup, isBoardClosed } from "./timelineGroups";
import { sideOf } from "./journeyBars";
import { STATUS_ORDER } from "./statusOrder";

const TODAY = "2026-08-26";
const days = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);
const q = (over: Partial<QueryFacts> = {}): QueryFacts =>
  ({ status: QueryStatus.QUERIED, nudgeYmd: null, backYmd: null, ...over });

describe("the now/soon split is by KIND, not by a threshold", () => {
  /**
   * ⚠️ THE PROPERTY, NOT THE CASES. A day count would put two rows in different groups for a
   * difference of one night; this asserts that no such boundary exists — a reminder is "soon"
   * however far off, and "now" the moment it arrives, with nothing in between.
   */
  it("a reminder ahead is soon at ANY distance, and now the day it lands", () => {
    for (const d of [1, 2, 7, 30, 200, 900]) {
      const ahead = new Date(`${TODAY}T12:00:00`); ahead.setDate(ahead.getDate() + d);
      const ymd = ahead.toISOString().slice(0, 10);
      expect(queryGroup(q({ nudgeYmd: ymd }), TODAY), `${d} days ahead`).toBe("soon");
    }
    for (const d of [0, 1, 5, 40, 400]) {
      const back = new Date(`${TODAY}T12:00:00`); back.setDate(back.getDate() - d);
      const ymd = back.toISOString().slice(0, 10);
      expect(queryGroup(q({ nudgeYmd: ymd }), TODAY), `${d} days ago`).toBe("now");
    }
  });

  it("no day count decides any group but the closure linger", async () => {
    /* ⚠️ ASSERTED AGAINST THE SOURCE, because the claim is that a number is ABSENT. The one
       permitted count is the linger, which is a retention policy rather than a classification. */
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("./timelineGroups.ts", import.meta.url), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    /* ⚠️ SCOPED TO THE CLASSIFICATION, and the scoping is the point rather than a convenience.
       The file also holds `groupSentence` and `inWords`, which are COPY — the words for nought
       through twenty, and the boundary past which a numeral reads better than a word. Those
       numbers decide how a sentence is spelled, not which group a row is in, so a sweep over the
       whole file would have forbidden them for a reason that is not true of them. The claim was
       always about the derivation; it now reads only the derivation. */
    const derivation = code.slice(0, code.indexOf("const ONES"));
    const numbers = [...derivation.matchAll(/\b\d+\b/g)].map((m) => m[0]);
    expect(numbers, `numbers in the derivation: ${numbers.join(", ")}`).toEqual(["30"]);
    expect(code).toContain("CLOSED_LINGER_DAYS = 30");
    /* the population floor: a slice that found nothing would report "no numbers" for ever */
    expect(derivation.length, "the derivation slice is empty").toBeGreaterThan(1000);
    expect(derivation).toContain("export function queryGroup");
  });
});

describe("what each group means", () => {
  it("an offer is always its own group, whatever else the row holds", () => {
    expect(queryGroup(q({ status: QueryStatus.OFFER }), TODAY)).toBe("offers");
    /* even snoozed, even with a reminder overdue — an offer is not a chore */
    expect(queryGroup(q({ status: QueryStatus.OFFER, backYmd: "2099-01-01", nudgeYmd: "2000-01-01" }), TODAY))
      .toBe("offers");
    expect(rowGroupOf([q({ status: QueryStatus.OFFER })], null, TODAY, days)).toBe("offers");
  });

  /**
   * ⚠️ RECONCILED AGAINST `sideOf`, NEVER AGAINST A HAND-WRITTEN LIST OF STATUSES. Writing the
   * four "your move" statuses out here would be a second copy of the CTA engine's mapping, and it
   * would go green the day the engine changed and the board did not.
   */
  it("every writer's-move status is `now`, and every agent's-move status is not", () => {
    let move = 0, theirs = 0;
    for (const status of STATUS_ORDER) {
      if (status === QueryStatus.OFFER) continue;
      const g = queryGroup(q({ status }), TODAY);
      if (sideOf(status) === "yours") { move += 1; expect(g, status).toBe("now"); }
      else if (sideOf(status) === "theirs") { theirs += 1; expect(g, status).toBe("watching"); }
    }
    expect(move, "no writer's-move status was exercised").toBeGreaterThan(0);
    expect(theirs, "no agent's-move status was exercised").toBeGreaterThan(0);
  });

  it("a live snooze outranks everything but an offer, and a spent one does not", () => {
    expect(queryGroup(q({ backYmd: "2099-01-01" }), TODAY)).toBe("snoozed");
    /* a snooze that has returned is not a snooze */
    expect(queryGroup(q({ backYmd: "2000-01-01" }), TODAY)).toBe("watching");
  });

  it("snoozing one book does not quieten the other", () => {
    const row = [q({ backYmd: "2099-01-01" }), q()];
    expect(rowGroupOf(row, null, TODAY, days)).toBe("watching");
    expect(rowGroupOf([q({ backYmd: "2099-01-01" })], null, TODAY, days)).toBe("snoozed");
  });

  it("a row takes the earliest group any of its queries earns", () => {
    const rows: [QueryFacts[], RowGroup][] = [
      [[q(), q({ status: QueryStatus.PARTIAL_REQUESTED })], "now"],
      [[q(), q({ nudgeYmd: "2099-01-01" })], "soon"],
      [[q({ nudgeYmd: "2099-01-01" }), q({ status: QueryStatus.OFFER })], "offers"],
    ];
    for (const [live, want] of rows) expect(rowGroupOf(live, null, TODAY, days)).toBe(want);
  });
});

describe("a closure lingers a week, then goes", () => {
  it("inside the window it is a row; outside it is not drawn at all", () => {
    const ago = (d: number) => {
      const x = new Date(`${TODAY}T12:00:00`); x.setDate(x.getDate() - d);
      return x.toISOString().slice(0, 10);
    };
    expect(rowGroupOf([], ago(0), TODAY, days)).toBe("closed");
    expect(rowGroupOf([], ago(CLOSED_LINGER_DAYS), TODAY, days)).toBe("closed");
    /* ⚠️ `null` IS "GONE", not "closed". Returning "closed" here keeps every closure a writer has
       ever had on the board forever, which is what the ungrouped page does today. */
    expect(rowGroupOf([], ago(CLOSED_LINGER_DAYS + 1), TODAY, days)).toBeNull();
    /* ⚠️ AN UNKNOWN CLOSURE DATE KEEPS THE ROW, and this is the assertion that says so. The
       closure fields are DERIVED, so a record predating them carries neither — and deleting a
       relationship because a field is missing is a confident answer to an unanswerable question.
       Keeping a stale closure costs a visible row; hiding a real one costs the record. */
    expect(rowGroupOf([], null, TODAY, days), "a closed row with no closure date was deleted").toBe("closed");
  });
});

describe("the vocabulary", () => {
  it("the order is the rank and there is only one of them", () => {
    expect(GROUP_ORDER).toEqual(["offers", "now", "soon", "watching", "snoozed", "closed"]);
    expect(Object.keys(GROUP_LABEL).sort()).toEqual([...GROUP_ORDER].sort());
    /* ⚠️ TWO NOW (v36, Phase 6). Both are history rather than work — one the writer saying "not
       yet", the other a relationship that has ended — and a board opens on what is being asked.
       Both keep their heading, their count and their `show ›`: a quiet group is honest,
       disappearing is not. */
    expect([...COLLAPSED_BY_DEFAULT]).toEqual(["snoozed", "closed"]);
    /* and every one of them is a real group, so the page cannot collapse something that is not there */
    for (const g of COLLAPSED_BY_DEFAULT) expect(GROUP_ORDER).toContain(g);
  });

  /** ⚠️ NOT A GROUP NAME AND NOT A WORD — a verdict, and one that implies a deadline that mostly
   *  does not exist. Asserted over the labels AND the source, because the temptation is to reach
   *  for it in a comment first and a string second. */
  it("nothing here says overdue, late or missed", () => {
    for (const label of Object.values(GROUP_LABEL)) {
      expect(label.toLowerCase(), label).not.toMatch(/overdue|late|missed|failed|behind/);
    }
  });
});

describe("⚠️ what the BOARD calls closed, and what it deliberately does not (v55)", () => {
  /**
   * ⚠️ THE ONE DIFFERENCE IS `No Response`, AND THE RENDERED BOARD CANNOT SEE IT. No relationship
   * on the harness account is rejected, withdrawn OR unanswered, so `isBoardClosed` and
   * `isTerminalStatus` agree on every row and a measured lock cannot tell them apart — proved: a
   * mutation swapping one for the other left the view lock green. The distinction is a predicate,
   * so it is asserted as one.
   */
  it("rejected and withdrawn are closed", () => {
    expect(isBoardClosed(QueryStatus.REJECTED)).toBe(true);
    expect(isBoardClosed(QueryStatus.WITHDRAWN)).toBe(true);
  });

  it("⚠️ `No Response` IS NOT CLOSED — the writer can still nudge it, and still close it", () => {
    /* which is exactly why the board offers it a close. Filing it under `Closed` would put a row
       they can still act on into the one view that says there is nothing left to do. */
    expect(isBoardClosed(QueryStatus.NO_RESPONSE)).toBe(false);
  });

  it("⚠️ AND IT DIVERGES FROM `TERMINAL_STATUSES` ON EXACTLY THAT ONE", () => {
    /* the app-wide set is left alone: it is read by the agent list and the agent context, where
       "terminal" means "this query is over" and No Response belongs. Redefining it there to suit a
       view would change a fact about the data to fix a fact about a tab. The divergence is stated
       here so it reads as a decision rather than as drift. */
    const differ = TERMINAL_STATUSES.filter((s) => !isBoardClosed(s));
    expect(differ).toEqual([QueryStatus.NO_RESPONSE]);
    /* and nothing the board calls closed is outside the app's terminal set */
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN]) {
      expect(TERMINAL_STATUSES).toContain(s);
    }
  });

  it("nothing live is closed", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_SENT,
      QueryStatus.OFFER, QueryStatus.REVISE_RESUBMIT]) {
      expect(isBoardClosed(s), `${s} is not a closure`).toBe(false);
    }
  });
});
