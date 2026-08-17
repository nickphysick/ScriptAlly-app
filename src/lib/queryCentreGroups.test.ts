/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §5 — the list groups by state, and the right-hand figure states a position.
 *
 * ⚠️ THE CASES THAT MATTER ARE THE RECONCILIATIONS, not the individual answers. Any one of these
 * derivations is easy to get right on its own; the faults this section can produce are all
 * disagreements between two of them — a row filed under OVERDUE reading "27 DAYS LEFT", a Nudge
 * offered on a row the list calls waiting, a group whose counts do not sum to the list.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { listGroupFor, rowFigure, figureText, GROUP_ORDER, GROUP_LABEL, foldClosed, CLOSED_FOLD_MIN } from "./queryCentreGroups";
import { replyTaskFor } from "./taskPrecedence";
import { queryBucket } from "./queryAmbient";

const NOW = Date.parse("2026-08-14T12:00:00Z");
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

const agent = (over: Partial<{ responseTimeWeeks: number; noResponseMeansNo: boolean }> = {}) =>
  ({ responseTimeWeeks: 8, noResponseMeansNo: false, ...over });
const q = (over: Partial<{ status: QueryStatus; dateSent: string; responseDeadline: string; lastNudgeSentDate: string }> = {}) =>
  ({ status: QueryStatus.QUERIED, dateSent: daysAgo(10), ...over }) as never;

describe("§5 · the four groups", () => {
  it("overdue leads and closed trails — the order is what the section is for", () => {
    expect([...GROUP_ORDER]).toEqual(["overdue", "waiting", "move", "closed"]);
  });

  /**
   * ⚠️ `YOUR MOVE`, NOT THE REF'S `WITH THE AGENT` — a deliberate deviation, asserted so it is a
   * decision rather than a slip. The ref's third group holds partial/full requested and R&R: in
   * every one the agent has ASKED and the writer owes the pages, so "with the agent" states the
   * reverse of what is true. This page's own filter pills already call that set "Your move".
   */
  it("the third group is named for whose turn it actually is", () => {
    expect(GROUP_LABEL.move).toBe("YOUR MOVE");
    for (const status of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) {
      expect(queryBucket(status), `${status} is not the writer's turn`).toBe("move");
      expect(listGroupFor(q({ status }), agent(), NOW)).toBe("move");
    }
  });

  it("membership is the shared bucket, split only where the clock splits it", () => {
    expect(listGroupFor(q({ dateSent: daysAgo(10) }), agent(), NOW)).toBe("waiting");
    expect(listGroupFor(q({ dateSent: daysAgo(60) }), agent(), NOW)).toBe("overdue");
    expect(listGroupFor(q({ status: QueryStatus.REJECTED }), agent(), NOW)).toBe("closed");
    expect(listGroupFor(q({ status: QueryStatus.NO_RESPONSE }), agent(), NOW)).toBe("closed");
    expect(listGroupFor(q({ status: QueryStatus.OFFER }), agent(), NOW)).toBe("closed");
  });

  /* ⚠️ NO STATED WINDOW → `waiting`, NEVER `overdue`. There is nothing for it to be late against;
     guessing a default would file a row under "chase this" on a number nobody typed. */
  it("a waiting query with no stated window stays waiting, however old", () => {
    expect(listGroupFor(q({ dateSent: daysAgo(900) }), agent({ responseTimeWeeks: 0 }), NOW)).toBe("waiting");
    expect(listGroupFor(q({ dateSent: daysAgo(900) }), null, NOW)).toBe("waiting");
    expect(listGroupFor(q({ dateSent: undefined }), agent(), NOW)).toBe("waiting");
  });

  it("every query lands in exactly one group — the counts sum to the list", () => {
    const rows = [
      q({ dateSent: daysAgo(10) }), q({ dateSent: daysAgo(60) }),
      q({ status: QueryStatus.PARTIAL_REQUESTED }), q({ status: QueryStatus.REJECTED }),
      q({ status: QueryStatus.PARTIAL_SENT, dateSent: daysAgo(200) }),
      q({ dateSent: daysAgo(900) }),
    ];
    const counts = rows.map((r) => listGroupFor(r, agent(), NOW));
    expect(counts.length).toBe(rows.length);
    for (const g of counts) expect(GROUP_ORDER).toContain(g);
  });
});

