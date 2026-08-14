/**
 * The regression guard for the reply-task precedence. Every other surface (db.tsx generator,
 * dashboard urgent panel, Queries Hub) reads this — so the state matrix is proven here: exactly
 * one of {nudge, close, none} fires for every row, and close SUCCEEDS nudge, never competes.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { replyTask, replyOverdue, replyDeadlineMs, closeAfterDays, NUDGE_GRACE_DAYS, ReplyTask, ReplyTaskInput } from "./taskPrecedence";

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
describe("replyOverdue / replyDeadlineMs — one deadline, three predicates", () => {
  /**
   * ⚠️ REVISED BY §5. `replyOverdue` was DEFINED as `replyTask !== "none"`, which made it drift-proof
   * but put the overdue boundary 14 days after the window closed — and Query Centre's row figure
   * turns burgundy at the window, not at the grace. Two boundaries three pixels apart is exactly the
   * contradiction the shared rule exists to prevent, so the shared thing moved DOWN a level: both
   * predicates now read one `replyDeadlineMs`, and they differ only in what they do about the grace.
   *
   * ⚠️ THE GRACE IS THE APP'S MANNERS, NOT A CLAIM ABOUT THE WINDOW. It exists so nothing nags on
   * day one; it does not mean the query is still inside the agent's stated time.
   */
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

  /* ⚠️ THE INVARIANT IS ASSERTED AS A RELATIONSHIP, not as a pair of literals per row. Two
     `toBe(true)`s would go green the day someone changed both sides in the same wrong direction —
     the failure the dashboard/board urgent-count reconciliation was written to catch. */
  for (const [name, input] of matrix) {
    it(`every verb it suggests is on a query it calls overdue: ${name}`, () => {
      if (replyTask(input) !== "none") expect(replyOverdue(input)).toBe(true);
    });
  }

  it("⚠️ THE GRACE IS THE ONLY DIFFERENCE — overdue at the window, a verb 14 days later", () => {
    const justPast = base({ dateSent: daysAgo(57) });   // window = 56d
    expect(replyOverdue(justPast), "a query one day past its window is not overdue").toBe(true);
    expect(replyTask(justPast), "the app started nagging on day one").toBe("none");
    const pastGrace = base({ dateSent: daysAgo(80) });
    expect(replyOverdue(pastGrace)).toBe(true);
    expect(replyTask(pastGrace)).toBe("nudge");
  });

  it("⚠️ NUDGE IS NARROWER — a stated pass is overdue and must never be chased", () => {
    const statedPass = base({ noResponseMeansNo: true, dateSent: daysAgo(80) });
    expect(replyOverdue(statedPass), "a lapsed query was hidden from the list built to show it").toBe(true);
    expect(replyTask(statedPass), "a chase was offered against a stated pass").toBe("close");
  });

  it("nothing is overdue against a window that was never stated", () => {
    expect(replyOverdue(base({ responseTimeWeeks: undefined, dateSent: daysAgo(400) }))).toBe(false);
    expect(replyOverdue(base({ dateSent: undefined, responseDeadline: undefined }))).toBe(false);
    expect(replyOverdue(base({ status: QueryStatus.REJECTED, dateSent: daysAgo(400) }))).toBe(false);
  });

  it("the stored override wins over the computed deadline, for both predicates", () => {
    const future = new Date(NOW + 30 * DAY).toISOString();
    const inp = base({ dateSent: daysAgo(200), responseDeadline: future });
    expect(replyDeadlineMs(inp)).toBe(Date.parse(future));
    expect(replyOverdue(inp), "the override was ignored — a query the writer re-dated read as lapsed").toBe(false);
    expect(replyTask(inp)).toBe("none");
  });
});
