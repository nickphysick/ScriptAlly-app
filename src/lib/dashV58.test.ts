/**
 * DASHBOARD v58 — the derivations the page added, through the real functions.
 *
 * A2's unit half: who wrote an event, whether its request is still open, and the day it was met.
 * The harness account holds no MET request inside thirty days, so that branch is entered here.
 * C1's unit half: the latest line. And the first-run plan.
 */
import { describe, expect, it } from "vitest";
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../types";
import { feedEntries } from "./dashFeed";
import { closedLatest, closedShare, closedTile } from "./dashClosed";
import { startingPlan, focusOf } from "./dashList";
import { GETTING_STARTED } from "./dashEmpty";

const NOW = new Date(2026, 9, 9, 13, 0, 0);
const at = (days: number, h = 12) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days, h).toISOString();
let seq = 0;
const act = (over: Partial<Activity>): Activity =>
  ({ id: `a${++seq}`, userId: "u", queryId: "q1", manuscriptId: "m1", date: at(1), activityType: ActivityType.STATUS_CHANGED, description: "", ...over } as unknown as Activity);
const AGENT = { id: "ag1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency" } as unknown as Agent;
const MS = { id: "m1", userId: "u", title: "Murphy's Day Out" } as unknown as Manuscript;
const query = (over: Partial<Query>): Query => ({ id: "q1", userId: "u", agentId: "ag1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: at(40), ...over } as unknown as Query);
const feed = (activities: Activity[], q: Query) => feedEntries({ activities, queries: [q], agents: [AGENT], manuscripts: [MS], now: NOW, seenAt: null });

describe("the feed: who wrote it", () => {
  it("a request, a pass and an offer are from the agent; a query, a send and a nudge are the writer's", () => {
    const e = feed([
      act({ id: "req", date: at(1), resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "sent", date: at(2), activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.PARTIAL_SENT }),
      act({ id: "nudge", date: at(3), activityType: ActivityType.NUDGE_SENT, description: "Nudge sent to Jonathan Marsh at The Marsh Agency" }),
      act({ id: "pass", date: at(4), resultingStatus: QueryStatus.REJECTED }),
      act({ id: "offer", date: at(5), resultingStatus: QueryStatus.OFFER }),
      act({ id: "q", date: at(6), activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
      act({ id: "added", date: at(7), queryId: undefined, activityType: ActivityType.AGENT_ADDED, description: "Added Jonathan Marsh at The Marsh Agency" }),
    ], query({ status: QueryStatus.FULL_REQUESTED }));
    const dir = Object.fromEntries(e.map((x) => [x.id, x.dir]));
    expect(dir).toEqual({ req: "in", sent: "out", nudge: "out", pass: "in", offer: "in", q: "out", added: "out" });
  });

  it("an open request needs the writer; a met one says the day the pages went; a closed one says neither", () => {
    const asked = act({ id: "ask", date: at(10), resultingStatus: QueryStatus.PARTIAL_REQUESTED });
    const open = feed([asked], query({ status: QueryStatus.PARTIAL_REQUESTED }))[0];
    expect([open.need?.label, open.met]).toEqual(["Send the partial", null]);

    const sent = act({ id: "went", date: at(6), activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.PARTIAL_SENT });
    const met = feed([asked, sent], query({ status: QueryStatus.PARTIAL_SENT })).find((x) => x.id === "ask")!;
    const d = new Date(at(6));
    expect(met.need).toBeNull();
    expect(met.met).toBe(`${d.getDate()} Oct`);

    const passed = feed([asked], query({ status: QueryStatus.REJECTED }))[0];
    expect([passed.need, passed.met]).toEqual([null, null]);
  });

  it("a send BEFORE the request does not answer it", () => {
    const early = act({ id: "early", date: at(20), activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.FULL_SENT });
    const rr = act({ id: "rr", date: at(5), resultingStatus: QueryStatus.REVISE_RESUBMIT });
    const e = feed([early, rr], query({ status: QueryStatus.REVISE_RESUBMIT })).find((x) => x.id === "rr")!;
    expect([e.need?.label, e.met]).toEqual(["Send your revision", null]);
  });

  it("the window starts where it is told to", () => {
    const acts = [act({ id: "old", date: at(50), resultingStatus: QueryStatus.FULL_REQUESTED }), act({ id: "new", date: at(2), resultingStatus: QueryStatus.FULL_REQUESTED })];
    expect(feed(acts, query({})).map((x) => x.id)).toEqual(["new"]);
    const wide = feedEntries({ activities: acts, queries: [query({})], agents: [AGENT], manuscripts: [MS], now: NOW, seenAt: null, from: 0 });
    expect(wide.map((x) => x.id)).toEqual(["new", "old"]);
  });
});

describe("closed queries: the latest line", () => {
  const closedQueries = [
    query({ id: "a", status: QueryStatus.NO_RESPONSE, lastStatusChange: at(9) }),
    query({ id: "b", status: QueryStatus.REJECTED, lastStatusChange: at(0) }),
    query({ id: "w", status: QueryStatus.WITHDRAWN, lastStatusChange: at(0, 13) }),
  ] as Query[];
  const tile = closedTile(closedQueries, []);

  it("withdrawn is in no tile, and the four tiles sum to the title", () => {
    expect(tile.total).toBe(2);
    expect(tile.buckets.reduce((n, b) => n + b.count, 0)).toBe(tile.total);
    expect(Object.values(tile.members).flat()).not.toContain("w");
  });

  it("names the most recently closed, how far it got, and how long ago", () => {
    const when = (id: string) => new Date((closedQueries.find((q) => q.id === id) as unknown as { lastStatusChange: string }).lastStatusChange).getTime();
    expect(closedLatest(tile, when, (id) => `Agent ${id}`, NOW.getTime())).toEqual({ who: "Agent b", verb: "passed on your query", when: "today", queryId: "b" });
    const quiet = closedTile([closedQueries[0]], []);
    expect(closedLatest(quiet, when, (id) => `Agent ${id}`, NOW.getTime())).toMatchObject({ verb: "didn't reply", when: "9 days ago" });
    expect(closedLatest(closedTile([], []), when, () => "", NOW.getTime())).toBeNull();
  });

  it("the ring's share is of every query sent, and never past the whole", () => {
    expect([closedShare(3, 22), closedShare(0, 5), closedShare(5, 0), closedShare(9, 3)]).toEqual([3 / 22, 0, 0, 1]);
  });
});

describe("first run: the getting-started deeds are the list", () => {
  it("lists only what is still to do, and each opens where it is done", () => {
    const rows = GETTING_STARTED.map((g, i) => ({ ...g, done: i === 0, doneNote: null }));
    const plan = startingPlan(rows, "m1");
    expect(plan.items.map((x) => x.pre)).toEqual(rows.slice(1).map((r) => r.deed));
    expect(plan.groups[0].label).toBe("Getting started");
    expect(focusOf(plan, 0).item?.action).toEqual({ kind: "route", tab: "agents", sub: "Add an agent" });
    expect(plan.items.find((x) => x.key === "start:query")?.action).toEqual({ kind: "drawer", request: { mode: "log", manuscriptId: "m1" } });
  });
  it("everything done leaves no list rather than a crash", () => {
    expect(startingPlan(GETTING_STARTED.map((g) => ({ ...g, done: true, doneNote: null })), null).items).toEqual([]);
  });
});
