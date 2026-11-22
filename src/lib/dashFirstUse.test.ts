import { describe, expect, it } from "vitest";
import { ComponentType, QueryStatus, SubmissionStatus, UserPlan, type Agent, type Manuscript, type ManuscriptVersion, type Query } from "../types";
import { agentCoverage, isPreQuery } from "./dashFirstUse";
import { agentQueryStates } from "./contactDesk";
import { nextStep } from "./contactNextStep";
import { bookGenres } from "./genreMatch";

const NOW = new Date("2026-10-16T12:00:00Z");
const TODAY = "2026-10-16";
const ms = (over: Partial<Manuscript> = {}) => ({ id: "m1", title: "Murphy", genre: "Fantasy", subGenres: [], comps: [], bookVersions: [], ...over } as unknown as Manuscript);
const agent = (id: string, over: Partial<Agent> = {}) => ({ id, name: id, agency: "", genres: [], submissionStatus: SubmissionStatus.OPEN, dateAdded: "2026-09-01", ...over } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, dateSent = "2026-09-10", manuscriptId = "m1") =>
  ({ id, agentId, manuscriptId, status, dateSent } as unknown as Query);
const version = (componentType: ComponentType, manuscriptId = "m1") => ({ id: componentType, manuscriptId, componentType } as unknown as ManuscriptVersion);

/* the ref's three STATE fixtures: day one · three agents, no queries · querying */
const DAY_ONE = { agents: [] as Agent[], queries: [] as Query[] };
const THREE = { agents: [agent("a"), agent("b"), agent("c", { dateAdded: "2026-10-14" })], queries: [] as Query[] };
const QUERYING = {
  agents: [agent("a"), agent("b"), agent("c"), agent("d", { submissionStatus: SubmissionStatus.CLOSED }), agent("e", { genres: ["Romance"] }), agent("f", { dateAdded: "2026-10-13" })],
  queries: [query("q1", "a", QueryStatus.QUERIED), query("q2", "b", QueryStatus.REJECTED), query("q3", "c", QueryStatus.FULL_REQUESTED), query("q4", "x", QueryStatus.QUERIED, "2026-09-01", "m2")],
};

describe("the pre-query predicate", () => {
  it("is the absence of a query on the active manuscript, and nothing else", () => {
    expect(isPreQuery([])).toBe(true);
    expect(isPreQuery([query("q", "a", QueryStatus.REJECTED)])).toBe(false);
  });
});

describe("Agents on file: the Contact list's own figures", () => {
  it("day one: nothing on file", () => {
    expect(agentCoverage({ ...DAY_ONE, manuscript: ms(), now: NOW, todayIso: TODAY })).toEqual({ total: 0, querying: 0, closed: 0, none: 0, queried: 0, ready: 0, addedThisWeek: 0, pct: 0 });
  });
  it("three agents, no queries: none queried, all ready, one added this week", () => {
    const c = agentCoverage({ ...THREE, manuscript: ms(), now: NOW, todayIso: TODAY });
    expect(c).toMatchObject({ total: 3, querying: 0, closed: 0, none: 3, queried: 0, ready: 3, addedThisWeek: 1, pct: 0 });
  });
  it("querying: the standings and ready equal agentQueryStates and nextStep for the same manuscript", () => {
    const m = ms();
    const c = agentCoverage({ ...QUERYING, manuscript: m, now: NOW, todayIso: TODAY });
    const st = [...agentQueryStates(QUERYING.agents, QUERYING.queries, m.id).values()].map((f) => f.state);
    expect(c.querying).toBe(st.filter((s) => s === "active").length);
    expect(c.closed).toBe(st.filter((s) => s === "closed").length);
    expect(c.none).toBe(st.filter((s) => s === "none").length);
    expect(c.ready).toBe(nextStep({ agents: QUERYING.agents, queries: QUERYING.queries, msId: m.id, book: bookGenres(m), todayIso: TODAY }).ready.length);
    /* a query on another manuscript does not count, a closed door is not ready, a known mismatch is not ready */
    expect(c).toMatchObject({ total: 6, querying: 2, closed: 1, none: 3, queried: 3, ready: 1, addedThisWeek: 1, pct: 50 });
    expect(c.querying + c.closed + c.none).toBe(c.total);
  });
});

/* "Ready for lift off?" and "Where do I start?" are retired with their components (first visit v1, Part E). */
