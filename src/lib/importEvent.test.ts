/**
 * Import review v1, Part D — the import's one feed event (lib/importEvent).
 * The counts are reconciled against the Query Centre's own derivations (buildQcRows → deskSections),
 * never against literals: the feed and the desk cannot disagree about one import.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type Query } from "../types";
import { buildQcRows } from "./qcSummary";
import { deskSections } from "./qcDesk";
import { feedEntries } from "./dashFeed";
import { drawerSummary, drawerEvents } from "./dashFeedDrawer";
import { feedFamily } from "../components/dashboard/v58/feedFamily";
import { CONTACT_FIXTURE_AGENTS as A, CONTACT_FIXTURE_QUERIES as Q } from "../components/agents/contactFixture";
import {
  importCounts, importSentence, importGroupLine, importEventDoc, matcherImportEvents,
  IMPORT_ROUTE_LABEL, IMPORT_END_LINE, IMPORT_SEE,
} from "./importEvent";

const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const text = (segs: { t: string }[]) => segs.map((s) => s.t).join("");

describe("D · the sentence, every branch", () => {
  const cases: [number, number, string][] = [
    [8, 8, "You imported your list: 8 agents and 8 queries for Import Test Book."],
    [1, 1, "You imported your list: 1 agent and 1 query for Import Test Book."],
    [1, 2, "You imported your list: 1 agent and 2 queries for Import Test Book."],
    [2, 1, "You imported your list: 2 agents and 1 query for Import Test Book."],
    [0, 6, "You imported 6 queries for Import Test Book."],
    [0, 1, "You imported 1 query for Import Test Book."],
    [3, 0, "You imported 3 agents for Import Test Book."],
    [1, 0, "You imported 1 agent for Import Test Book."],
  ];
  for (const [a, q, want] of cases) it(`${a} agents, ${q} queries`, () => expect(text(importSentence({ agents: a, queries: q }, "Import Test Book"))).toBe(want));
  it("with no manuscript (an agents-only matcher run) it names none", () => {
    expect(text(importSentence({ agents: 3, queries: 0 }, ""))).toBe("You imported 3 agents.");
  });
  it("the counts are bold and the manuscript is set apart", () => {
    const s = importSentence({ agents: 8, queries: 8 }, "Import Test Book");
    expect(s.filter((x) => (x as { who?: boolean }).who).map((x) => x.t)).toEqual(["8 agents", "8 queries"]);
    expect(s.find((x) => (x as { em?: boolean }).em)?.t).toBe("Import Test Book");
  });
});

describe("D · the counts are the Query Centre desk's own", () => {
  /* The fixture's statuses plus the two that are in no group, so every branch is entered. */
  const extra: Query[] = [
    { ...Q[0], id: "x-wd", status: QueryStatus.WITHDRAWN },
    { ...Q[0], id: "x-sg", status: QueryStatus.SIGNED },
    { ...Q[0], id: "x-of", status: QueryStatus.OFFER },
  ];
  const qs = [...Q, ...extra];
  const c = importCounts(4, qs.map((q) => q.status));
  const desk = Object.fromEntries(deskSections(buildQcRows(qs, A, [], NOW), NOW).map((s) => [s.key, s.total]));
  it("each group equals the desk's total for it", () => {
    expect(c.withAgents).toBe(desk.agent);
    expect(c.withYou).toBe(desk.you);
    expect(c.closed).toBe(desk.closed);
  });
  it("every group is entered by the fixture (no monoculture)", () => {
    expect(c.withAgents).toBeGreaterThan(0);
    expect(c.withYou).toBeGreaterThan(0);
    expect(c.closed).toBeGreaterThan(0);
  });
  it("Withdrawn and Signed are in no group, and the query total still counts them", () => {
    expect(c.queries).toBe(qs.length);
    expect(c.withAgents + c.withYou + c.closed).toBe(qs.length - 2);
    expect(c.agents).toBe(4);
  });
  it("the group line leaves a group at zero out, in the design's order", () => {
    expect(importGroupLine({ withAgents: 3, withYou: 3, closed: 2 })).toEqual(["3 with agents", "3 with you", "2 closed"]);
    expect(importGroupLine({ withAgents: 0, withYou: 3, closed: 0 })).toEqual(["3 with you"]);
    expect(importGroupLine({ withAgents: 0, withYou: 0, closed: 0 })).toEqual([]);
  });
});

describe("D · the event, and the feed's row", () => {
  const counts = importCounts(8, [QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED, QueryStatus.REJECTED]);
  const ev = importEventDoc({ id: "imp-ev-1", userId: "u1", manuscriptId: "ms1", manuscriptTitle: "Import Test Book",
    dateIso: new Date(NOW - 3600_000).toISOString(), route: "smart", counts });
  it("is tied to the manuscript, carries no query and no status", () => {
    expect(ev.eventKey).toBe("imported");
    expect(ev.manuscriptId).toBe("ms1");
    expect(ev.queryId).toBe("");
    expect("resultingStatus" in ev).toBe(false);
  });
  const ms = [{ id: "ms1", title: "Import Test Book" }] as never[];
  const entries = feedEntries({ activities: [ev], queries: [], agents: [], manuscripts: ms, now: new Date(NOW), seenAt: null });
  it("becomes exactly one entry, in its own family, with the route and the groups", () => {
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(feedFamily(e)).toBe("import");
    expect(e.pill).toBe("Imported");
    expect(text(e.say)).toBe("You imported your list: 8 agents and 4 queries for Import Test Book.");
    expect(e.imported?.groups).toEqual(importGroupLine(counts));
    expect(e.imported?.routeLabel).toBe(IMPORT_ROUTE_LABEL.smart);
  });
  it("counts as one thing you did, and is never 'From agents'", () => {
    expect(drawerSummary(entries)).toEqual({ replies: 0, did: 1, need: 0 });
    expect(drawerEvents(entries, [], "in")).toHaveLength(0);
    expect(drawerEvents(entries, [], "out")).toHaveLength(1);
  });
  it("the words are the design's", () => {
    expect(IMPORT_SEE).toBe("See them in your Query Centre →");
    expect(IMPORT_END_LINE).toBe("Your imported queries keep their own dates, so they show on their timelines in the Query Centre.");
    expect(Object.values(IMPORT_ROUTE_LABEL)).toEqual(["Smart import", "Template import", "Column matcher"]);
  });
});

describe("D · the column matcher's events", () => {
  it("an agents run: one event, tied to no manuscript", () => {
    expect(matcherImportEvents(3, [])).toEqual([{ manuscriptId: "", manuscriptTitle: "", counts: importCounts(3, []) }]);
    expect(matcherImportEvents(0, [])).toEqual([]);
  });
  it("a queries run: one event per manuscript, agents counted once", () => {
    const ev = matcherImportEvents(2, [
      { manuscriptId: "a", manuscriptTitle: "Book A", status: QueryStatus.QUERIED },
      { manuscriptId: "b", manuscriptTitle: "Book B", status: QueryStatus.REJECTED },
      { manuscriptId: "a", manuscriptTitle: "Book A", status: QueryStatus.FULL_REQUESTED },
    ]);
    expect(ev.map((e) => [e.manuscriptId, e.counts.queries, e.counts.agents])).toEqual([["a", 2, 2], ["b", 1, 0]]);
  });
});
