/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "It never happened" — which feed rows and which journey fields go with a deleted entry (fix-delete-entry).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus as S } from "../types";
import { JOURNEY_FIELDS, NUDGE_TYPE, feedRowsFor, journeyFieldsToClear, offerGone, type FeedRow, type LogEntry } from "./entryDelete";

const e = (id: string, kind: string, t: number, eventKey?: string): LogEntry => ({ id, kind, timeMs: t, eventKey });
const ALL = new Set(JOURNEY_FIELDS);
const cleared = (log: LogEntry[], del: string[], status: string, present: ReadonlySet<string> = ALL) => journeyFieldsToClear(log, del, status, present).sort();

describe("journeyFieldsToClear — a field goes when the entry that owns it is gone", () => {
  const queried = e("q", S.QUERIED, 1);
  it("a request deleted from a Queried query: the send-by date, the reminder and what was asked for", () => {
    const got = cleared([queried, e("r", S.FULL_REQUESTED, 2)], ["r"], S.QUERIED);
    for (const f of ["expectedSendDate", "sendReminderDate", "materialsRequestedType", "materialsRequestedQuantity", "requestSynopsis", "requestFrom", "requestFromUnit", "rrNotes"]) expect(got, f).toContain(f);
  });
  it("a pass or a close deleted: how it closed", () => {
    const got = cleared([queried, e("x", S.REJECTED, 2)], ["x"], S.QUERIED);
    for (const f of ["closingReason", "closingNotes", "withdrawTold", "agentRecheckOn", "rejectionFeedbackType", "rejectionFeedbackText", "rejectionReflection", "rejectionLesson", "rejectedFromStatus"]) expect(got, f).toContain(f);
  });
  it("an offer deleted: the offer's fields; kept while another offer or the signing remains", () => {
    expect(cleared([queried, e("o", S.OFFER, 2)], ["o"], S.QUERIED)).toEqual(expect.arrayContaining(["offerDate", "offerResponseDeadline", "offerNotes", "offerCallOn"]));
    expect(cleared([queried, e("o", S.OFFER, 2), e("s", S.SIGNED, 3)], ["s"], S.OFFER)).not.toContain("offerDate");
  });
  it("a nudge deleted: the last-nudge date and the close it planned — kept while another nudge remains", () => {
    expect(cleared([queried, e("n", NUDGE_TYPE, 2)], ["n"], S.QUERIED)).toEqual(expect.arrayContaining(["lastNudgeSentDate", "closePlan"]));
    const two = cleared([queried, e("n1", NUDGE_TYPE, 2), e("n2", NUDGE_TYPE, 3)], ["n2"], S.QUERIED);
    expect(two).not.toContain("lastNudgeSentDate");
  });
  it("the LATEST send deleted: the wait it began (expected reply, planned nudge, label) — and not when an older entry goes", () => {
    const log = [queried, e("r", S.FULL_REQUESTED, 2), e("s", S.FULL_SENT, 3)];
    expect(cleared(log, ["s"], S.FULL_REQUESTED)).toEqual(expect.arrayContaining(["writerExpectedDate", "writerExpectedSetAt", "nudgeDate", "lastSentLabel"]));
    /* a nudge deleted while the send stands: the wait is still the send's */
    const got = cleared([...log, e("n", NUDGE_TYPE, 4)], ["n"], S.FULL_SENT);
    for (const f of ["writerExpectedDate", "nudgeDate", "lastSentLabel"]) expect(got, f).not.toContain(f);
  });
  it("⚠️ a field its owner still holds is NEVER cleared: deleting a nudge from a requested query keeps the send-by date", () => {
    const got = cleared([queried, e("r", S.FULL_REQUESTED, 2), e("n", NUDGE_TYPE, 3)], ["n"], S.FULL_REQUESTED);
    for (const f of ["expectedSendDate", "sendReminderDate", "materialsRequestedType"]) expect(got, f).not.toContain(f);
    expect(got).toEqual(["agentRecheckOn", "withdrawTold", "closePlan", "closingNotes", "closingReason", "lastNudgeSentDate", "offerCallOn", "offerDate", "offerNotes", "offerResponseDeadline", "rejectedFromStatus", "rejectionFeedbackText", "rejectionFeedbackType", "rejectionLesson", "rejectionReflection"].sort());
  });
  it("only fields the query carries are named, so a clean query costs no write", () => {
    expect(cleared([queried, e("r", S.FULL_REQUESTED, 2)], ["r"], S.QUERIED, new Set(["expectedSendDate", "status"]))).toEqual(["expectedSendDate"]);
    expect(cleared([queried, e("r", S.FULL_REQUESTED, 2)], ["r"], S.QUERIED, new Set(["status"]))).toEqual([]);
  });
  it("⚠️ it never names a field recomputeQuery writes: those are derived from the log, by recompute alone", () => {
    const recompute = readFileSync("src/lib/recomputeQuery.ts", "utf8");
    const written = [...recompute.matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
    expect(written.length, "recomputeQuery's written fields were not found").toBeGreaterThanOrEqual(10);
    for (const f of written) expect(JOURNEY_FIELDS, f).not.toContain(f);
  });
});

describe("offerGone", () => {
  it("true only when the last offer is among the deleted", () => {
    expect(offerGone([e("q", S.QUERIED, 1), e("o", S.OFFER, 2)], ["o"])).toBe(true);
    expect(offerGone([e("q", S.QUERIED, 1), e("o", S.OFFER, 2), e("s", S.SIGNED, 3)], ["s"])).toBe(false);
    expect(offerGone([e("q", S.QUERIED, 1), e("r", S.REJECTED, 2)], ["r"])).toBe(false);
  });
});

describe("feedRowsFor — the feed row that belongs to a deleted entry", () => {
  const f = (id: string, over: Partial<FeedRow>): FeedRow => ({ id, timeMs: 0, ...over });
  it("by the log entry's id written on the row", () => {
    const m = feedRowsFor([e("q", S.QUERIED, 1), e("r", S.FULL_REQUESTED, 2)], ["r"], [f("q", { resultingStatus: S.QUERIED }), f("zzz", { logEntryId: "r", resultingStatus: S.FULL_REQUESTED })]);
    expect(m).toEqual({ rows: ["zzz"], how: { r: "logEntryId" } });
  });
  it("by a shared id (nudges, sends, seeds)", () => {
    const m = feedRowsFor([e("q", S.QUERIED, 1), e("n", NUDGE_TYPE, 2)], ["n"], [f("q", { resultingStatus: S.QUERIED }), f("n", { activityType: "Nudge Sent" })]);
    expect(m).toEqual({ rows: ["n"], how: { n: "sameId" } });
  });
  it("an older row: the same type, paired by its place in time — though the two times are weeks apart", () => {
    const log = [e("q", S.QUERIED, 1), e("r1", S.PARTIAL_REQUESTED, 100), e("r2", S.FULL_REQUESTED, 200)];
    const feed = [f("q", { resultingStatus: S.QUERIED }), f("a", { resultingStatus: S.PARTIAL_REQUESTED, timeMs: 9_000 }), f("b", { resultingStatus: S.FULL_REQUESTED, timeMs: 9_500 })];
    expect(feedRowsFor(log, ["r2"], feed)).toEqual({ rows: ["b"], how: { r2: "typeAndTime" } });
  });
  it("two entries of one type: the first with the first, the second with the second", () => {
    const log = [e("q", S.QUERIED, 1), e("r1", S.REVISE_RESUBMIT, 100), e("r2", S.REVISE_RESUBMIT, 300)];
    const feed = [f("late", { resultingStatus: S.REVISE_RESUBMIT, timeMs: 900 }), f("early", { resultingStatus: S.REVISE_RESUBMIT, timeMs: 500 })];
    expect(feedRowsFor(log, ["r1"], feed).rows).toEqual(["early"]);
    expect(feedRowsFor(log, ["r2"], feed).rows).toEqual(["late"]);
  });
  it("⚠️ counts that disagree are not guessed at: the row is left, and said to be unmatched", () => {
    const log = [e("q", S.QUERIED, 1), e("r1", S.REVISE_RESUBMIT, 100), e("r2", S.REVISE_RESUBMIT, 300)];
    expect(feedRowsFor(log, ["r2"], [f("only", { resultingStatus: S.REVISE_RESUBMIT, timeMs: 500 })])).toEqual({ rows: [], how: { r2: "none" } });
  });
  it("a row another entry claims by id is never taken by a guess", () => {
    const log = [e("q", S.QUERIED, 1), e("r1", S.REVISE_RESUBMIT, 100), e("r2", S.REVISE_RESUBMIT, 300)];
    const feed = [f("x", { logEntryId: "r1", resultingStatus: S.REVISE_RESUBMIT, timeMs: 900 }), f("y", { resultingStatus: S.REVISE_RESUBMIT, timeMs: 500 })];
    expect(feedRowsFor(log, ["r2"], feed)).toEqual({ rows: ["y"], how: { r2: "typeAndTime" } });
  });
  it("an event key on both sides must agree", () => {
    const log = [e("q", S.QUERIED, 1), e("c", S.WITHDRAWN, 100, "withdrawn_on_offer")];
    expect(feedRowsFor(log, ["c"], [f("z", { resultingStatus: S.WITHDRAWN, eventKey: "offer_declined" })]).how.c).toBe("none");
  });
});

describe("the delete path uses them, in one batch", () => {
  const write = readFileSync("src/lib/entryDeleteWrite.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("one writeBatch: the entries, their feed rows and the cleared fields, then recompute", () => {
    expect(write.split("writeBatch(db)").length - 1).toBe(1);
    expect(write.indexOf("batch.commit()")).toBeGreaterThan(write.indexOf("batch.delete"));
    expect(write.indexOf("recomputeQuery(userId, queryId)")).toBeGreaterThan(write.indexOf("batch.commit()"));
    expect(write).toContain("feedRowsFor(before, ids, feed)");
    expect(write).toContain("journeyFieldsToClear(before, ids, status");
  });
  it("the feed row names its log entry at creation", () => {
    expect(readFileSync("src/lib/recordResponse.ts", "utf8")).toContain("logEntryId: activityDocRef.id");
  });
  it("the timeline's delete goes through it", () => {
    const page = readFileSync("src/components/Queries.tsx", "utf8");
    const at = page.indexOf("const confirmEntryDelete = async");
    expect(at).toBeGreaterThan(-1);
    expect(page.slice(at, at + 1400)).toContain("await deleteTimelineEntries(uid, q.id, d.ids);");
  });
});
