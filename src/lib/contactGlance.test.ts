/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §B — the strip's figures. The facts are built by the page's own `agentFacts` over the Query
 * Centre's own rows (`buildQcRows`), never typed by hand, so a fixture cannot hand the model a state its callers
 * cannot produce.
 */
import { describe, expect, it } from "vitest";
import type { Agent, Query } from "../types";
import { QueryStatus } from "../types";
import { agentFacts } from "./contactList";
import { buildQcRows } from "./qcSummary";
import { GLANCE_WEEKS, glanceModel, glanceOf } from "./contactGlance";

const NOW = Date.parse("2026-10-12T12:00:00Z"); // a Monday
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const agent = (id: string, name: string, over: Partial<Agent> = {}): Agent => ({
  id, name, agency: `${name.split(" ").pop()} Literary`, genres: ["Thriller"], submissionStatus: "Open", dateAdded: iso(200), responseTimeWeeks: 6, ...over,
} as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, sentDaysAgo: number, over: Partial<Query> = {}): Query => ({
  id, agentId, manuscriptId: "ms1", status, dateSent: iso(sentDaysAgo), lastStatusChange: iso(sentDaysAgo), ...over,
} as unknown as Query);

const AGENTS: Agent[] = [
  agent("a1", "Ada Able", { dateAdded: iso(0) }),                              // not queried, ready; added this week
  agent("a2", "Bo Baker", { submissionStatus: "Closed", dateAdded: iso(3) }),   // not queried, closed to submissions; last week, this month
  agent("a3", "Cy Carr", { dateAdded: iso(20) }),                               // querying, inside the window
  agent("a4", "Di Dunn"),                                                       // querying, a request to send: waiting on you
  agent("a5", "Ed Eyre"),                                                       // querying, past their reply time
  agent("a6", "Flo Finch"),                                                     // closed: passed
  agent("a7", "Gus Gray"),                                                      // closed: no reply
  agent("a8", "Hal Hart"),                                                      // closed: withdrawn (in the figure, in neither part)
  agent("a9", "Ivy Ives", { dateAdded: "not a date" }),                         // not queried; counted in no week
];
const QUERIES: Query[] = [
  query("q3", "a3", QueryStatus.QUERIED, 10),
  query("q4", "a4", QueryStatus.FULL_REQUESTED, 30),
  query("q5", "a5", QueryStatus.QUERIED, 120),
  query("q6", "a6", QueryStatus.REJECTED, 60),
  query("q7", "a7", QueryStatus.NO_RESPONSE, 200),
  query("q8", "a8", QueryStatus.WITHDRAWN, 90),
  query("qx", "a1", QueryStatus.QUERIED, 5, { manuscriptId: "another-book" }),  // out of scope: a1 stays not queried
];
const rows = buildQcRows(QUERIES, AGENTS, [], NOW);
const facts = AGENTS.map((a) => agentFacts(a, rows, "ms1"));
const model = glanceModel({ facts, rows, msId: "ms1", readyIds: ["a1", "a9"], nowMs: NOW });
const [none, live, closed] = model.cells;

describe("At a glance: the four cells", () => {
  it("the three groups are the list's standing, and they add up to the agents on file", () => {
    expect(model.total).toBe(AGENTS.length);
    expect([none.n, live.n, closed.n]).toEqual([3, 3, 3]);
    expect(none.n + live.n + closed.n).toBe(model.total);
    /* every agent is in exactly one group, and it is the group its own standing names */
    for (const x of facts) expect(["none", "live", "closed"]).toContain(glanceOf(x));
    expect(facts.filter((x) => glanceOf(x) === "live").map((x) => x.agent.id).sort()).toEqual(["a3", "a4", "a5"]);
  });
  it("a query for another book leaves the agent not queried for this one", () => {
    expect(glanceOf(facts.find((x) => x.agent.id === "a1")!)).toBe("none");
  });
  it("not queried: ready comes from the page's own set, closed to submissions from the door", () => {
    expect(none.parts.map((p) => [p.n, p.text])).toEqual([[2, "ready to query"], [1, "closed to submissions"]]);
    /* ready ones first, in the order handed in; then the rest by surname */
    expect(none.faces.map((f) => f.id)).toEqual(["a1", "a9", "a2"]);
  });
  it("querying: waiting on you is a request or an offer; past their reply time is the agent's court gone by", () => {
    expect(live.parts.map((p) => [p.n, p.text, !!p.hot])).toEqual([[1, "waiting on you", true], [1, "past their reply time", false]]);
    expect(live.faces.map((f) => f.id)).toEqual(["a4", "a5", "a3"]);
  });
  it("closed: passed and no reply; a withdrawn query is in the figure and in neither part", () => {
    expect(closed.parts.map((p) => [p.n, p.text])).toEqual([[1, "passed"], [1, "no reply"]]);
    expect(closed.n).toBe(3);
  });
  it("waiting on you is not hot at zero", () => {
    const m = glanceModel({ facts: facts.filter((x) => x.agent.id !== "a4"), rows, msId: "ms1", readyIds: [], nowMs: NOW });
    expect(m.cells[1].parts[0]).toMatchObject({ n: 0, hot: false });
  });
});

describe("At a glance: weeks and the month, by the London calendar", () => {
  it("twenty weeks, oldest first, this week last", () => {
    expect(model.weeks).toHaveLength(GLANCE_WEEKS);
    expect(model.weeks.every((w, i) => i === 0 || w.start > model.weeks[i - 1].start)).toBe(true);
    expect(model.weeks[GLANCE_WEEKS - 1].n).toBe(model.week);
  });
  it("this week is Monday to now; an agent added last Friday is last week's and this month's", () => {
    expect(model.week).toBe(1);                       // a1, today (a Monday)
    expect(model.weeks[GLANCE_WEEKS - 2].n).toBe(1);  // a2, three days ago
    expect(model.month).toBe(2);                      // a1 and a2; a3 (20 days ago) is September's
  });
  it("an unreadable date falls in no week and no month; an agent older than twenty weeks is in no bar", () => {
    expect(model.weeks.reduce((s, w) => s + w.n, 0)).toBe(3); // a1, a2, a3
  });
  it("the month starts at London midnight, not UTC's: 23:30 UTC on 30 Sep is 1 Oct in London (BST)", () => {
    const edge = [agent("e1", "Edge One", { dateAdded: "2026-09-30T23:30:00Z" }), agent("e2", "Edge Two", { dateAdded: "2026-09-30T22:30:00Z" })];
    const f = edge.map((a) => agentFacts(a, [], null));
    expect(glanceModel({ facts: f, rows: [], msId: null, readyIds: [], nowMs: NOW }).month).toBe(1);
  });
  it("a date in the future is counted nowhere", () => {
    const f = [agentFacts(agent("f1", "Fu Ture", { dateAdded: new Date(NOW + DAY).toISOString() }), [], null)];
    const m = glanceModel({ facts: f, rows: [], msId: null, readyIds: [], nowMs: NOW });
    expect([m.week, m.month, m.weeks.reduce((s, w) => s + w.n, 0)]).toEqual([0, 0, 0]);
  });
});
