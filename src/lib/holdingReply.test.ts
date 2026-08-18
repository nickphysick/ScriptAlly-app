/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 1 — the holding reply's schema, and the guarantee that it decides nothing.
 *
 * ⚠️ THE "DOES NOT" COLUMN IS ASSERTED THROUGH THE REAL DERIVATION, not by reading the builder.
 * `deriveQueryFields` is what every derived field on a query comes from, so running it over a log
 * WITH and WITHOUT a holding reply and requiring the two to be identical is the strongest form the
 * claim can take — and it cannot go green the day someone teaches derivation to notice the type.
 */
import { describe, it, expect } from "vitest";
import {
  HOLDING_REPLY_TYPE, HOLDING_REPLY_NESTED_TYPE, HOLDING_REPLY_LABEL,
  buildHoldingReplyWrites, holdingReplyTimes, replyStatedWindow, waitAnchorMs, hasHoldingReply,
} from "./holdingReply";
import { deriveQueryFields } from "./queryDerivation";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 18);
const iso = (ms: number) => new Date(ms).toISOString();
const query = { id: "q1", manuscriptId: "m1" };
const agent = { name: "Aisha Bello", agency: "Quill Literary" };

describe("Phase 1 · the event decides nothing", () => {
  /* a real log: the query went out, then the agent asked for the full */
  const log = [
    { resultingStatus: QueryStatus.QUERIED, date: iso(NOW - 300 * DAY) },
    { resultingStatus: QueryStatus.FULL_REQUESTED, date: iso(NOW - 200 * DAY) },
  ];

  it("adding one to the log moves NOTHING that recomputeQuery writes", () => {
    const w = buildHoldingReplyWrites(query, agent, { repliedOn: iso(NOW - 4 * DAY), weeks: 2 });
    /* the global twin, in the shape derivation actually consumes */
    const withReply = [...log, { resultingStatus: (w.activity as { resultingStatus?: string }).resultingStatus, date: w.activity.date }];
    expect(deriveQueryFields(withReply as never), "a holding reply moved a derived field").toEqual(deriveQueryFields(log as never));
  });

  it("because it carries no resultingStatus at all — the whole of D1", () => {
    const w = buildHoldingReplyWrites(query, agent, { repliedOn: iso(NOW) });
    expect("resultingStatus" in w.activity, "the event is status-bearing, so it can move status").toBe(false);
    /* ⚠️ AND THE NESTED TYPE IS NOT A QueryStatus MEMBER, which is what keeps it invisible to the
       authoritative store's derivation as well as the global feed's. */
    expect(Object.values(QueryStatus)).not.toContain(HOLDING_REPLY_NESTED_TYPE as never);
    expect(HOLDING_REPLY_TYPE).toBe("Holding Reply");
    expect(HOLDING_REPLY_LABEL).toBe("They replied — no decision yet");
  });

  /** ⚠️ BOTH FIELDS OPTIONAL — the event alone is worth recording, because it ends the silence. */
  it("records with neither a timeframe nor a note", () => {
    const w = buildHoldingReplyWrites(query, agent, { repliedOn: iso(NOW) });
    expect(w.nested.note).toBe("");
    expect(w.nested).not.toHaveProperty("replyWeeks");
    expect(w.activity.description).toContain("Aisha Bello");
  });

  it("carries their stated weeks on the EVENT, never toward the agent record", () => {
    const w = buildHoldingReplyWrites(query, agent, { repliedOn: iso(NOW), weeks: 2, note: "Sorry for the delay." });
    expect(w.nested.replyWeeks).toBe(2);
    expect(w.nested.note).toContain("2 weeks");
    expect(w.nested.note).toContain("Sorry for the delay.");
    /* D3 — nothing in the writes touches the agent */
    expect(JSON.stringify(w)).not.toContain("responseTimeWeeks");
  });
});

describe("Phase 1 · reading them back", () => {
  const ev = (daysAgo: number, weeks?: number) => ({
    type: HOLDING_REPLY_NESTED_TYPE, createdAt: iso(NOW - daysAgo * DAY), ...(weeks ? { replyWeeks: weeks } : {}),
  });
  const other = { type: "Nudge sent", createdAt: iso(NOW - 50 * DAY) };

  it("finds them, oldest first, and ignores everything else", () => {
    const times = holdingReplyTimes([other, ev(4), ev(40)]);
    expect(times).toEqual([NOW - 40 * DAY, NOW - 4 * DAY]);
    expect(hasHoldingReply([other])).toBe(false);
    expect(hasHoldingReply([other, ev(4)])).toBe(true);
  });

  /**
   * ⚠️ ANCHORED ON THE REPLY, NOT THE SEND. "Two more weeks" means two weeks from when they said
   * it; measuring from the original send would put the new window in the past on any long silence,
   * which is exactly the case this feature exists for.
   */
  it("the window runs from the reply, not the send", () => {
    const w = replyStatedWindow([ev(4, 2)]);
    expect(w).toEqual({ ms: NOW - 4 * DAY + 14 * DAY, statedAt: NOW - 4 * DAY });
  });

  it("the LATEST stated window wins — an agent supersedes their own estimate", () => {
    const w = replyStatedWindow([ev(40, 12), ev(4, 2)]);
    expect(w!.statedAt, "an older estimate outranked the one that replaced it").toBe(NOW - 4 * DAY);
  });

  /** ⚠️ SILENCE ABOUT A DATE IS NOT A RETRACTION OF ONE — a later dateless reply does not clear it. */
  it("a later reply giving no timeframe leaves the last stated one standing", () => {
    const w = replyStatedWindow([ev(40, 12), ev(4)]);
    expect(w!.statedAt).toBe(NOW - 40 * DAY);
  });

  it("no stated window anywhere is null, never a guess", () => {
    expect(replyStatedWindow([ev(4), other])).toBeNull();
    expect(replyStatedWindow([])).toBeNull();
  });
});

describe("Phase 2 · the wait re-bases on whichever came last", () => {
  const ev = (daysAgo: number) => ({ type: HOLDING_REPLY_NESTED_TYPE, createdAt: iso(NOW - daysAgo * DAY) });

  it("a reply after the send moves the anchor to the reply", () => {
    expect(waitAnchorMs(NOW - 800 * DAY, [ev(4)])).toBe(NOW - 4 * DAY);
  });
  it("a send after the reply keeps the send", () => {
    expect(waitAnchorMs(NOW - 2 * DAY, [ev(40)])).toBe(NOW - 2 * DAY);
  });
  it("either alone is the anchor; neither is null", () => {
    expect(waitAnchorMs(NOW - 10 * DAY, [])).toBe(NOW - 10 * DAY);
    expect(waitAnchorMs(null, [ev(3)])).toBe(NOW - 3 * DAY);
    expect(waitAnchorMs(null, [])).toBeNull();
  });
});
