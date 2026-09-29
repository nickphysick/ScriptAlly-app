/**
 * Item 2 (clean-up pass, 28 Sep): a requery explains itself. The ONE check — same agent, same book,
 * not itself, closed, sent strictly earlier, still existing — and one test per case it must refuse.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ActivityType, QueryStatus, type Activity, type Agent, type Query } from "../types";
import { previousQueryFor, previousOutcome, requeryLine } from "./requery";
import { feedEntries } from "./dashFeed";

const q = (id: string, over: Partial<Query>): Query =>
  ({ id, userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-09-20", ...over } as Query);
const NEW = q("new", {});
const EARLIER_PASS = q("old-pass", { status: QueryStatus.REJECTED, dateSent: "2026-05-01", lastStatusChange: "2026-07-03T10:00:00Z" });

describe("previousQueryFor — the one check", () => {
  it("matches an earlier, closed query to the same agent for the same book", () => {
    expect(previousQueryFor(NEW, [NEW, EARLIER_PASS])?.id).toBe("old-pass");
  });
  it("never another book", () => {
    expect(previousQueryFor(NEW, [NEW, { ...EARLIER_PASS, manuscriptId: "m2" }])).toBeNull();
  });
  it("never another agent", () => {
    expect(previousQueryFor(NEW, [NEW, { ...EARLIER_PASS, agentId: "a2" }])).toBeNull();
  });
  it("never the query itself, even when it is closed", () => {
    const self = q("self", { status: QueryStatus.REJECTED, dateSent: "2026-05-01" });
    expect(previousQueryFor(self, [self])).toBeNull();
    /* the date alone also keeps it out (its own date is never strictly earlier than itself), so the
       id test is proved on its own: the same query, asked about as if logged later */
    expect(previousQueryFor(self, [self], Date.parse("2026-09-01T00:00:00"))).toBeNull();
  });
  it("never a live one — that is a duplicate, not a requery", () => {
    expect(previousQueryFor(NEW, [NEW, { ...EARLIER_PASS, status: QueryStatus.PARTIAL_REQUESTED }])).toBeNull();
  });
  it("never a LATER one", () => {
    expect(previousQueryFor(NEW, [NEW, { ...EARLIER_PASS, dateSent: "2026-09-25" }])).toBeNull();
  });
  it("never an undone or deleted query: it is simply not in the list, so there is nothing to name", () => {
    expect(previousQueryFor(NEW, [NEW])).toBeNull();
  });
  it("the latest of several earlier closed queries", () => {
    const older = q("older", { status: QueryStatus.NO_RESPONSE, dateSent: "2026-01-10" });
    expect(previousQueryFor(NEW, [older, EARLIER_PASS, NEW])?.id).toBe("old-pass");
  });
});

describe("the words", () => {
  it("passed, no reply, withdrawn — with the date it closed", () => {
    expect(previousOutcome(EARLIER_PASS)).toBe("previously passed 3 Jul");
    expect(previousOutcome({ ...EARLIER_PASS, status: QueryStatus.NO_RESPONSE, lastStatusChange: "2026-08-12T10:00:00Z" })).toBe("previously closed 12 Aug, no reply");
    expect(previousOutcome({ ...EARLIER_PASS, status: QueryStatus.WITHDRAWN })).toBe("previously withdrawn 3 Jul");
    expect(requeryLine(NEW, [NEW, EARLIER_PASS])).toEqual({ text: "Requery · previously passed 3 Jul", queryId: "old-pass" });
  });
});

describe("the surfaces", () => {
  const agents = [{ id: "a1", name: "Fenella Strand", agency: "Strand Literary" }] as unknown as Agent[];
  const send = (queryId: string, eventKey?: string): Activity =>
    ({ id: `act-${queryId}`, userId: "u", activityType: ActivityType.QUERY_SENT, description: "Query sent to Fenella Strand at Strand Literary", manuscriptId: "m1", queryId, date: "2026-09-20T10:00:00Z", details: "", resultingStatus: QueryStatus.QUERIED, ...(eventKey ? { eventKey } : {}) } as unknown as Activity);
  it("the dashboard feed's send row carries the explanation and the earlier query's id", () => {
    const e = feedEntries({ activities: [send("new", "requery_sent")], queries: [NEW, EARLIER_PASS], agents, manuscripts: [], now: new Date("2026-09-28T12:00:00Z"), seenAt: null });
    expect(e.length, "the fixture row was not read").toBe(1);
    expect(e[0].requery).toEqual({ text: "Requery · previously passed 3 Jul", queryId: "old-pass" });
  });
  it("and a first query carries none", () => {
    const e = feedEntries({ activities: [send("new")], queries: [NEW], agents, manuscripts: [], now: new Date("2026-09-28T12:00:00Z"), seenAt: null });
    expect(e[0].requery).toBeNull();
  });
  it("the log, the quick card, the To-do pane and Tracking all use the one check", () => {
    const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
    expect(read("src/components/queryActions/journeys/LogJourney.tsx")).toMatch(/previousQueryFor\(\{ id: "__new__"[\s\S]{0,160}sent\.getTime\(\)\)/);
    expect(read("src/components/dashboard/QueryCardLive.tsx")).toContain("requeryLine(query, queries)");
    expect(read("src/components/todo/useTaskPaneSession.tsx")).toContain("requeryLine(q, queries)");
    expect(read("src/components/Queries.tsx")).toContain("requeryLine(activeQuery, queries)");
  });
});
