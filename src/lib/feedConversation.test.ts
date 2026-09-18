/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The feed's conversation shape — the properties, not the pixels.
 */
import { describe, it, expect } from "vitest";
import { ActivityType, QueryStatus } from "../types";
import { eventShape, markSentOffered } from "./feedConversation";

const a = (over: Record<string, unknown>) =>
  ({ activityType: ActivityType.STATUS_CHANGED, queryId: "q1", ...over }) as any;

describe("housekeeping is decided by the absence of a queryId, and by nothing else", () => {
  it("no queryId → housekeeping, with no state and no status", () => {
    const s = eventShape(a({ queryId: "", activityType: ActivityType.AGENT_ADDED }));
    expect(s.kind).toBe("housekeeping");
    expect(s.state).toBeNull();
    expect(s.status).toBeNull();
  });

  /**
   * ⚠️ THE FAULT THE ADDENDUM NAMED, AND THE ONE THAT FAILS SILENTLY. `resultingStatus` is absent
   * on pre-migration records, so keying housekeeping off IT would draw every query send written
   * before the migration as a white desk-admin row with no dot.
   */
  it("⚠️ a query event with NO resultingStatus is a query row, never housekeeping", () => {
    const s = eventShape(a({ resultingStatus: undefined, activityType: ActivityType.MATERIALS_SENT }));
    expect(s.kind).toBe("query");
    /* neutral: no fill, no label, and above all no guessed status */
    expect(s.state).toBeNull();
    expect(s.status).toBeNull();
  });

  /* ⚠️ AND AN UNRECOGNISED STRING IS REFUSED, NOT CAST. `normalizeStatus` (StatusPill) would have
     returned it as a QueryStatus; `normalizeResultingStatus` returns null. */
  it("⚠️ an unrecognised status string yields a neutral row, never that string", () => {
    const s = eventShape(a({ resultingStatus: "Holding Reply" }));
    expect(s.kind).toBe("query");
    expect(s.status).toBeNull();
    expect(s.state).toBeNull();
  });

  it("the activityType fallback places a send, and refuses to place ambiguous materials", () => {
    expect(eventShape(a({ resultingStatus: undefined, activityType: ActivityType.QUERY_SENT })).status)
      .toBe(QueryStatus.QUERIED);
    /* MATERIALS_SENT cannot choose between Partial Sent and Full Sent, so it does not choose */
    expect(eventShape(a({ resultingStatus: undefined, activityType: ActivityType.MATERIALS_SENT })).status)
      .toBeNull();
  });
});

/* ⚠️ THE ALIGNMENT CASES ARE RETIRED WITH THE SIDES (v16, 18 Sep). They asserted that an offer sat on
   the agent's side of the conversation and a send on the writer's; there is no conversation and no
   protecting — that an offer is the AGENT's message rather than the writer's — is now stated by the
   feed's sentence itself ("<agent> offered representation for …"), which `feedSentence.test.ts`
   locks. */

describe("Mark sent is offered only while the request is still open", () => {
  const qs = (status: QueryStatus) => [{ id: "q1", status }];

  it("offered on a request row whose query still sits at that request", () => {
    const ev = a({ resultingStatus: QueryStatus.FULL_REQUESTED });
    expect(markSentOffered(ev, qs(QueryStatus.FULL_REQUESTED))).toBe(true);
  });

  /* ⚠️ THE PROPERTY THAT MATTERS: it disappears when the query moves on, because the thing it
     would do has been done. Openness is read from the QUERY, never stored on the event. */
  it("⚠️ withdrawn the moment the query leaves that status", () => {
    const ev = a({ resultingStatus: QueryStatus.FULL_REQUESTED });
    for (const moved of [QueryStatus.FULL_SENT, QueryStatus.REJECTED, QueryStatus.OFFER,
      QueryStatus.PARTIAL_REQUESTED]) {
      expect(markSentOffered(ev, qs(moved)), `still offered at ${moved}`).toBe(false);
    }
  });

  it("never offered on a send, a close, a neutral row or housekeeping", () => {
    expect(markSentOffered(a({ resultingStatus: QueryStatus.FULL_SENT }), qs(QueryStatus.FULL_SENT))).toBe(false);
    expect(markSentOffered(a({ resultingStatus: undefined }), qs(QueryStatus.FULL_REQUESTED))).toBe(false);
    expect(markSentOffered(a({ queryId: "" }), qs(QueryStatus.FULL_REQUESTED))).toBe(false);
    /* a query the account no longer holds offers nothing rather than throwing */
    expect(markSentOffered(a({ resultingStatus: QueryStatus.FULL_REQUESTED }), [])).toBe(false);
  });
});

/* ⚠️ THE TIGHT-RUN CASES ARE RETIRED WITH THE RUNS (v16, 18 Sep). They asserted that consecutive rows
   from one side dropped their repeated furniture; the v16 feed states every row's pill, time and
   provenance, because a row is read on its own. */

