/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phases 2 and 5 — everywhere else. Each of these is a surface the pack names, asserted against
 * the REAL derivation rather than against the builder that feeds it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { HOLDING_REPLY_NESTED_TYPE, HOLDING_REPLY_TYPE } from "./holdingReply";
import { queryAmbientStatus } from "./queryAmbient";
import { closureOffer, pastWindowLine, silencePolicyLine, nudgeOutcomeLabel } from "./nudgeState";
import { replyTask } from "./taskPrecedence";
import { responsesReceivedCount, responseRatePercent } from "./dashboardStats";
import { listGroupFor } from "./queryCentreGroups";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 18);
const iso = (ms: number) => new Date(ms).toISOString();
const reply = (daysAgo: number, weeks?: number) => ({
  type: HOLDING_REPLY_NESTED_TYPE, createdAt: iso(NOW - daysAgo * DAY), ...(weeks ? { replyWeeks: weeks } : {}),
});
const q = (over: Record<string, unknown> = {}) =>
  ({ id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", sendMethod: "Email",
     status: QueryStatus.QUERIED, dateSent: iso(NOW - 800 * DAY), ...over }) as never;

describe("Phase 2 · the tracker re-bases; the list does not", () => {
  it("the wait is measured from their reply, not the two-year-old send", () => {
    const before = queryAmbientStatus(q(), "agent", undefined, NOW, 8);
    const after = queryAmbientStatus(q(), "agent", undefined, NOW, 8, [reply(4)]);
    expect(before.nDays, "the fixture is not the long silence it is meant to be").toBeGreaterThan(700);
    expect(after.nDays, "the clock did not restart from their reply").toBe(4);
    /* the bar re-bases with the figure — one anchor, so they cannot disagree */
    expect(after.sentMs).toBe(NOW - 4 * DAY);
  });

  it("a reply-stated window becomes the expected date, attributed to them", () => {
    const a = queryAmbientStatus(q(), "agent", undefined, NOW, 8, [reply(4, 2)]);
    expect(a.windowSource, "the agency's standing weeks outranked what they said last week").toBe("reply");
    expect(a.expMs).toBe(NOW - 4 * DAY + 14 * DAY);
    expect(a.overdue, "a query inside a freshly stated window reads as overdue").toBe(false);
  });

  /** ⚠️ D2 — the list keeps measuring from the send. Both true, different questions. */
  it("the list's group is untouched by a reply", () => {
    const agent = { responseTimeWeeks: 8 };
    expect(listGroupFor(q() as never, agent, NOW)).toBe("overdue");
  });
});

describe("Phase 2/5 · the silence has ended", () => {
  const expired = NOW - 700 * DAY;

  it("the expiry figure stops once they write", () => {
    expect(pastWindowLine(expired, NOW, true), "the fixture states no figure to begin with").not.toBeNull();
    expect(pastWindowLine(expired, NOW, true, NOW - 4 * DAY),
      "the card still counts a silence the record says ended").toBeNull();
  });

  it("the agency's silence policy has nothing to say once they have written", () => {
    const base = { policy: true as const, who: { name: "Quill", plural: true }, windowExpiredMs: expired, now: NOW, formatDate: iso };
    expect(silencePolicyLine(base)).not.toBeNull();
    expect(silencePolicyLine({ ...base, repliedSinceMs: NOW - 4 * DAY }),
      "'they treat silence as a pass' printed above their own reply").toBeNull();
  });

  it("the closure offer is withdrawn — by both routes", () => {
    const base = { times: [NOW - 300 * DAY], windowExpiredMs: expired, now: NOW, dismissed: false };
    expect(closureOffer(base).show).toBe(true);
    expect(closureOffer({ ...base, repliedSinceMs: NOW - 4 * DAY }).show,
      "closure offered on a query the agent replied to last week").toBe(false);
    /* ⚠️ THE POLICY ROUTE TOO — a stated policy about silence cannot reach past a reply. */
    expect(closureOffer({ ...base, times: [], policy: true }).show).toBe(true);
    expect(closureOffer({ ...base, times: [], policy: true, repliedSinceMs: NOW - 4 * DAY }).show).toBe(false);
  });

  /** ⚠️ THE CLAUSE THE PACK NAMES: a nudge answered by a holding reply never reads "no reply". */
  it("a nudge followed by a holding reply reads as answered", () => {
    const nudgeMs = NOW - 30 * DAY;
    expect(nudgeOutcomeLabel(nudgeMs, [])).toBe("Nudged — no reply");
    expect(nudgeOutcomeLabel(nudgeMs, [{ status: "", kind: "holding", timeMs: NOW - 4 * DAY }]),
      "the nudge still says 'no reply' above the reply that answered it").toBe("Nudged");
  });
});

describe("Phase 5 · the task engine (D6)", () => {
  const base = {
    status: QueryStatus.QUERIED, dateSent: iso(NOW - 800 * DAY), responseTimeWeeks: 8,
    noResponseMeansNo: false, lastNudgeSentDate: iso(NOW - 300 * DAY), now: NOW,
  };
  it("the close suggestion clears", () => {
    expect(replyTask(base)).toBe("close");
    expect(replyTask({ ...base, repliedSinceMs: NOW - 4 * DAY }),
      "the app still suggests closing a query the agent replied to last week").toBe("nudge");
  });
  it("including where silence is a stated pass — a reply is not silence", () => {
    const nrn = { ...base, noResponseMeansNo: true };
    expect(replyTask(nrn)).toBe("close");
    expect(replyTask({ ...nrn, repliedSinceMs: NOW - 4 * DAY })).toBe("none");
  });
  /** ⚠️ AND THE NUDGE SURVIVES IT — chasing again is reasonable; closing is not. */
  it("but a fresh query with a reply is still nudgeable", () => {
    expect(replyTask({ ...base, lastNudgeSentDate: undefined, repliedSinceMs: NOW - 4 * DAY })).toBe("nudge");
  });
});

describe("Phase 5 · Analytics counts nothing new (D1)", () => {
  /**
   * ⚠️ ASSERTED THROUGH THE SELECTORS, NOT BY READING THEM. Every response figure keys on
   * `hasAgentResponded` or a status; a holding reply produces neither, so it cannot reach them.
   */
  it("the answered count and rate are untouched", () => {
    const queries = [q({ hasAgentResponded: false }), q({ id: "q2", hasAgentResponded: true })] as never[];
    expect(responsesReceivedCount(queries)).toBe(1);
    expect(responseRatePercent(queries)).toBe(50);
  });

  it("and no analytics selector reads the retired responseDeadline", () => {
    const src = readFileSync(new URL("./dashboardStats.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");
    expect(src, "an analytics figure still reads the retired column").not.toContain(".responseDeadline");
  });
});

describe("Phase 5 · export carries it", () => {
  /* the global twin rides the `activities` collection, which the export copies wholesale */
  it("the type is a plain activity, so the export needs no case for it", () => {
    const src = readFileSync(new URL("./dataExport.ts", import.meta.url), "utf8");
    expect(src).toContain('"activities"');
    expect(HOLDING_REPLY_TYPE).toBe("Holding Reply");
  });
});
