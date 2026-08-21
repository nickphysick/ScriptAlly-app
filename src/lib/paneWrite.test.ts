/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SEND FORM'S ANSWERS REACH THE WRITE — asserted at the SEAM, not at the surface.
 *
 * The fault this suite exists for was invisible to every surface test: the pane collected five
 * answers, the will-record strip stated them, the gate REQUIRED two of them, and four were dropped
 * at the takeover boundary. Nothing rendered wrongly. The only place the loss is visible is the
 * payload the single write path receives, which is what this reads.
 */
import { describe, it, expect } from "vitest";
import { markSentWriteArgs, type StagedPayload } from "./todoWalk";
import { QueryStatus } from "../types";

const base: Extract<StagedPayload, { kind: "mark-sent" }> = {
  kind: "mark-sent", cardKey: "k", queryId: "q1",
  targetStatus: QueryStatus.FULL_SENT, sentDate: "2026-08-13T12:00:00.000Z", isResubmit: false,
};

describe("⚠️ the mark-sent payload carries what the form asked for", () => {
  it("the expectation reaches the write args when the writer gave one", () => {
    const args = markSentWriteArgs({ ...base, writerExpectedDate: "2026-09-24T12:00:00.000Z" });
    expect(args.writerExpectedDate).toBe("2026-09-24T12:00:00.000Z");
  });

  it("the writer's note reaches them too", () => {
    const args = markSentWriteArgs({ ...base, note: "included the revised opening" });
    expect(args.note).toBe("included the revised opening");
  });

  /**
   * ⚠️ UNANSWERED IS AN ABSENT KEY, NEVER A DEFAULT. `recordMaterialsSent` writes the column only
   * when the key is present, so omission leaves the query's stored value untouched — which is the
   * difference between "not asked" and "answered with today's date". A `null` here would be a write.
   */
  it("an unanswered field is omitted from the args, not defaulted", () => {
    const args = markSentWriteArgs(base);
    expect("writerExpectedDate" in args).toBe(false);
    expect("note" in args).toBe(false);
  });

  it("an empty note is treated as unanswered rather than written as blank", () => {
    const args = markSentWriteArgs({ ...base, note: "" });
    expect("note" in args).toBe(false);
  });

  /**
   * ⚠️ AND THE WRITE MUST NOT MOVE THE QUERY. The four fields this round adds are RECORD fields —
   * what went, when, and what the writer expects — none of which is a status. The args' status is
   * whatever the payload's target was and nothing here can change it.
   */
  it("the target status is passed through untouched", () => {
    expect(markSentWriteArgs({ ...base, writerExpectedDate: "2026-09-24T12:00:00.000Z", note: "x" })
      .targetStatus).toBe(QueryStatus.FULL_SENT);
    expect(markSentWriteArgs({ ...base, targetStatus: QueryStatus.PARTIAL_SENT })
      .targetStatus).toBe(QueryStatus.PARTIAL_SENT);
  });
});

/**
 * ⚠️ THE REMINDER REACHES THE WRITE (reminder round, Phase 1), through `nudgeDate` — the field the
 * model already had, whose own declaration reads "set when a nudge reminder is chosen". A
 * symmetrical `writerNudgeDate` would have needed a rules deploy to say the same thing.
 */
describe("⚠️ the reminder reaches the write", () => {
  it("a resolved reminder date reaches the write args", () => {
    const args = markSentWriteArgs({ ...base, nudgeDate: "2026-09-11T12:00:00.000Z" });
    expect(args.nudgeDate).toBe("2026-09-11T12:00:00.000Z");
  });

  /**
   * ⚠️ "No reminder" AND "not asked" LEAVE THE SAME STORED STATE, and that is correct rather than a
   * gap. The difference between them lives in the FORM — one is an answer the gate accepts, the
   * other leaves the primary gated — and a query that recorded "the writer declined a reminder"
   * would be keeping a fact about a conversation rather than about a query.
   */
  it("no reminder writes nothing, and so does an unanswered one", () => {
    expect("nudgeDate" in markSentWriteArgs(base)).toBe(false);
    expect("nudgeDate" in markSentWriteArgs({ ...base, nudgeDate: "" })).toBe(false);
  });

  it("the expectation and the reminder travel together without colliding", () => {
    const args = markSentWriteArgs({
      ...base,
      writerExpectedDate: "2026-09-18T12:00:00.000Z",
      nudgeDate: "2026-09-11T12:00:00.000Z",
    });
    expect(args.writerExpectedDate).toBe("2026-09-18T12:00:00.000Z");
    expect(args.nudgeDate).toBe("2026-09-11T12:00:00.000Z");
    /* and neither moves the query */
    expect(args.targetStatus).toBe(QueryStatus.FULL_SENT);
  });
});
