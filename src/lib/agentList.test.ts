/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Agent list derivations: the relationship vocabulary (Offer is ACTIVE, not
 * terminal), the awaiting-your-pages cut, the retired-UNKNOWN door rule (Unknown reads OPEN),
 * chip counts over the whole list, search reach, and the absence-aware meta line.
 */
import { describe, it, expect } from "vitest";
import {
  TERMINAL_STATUSES,
  AWAITING_PAGES_STATUSES,
  agentRelationship,
  relationshipLabel,
  awaitingYourPages,
  isDoorOpen,
  agentStateClass,
  matchesAgentFilter,
  matchesAgentSearch,
  visibleAgents,
  agentListCounts,
  agentCountLine,
  methodShort,
  metaTokens,
  AGENT_LIST_CHIPS,
  CLOSED_DETAIL,
  closedStampDate,
  cardHistory,
  wishlistChips,
  materialsSummary,
  notePreview,
  DEFAULT_AGENT_SORT,
  AGENT_SORT_OPTIONS,
  sortAgentList,
  matchesAgentLocation,
  agentStanding,
  agentTurn,
  agentAxisCounts,
  STANDING_LABEL,
  TURN_LABEL,
  emptyFilterSet,
  matchesFilterSet,
  filterCount,
  isFilterSetEmpty,
  starTierCount,
  locationCounts,
} from "./agentList";
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";

const mkAgent = (over: Partial<Agent>): Agent => ({
  id: "a1",
  userId: "u1",
  name: "Rosalind Achebe",
  agency: "Hartley & Co",
  email: "",
  website: "",
  genres: [],
  mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00.000Z",
  lastCheckedDate: "2026-01-01T00:00:00.000Z",
  notes: "",
  ...over,
});

const mkQuery = (over: Partial<Query>): Query =>
  ({ id: "q1", userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED, dateSent: "2026-04-03T00:00:00.000Z", ...over }) as Query;

describe("agentList · relationship vocabulary", () => {
  it("terminal set is exactly Rejected / Withdrawn / No Response — Offer stays ACTIVE", () => {
    expect([...TERMINAL_STATUSES]).toEqual([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.OFFER })])).toBe("active");
  });

  it("never / prev / active", () => {
    expect(agentRelationship("a1", [])).toBe("never");
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.REJECTED })])).toBe("prev");
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.REJECTED }), mkQuery({ id: "q2", status: QueryStatus.QUERIED })])).toBe("active");
  });

  it("labels are worded once and shared by pill, chips and empty line", () => {
    expect(relationshipLabel("active")).toBe("Active queries");
    expect(relationshipLabel("prev")).toBe("No active queries");
    expect(relationshipLabel("never")).toBe("Never queried");
    // the chip row reuses the same three words
    const chipLabels = AGENT_LIST_CHIPS.map((c) => c.label);
    expect(chipLabels).toContain("Active queries");
    expect(chipLabels).toContain("No active queries");
    expect(chipLabels).toContain("Never queried");
  });
});

describe("agentList · awaiting your pages", () => {
  it("is exactly the three request statuses", () => {
    expect([...AWAITING_PAGES_STATUSES]).toEqual([
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.REVISE_RESUBMIT,
    ]);
  });
  it("cuts across relationship — a queried-only agent is not awaiting", () => {
    expect(awaitingYourPages("a1", [mkQuery({ status: QueryStatus.QUERIED })])).toBe(false);
    expect(awaitingYourPages("a1", [mkQuery({ status: QueryStatus.FULL_REQUESTED })])).toBe(true);
  });
});

describe("agentList · the door (UNKNOWN is retired — reads OPEN)", () => {
  it("only an explicit Closed shuts the door", () => {
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.OPEN }))).toBe(true);
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.UNKNOWN }))).toBe(true);
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.CLOSED }))).toBe(false);
  });

  it("an Unknown agent is NOT in the closed chip, gets no grey state, and stays queryable", () => {
    const unknown = mkAgent({ id: "u", submissionStatus: SubmissionStatus.UNKNOWN });
    expect(matchesAgentFilter(unknown, [], "closed")).toBe(false);
    expect(agentStateClass(unknown, [])).toBe("s-pink");
    expect(agentListCounts([unknown], []).closed).toBe(0);
  });

  it("closed overrides sage/pink", () => {
    const closed = mkAgent({ submissionStatus: SubmissionStatus.CLOSED });
    expect(agentStateClass(closed, [mkQuery({})])).toBe("s-grey");
    expect(agentStateClass(mkAgent({}), [mkQuery({})])).toBe("s-sage");
  });
});

