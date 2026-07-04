/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard stat selectors — fixture-driven unit tests (overnight build Phase 4). These pin the
 * v37 dashboard's numbers: ISO-week send series, awaiting-a-reply, the canonical once-per-query
 * response rule (hasAgentResponded ?? legacy status set), idle agents, week-of-querying wording
 * and the attention chip pluralisation.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import {
  activeQueriesOf,
  awaitingReplyCount,
  chipText,
  idleAgentCount,
  isoWeekStart,
  pipelineMix,
  responseRatePercent,
  responsesReceivedCount,
  salutation,
  sendsThisWeek,
  weekOfQuerying,
  weeklySendSeries,
} from "./dashboardStats";

// Friday 3 July 2026, 15:00 local — a fixed "now" (ISO week starts Mon 29 June).
const NOW = new Date(2026, 6, 3, 15, 0, 0);

const q = (over: Record<string, unknown>) => ({
  id: String(Math.random()),
  status: QueryStatus.QUERIED,
  ...over,
}) as any;

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

describe("isoWeekStart", () => {
  it("returns the Monday of the containing ISO week", () => {
    expect(isoWeekStart(new Date(2026, 6, 3)).getDay()).toBe(1); // Friday → Monday
    expect(isoWeekStart(new Date(2026, 6, 3)).getDate()).toBe(29); // Mon 29 June
    expect(isoWeekStart(new Date(2026, 5, 29)).getDate()).toBe(29); // Monday maps to itself
    expect(isoWeekStart(new Date(2026, 6, 5)).getDate()).toBe(29); // Sunday still last Monday
  });
});

describe("weeklySendSeries", () => {
  it("bins sends into trailing ISO weeks with the current week last", () => {
    const queries = [
      q({ dateSent: daysAgo(0) }), // this week (Fri)
      q({ dateSent: daysAgo(4) }), // Mon 29 Jun — still this ISO week
      q({ dateSent: daysAgo(5) }), // Sun 28 Jun — LAST ISO week
      q({ dateSent: daysAgo(20) }), // three weeks back
      q({ dateSent: daysAgo(400) }), // out of range
      q({}), // no dateSent — ignored
    ];
    const series = weeklySendSeries(queries, NOW, 8);
    expect(series).toHaveLength(8);
    expect(series[7]).toBe(2); // current ISO week
    expect(series[6]).toBe(1); // previous ISO week
    expect(series[5]).toBe(0);
    expect(series[4]).toBe(1); // ~3 weeks back
    expect(series.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("sendsThisWeek matches the last bin", () => {
    const queries = [q({ dateSent: daysAgo(1) }), q({ dateSent: daysAgo(10) })];
    expect(sendsThisWeek(queries, NOW)).toBe(weeklySendSeries(queries, NOW, 8)[7]);
    expect(sendsThisWeek(queries, NOW)).toBe(1);
  });
});

describe("active + awaiting a reply", () => {
  const queries = [
    q({ status: QueryStatus.QUERIED }),
    q({ status: QueryStatus.PARTIAL_REQUESTED }),
    q({ status: QueryStatus.PARTIAL_SENT }),
    q({ status: QueryStatus.FULL_SENT }),
    q({ status: QueryStatus.OFFER }),
    q({ status: QueryStatus.REJECTED }),
    q({ status: QueryStatus.NO_RESPONSE }),
  ];
  it("active excludes terminal statuses", () => {
    expect(activeQueriesOf(queries)).toHaveLength(4);
  });
  it("awaiting a reply = ball with the agent (Queried / Partial Sent / Full Sent)", () => {
    expect(awaitingReplyCount(queries)).toBe(3);
  });
  it("pipelineMix keeps journey order and drops empty stages", () => {
    const mix = pipelineMix(activeQueriesOf(queries));
    expect(mix.map((m) => m.status)).toEqual([
      QueryStatus.QUERIED,
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_SENT,
    ]);
  });
});

describe("responses (canonical once-per-query rule)", () => {
  it("prefers the derived hasAgentResponded flag and falls back to the legacy status set", () => {
    const queries = [
      q({ status: QueryStatus.QUERIED, hasAgentResponded: true }), // derived true wins over status
      q({ status: QueryStatus.PARTIAL_REQUESTED, hasAgentResponded: false }), // derived false wins
      q({ status: QueryStatus.REJECTED }), // un-migrated → legacy set counts it
      q({ status: QueryStatus.QUERIED }), // un-migrated, not in the legacy set
    ];
    expect(responsesReceivedCount(queries)).toBe(2);
    expect(responseRatePercent(queries)).toBe(50);
  });
  it("rate is 0 with no queries (no divide-by-zero)", () => {
    expect(responseRatePercent([])).toBe(0);
  });
});

describe("idle agents (agentBuckets contract)", () => {
  const agents = [
    { id: "a1" }, // queried
    { id: "a2" }, // idle (open/unknown, not set aside)
    { id: "a3", setAside: true }, // excluded
    { id: "a4", submissionStatus: "Closed" }, // excluded
  ] as any[];
  const queries = [q({ agentId: "a1" })];
  it("idle = no queries ∧ open/unknown ∧ not set aside", () => {
    expect(idleAgentCount(agents, queries)).toBe(1);
  });
});

describe("weekOfQuerying", () => {
  it("spells weeks ≤ twelve and goes numeric after", () => {
    expect(weekOfQuerying([q({ dateSent: daysAgo(1) })], NOW)).toBe("week one");
    expect(weekOfQuerying([q({ dateSent: daysAgo(7 * 8) })], NOW)).toBe("week nine");
    expect(weekOfQuerying([q({ dateSent: daysAgo(7 * 20) })], NOW)).toBe("week 21");
  });
  it("falls back to week one when underivable", () => {
    expect(weekOfQuerying([], NOW)).toBe("week one");
    expect(weekOfQuerying([q({})], NOW)).toBe("week one");
  });
  it("uses the earliest send", () => {
    const queries = [q({ dateSent: daysAgo(3) }), q({ dateSent: daysAgo(7 * 3 + 1) })];
    expect(weekOfQuerying(queries, NOW)).toBe("week four");
  });
});

describe("chipText", () => {
  it("is singular at exactly 1", () => {
    expect(chipText(1)).toBe("1 thing needs your attention");
  });
  it("is plural otherwise", () => {
    expect(chipText(0)).toBe("0 things need your attention");
    expect(chipText(7)).toBe("7 things need your attention");
  });
});

describe("salutation", () => {
  it("is time-of-day aware", () => {
    expect(salutation(new Date(2026, 6, 3, 8))).toBe("Good morning");
    expect(salutation(new Date(2026, 6, 3, 14))).toBe("Good afternoon");
    expect(salutation(new Date(2026, 6, 3, 21))).toBe("Good evening");
  });
});
