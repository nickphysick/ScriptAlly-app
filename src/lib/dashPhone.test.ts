/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard on the phone v1 — the phone's figures are the desktop's own: each is reconciled against the function the
 * desktop reads, never against a literal.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { liveCount } from "./dashBreakdown";
import { aggregateLedger, dailyLedger, sentAt } from "./oneScreen";
import { tileCourt } from "./qcSummary";
import { activeCard, activeLine, agentsCard, closedCard, foundingRow, phoneKindOf, PHONE_KIND, PHONE_WEEKS, queriesForIds, withAgentsCard } from "./dashPhone";

const NOW = new Date(2026, 9, 28, 12);
const day = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let k = 0;
const q = (status: QueryStatus, sentDaysAgo: number | null, changedDaysAgo = 1): Query =>
  ({ id: `q${++k}`, agentId: `a${k}`, manuscriptId: "m1", status, dateSent: sentDaysAgo == null ? undefined : day(sentDaysAgo), lastStatusChange: day(changedDaysAgo) } as unknown as Query);

const FIX: Query[] = [
  q(QueryStatus.QUERIED, 120), q(QueryStatus.QUERIED, 90), q(QueryStatus.QUERIED, 20), q(QueryStatus.QUERIED, 3),
  q(QueryStatus.PARTIAL_REQUESTED, 60), q(QueryStatus.PARTIAL_SENT, 70), q(QueryStatus.FULL_SENT, 80),
  q(QueryStatus.OFFER, 100), q(QueryStatus.REVISE_RESUBMIT, 110),
  q(QueryStatus.REJECTED, 85, 40), q(QueryStatus.NO_RESPONSE, 150, 10), q(QueryStatus.WITHDRAWN, 50, 30),
  q(QueryStatus.QUERIED, null),
];

describe("the Active queries card reads the desktop's own functions", () => {
  const c = activeCard(FIX, NOW);
  it("the number is the live count", () => { expect(c.count).toBe(liveCount(FIX)); expect(c.count).toBeGreaterThan(0); });
  it("need you + with agents = the live count (the two courts partition the live set)", () => {
    expect(c.withYou + withAgentsCard(FIX).n).toBe(c.count);
    expect(c.withYou).toBe(FIX.filter((x) => liveCount([x]) === 1 && tileCourt(x.status) === "you").length);
  });
  it("sent in all counts every query with a send date", () => { expect(c.sent).toBe(FIX.filter((x) => sentAt(x) !== null).length); });
  it("the series is the weekly roll-up's last twelve weeks", () => {
    const w = aggregateLedger(dailyLedger(FIX, NOW), "weekly").slice(-PHONE_WEEKS);
    expect(c.weeks.map((p) => p.active)).toEqual(w.map((p) => p.active));
    expect(c.weeks.length).toBe(PHONE_WEEKS);
  });
  it("a month name marks the first week of each month in the window, in order", () => {
    expect(c.months[0].index).toBe(0);
    expect(c.months.map((m) => m.index)).toEqual([...c.months.map((m) => m.index)].sort((a, b) => a - b));
  });
  it("the chip is the net rise this month, and absent when it is not a rise", () => {
    const d = dailyLedger(FIX, NOW);
    const start = new Date(NOW.getFullYear(), NOW.getMonth(), 1).getTime();
    const before = [...d].reverse().find((p) => p.start.getTime() < start)?.active ?? 0;
    const delta = d[d.length - 1].active - before;
    expect(c.chip).toBe(delta > 0 ? delta : null);
    expect(activeCard([q(QueryStatus.QUERIED, 200)], NOW).chip).toBeNull();
  });
  it("'need you' is dropped at zero", () => {
    expect(activeLine({ withYou: 0, sent: 4 })).toEqual({ bold: null, rest: "4 sent in all" });
    expect(activeLine({ withYou: 2, sent: 21 })).toEqual({ bold: "2 need you", rest: "21 sent in all" });
  });
});

describe("where a card goes: exactly its own queries", () => {
  it("each card's ids are its number", () => {
    const c = activeCard(FIX, NOW), w = withAgentsCard(FIX);
    expect(c.ids.length).toBe(c.count);
    expect(w.ids.length).toBe(w.n);
    expect(new Set(c.ids).size).toBe(c.ids.length);
  });
  it("the path carries the ids, and an empty set opens the page whole", () => {
    expect(queriesForIds(["a", "b"])).toBe("/queries?ids=a%2Cb");
    expect(queriesForIds([])).toBe("/queries");
  });
});

describe("the three small cards", () => {
  it("With agents: reading is partial or full sent, the bar sums to the number", () => {
    const w = withAgentsCard(FIX);
    expect(w.reading).toBe(2);
    expect(w.segs.reduce((n, s) => n + s.count, 0)).toBe(w.n);
  });
  it("Closed: the biggest bucket, and the bar sums to the total", () => {
    const c = closedCard({ total: 3, buckets: [
      { key: "quiet", label: "No reply", count: 2, share: 0 }, { key: "letter", label: "Passed on query", count: 1, share: 0 },
      { key: "partial", label: "Passed on partial", count: 0, share: 0 }, { key: "full", label: "Passed on full", count: 0, share: 0 },
    ] });
    expect(c.top).toEqual({ count: 2, label: "no reply" });
    expect(c.segs.reduce((n, s) => n + s.count, 0)).toBe(3);
    expect(closedCard({ total: 0, buckets: [] }).top).toBeNull();
  });
  it("Agents: queried of total, the rest to query, the bar sums to the total", () => {
    const a = agentsCard({ querying: 14, closed: 2, none: 1, queried: 16, total: 17 });
    expect([a.queried, a.total, a.toQuery]).toEqual([16, 17, 1]);
    expect(a.segs.reduce((n, s) => n + s.count, 0)).toBe(17);
  });
});

describe("Up next's kinds, in one map", () => {
  it("every task kind lands on a phone kind with a tint", () => {
    expect((["send", "nudge", "close", "other"] as const).map(phoneKindOf)).toEqual(["move", "nudge", "close", "house"]);
    expect(Object.keys(PHONE_KIND).sort()).toEqual(["close", "house", "move", "nudge"]);
  });
});

describe("the founding writer row", () => {
  it("an egg is three more to hatch", () => {
    expect(foundingRow({ contributions: 2, nextTier: "fledgling", toNext: 3, tier: null })).toEqual({ rank: "Egg", tier: 0, line: "2 sent · 3 more to hatch. Tell us something." });
  });
  it("a rank names the next one", () => {
    expect(foundingRow({ contributions: 4, nextTier: "scout", toNext: 4, tier: "archivist" }).line).toBe("4 sent · 4 more to Scout. Tell us something.");
  });
  it("the top rank says so", () => {
    expect(foundingRow({ contributions: 30, nextTier: null, toNext: null, tier: "queryhawk" })).toEqual({ rank: "QueryHawk", tier: 5, line: "30 sent · top rank. Tell us something." });
  });
});
