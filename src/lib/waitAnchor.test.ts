/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §1 — the waiting state's anchor comes from the ACTIVITY LOG.
 *
 * ⚠️ THE FAULT, REPRODUCED FIRST. `queryAmbientStatus` chose its send date by STATUS — `dateSent`
 * at Queried, `partialSentDate` at Partial Sent, `fullSentDate` at Full Sent. Those are
 * `recomputeQuery`'s OUTPUT, so a query whose stage date had not been derived read as having no
 * send date at all, while the card directly above it drew "Query sent · 1 May" and "Partial sent ·
 * 1 May" from the log. The log is recompute's INPUT, and the input is what always exists.
 */
import { describe, it, expect } from "vitest";
import { queryAmbientStatus } from "./queryAmbient";
import { waitAnchor } from "./holdingReply";
import { HOLDING_REPLY_NESTED_TYPE } from "./holdingReply";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 20);
const iso = (ms: number) => new Date(ms).toISOString();
const rung = (status: QueryStatus, daysAgo: number) => ({ type: status, createdAt: iso(NOW - daysAgo * DAY) });
const reply = (daysAgo: number) => ({ type: HOLDING_REPLY_NESTED_TYPE, createdAt: iso(NOW - daysAgo * DAY) });

/** The shape the bug needs: a stage the query is AT, whose derived date is absent. */
const partialSentNoStageDate = { id: "q", status: QueryStatus.PARTIAL_SENT, dateSent: iso(NOW - 100 * DAY) } as never;

describe("§1 · the anchor is the log's, not a status-keyed field", () => {
  it("THE FAULT: without the log there is no anchor, though a send date is on the record", () => {
    const a = queryAmbientStatus(partialSentNoStageDate, "agent", undefined, NOW, 8);
    expect(a.sentMs, "the fixture no longer reproduces the fault it was written for").toBeNull();
  });

  it("THE FIX: the log's most recent outbound supplies it", () => {
    const a = queryAmbientStatus(partialSentNoStageDate, "agent", undefined, NOW, 8,
      [rung(QueryStatus.QUERIED, 100), rung(QueryStatus.PARTIAL_SENT, 40)]);
    expect(a.sentMs, "the card still reports no send date with two sends in its own log").toBe(NOW - 40 * DAY);
    expect(a.nDays).toBe(40);
    /* a bar needs both ends — with an anchor and a window there is something to measure */
    expect(a.expMs).not.toBeNull();
  });

  /** ⚠️ THE MOST RECENT, not the first: the agent is sitting on the partial, not the query. */
  it("takes the latest outbound, not the earliest", () => {
    const a = queryAmbientStatus(partialSentNoStageDate, "agent", undefined, NOW, 8,
      [rung(QueryStatus.PARTIAL_SENT, 40), rung(QueryStatus.QUERIED, 100)]);
    expect(a.sentMs).toBe(NOW - 40 * DAY);
  });

  /** ⚠️ THE RE-BASE RULE ALREADY BUILT — a later holding reply still wins. One derivation, not two. */
  it("a holding reply after the send still re-bases the clock", () => {
    const a = queryAmbientStatus(partialSentNoStageDate, "agent", undefined, NOW, 8,
      [rung(QueryStatus.PARTIAL_SENT, 40), reply(4)]);
    expect(a.sentMs).toBe(NOW - 4 * DAY);
    expect(a.anchorKind).toBe("reply");
  });

  it("and a send after the reply keeps the send", () => {
    const a = queryAmbientStatus(partialSentNoStageDate, "agent", undefined, NOW, 8,
      [reply(40), rung(QueryStatus.PARTIAL_SENT, 4)]);
    expect(a.sentMs).toBe(NOW - 4 * DAY);
    expect(a.anchorKind).toBe("send");
  });

  /**
   * ⚠️ THE STATE THE COPY IS FOR, AND IT MUST RENDER NO BAR. With no outbound anywhere — no log
   * rung and no field — there is nothing to measure from, and a track drawn from nothing would
   * invent the fact the sentence beside it is admitting the record does not hold.
   */
  it("no outbound anywhere: no anchor, and therefore no bar", () => {
    const undated = { id: "q", status: QueryStatus.QUERIED } as never;
    const a = queryAmbientStatus(undated, "agent", undefined, NOW, 8, []);
    expect(a.sentMs, "an anchor was invented from nothing").toBeNull();
    expect(a.widthPct, "a bar was drawn with nothing to measure from").toBe(0);
  });

  /** ⚠️ OMITTING THE LOG IS BYTE-IDENTICAL TO BEFORE — which is what keeps this additive. */
  it("a caller passing no events keeps the field-based behaviour", () => {
    const queried = { id: "q", status: QueryStatus.QUERIED, dateSent: iso(NOW - 30 * DAY) } as never;
    expect(queryAmbientStatus(queried, "agent", undefined, NOW, 8).sentMs).toBe(NOW - 30 * DAY);
  });
});

describe("§1 · waitAnchor reads outbound through the CTA engine", () => {
  /* ⚠️ ASSERTED THROUGH THE DERIVATION, not against a list of three statuses written here — a
     hand-written set is exactly what `isSendStatus` exists to stop this file keeping. */
  it("every send stage counts as outbound", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(waitAnchor([rung(s, 10)], null), `${s} is not being read as an outbound`)
        .toEqual({ ms: NOW - 10 * DAY, kind: "send" });
    }
  });

  it("an incoming rung is not an anchor", () => {
    expect(waitAnchor([rung(QueryStatus.FULL_REQUESTED, 10)], null),
      "a request from the agent was treated as something the writer sent").toBeNull();
  });

  it("the field is the fallback, and the log outranks it", () => {
    expect(waitAnchor([], NOW - 90 * DAY)).toEqual({ ms: NOW - 90 * DAY, kind: "send" });
    expect(waitAnchor([rung(QueryStatus.PARTIAL_SENT, 5)], NOW - 90 * DAY)).toEqual({ ms: NOW - 5 * DAY, kind: "send" });
  });
});
