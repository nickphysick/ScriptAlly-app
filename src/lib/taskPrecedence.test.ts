/**
 * The regression guard for the reply-task precedence. Every other surface (db.tsx generator,
 * dashboard urgent panel, Queries Hub) reads this — so the state matrix is proven here: exactly
 * one of {nudge, close, none} fires for every row, and close SUCCEEDS nudge, never competes.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { replyTask, replyOverdue, closeAfterDays, NUDGE_GRACE_DAYS, ReplyTask, ReplyTaskInput } from "./taskPrecedence";

const NOW = Date.parse("2026-07-09T12:00:00Z");
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

const WEEKS = 8; // window = 56 days; grace ends 70d after send; ceiling = max(112,90)=112d after send

const base = (over: Partial<ReplyTaskInput>): ReplyTaskInput => ({
  status: QueryStatus.QUERIED,
  responseTimeWeeks: WEEKS,
  noResponseMeansNo: false,
  now: NOW,
  ...over,
});

describe("constants", () => {
  it("NUDGE_GRACE_DAYS = 14", () => expect(NUDGE_GRACE_DAYS).toBe(14));
  it("CLOSE_AFTER = max(2×window, 90d)", () => {
    expect(closeAfterDays(8)).toBe(112); // 2×56 = 112 > 90
    expect(closeAfterDays(4)).toBe(90); // 2×28 = 56 < 90 → floor 90
  });
});

describe("replyTask — the state matrix (exactly one fires per row)", () => {
  const rows: { name: string; input: ReplyTaskInput; expected: ReplyTask }[] = [
    // Non-awaiting statuses never chase a reply.
    { name: "Offer → none", input: base({ status: QueryStatus.OFFER, dateSent: daysAgo(200) }), expected: "none" },
    { name: "Partial Requested (writer's court) → none", input: base({ status: QueryStatus.PARTIAL_REQUESTED, dateSent: daysAgo(200) }), expected: "none" },

    // No reply window recorded → neither fires (data_quality handles it).
    { name: "no window (0) → none", input: base({ responseTimeWeeks: 0, dateSent: daysAgo(200) }), expected: "none" },
    { name: "no window (undefined) → none", input: base({ responseTimeWeeks: undefined, dateSent: daysAgo(200) }), expected: "none" },

    // Undated → can't place in time.
    { name: "undated → none", input: base({ dateSent: undefined, responseDeadline: undefined }), expected: "none" },

    // Inside window / inside grace → nothing yet.
    { name: "inside window → none", input: base({ dateSent: daysAgo(30) }), expected: "none" },
    { name: "past deadline but inside 14d grace → none", input: base({ dateSent: daysAgo(60) }), expected: "none" },

    // noResponseMeansNo === true → close at window+grace, never nudge.
    { name: "no-means-no, past grace → close", input: base({ noResponseMeansNo: true, dateSent: daysAgo(80) }), expected: "close" },
    { name: "no-means-no, inside grace → none", input: base({ noResponseMeansNo: true, dateSent: daysAgo(60) }), expected: "none" },

    // noResponseMeansNo === false → nudge, until ignored or ceiling.
    { name: "past grace, never nudged, before ceiling → nudge", input: base({ dateSent: daysAgo(80) }), expected: "nudge" },
    { name: "past grace, nudged recently (window not elapsed) → nudge", input: base({ dateSent: daysAgo(80), lastNudgeSentDate: daysAgo(10) }), expected: "nudge" },
    { name: "nudge ignored (nudge + full window elapsed) → close", input: base({ dateSent: daysAgo(90), lastNudgeSentDate: daysAgo(60) }), expected: "close" },
    { name: "never nudged but past hard ceiling (112d) → close", input: base({ dateSent: daysAgo(120) }), expected: "close" },

    // Deadline computed from dateSent + window when responseDeadline is absent.
    { name: "computed deadline, past grace → nudge", input: base({ dateSent: daysAgo(80), responseDeadline: undefined }), expected: "nudge" },
    // Stored responseDeadline wins over the computed one.
    { name: "stored deadline far future → none", input: base({ dateSent: daysAgo(200), responseDeadline: new Date(NOW + 30 * DAY).toISOString() }), expected: "none" },
  ];

  for (const { name, input, expected } of rows) {
    it(name, () => expect(replyTask(input)).toBe(expected));
  }

  it("always returns exactly one of the three", () => {
    const valid = new Set<ReplyTask>(["nudge", "close", "none"]);
    for (const { input } of rows) expect(valid.has(replyTask(input))).toBe(true);
  });

  it("PARTIAL_SENT and FULL_SENT are also awaiting states", () => {
    expect(replyTask(base({ status: QueryStatus.PARTIAL_SENT, dateSent: daysAgo(80) }))).toBe("nudge");
    expect(replyTask(base({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(80), noResponseMeansNo: true }))).toBe("close");
  });
});

/**
 * ══ Query Centre §5 / §2 — ONE RULE, TWO CONSUMERS ═══════════════════════════════════════════
 *
 * The list's OVERDUE group and the Nudge button's greying both come from `replyTask`. These cases
 * assert the RELATIONSHIP between the two rather than either against a literal: a pair of
 * `toBe(true)` assertions would go green the day someone changed both in the same wrong direction,
 * which is the failure mode the dashboard/board urgent-count reconciliation was written to catch.
 */
