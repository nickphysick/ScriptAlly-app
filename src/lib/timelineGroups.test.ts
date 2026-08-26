import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import {
  queryGroup, rowGroupOf, GROUP_ORDER, GROUP_LABEL, CLOSED_LINGER_DAYS, COLLAPSED_BY_DEFAULT,
  type QueryFacts, type RowGroup,
} from "./timelineGroups";
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
    const numbers = [...code.matchAll(/\b\d+\b/g)].map((m) => m[0]);
    expect(numbers, `numbers in the derivation: ${numbers.join(", ")}`).toEqual(["7"]);
    expect(code).toContain("CLOSED_LINGER_DAYS = 7");
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
    expect(COLLAPSED_BY_DEFAULT).toEqual(["snoozed"]);
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
