/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The feed's conversation shape — the properties, not the pixels.
 */
import { describe, it, expect } from "vitest";
import { ActivityType, QueryStatus } from "../types";
import { bubbleShape, markSentOffered, tightRunHeads } from "./feedConversation";

const a = (over: Record<string, unknown>) =>
  ({ activityType: ActivityType.STATUS_CHANGED, queryId: "q1", ...over }) as any;

describe("housekeeping is decided by the absence of a queryId, and by nothing else", () => {
  it("no queryId → housekeeping, with no state and no status", () => {
    const s = bubbleShape(a({ queryId: "", activityType: ActivityType.AGENT_ADDED }));
    expect(s.kind).toBe("housekeeping");
    expect(s.state).toBeNull();
    expect(s.status).toBeNull();
  });

  /**
   * ⚠️ THE FAULT THE ADDENDUM NAMED, AND THE ONE THAT FAILS SILENTLY. `resultingStatus` is absent
   * on pre-migration records, so keying housekeeping off IT would draw every query send written
   * before the migration as a white desk-admin bubble with no dot.
   */
  it("⚠️ a query event with NO resultingStatus is a query bubble, never housekeeping", () => {
    const s = bubbleShape(a({ resultingStatus: undefined, activityType: ActivityType.MATERIALS_SENT }));
    expect(s.kind).toBe("query");
    expect(s.side).toBe("out");
    /* neutral: no fill, no label, and above all no guessed status */
    expect(s.state).toBeNull();
    expect(s.status).toBeNull();
  });

  /* ⚠️ AND AN UNRECOGNISED STRING IS REFUSED, NOT CAST. `normalizeStatus` (StatusPill) would have
     returned it as a QueryStatus; `normalizeResultingStatus` returns null. */
  it("⚠️ an unrecognised status string yields a neutral bubble, never that string", () => {
    const s = bubbleShape(a({ resultingStatus: "Holding Reply" }));
    expect(s.kind).toBe("query");
    expect(s.status).toBeNull();
    expect(s.state).toBeNull();
  });

  it("the activityType fallback places a send, and refuses to place ambiguous materials", () => {
    expect(bubbleShape(a({ resultingStatus: undefined, activityType: ActivityType.QUERY_SENT })).status)
      .toBe(QueryStatus.QUERIED);
    /* MATERIALS_SENT cannot choose between Partial Sent and Full Sent, so it does not choose */
    expect(bubbleShape(a({ resultingStatus: undefined, activityType: ActivityType.MATERIALS_SENT })).status)
      .toBeNull();
  });
});

describe("alignment carries direction, and an offer is the agent's message", () => {
  const side = (st: QueryStatus) => bubbleShape(a({ resultingStatus: st })).side;

  it("the agent's rungs align left, the writer's right", () => {
    for (const st of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED,
      QueryStatus.REVISE_RESUBMIT, QueryStatus.REJECTED]) {
      expect(side(st), `${st} should be the agent's`).toBe("in");
    }
    for (const st of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT,
      QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(side(st), `${st} should be the writer's`).toBe("out");
    }
  });

  /**
   * ⚠️ THE ONE THAT DIVERGES FROM `statusDirection`, DELIBERATELY. That export puts `OFFER` in
   * "out" — a defensible colour choice for the Query DB list's spine, and a false statement in a
   * conversation. Pinned so nobody "unifies" the two and moves the best news a writer ever gets to
   * the wrong side of the thread.
   */
  it("⚠️ an OFFER is the agent's, though statusDirection calls it outgoing", async () => {
    expect(side(QueryStatus.OFFER)).toBe("in");
    const { statusDirection } = await import("../components/StatusDot");
    expect(statusDirection(QueryStatus.OFFER)).toBe("out"); // the divergence, asserted both ways
  });

  it("every bubble's state comes from the v2 table, and housekeeping has none", () => {
    expect(bubbleShape(a({ resultingStatus: QueryStatus.QUERIED })).state).toBe("queried");
    expect(bubbleShape(a({ resultingStatus: QueryStatus.FULL_SENT })).state).toBe("agent");
    expect(bubbleShape(a({ resultingStatus: QueryStatus.FULL_REQUESTED })).state).toBe("you");
    expect(bubbleShape(a({ resultingStatus: QueryStatus.OFFER })).state).toBe("offer");
    expect(bubbleShape(a({ resultingStatus: QueryStatus.REJECTED })).state).toBe("closed");
    expect(bubbleShape(a({ queryId: "" })).state).toBeNull();
  });
});

describe("Mark sent is offered only while the request is still open", () => {
  const qs = (status: QueryStatus) => [{ id: "q1", status }];

  it("offered on a request bubble whose query still sits at that request", () => {
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

  it("never offered on a send, a close, a neutral bubble or housekeeping", () => {
    expect(markSentOffered(a({ resultingStatus: QueryStatus.FULL_SENT }), qs(QueryStatus.FULL_SENT))).toBe(false);
    expect(markSentOffered(a({ resultingStatus: undefined }), qs(QueryStatus.FULL_REQUESTED))).toBe(false);
    expect(markSentOffered(a({ queryId: "" }), qs(QueryStatus.FULL_REQUESTED))).toBe(false);
    /* a query the account no longer holds offers nothing rather than throwing */
    expect(markSentOffered(a({ resultingStatus: QueryStatus.FULL_REQUESTED }), [])).toBe(false);
  });
});

describe("tight runs drop the furniture, never the bubble", () => {
  it("the first of a same-side run keeps its head; the rest do not", () => {
    const rows = [
      { side: "out" as const, dayLabel: "Mon 1 Jun" },
      { side: "out" as const, dayLabel: "Mon 1 Jun" },
      { side: "in" as const, dayLabel: "Mon 1 Jun" },
      { side: "in" as const, dayLabel: "Tue 2 Jun" },  // a new day breaks the run
      { side: "in" as const, dayLabel: "Tue 2 Jun" },
    ];
    expect(tightRunHeads(rows)).toEqual([true, false, true, true, false]);
  });

  it("a single row is always its own head — a run with no head cannot be dated", () => {
    expect(tightRunHeads([{ side: "in" as const, dayLabel: "Mon 1 Jun" }])).toEqual([true]);
    expect(tightRunHeads([])).toEqual([]);
  });
});