describe("replyOverdue — the shared overdue predicate", () => {
  /* ⚠️ ITS OWN MATRIX, because the one above is scoped to that describe. Same shapes, restated
     here rather than hoisted: hoisting would let a later edit to one suite silently change what the
     other proves. */
  const matrix: Array<[string, ReplyTaskInput]> = [
    ["inside window", base({ dateSent: daysAgo(30) })],
    ["past deadline, inside grace", base({ dateSent: daysAgo(60) })],
    ["past grace, chaseable", base({ dateSent: daysAgo(80) })],
    ["past grace, stated pass", base({ noResponseMeansNo: true, dateSent: daysAgo(80) })],
    ["nudge ignored", base({ dateSent: daysAgo(90), lastNudgeSentDate: daysAgo(60) })],
    ["past hard ceiling", base({ dateSent: daysAgo(120) })],
    ["no window stated", base({ responseTimeWeeks: 0, dateSent: daysAgo(200) })],
    ["undated", base({ dateSent: undefined, responseDeadline: undefined })],
    ["not an awaiting status", base({ status: QueryStatus.REJECTED, dateSent: daysAgo(200) })],
  ];

  for (const [name, input] of matrix) {
    it(`agrees with replyTask by construction: ${name}`, () => {
      expect(replyOverdue(input)).toBe(replyTask(input) !== "none");
    });
  }

  it("⚠️ NUDGE IS THE NARROWER SET — every nudgeable query is overdue, but not every overdue one is nudgeable", () => {
    const chase = base({ dateSent: daysAgo(80) });
    const statedPass = base({ noResponseMeansNo: true, dateSent: daysAgo(80) });
    expect(replyTask(chase), "the chase fixture stopped being nudgeable").toBe("nudge");
    expect(replyTask(statedPass), "the stated-pass fixture stopped closing").toBe("close");
    /* both lapsed, so both belong in the group the list draws … */
    expect(replyOverdue(chase)).toBe(true);
    expect(replyOverdue(statedPass)).toBe(true);
    /* … and only one of them may be chased. An agency whose silence IS its answer is genuinely
       overdue and must never be nudged; collapsing the two sets would either offer a chase the
       agency has told you not to make, or hide a lapsed query from the list built to show it. */
    expect(replyTask(statedPass) === "nudge", "Nudge was offered against a stated pass").toBe(false);
  });

  it("nothing is overdue against a window that was never stated", () => {
    expect(replyOverdue(base({ responseTimeWeeks: undefined, dateSent: daysAgo(400) }))).toBe(false);
    expect(replyOverdue(base({ dateSent: undefined, responseDeadline: undefined }))).toBe(false);
  });
});
