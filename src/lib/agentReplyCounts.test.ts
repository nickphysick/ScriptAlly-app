/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · Phase 2 — where the agent's reply that moves nothing counts, and where it does not (Nick's
 * ruling 6). Each lock runs the REAL counter over a population first proved non-empty, then adds one entry of every
 * kind to every query and asserts what the counter does with them.
 *
 *   counts like a holding reply   "Nth response", the To-do calendar's "exchange N", the nudge outcome label
 *   counts as a feed row          "Last in touch" / "Closed {date}" / the recency sorts (QcRow.lastMs)
 *   counts on the agent's side    the Dashboard drawer's "N replies from agents", never "things you did"
 *   absent                        response rate, reply time, the Responses tally, the Dashboard median, the day count
 */
import { describe, expect, it } from "vitest";
import { AGENT_REPLY_NESTED_TYPE, buildAgentReplyWrites, REPLY_KINDS, type ReplyKind } from "./agentReply";
import { agentRepliesForManuscript } from "./queryAmbient";
import { recordDays } from "./todoCalendar";
import { feedEntries } from "./dashFeed";
import { drawerSummary } from "./dashFeedDrawer";
import { buildQcRows } from "./qcSummary";
import { medianReplyDays, responseRatePercent, responsesReceivedCount } from "./dashboardStats";
import { buildRows, statSet } from "./analytics";
import { analyticsModel } from "./analyticsModel";
import { replyTally } from "./analyticsV24";
import { headerTally, pageCounts, respCounts, respItems } from "./responses";
import { buildTimelineRows } from "../components/reading-pane/QueryTimeline";
import { NUDGE_NESTED_TYPE } from "./logNudge";
import { Activity, Agent, Manuscript, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 24, 12);
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (d: number) => iso(NOW - d * DAY);
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const agents: Agent[] = [{ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8 } as Agent];
const manuscripts: Manuscript[] = [{ id: "m1", userId: "u", title: "The Glass Orchard" } as Manuscript];
const mkQ = (id: string, status: QueryStatus, over: Partial<Query> = {}): Query => ({
  id, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "", sendMethod: "Email" as never,
  status, dateSent: ago(90), lastStatusChange: ago(90), hasAgentResponded: false, ...over,
} as Query);
const st = (q: Query, s: QueryStatus, daysAgo: number): Activity => ({
  id: `${q.id}-${s}`, userId: "u", queryId: q.id, manuscriptId: "m1", activityType: "Status Changed" as never,
  description: `Jonathan Marsh — ${s}`, details: "", date: ago(daysAgo), resultingStatus: s,
});

/* the population: one waiting, one asked for the full, one passed, one asked for a partial */
const Q = [
  mkQ("q1", QueryStatus.QUERIED),
  mkQ("q2", QueryStatus.FULL_REQUESTED, { fullRequestedDate: ago(40), lastStatusChange: ago(40), hasAgentResponded: true, responseReceivedAt: ago(40) }),
  mkQ("q3", QueryStatus.REJECTED, { rejectedDate: ago(30), lastStatusChange: ago(30), hasAgentResponded: true, responseReceivedAt: ago(30) }),
  mkQ("q4", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: ago(20), lastStatusChange: ago(20), hasAgentResponded: true, responseReceivedAt: ago(20) }),
];
const LOG: Activity[] = [
  ...Q.map((q) => st(q, QueryStatus.QUERIED, 90)),
  st(Q[1], QueryStatus.FULL_REQUESTED, 40), st(Q[2], QueryStatus.REJECTED, 30), st(Q[3], QueryStatus.PARTIAL_REQUESTED, 20),
];
/** one entry of every kind on every query, through the real builder */
const ENTRIES: Activity[] = Q.flatMap((q, i) => REPLY_KINDS.map((kind, k) => {
  const w = buildAgentReplyWrites(q, agents[0], { kind, on: ago(10 - i - k), date: k === 0 ? ymd(NOW + 20 * DAY) : null, words: "Any news?" });
  return { ...(w.activity as Activity), id: `e-${q.id}-${kind}`, userId: "u" };
}));
const WITH = [...LOG, ...ENTRIES];

describe("the population is not empty", () => {
  it("four queries, three replies, every kind of entry on each", () => {
    expect(Q.length).toBe(4);
    expect(responsesReceivedCount(Q)).toBe(3);
    expect(ENTRIES.length).toBe(Q.length * REPLY_KINDS.length);
    expect(new Set(ENTRIES.map((e) => (e as unknown as { replyKind: string }).replyKind))).toEqual(new Set(REPLY_KINDS));
  });
});