describe("agentList · filters, search and counts", () => {
  const active = mkAgent({ id: "act", name: "Active Ann" });
  const waiting = mkAgent({ id: "wait", name: "Waiting Wes" });
  const prev = mkAgent({ id: "prev", name: "Past Pat" });
  const never = mkAgent({ id: "nev", name: "New Nell", agency: "Foxglove" });
  const closed = mkAgent({ id: "shut", name: "Shut Sam", submissionStatus: SubmissionStatus.CLOSED });
  const agents = [active, waiting, prev, never, closed];
  const queries = [
    mkQuery({ id: "q1", agentId: "act", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q2", agentId: "wait", status: QueryStatus.PARTIAL_REQUESTED }),
    mkQuery({ id: "q3", agentId: "prev", status: QueryStatus.REJECTED }),
    mkQuery({ id: "q4", agentId: "shut", status: QueryStatus.WITHDRAWN }),
  ];

  it("counts run over the whole list and the relationship buckets partition it", () => {
    const c = agentListCounts(agents, queries);
    expect(c.all).toBe(5);
    expect(c.active + c.prev + c.notq).toBe(5); // partition
    expect(c).toMatchObject({ active: 2, waiting: 1, prev: 2, notq: 1, closed: 1 });
  });

  it("each chip selects its own bucket", () => {
    const ids = (f: Parameters<typeof matchesAgentFilter>[2]) => agents.filter((a) => matchesAgentFilter(a, queries, f)).map((a) => a.id);
    expect(ids("all")).toEqual(["act", "wait", "prev", "nev", "shut"]);
    expect(ids("active")).toEqual(["act", "wait"]);
    expect(ids("waiting")).toEqual(["wait"]);
    expect(ids("prev")).toEqual(["prev", "shut"]);
    expect(ids("notq")).toEqual(["nev"]);
    expect(ids("closed")).toEqual(["shut"]);
  });

  it("search matches name OR agency, case-insensitively, and composes with the filter", () => {
    expect(matchesAgentSearch(never, "foxglove")).toBe(true);
    expect(matchesAgentSearch(never, "NELL")).toBe(true);
    expect(matchesAgentSearch(never, "hartley")).toBe(false);
    expect(visibleAgents(agents, queries, "active", "wes").map((a) => a.id)).toEqual(["wait"]);
  });

  it("count line is singular-safe", () => {
    expect(agentCountLine(5, 5)).toBe("5 of 5 agents");
    expect(agentCountLine(0, 1)).toBe("0 of 1 agent");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   THE TWO AXES — the reconciliation locks are the point of the rebuild's phase 1.
   The bug they exist to prevent: "Awaiting your pages" counted as a PEER of "Active
   queries", so the filter counts summed past the agent total (12 + 3 + 4 = 19 of 16)
   and ticking both returned the union instead of the intersection.
   ════════════════════════════════════════════════════════════════════════════ */
describe("agentList · axis A (where things stand) partitions the list", () => {
  const agents = [
    mkAgent({ id: "act" }),
    mkAgent({ id: "wait" }),
    mkAgent({ id: "prev" }),
    mkAgent({ id: "nev" }),
    mkAgent({ id: "shut", submissionStatus: SubmissionStatus.CLOSED }),
    mkAgent({ id: "shutlive", submissionStatus: SubmissionStatus.CLOSED }),
  ];
  const queries = [
    mkQuery({ id: "q1", agentId: "act", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q2", agentId: "wait", status: QueryStatus.FULL_REQUESTED }),
    mkQuery({ id: "q3", agentId: "prev", status: QueryStatus.REJECTED }),
    mkQuery({ id: "q4", agentId: "shutlive", status: QueryStatus.QUERIED }),
  ];

  it("AXIS A COUNTS SUM TO THE AGENT TOTAL — the invariant the old chip row broke", () => {
    const c = agentAxisCounts(agents, queries);
    const sum = c.standing.active + c.standing.noactive + c.standing.never + c.standing.closed;
    expect(sum).toBe(c.total);
    expect(c.total).toBe(agents.length);
  });

  it("every agent lands in exactly one standing", () => {
    expect(agentStanding(agents[0], queries)).toBe("active");
    expect(agentStanding(agents[1], queries)).toBe("active"); // awaiting pages is INSIDE active
    expect(agentStanding(agents[2], queries)).toBe("noactive");
    expect(agentStanding(agents[3], queries)).toBe("never");
    expect(agentStanding(agents[4], queries)).toBe("closed");
  });

  it("the door outranks history — a closed agent with a live query still reads Closed", () => {
    expect(agentStanding(agents[5], queries)).toBe("closed");
    expect(agentAxisCounts(agents, queries).standing.closed).toBe(2);
  });

  it("Unknown is not Closed, so it never leaves the open standings", () => {
    const unknown = mkAgent({ id: "u", submissionStatus: SubmissionStatus.UNKNOWN });
    expect(agentStanding(unknown, [])).toBe("never");
  });
});

describe("agentList · axis B (whose turn) lives INSIDE active queries", () => {
  const agents = [
    mkAgent({ id: "you1" }),
    mkAgent({ id: "you2" }),
    mkAgent({ id: "them1" }),
    mkAgent({ id: "them2" }),
    mkAgent({ id: "prev" }),
    mkAgent({ id: "nev" }),
    mkAgent({ id: "shut", submissionStatus: SubmissionStatus.CLOSED }),
  ];
  const queries = [
    mkQuery({ id: "q1", agentId: "you1", status: QueryStatus.PARTIAL_REQUESTED }),
    mkQuery({ id: "q2", agentId: "you2", status: QueryStatus.REVISE_RESUBMIT }),
    mkQuery({ id: "q3", agentId: "them1", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q4", agentId: "them2", status: QueryStatus.FULL_SENT }),
    mkQuery({ id: "q5", agentId: "prev", status: QueryStatus.REJECTED }),
    mkQuery({ id: "q6", agentId: "shut", status: QueryStatus.FULL_REQUESTED }),
  ];

  it("AXIS B COUNTS SUM TO THE ACTIVE COUNT — never to the agent total", () => {
    const c = agentAxisCounts(agents, queries);
    expect(c.turn.you + c.turn.them).toBe(c.standing.active);
    expect(c.turn.you + c.turn.them).toBeLessThan(c.total);
  });

  it("the axis simply does not apply outside active queries", () => {
    expect(agentTurn(agents[4], queries)).toBeNull(); // only terminal queries
    expect(agentTurn(agents[5], queries)).toBeNull(); // never queried
    expect(agentTurn(agents[6], queries)).toBeNull(); // closed door outranks the live query
  });

  it("'you' is the CTA engine's writer's-turn, not a second status list", () => {
    // the three writer's-turn statuses, straight from getPrimaryAction
    expect(agentTurn(agents[0], queries)).toBe("you");
    expect(agentTurn(agents[1], queries)).toBe("you");
    expect(agentTurn(agents[2], queries)).toBe("them");
    expect(agentTurn(agents[3], queries)).toBe("them");
    // Offer is active but nobody owes pages — no primary writer action ⇒ them
    expect(agentTurn(mkAgent({ id: "off" }), [mkQuery({ id: "qo", agentId: "off", status: QueryStatus.OFFER })])).toBe("them");
  });

  it("one writer's-turn query among several claims the agent", () => {
    const multi = [
      mkQuery({ id: "m1", agentId: "m", status: QueryStatus.QUERIED }),
      mkQuery({ id: "m2", agentId: "m", status: QueryStatus.FULL_REQUESTED }),
    ];
    expect(agentTurn(mkAgent({ id: "m" }), multi)).toBe("you");
  });
});

describe("agentList · the filter set intersects across axes", () => {
  const you = mkAgent({ id: "you", starRating: 5, country: "GB" });
  const them = mkAgent({ id: "them", starRating: 3, country: "US" });
  const prev = mkAgent({ id: "prev", starRating: 4, country: "GB" });
  const agents = [you, them, prev];
  const queries = [
    mkQuery({ id: "q1", agentId: "you", status: QueryStatus.PARTIAL_REQUESTED }),
    mkQuery({ id: "q2", agentId: "them", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q3", agentId: "prev", status: QueryStatus.REJECTED }),
  ];
  const ids = (f: Parameters<typeof matchesFilterSet>[2]) =>
    agents.filter((a) => matchesFilterSet(a, queries, f)).map((a) => a.id);

  it("an empty set constrains nothing", () => {
    const f = emptyFilterSet();
    expect(isFilterSetEmpty(f)).toBe(true);
    expect(filterCount(f)).toBe(0);
    expect(ids(f)).toEqual(["you", "them", "prev"]);
  });

  it("standing + turn INTERSECT — the union bug, locked shut", () => {
    // both ticked: active AND awaiting-your-pages ⇒ only the writer's-turn agent
    expect(ids({ ...emptyFilterSet(), standing: ["active"], turn: ["you"] })).toEqual(["you"]);
    // the old union behaviour would have returned "you" and "them" here
    expect(ids({ ...emptyFilterSet(), standing: ["active"] })).toEqual(["you", "them"]);
  });

  it("ticks within one facet are alternatives", () => {
    expect(ids({ ...emptyFilterSet(), standing: ["noactive", "active"] })).toEqual(["you", "them", "prev"]);
    expect(ids({ ...emptyFilterSet(), turn: ["you", "them"] })).toEqual(["you", "them"]);
  });

  it("stars take the LOWEST tick, and location matches the ISO code", () => {
    expect(ids({ ...emptyFilterSet(), stars: [4] })).toEqual(["you", "prev"]);
    expect(ids({ ...emptyFilterSet(), stars: [4, 3] })).toEqual(["you", "them", "prev"]);
    expect(ids({ ...emptyFilterSet(), loc: ["GB"] })).toEqual(["you", "prev"]);
    expect(ids({ ...emptyFilterSet(), loc: ["GB", "US"] })).toEqual(["you", "them", "prev"]);
  });

  it("the popover's own row counts read the whole list", () => {
    expect(starTierCount(agents, 4)).toBe(2);
    expect(starTierCount(agents, 3)).toBe(3);
    expect(locationCounts(agents)).toEqual([{ code: "GB", n: 2 }, { code: "US", n: 1 }]);
  });
});

describe("agentList · axis vocabulary is worded once", () => {
  it("standing labels reuse the existing page words — no third term for never-queried", () => {
    expect(STANDING_LABEL.active).toBe("Active queries");
    expect(STANDING_LABEL.noactive).toBe("No active queries");
    expect(STANDING_LABEL.closed).toBe("Closed for submissions");
    // the codebase says "Never queried"; the mockup's word is the same, and relationshipLabel agrees
    expect(STANDING_LABEL.never).toBe("Never queried");
    expect(STANDING_LABEL.never).toBe(relationshipLabel("never"));
  });
  it("turn labels", () => {
    expect(TURN_LABEL.you).toBe("Awaiting your pages");
    expect(TURN_LABEL.them).toBe("Waiting on the agent");
  });
});

describe("agentList · meta line (absence is a first-class state)", () => {
  it("no stated response time reads 'response unknown' — never an invented number", () => {
    expect(metaTokens(mkAgent({}))[0]).toBe("response unknown");
    expect(metaTokens(mkAgent({ responseTimeWeeks: 8 }))[0]).toBe("~8 wks");
  });

  it("the no-reply token appears only when explicitly set true", () => {
    expect(metaTokens(mkAgent({}))).not.toContain("No reply = no");
    expect(metaTokens(mkAgent({ noResponseMeansNo: false }))).not.toContain("No reply = no");
    expect(metaTokens(mkAgent({ noResponseMeansNo: true }))).toContain("No reply = no");
  });

  it("method shortens to Form / the Other text / Email", () => {
    expect(methodShort(mkAgent({ submissionMethod: SubmissionMethod.ONLINE_FORM }))).toBe("Form");
    expect(methodShort(mkAgent({ submissionMethod: SubmissionMethod.EMAIL }))).toBe("Email");
    expect(methodShort({ submissionMethod: "Other" as SubmissionMethod, agentNotes: "QueryManager" })).toBe("QueryManager");
    expect(methodShort({ submissionMethod: "Other" as SubmissionMethod, agentNotes: "" })).toBe("Other");
  });
});

describe("agentList · closed stamp date (derived, no new stored field)", () => {
  const closedAgent = mkAgent({ name: "Rosalind Achebe", submissionStatus: SubmissionStatus.CLOSED, lastCheckedDate: "2026-01-09T00:00:00.000Z" });
  const mkAct = (over: Partial<Activity>): Activity => ({
    id: "x", userId: "u1", queryId: "", manuscriptId: "",
    activityType: ActivityType.AGENT_UPDATED,
    description: "You updated details for Rosalind Achebe at Hartley & Co",
    date: "2026-05-01T00:00:00.000Z", details: CLOSED_DETAIL, ...over,
  });

  it("takes the NEWEST closing activity for this agent", () => {
    expect(closedStampDate(closedAgent, [
      mkAct({ id: "a", date: "2026-05-01T00:00:00.000Z" }),
      mkAct({ id: "b", date: "2026-06-20T00:00:00.000Z" }),
    ])).toBe("20 Jun 2026");
  });

  it("ignores other agents, other activity types, and non-closing details", () => {
    expect(closedStampDate(closedAgent, [
      mkAct({ id: "other", description: "You updated details for Someone Else at Elsewhere", date: "2026-07-01T00:00:00.000Z" }),
      mkAct({ id: "open", details: "Submission status updated to Open", date: "2026-07-02T00:00:00.000Z" }),
      mkAct({ id: "type", activityType: ActivityType.AGENT_ADDED, date: "2026-07-03T00:00:00.000Z" }),
    ])).toBe("9 Jan 2026"); // → the lastCheckedDate fallback
  });

  it("falls back to lastCheckedDate when nothing matches", () => {
    expect(closedStampDate(closedAgent, [])).toBe("9 Jan 2026");
  });
});

describe("agentList · card history + wishlist", () => {
  it("history is one entry per query, oldest first, with the manuscript title resolved", () => {
    const ms = [{ id: "m1", title: "Salt and Starlight" } as Manuscript];
    const qs = [
      mkQuery({ id: "q2", dateSent: "2026-06-01T00:00:00.000Z", status: QueryStatus.FULL_REQUESTED }),
      mkQuery({ id: "q1", dateSent: "2026-01-01T00:00:00.000Z", status: QueryStatus.QUERIED }),
    ];
    expect(cardHistory(mkAgent({}), qs, ms)).toEqual([
      { queryId: "q1", status: QueryStatus.QUERIED, title: "Salt and Starlight" },
      { queryId: "q2", status: QueryStatus.FULL_REQUESTED, title: "Salt and Starlight" },
    ]);
  });

  it("wishlist shows three chips plus an overflow count", () => {
    expect(wishlistChips(mkAgent({ genres: ["Crime", "Mystery"] }))).toEqual({ shown: ["Crime", "Mystery"], more: 0 });
    expect(wishlistChips(mkAgent({ genres: ["A", "B", "C", "D", "E"] }))).toEqual({ shown: ["A", "B", "C"], more: 2 });
  });
});

describe("agentList · materials summary (the canonical string[] — one source with the editor)", () => {
  it("summarises the stored strings through the editor's own row model", () => {
    expect(materialsSummary(mkAgent({ materialsWanted: ["Query letter", "Synopsis"] }))).toBe("Query letter  ·  Synopsis");
  });

  it("names the sample unit", () => {
    expect(materialsSummary(mkAgent({ materialsWanted: ["First 10 pages"] }))).toBe("Opening sample (10 pages)");
  });

  it("a quantified Synopsis reads as 'Synopsis · 2 pages'", () => {
    expect(materialsSummary(mkAgent({ materialsWanted: ["Synopsis (2 pages)"] }))).toBe("Synopsis · 2 pages");
  });

  it("the Other text reads as its own words — never an 'Other —' prefix", () => {
    const out = materialsSummary(mkAgent({ materialsWanted: ["Query letter", "A one-page pitch in the email body"] }));
    expect(out).toMatch(/A one-page pitch in the email body/);
    expect(out).not.toMatch(/Other —/);
  });

  it("null when nothing is recorded", () => {
    expect(materialsSummary(mkAgent({ materialsWanted: [] }))).toBeNull();
  });
});

describe("agentList · note preview", () => {
  const notes = [
    { id: "n1", text: "oldest", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "n2", text: "newest", createdAt: "2026-03-01T00:00:00.000Z" },
  ];
  it("prefers the pinned note", () => {
    expect(notePreview(mkAgent({ pinnedNoteId: "n1" }), notes)).toEqual({ text: "oldest", pinned: true });
  });
  it("falls back to the latest when the pin is absent or dangling", () => {
    expect(notePreview(mkAgent({}), notes)).toEqual({ text: "newest", pinned: false });
    expect(notePreview(mkAgent({ pinnedNoteId: "gone" }), notes)).toEqual({ text: "newest", pinned: false });
  });
  it("without a loaded subcollection it reads the legacy flat note", () => {
    expect(notePreview(mkAgent({ notes: "Met at Harrogate." }))).toEqual({ text: "Met at Harrogate.", pinned: false });
    expect(notePreview(mkAgent({ notes: "" }))).toBeNull();
  });
});

describe("agentList · sort + location (restored in Phase 6)", () => {
  it("THE DEFAULT is star rating, stated explicitly so the grid can't drift", () => {
    expect(DEFAULT_AGENT_SORT).toBe("rating");
    expect(AGENT_SORT_OPTIONS.map((o) => o.key)).toEqual(["rating", "resp", "added", "az"]);
  });

  it("rating: highest first, alphabetical within a tier; UNRATED sorts last", () => {
    const five = mkAgent({ id: "5", name: "Zed", starRating: 5 });
    const fiveA = mkAgent({ id: "5a", name: "Ada", starRating: 5 });
    const unrated = mkAgent({ id: "u", name: "Aaron" });
    expect(sortAgentList([unrated, five, fiveA], "rating").map((a) => a.id)).toEqual(["5a", "5", "u"]);
  });

  it("response time: fastest first, UNSTATED last (absence is not a zero)", () => {
    const fast = mkAgent({ id: "f", responseTimeWeeks: 2 });
    const slow = mkAgent({ id: "s", responseTimeWeeks: 12 });
    const unknown = mkAgent({ id: "u" });
    expect(sortAgentList([unknown, slow, fast], "resp").map((a) => a.id)).toEqual(["f", "s", "u"]);
  });

  it("date added: newest first; A–Z is alphabetical", () => {
    const old = mkAgent({ id: "o", name: "Zed", dateAdded: "2025-01-01T00:00:00.000Z" });
    const recent = mkAgent({ id: "r", name: "Ada", dateAdded: "2026-06-01T00:00:00.000Z" });
    expect(sortAgentList([old, recent], "added").map((a) => a.id)).toEqual(["r", "o"]);
    expect(sortAgentList([old, recent], "az").map((a) => a.id)).toEqual(["r", "o"]);
  });

  it("location filters on the REAL country field against the home market", () => {
    const gb = mkAgent({ id: "gb", country: "GB" });
    const us = mkAgent({ id: "us", country: "US" });
    const none = mkAgent({ id: "nn" });
    const all = [gb, us, none];
    expect(all.filter((a) => matchesAgentLocation(a, "domestic", "GB")).map((a) => a.id)).toEqual(["gb"]);
    expect(all.filter((a) => matchesAgentLocation(a, "international", "GB")).map((a) => a.id)).toEqual(["us"]);
    expect(all.filter((a) => matchesAgentLocation(a, "all", "GB"))).toHaveLength(3);
  });

  it("visibleAgents composes filter + search + location + sort", () => {
    const a = mkAgent({ id: "a", name: "Bee", country: "GB", starRating: 3 });
    const b = mkAgent({ id: "b", name: "Ant", country: "GB", starRating: 5 });
    const c = mkAgent({ id: "c", name: "Cat", country: "US", starRating: 5 });
    expect(visibleAgents([a, b, c], [], "all", "", { location: "domestic", homeCountry: "GB" }).map((x) => x.id))
      .toEqual(["b", "a"]);
  });
});