describe("§5 · the figure is a position, and it agrees with the group", () => {
  /**
   * ⚠️ THE FIGURE SCALES ITS UNIT AND LOSES ITS SHOUT (§4a/§4c). `+46 DAYS LEFT` became `7 weeks
   * left`: mono uppercase belonged to a label, and a `+` on a wait is an overrun against a deadline
   * the agency never agreed to. The DERIVATION is untouched — same days, same groups, same
   * direction — which is why only the strings in these cases moved.
   */
  it("waiting counts down, overdue counts up, everything else keeps its date", () => {
    expect(figureText(rowFigure(q({ dateSent: daysAgo(10) }), agent(), NOW))).toBe("7 weeks left");
    expect(figureText(rowFigure(q({ dateSent: daysAgo(75) }), agent(), NOW))).toBe("3 weeks");
    expect(rowFigure(q({ status: QueryStatus.PARTIAL_REQUESTED }), agent(), NOW).kind).toBe("date");
    expect(rowFigure(q({ status: QueryStatus.REJECTED }), agent(), NOW).kind).toBe("date");
    expect(figureText({ kind: "date" })).toBeNull();
  });

  /**
   * ⚠️ THE RECONCILIATION THIS SECTION EXISTS FOR. If the countdown read the STAGE windows while the
   * group read the agent's stated one, a row could sit under OVERDUE reading "27 DAYS LEFT". Both
   * now read `replyDeadlineMs`, and this asserts the consequence rather than the plumbing: a row in
   * the overdue group is NEVER counting down, and a row in the waiting group is never counting up.
   */
  it("⚠️ no row is ever filed against its own figure", () => {
    for (let d = 0; d <= 200; d += 1) {
      const row = q({ dateSent: daysAgo(d) });
      const group = listGroupFor(row, agent(), NOW);
      const fig = rowFigure(row, agent(), NOW);
      if (group === "overdue") expect(fig.kind, `day ${d}: an overdue row is counting down`).toBe("late");
      if (group === "waiting" && fig.kind !== "date") expect(fig.kind, `day ${d}: a waiting row is counting up`).toBe("left");
    }
  });

  /* ⚠️ AND THE NUDGE BUTTON CAN ONLY EVER LIGHT ON A ROW THE LIST HAS ALREADY CALLED OVERDUE. */
  it("⚠️ nudgeable ⊆ overdue, at every age", () => {
    for (const a of [agent(), agent({ noResponseMeansNo: true }), agent({ responseTimeWeeks: 4 })]) {
      for (let d = 0; d <= 300; d += 1) {
        const row = q({ dateSent: daysAgo(d) });
        if (replyTaskFor(row, a, NOW) === "nudge") {
          expect(listGroupFor(row, a, NOW), `day ${d}: Nudge lit on a row the list is not chasing`).toBe("overdue");
        }
      }
    }
  });

  it("singulars agree, and the day the window closes says so", () => {
    expect(figureText(rowFigure(q({ dateSent: daysAgo(55) }), agent(), NOW))).toBe("1 day left");
    expect(figureText(rowFigure(q({ dateSent: daysAgo(56) }), agent(), NOW))).toBe("today");
    expect(figureText(rowFigure(q({ dateSent: daysAgo(57) }), agent(), NOW))).toBe("1 day");
  });

  it("an unplaceable query keeps its date rather than inventing a position", () => {
    expect(rowFigure(q({ dateSent: daysAgo(900) }), agent({ responseTimeWeeks: 0 }), NOW).kind).toBe("date");
    expect(rowFigure(q({ dateSent: undefined }), agent(), NOW).kind).toBe("date");
    expect(rowFigure(q(), null, NOW).kind).toBe("date");
  });
});

describe("§5 · closed folds, but only when folding earns its place", () => {
  /* ⚠️ A FIRST-TIME WRITER WITH TWO REJECTIONS SHOULD SEE BOTH. Hiding them saves four rows of
     nothing and teaches that the app keeps things from you. */
  it("a handful stays open; a real backlog folds", () => {
    expect(foldClosed(0)).toBe(false);
    expect(foldClosed(2)).toBe(false);
    expect(foldClosed(CLOSED_FOLD_MIN - 1)).toBe(false);
    expect(foldClosed(CLOSED_FOLD_MIN)).toBe(true);
    expect(foldClosed(40)).toBe(true);
  });
});