describe("counts like a holding reply", () => {
  it("\"Nth response\": every entry counts as a response received", () => {
    const before = agentRepliesForManuscript(LOG, "m1")!;
    expect(before).toBeGreaterThan(0);
    expect(agentRepliesForManuscript(WITH, "m1")).toBe(before + ENTRIES.length);
  });

  it("the To-do calendar: every entry is an exchange, from the agent", () => {
    const range = Array.from({ length: 100 }, (_, i) => ymd(NOW - i * DAY));
    const items = [...recordDays(WITH, Q, agents, range).values()].flat();
    const mine = items.filter((it) => it.key.startsWith("rec-e-"));
    expect(mine.length).toBe(ENTRIES.length);
    expect(mine.every((it) => it.dir === "in")).toBe(true);
    const before = [...recordDays(LOG, Q, agents, range).values()].flat().length;
    expect(before).toBeGreaterThan(0);
    /* the exchange number runs on through them */
    const q2 = items.filter((it) => it.queryId === "q2").sort((a, b) => a.exchange - b.exchange);
    expect(q2.map((x) => x.exchange)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each(REPLY_KINDS)("the nudge outcome: a nudge followed by a %s reads as answered", (kind: ReplyKind) => {
    const q = Q[0];
    const nudge = { id: "n1", type: NUDGE_NESTED_TYPE, createdAt: ago(30), note: "" };
    const e = { id: "e1", ...buildAgentReplyWrites(q, agents[0], { kind, on: ago(5) }).nested };
    const title = (evs: Record<string, unknown>[]) => buildTimelineRows(evs as never, q, agents[0] as never).find((r) => r.kind === "nudge")?.title;
    expect(title([nudge])).toBe("Nudged — no reply");
    expect(title([nudge, e]), `a ${kind} did not answer the nudge`).toBe("Nudged");
    expect(e.type).toBe(AGENT_REPLY_NESTED_TYPE);
  });
});

describe("counts as a feed row", () => {
  it("\"Last in touch\", \"Closed {date}\" and the recency sorts keep counting every feed row (QcRow.lastMs)", () => {
    const before = buildQcRows(Q, agents, LOG, NOW);
    const after = buildQcRows(Q, agents, WITH, NOW);
    for (const q of Q) {
      const latest = Math.max(...ENTRIES.filter((e) => e.queryId === q.id).map((e) => Date.parse(e.date)));
      expect(after.find((r) => r.id === q.id)!.lastMs).toBe(latest);
      expect(before.find((r) => r.id === q.id)!.lastMs).toBeLessThan(latest);
    }
  });
});

describe("counts on the agent's side", () => {
  it("the Dashboard drawer's \"N replies from agents\" counts each entry, never as something you did", () => {
    const input = { queries: Q, agents, manuscripts, now: new Date(NOW), seenAt: null, from: NOW - 100 * DAY };
    const before = drawerSummary(feedEntries({ ...input, activities: LOG }));
    const after = drawerSummary(feedEntries({ ...input, activities: WITH }));
    expect(before.replies + before.did).toBeGreaterThan(0);
    expect(after.replies, "an entry was not counted as a reply").toBe(before.replies + ENTRIES.length);
    expect(after.did, "an entry was counted as something the writer did").toBe(before.did);
  });
});

describe("absent — the figures stay as they are", () => {
  it("response rate and responses received", () => {
    expect(responseRatePercent(Q)).toBeGreaterThan(0);
    /* the entry writes nothing to a query, so the query-field counters cannot see it; the log counters below can */
    expect(responsesReceivedCount(Q)).toBe(3);
  });

  it("reply time: the Dashboard median and the analytics median", () => {
    const m = medianReplyDays(Q, LOG);
    expect(m).not.toBeNull();
    expect(medianReplyDays(Q, WITH)).toBe(m);
    const a = statSet(buildRows(Q, LOG, agents, NOW));
    expect(a.ratePercent).toBeGreaterThan(0);
    expect(statSet(buildRows(Q, WITH, agents, NOW))).toEqual(a);
  });

  it("the Responses tally", () => {
    const tally = (acts: Activity[]) => {
      const rows = buildQcRows(Q, agents, acts, NOW);
      const items = respItems(rows);
      return { counts: respCounts(items), header: headerTally(pageCounts(items, rows)) };
    };
    const t = tally(LOG);
    expect(t.counts).toMatchObject({});
    expect(respItems(buildQcRows(Q, agents, LOG, NOW)).length).toBeGreaterThan(0);
    expect(tally(WITH)).toEqual(t);
  });

  it("the Analytics tally", () => {
    const tally = (acts: Activity[]) => replyTally(analyticsModel({ queries: Q, activities: acts, agents, range: "all", nowMs: NOW } as never).items);
    const t = tally(LOG);
    expect(t.all).toBeGreaterThan(0);
    expect(tally(WITH)).toEqual(t);
  });

  it("the day count", () => {
    const d = buildQcRows(Q, agents, LOG, NOW).map((r) => r.dayN);
    expect(d.some((x) => x != null)).toBe(true);
    expect(buildQcRows(Q, agents, WITH, NOW).map((r) => r.dayN)).toEqual(d);
  });
});
