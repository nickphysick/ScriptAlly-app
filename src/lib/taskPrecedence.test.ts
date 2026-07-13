/**
 * The regression guard for the reply-task precedence. Every other surface (db.tsx generator,
 * dashboard "Over to you", Queries Hub) reads this — so the state matrix is proven here: exactly
 * one of {nudge, close, none} fires for every row, and close SUCCEEDS nudge, never competes.
 */

import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { replyTask, closeAfterDays, NUDGE_GRACE_DAYS, ReplyTask, ReplyTaskInput } from "./taskPrecedence";

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
