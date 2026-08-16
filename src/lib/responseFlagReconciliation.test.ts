/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Responses received" — the derived flag, and the three other places that answer the same question.
 *
 * ⚠️ THE FAULT THIS FIXES WAS TWO SETS DISAGREEING, so these assert the derivations AGAINST EACH
 * OTHER rather than against literals. A pair of `toBe` calls on hand-written expectations would go
 * green the day someone changed both in the same wrong direction — which is exactly how the app
 * arrived at a dashboard fallback that was right and a derived flag that was wrong.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { STATUS_ORDER } from "./statusOrder";
import {
  AGENT_HAS_RESPONDED_STATUSES, AGENT_RESPONSE_STATUSES,
  deriveResponseFlags, deriveResponseReceivedAt,
} from "./queryDerivation";
import { isRequest, isResponse } from "./packageMetrics";
import { Query } from "../types";

/** A status-bearing rung, dated. `provisional` marks an imported rung, whose date is only a key. */
const rung = (status: QueryStatus, day: number, provisional = false) => ({
  id: `a${day}`,
  resultingStatus: status,
  date: new Date(Date.UTC(2026, 0, day)).toISOString(),
  dateProvisional: provisional,
});

describe("⚠️ the undercount: a sent full means the agent already replied", () => {
  /**
   * An import records where a query GOT TO, not every step it took — so a real history is mostly
   * rows sitting at Partial Sent or Full Sent, and every one of them derived "no response".
   */
  it("an imported query at Full Sent reports the agent as having responded", () => {
    expect(deriveResponseFlags([rung(QueryStatus.FULL_SENT, 4, true)]).hasAgentResponded).toBe(true);
  });

  it("…and so does one at Partial Sent", () => {
    expect(deriveResponseFlags([rung(QueryStatus.PARTIAL_SENT, 4, true)]).hasAgentResponded).toBe(true);
  });

  /** The one that was always right, and must stay right. */
  it("a query still at Queried reports no response", () => {
    expect(deriveResponseFlags([rung(QueryStatus.QUERIED, 1)]).hasAgentResponded).toBe(false);
  });

  /**
   * ⚠️ SILENCE IS NOT A REPLY, AND NEITHER IS WITHDRAWING. Closing a query yourself after months of
   * quiet is the opposite of hearing back; withdrawing is the writer's act, not the agent's.
   */
  it("closing a query yourself is not a response", () => {
    for (const status of [QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) {
      expect(deriveResponseFlags([rung(QueryStatus.QUERIED, 1), rung(status, 9)]).hasAgentResponded)
        .toBe(false);
    }
  });
});

describe("the wider set is derived from the pipeline, never listed", () => {
  /**
   * ⚠️ A LISTED SET WOULD BE A FOURTH HAND-WRITTEN COPY of the journey, and the fault being fixed
   * here is two copies that disagreed.
   */
  it("is exactly Partial Requested onward, plus Rejected", () => {
    const expected = new Set<QueryStatus>([
      ...STATUS_ORDER.slice(STATUS_ORDER.indexOf(QueryStatus.PARTIAL_REQUESTED)),
      QueryStatus.REJECTED,
    ]);
    expect([...AGENT_HAS_RESPONDED_STATUSES].sort()).toEqual([...expected].sort());
  });

  it("contains every incoming rung — you cannot have replied without having acted", () => {
    for (const status of AGENT_RESPONSE_STATUSES) {
      expect(AGENT_HAS_RESPONDED_STATUSES.has(status)).toBe(true);
    }
  });

  /** The two the widening adds, and the reason it exists. */
  it("adds exactly the writer's own sends", () => {
    const added = [...AGENT_HAS_RESPONDED_STATUSES].filter((s) => !AGENT_RESPONSE_STATUSES.has(s));
    expect(added.sort()).toEqual([QueryStatus.FULL_SENT, QueryStatus.PARTIAL_SENT].sort());
  });
});

describe("⚠️ the DATE still comes from the narrower set", () => {
  /**
   * The two questions are different. "Did they reply" is answered by where the query got to; "when
   * did they reply" can only be answered by a rung the agent actually sent. Reading one set for
   * both either undercounts the boolean or mints a response date out of the writer's own postmark.
   */
  it("a lone Full Sent rung yields a response with no date rather than a wrong one", () => {
    const log = [rung(QueryStatus.FULL_SENT, 4)];
    expect(deriveResponseFlags(log).hasAgentResponded).toBe(true);
    expect(deriveResponseReceivedAt(log)).toBeNull();
  });

  it("a full history dates the response from the agent's request, not the writer's send", () => {
    const log = [
      rung(QueryStatus.QUERIED, 1),
      rung(QueryStatus.FULL_REQUESTED, 5),
      rung(QueryStatus.FULL_SENT, 6),
    ];
    expect(deriveResponseReceivedAt(log)).toBe(new Date(Date.UTC(2026, 0, 5)).toISOString());
  });
});

describe("the surfaces that answer this question now agree", () => {
  const q = (status: QueryStatus, hasAgentResponded?: boolean): Query =>
    ({ id: "q", status, ...(hasAgentResponded === undefined ? {} : { hasAgentResponded }) } as Query);

  /**
   * ⚠️ THE PACKAGE ENGINE WIDENED THIS LOCALLY BECAUSE THE GLOBAL FLAG WAS WRONG. Its own comment
   * called the undercount "a separate, known standing fix" — this is that fix. Requests ⊆ responses
   * was the invariant it was protecting; with the global flag corrected it holds without help.
   */
  it("every request-or-beyond status is a response by the global flag alone", () => {
    for (const status of STATUS_ORDER.slice(STATUS_ORDER.indexOf(QueryStatus.PARTIAL_REQUESTED))) {
      const derived = deriveResponseFlags([rung(status, 3)]).hasAgentResponded;
      expect(derived).toBe(true);
      // …and the package engine's local widening now agrees with it rather than covering for it.
      expect(isResponse(q(status, derived))).toBe(true);
      expect(isRequest(q(status))).toBe(true);
    }
  });
});
