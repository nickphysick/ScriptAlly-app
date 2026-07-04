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
  activeTooltip,
  activeWeeklySeries,
  agentStatusSummaries,
  agentTooltip,
  awaitingReplyCount,
  chipText,
  idleAgentCount,
  isoWeekStart,
  overflowTooltip,
  pipelineMix,
  responseRatePercent,
  responsesReceivedCount,
  responsesTooltip,
  salutation,
  sendsThisWeek,
  sentTooltip,
  trailingWeekStarts,
  wcLabel,
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

describe("trailingWeekStarts", () => {
  it("returns Mondays oldest-first, current week last", () => {
    const starts = trailingWeekStarts(NOW, 8);
    expect(starts).toHaveLength(8);
    expect(starts[7].getDate()).toBe(29); // Mon 29 June (current ISO week)
    expect(starts[6].getDate()).toBe(22);
    starts.forEach((d) => expect(d.getDay()).toBe(1));
  });
});

describe("activeWeeklySeries", () => {
  it("counts a query active from its sent week until its terminal close", () => {
    const sent = daysAgo(28); // four weeks back
    const closed = new Date(NOW.getTime() - 10 * 86400000); // ~1.5 weeks back
    const queries = [
      q({ dateSent: sent, status: QueryStatus.REJECTED, lastStatusChange: closed.toISOString() }),
      q({ dateSent: daysAgo(3), status: QueryStatus.QUERIED }), // active this week only
    ];
    const s = activeWeeklySeries(queries, NOW, 8);
    expect(s).toHaveLength(8);
    expect(s[7]).toBe(1); // the live count: only the open query (last sample clamps to now)
    expect(s[3]).toBe(1); // four weeks back: the (later-rejected) query was still open
    expect(s[5]).toBe(1); // two weeks back: still open (closed ~1.5 weeks ago)
    expect(s[0]).toBe(0); // before anything was sent
  });
  it("closes a terminal query with no timestamps at its dateSent (never counted active)", () => {
    const queries = [q({ dateSent: daysAgo(20), status: QueryStatus.WITHDRAWN })];
    expect(activeWeeklySeries(queries, NOW, 8).every((n) => n === 0)).toBe(true);
  });
  it("reads Firestore-Timestamp-shaped close dates", () => {
    const queries = [
      q({ dateSent: daysAgo(20), status: QueryStatus.REJECTED, lastStatusChange: { seconds: Math.floor((NOW.getTime() - 2 * 86400000) / 1000) } }),
    ];
    const s = activeWeeklySeries(queries, NOW, 8);
    expect(s[5]).toBe(1); // open two weeks ago
    expect(s[7]).toBe(0); // closed by now
  });
});

describe("agentStatusSummaries", () => {
  const agents = [
    { id: "a1", name: "Margaret Atwood" },
    { id: "a2", name: "Idle Ivy" },
    { id: "a3", name: "Parked Pete", setAside: true },
  ] as any[];
  const queries = [
    q({ agentId: "a1", status: QueryStatus.QUERIED }),
    q({ agentId: "a1", status: QueryStatus.PARTIAL_REQUESTED }),
    q({ agentId: "a1", status: QueryStatus.REJECTED }), // terminal — never the summary status
  ];
  it("reports the most advanced ACTIVE status per agent; idle agents get null", () => {
    const s = agentStatusSummaries(agents, queries);
    expect(s.find((x) => x.id === "a1")?.status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(s.find((x) => x.id === "a2")?.status).toBeNull();
  });
  it("excludes set-aside/closed unqueried agents (agentBuckets contract)", () => {
    const s = agentStatusSummaries(agents, queries);
    expect(s.some((x) => x.id === "a3")).toBe(false);
    expect(s).toHaveLength(2);
  });
});

describe("tooltip label builders", () => {
  it("formats the week-commencing labels", () => {
    expect(wcLabel(new Date(2026, 5, 23))).toBe("W/C 23 JUN");
    expect(sentTooltip(new Date(2026, 5, 23), 2)).toBe("W/C 23 JUN · 2 SENT");
    expect(activeTooltip(new Date(2026, 5, 30), 3)).toBe("W/C 30 JUN · 3 ACTIVE");
  });
  it("formats agent + overflow + responses labels", () => {
    expect(agentTooltip("Margaret Atwood", QueryStatus.PARTIAL_REQUESTED)).toBe("MARGARET ATWOOD · PARTIAL REQUESTED");
    expect(agentTooltip("Idle Ivy", null)).toBe("IDLE IVY · IDLE");
    expect(overflowTooltip(4)).toBe("+4 MORE AGENTS");
    expect(overflowTooltip(1)).toBe("+1 MORE AGENT");
    expect(responsesTooltip(9, 10, 90)).toBe("9 OF 10 QUERIES ANSWERED · 90%");
    expect(responsesTooltip(1, 1, 100)).toBe("1 OF 1 QUERY ANSWERED · 100%");
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
