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
import { queryAmbientStatus, agentRepliesForManuscript, recordPlaceLine } from "./queryAmbient";
import { waitAnchor } from "./holdingReply";
import { HOLDING_REPLY_NESTED_TYPE, HOLDING_REPLY_TYPE } from "./holdingReply";
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

/**
 * §3 — the two loose ends.
 *
 * ⚠️ 3b IS ASSERTED THROUGH `recordPlaceLine`, THE REAL CALLER, not against the count alone. The
 * ordinal is what a writer reads; a test on the raw number would pass while the sentence stayed
 * wrong, and the repo's own rule is to derive a test's input from whatever builds it in production.
 */
describe("§3 · the anchor's noun, and what counts as a reply", () => {
  const rung = (status: QueryStatus, daysAgo: number) => ({ type: status, createdAt: iso(NOW - daysAgo * DAY) });
  const q = { id: "q", status: QueryStatus.PARTIAL_SENT, dateSent: iso(NOW - 100 * DAY) } as never;

  it("3a · the anchor names its own event", () => {
    const outbound = queryAmbientStatus(q, "agent", undefined, NOW, 8, [rung(QueryStatus.PARTIAL_SENT, 40)]);
    expect(outbound.anchorKind, "an outbound send is not being named as a send").toBe("send");

    const replied = queryAmbientStatus(q, "agent", undefined, NOW, 8,
      [rung(QueryStatus.PARTIAL_SENT, 40), { type: HOLDING_REPLY_NESTED_TYPE, createdAt: iso(NOW - 4 * DAY) }]);
    expect(replied.anchorKind, "the bar would still say SENT above a reply date").toBe("reply");
  });
});

describe("§3b · a holding reply is a reply", () => {
  const act = (over: Record<string, unknown>) => ({ manuscriptId: "m1", queryId: "q1", ...over });
  const decided = act({ resultingStatus: QueryStatus.FULL_REQUESTED });
  const holding = act({ activityType: HOLDING_REPLY_TYPE });

  it("counts it alongside the decisions", () => {
    expect(agentRepliesForManuscript([decided], "m1")).toBe(1);
    expect(agentRepliesForManuscript([decided, holding], "m1"),
      "an acknowledgement is not being counted as a response received").toBe(2);
  });

  /** ⚠️ THE SENTENCE IS THE POINT — asserted through the caller that writes it. */
  it("and the ordinal the writer reads moves with it", () => {
    const line = (activities: never[]) => recordPlaceLine({
      manuscriptTitle: "The Smoke Test",
      priorRepliesForManuscript: agentRepliesForManuscript(activities, "m1"),
    });
    expect(line([decided] as never)).toContain("2nd response");
    expect(line([decided, holding] as never), "the ordinal ignored a reply the writer had recorded")
      .toContain("3rd response");
  });

  /** ⚠️ SILENCE IS STILL NOT A REPLY — the widening must not have swept anything else in. */
  it("a closed-with-no-reply query still counts nothing", () => {
    expect(agentRepliesForManuscript([act({ resultingStatus: QueryStatus.NO_RESPONSE })] as never, "m1")).toBe(0);
    expect(agentRepliesForManuscript([act({ resultingStatus: QueryStatus.PARTIAL_SENT })] as never, "m1"),
      "the writer's own send is being counted as a reply from the agent").toBe(0);
  });

  it("this query's own history is still excluded", () => {
    expect(agentRepliesForManuscript([holding], "m1", "q1")).toBe(0);
  });
});

/**
 * §3 — the same status-keyed fault on this function's OTHER branch.
 *
 * ⚠️ THE SWEEP FOUND IT BECAUSE IT LOOKED FOR THE SHAPE, NOT THE SYMPTOM. `reqIso` picked
 * `partialRequestedDate` or `fullRequestedDate` by status with no fallback, so a writer's-turn card
 * whose stage date had not been derived lost "N days ago" entirely — the identical failure to §1's,
 * on the identical kind of field, in the identical function.
 */
describe("§3 · the writer's-turn figure reads the log too", () => {
  const rung = (status: QueryStatus, daysAgo: number) => ({ type: status, createdAt: iso(NOW - daysAgo * DAY) });
  const q = { id: "q", status: QueryStatus.PARTIAL_REQUESTED, dateSent: iso(NOW - 100 * DAY) } as never;

  it("THE FAULT: without the log there is no figure", () => {
    expect(queryAmbientStatus(q, "writer", "partial", NOW).writerDaysAgo,
      "the fixture no longer reproduces the fault it was written for").toBeNull();
  });

  it("THE FIX: the log's most recent request supplies it", () => {
    const a = queryAmbientStatus(q, "writer", "partial", NOW, undefined,
      [rung(QueryStatus.QUERIED, 100), rung(QueryStatus.PARTIAL_REQUESTED, 12)]);
    expect(a.writerDaysAgo, "the card still has no figure with the request in its own log").toBe(12);
  });

  /** ⚠️ REQUESTS ONLY — a send is not the agent asking for something. */
  it("an outbound send is not read as a request", () => {
    const a = queryAmbientStatus(q, "writer", "partial", NOW, undefined, [rung(QueryStatus.PARTIAL_SENT, 3)]);
    expect(a.writerDaysAgo, "the writer's own send was counted as the agent's request").toBeNull();
  });

  /** ⚠️ THE MOST RECENT REQUEST — an R&R after a full request is what the writer owes now. */
  it("takes the latest request", () => {
    const a = queryAmbientStatus(q, "writer", "partial", NOW, undefined,
      [rung(QueryStatus.PARTIAL_REQUESTED, 40), rung(QueryStatus.FULL_REQUESTED, 6)]);
    expect(a.writerDaysAgo).toBe(6);
  });

  it("a caller passing no events keeps the field-based behaviour", () => {
    const dated = { id: "q", status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: iso(NOW - 9 * DAY) } as never;
    expect(queryAmbientStatus(dated, "writer", "partial", NOW).writerDaysAgo).toBe(9);
  });
});
