import { describe, expect, it } from "vitest";
import { ComponentType, QueryStatus, SubmissionStatus, UserPlan, type Agent, type Manuscript, type ManuscriptVersion, type Query } from "../types";
import { START_TARGETS, agentCoverage, firstUseTiles, isPreQuery, spotOf, startAnswers, tilesDone } from "./dashFirstUse";
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

describe("Ready for lift off? — the four tiles, every branch", () => {
  const base = { plan: UserPlan.FREE, usage: null, manuscript: ms(), versions: [] as ManuscriptVersion[], now: NOW };
  it("day one: none done, in the ref's order", () => {
    const t = firstUseTiles(base);
    expect(t.map((x) => x.key)).toEqual(["import", "mats", "comps", "version"]);
    expect(t.map((x) => x.status)).toEqual(["One free import", "0 of 3 on file", "0 comps", "None yet"]);
    expect(tilesDone(t)).toBe(0);
  });
  it("import: done when the entitlement is spent, the entitlement's own answer", () => {
    expect(firstUseTiles({ ...base, usage: { smartImportFreeUsed: true } as never })[0]).toMatchObject({ status: "Used", done: true });
    expect(firstUseTiles({ ...base, plan: UserPlan.PRO })[0]).toMatchObject({ status: "One this month", done: false });
    expect(firstUseTiles({ ...base, plan: UserPlan.PRO, usage: { smartImportLastUsedMonth: "2026-10" } as never })[0]).toMatchObject({ status: "Used", done: true });
  });
  it("materials: one of each of the three, on THIS manuscript", () => {
    const two = [version(ComponentType.QUERY_LETTER), version(ComponentType.SYNOPSIS), version(ComponentType.QUERY_LETTER), version(ComponentType.SAMPLE_PAGES, "m2"), version(ComponentType.FULL_MANUSCRIPT)];
    expect(firstUseTiles({ ...base, versions: two })[1]).toMatchObject({ status: "2 of 3 on file", done: false });
    expect(firstUseTiles({ ...base, versions: [...two, version(ComponentType.SAMPLE_PAGES)] })[1]).toMatchObject({ status: "3 of 3 on file", done: true });
  });
  it("comps: done at two", () => {
    expect(firstUseTiles({ ...base, manuscript: ms({ comps: [{ title: "A" }] as never }) })[2]).toMatchObject({ status: "1 comp", done: false });
    expect(firstUseTiles({ ...base, manuscript: ms({ comps: [{ title: "A" }, { title: "B" }] as never }) })[2]).toMatchObject({ status: "2 comps", done: true });
  });
  it("version: done at one, named by the count", () => {
    const bv = [{ id: "v1", name: "First", kind: "initial", createdDate: "2026-09-01" }];
    expect(firstUseTiles({ ...base, manuscript: ms({ bookVersions: bv as never }) })[3]).toMatchObject({ status: "v1 current", done: true });
    expect(tilesDone(firstUseTiles({ ...base, usage: { smartImportFreeUsed: true } as never, manuscript: ms({ bookVersions: bv as never }) }))).toBe(2);
  });
});

describe("v60.1 Where do I start? — answers → targets", () => {
  it("each answer rings exactly its targets and dims every other one", () => {
    const want: Record<string, string[]> = {
      sent: ["queries", "tile:import"],
      agents: ["agents"],
      materials: ["tile:mats", "tile:comps", "tile:version"],
    };
    for (const hasAgents of [false, true]) {
      for (const a of startAnswers(hasAgents)) {
        expect([...a.targets]).toEqual(want[a.key]);
        for (const t of START_TARGETS) expect(spotOf(a.key, t, hasAgents)).toBe(want[a.key].includes(t) ? "ring" : "dim");
      }
      for (const t of START_TARGETS) expect(spotOf(null, t, hasAgents)).toBeNull();
    }
  });
  it("the agents answer's line follows whether agents are on file; nothing carries an em dash", () => {
    expect(startAnswers(false)[1].line).toBe("Add the agents you want to query.");
    expect(startAnswers(true)[1].line).toBe("Add more, and see who you haven't queried.");
    for (const h of [false, true]) for (const a of startAnswers(h)) {
      for (const s of [a.title, a.line, ...a.labels.map((l) => l.text)]) expect(s).not.toContain("—");
    }
  });
  it("the tiles' copy is the pack's, with no em dash", () => {
    const tiles = firstUseTiles({ plan: undefined, usage: null, manuscript: null, versions: [] });
    expect(tiles.map((t) => t.copy)).toEqual([
      "Bring in the spreadsheet you've been tracking queries in.",
      "Your letter, synopsis and opening sample, kept as versions.",
      "Most agents want two comparable titles in a query.",
      "Save the draft you're sending, so you know which one each agent got.",
    ]);
  });
});
