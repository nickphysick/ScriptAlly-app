/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Agent list derivations: the relationship vocabulary (Offer is ACTIVE, not
 * terminal), the awaiting-your-pages cut, the retired-UNKNOWN door rule (Unknown reads OPEN),
 * chip counts over the whole list, search reach, and the absence-aware meta line.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TERMINAL_STATUSES,
  AWAITING_PAGES_STATUSES,
  agentRelationship,
  relationshipLabel,
  awaitingYourPages,
  isDoorOpen,
  agentStateClass,
  agentCardDims,
  matchesAgentSearch,
  methodShort,
  metaTokens,
  CLOSED_DETAIL,
  closedStampDate,
  cardHistory,
  wishlistChips,
  materialsSummary,
  notePreview,
  DEFAULT_AGENT_SORT,
  AGENT_SORT_OPTIONS,
  sortAgentList,
  lastQueriedAt,
  groupAgents,
  AGENT_GROUP_OPTIONS,
  GROUP_STUB,
  agentStanding,
  agentTurn,
  agentAxisCounts,
  STANDING_LABEL,
  TURN_LABEL,
  agentDoor,
  DOOR_LABEL,
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

  it("labels are worded once — the axis labels and the pill read the SAME strings", () => {
    expect(relationshipLabel("active")).toBe("Active queries");
    expect(relationshipLabel("prev")).toBe("No active queries");
    expect(relationshipLabel("never")).toBe("Never queried");
    // the standing axis (which the popover, tags and group headings all read) agrees with the pill
    expect(STANDING_LABEL.active).toBe(relationshipLabel("active"));
    expect(STANDING_LABEL.noactive).toBe(relationshipLabel("prev"));
    expect(STANDING_LABEL.never).toBe(relationshipLabel("never"));
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

  it("an Unknown agent is NOT closed, gets no grey state, and stays queryable", () => {
    const unknown = mkAgent({ id: "u", submissionStatus: SubmissionStatus.UNKNOWN });
    expect(matchesFilterSet(unknown, [], { ...emptyFilterSet(), door: ["closed"] })).toBe(false);
    expect(agentStateClass(unknown, [])).toBe("s-pink");
    expect(agentAxisCounts([unknown], []).door.closed).toBe(0);
  });

  /* THE COLOUR/DOOR SPLIT (agent-card-visual pack). Colour carries YOUR HISTORY only; the door
     is ink. The old "closed overrides sage/pink" precedence is retired — it was the same class
     of error the axis split fixed, one level down in the presentation. */
  it("COLOUR IS HISTORY: the door never changes it, and s-grey is extinct", () => {
    const closed = mkAgent({ submissionStatus: SubmissionStatus.CLOSED });
    expect(agentStateClass(closed, [mkQuery({})])).toBe("s-sage"); // a live query, closed door
    expect(agentStateClass(closed, [])).toBe("s-pink"); // nothing live, closed door
    expect(agentStateClass(mkAgent({}), [mkQuery({})])).toBe("s-sage");
    expect(agentStateClass(mkAgent({}), [])).toBe("s-pink");
  });

  describe("THE DIM RULE — all four states", () => {
    const closed = mkAgent({ id: "c", submissionStatus: SubmissionStatus.CLOSED });
    const open = mkAgent({ id: "o" });
    it("closed + NOT active dims", () => {
      expect(agentCardDims(closed, [])).toBe(true);
    });
    it("closed + ACTIVE does NOT dim — an outstanding query does not matter less", () => {
      expect(agentCardDims(closed, [mkQuery({ agentId: "c" })])).toBe(false);
    });
    it("open never dims, active or not", () => {
      expect(agentCardDims(open, [])).toBe(false);
      expect(agentCardDims(open, [mkQuery({ agentId: "o" })])).toBe(false);
    });
    it("hover restores full strength (CSS — the class is the contract)", () => {
      const css = readFileSync(join(__dirname, "..", "components", "agents", "agentList.css"), "utf8");
      expect(css).toMatch(/\.s-dim \.agl-facef \.agl-acard \{ opacity: \.6; transition: opacity \.15s ease; \}/);
      expect(css).toMatch(/\.s-dim \.agl-facef \.agl-acard:hover \{ opacity: 1; \}/);
      expect(css).not.toContain(".s-grey {"); // the door's colour is gone
    });
    it("the DOOR is ink: a hatch overlay beneath the band's contents — and the pill is RETIRED", () => {
      const css = readFileSync(join(__dirname, "..", "components", "agents", "agentList.css"), "utf8");
      expect(css).toContain("repeating-linear-gradient(-45deg, rgba(46, 39, 35, 0.14) 0 3px, transparent 3px 9px)");
      expect(css).toMatch(/\.s-closed \.agl-band::after \{[^}]*pointer-events: none/s);
      expect(css).toMatch(/\.s-closed \.agl-band > \* \{ position: relative; z-index: 1; \}/);
      const card = readFileSync(join(__dirname, "..", "components", "agents", "AgentCard.tsx"), "utf8");
      expect(card).toContain("{!open && (");
      expect(card).toContain("s-closed");
      // agent-list-fixes P2: hatch + stamp say it; a third device is two too many
      expect(card).not.toContain("agl-closedpill");
      expect(css).not.toContain(".agl-closedpill");
    });

    it("THE HUSHED BODY: closed + nothing live hides the body; an ACTIVE query renders in full", () => {
      const card = readFileSync(join(__dirname, "..", "components", "agents", "AgentCard.tsx"), "utf8");
      // the hush and the dim share ONE derivation, so they can never disagree
      expect(card).toContain("const hushed = agentCardDims(agent, queries);");
      expect(card).toContain('{!hushed && <div className="agl-body">');
      // what survives the hush: identity + the meta line, which sit ABOVE the body
      expect(card.indexOf('className="agl-meta"')).toBeLessThan(card.indexOf('{!hushed && <div className="agl-body">'));
      // …and what does not: history, wishlist, materials all live inside the body
      const body = card.slice(card.indexOf('{!hushed && <div className="agl-body">'), card.indexOf('className="agl-stamp"'));
      for (const gone of ["Your history", "Wishlist", "Materials wanted"]) expect(body).toContain(gone);
      const css = readFileSync(join(__dirname, "..", "components", "agents", "agentList.css"), "utf8");
      expect(css).toMatch(/\.s-hush \.agl-facef \.agl-acard \{ min-height: 210px; \}/); // never a stub
    });
  });
});

describe("agentList · search", () => {
  const never = mkAgent({ id: "nev", name: "New Nell", agency: "Foxglove" });

  it("matches name OR agency, case-insensitively", () => {
    expect(matchesAgentSearch(never, "foxglove")).toBe(true);
    expect(matchesAgentSearch(never, "NELL")).toBe(true);
    expect(matchesAgentSearch(never, "hartley")).toBe(false);
    expect(matchesAgentSearch(never, "  ")).toBe(true); // empty search constrains nothing
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
    const sum = c.standing.active + c.standing.noactive + c.standing.never;
    expect(sum, "standing stopped partitioning the list — a value was added that isn't a fact about your history, or an agent fell through every branch").toBe(c.total);
    expect(c.total).toBe(agents.length);
  });

  it("every agent lands in exactly one standing", () => {
    expect(agentStanding(agents[0], queries)).toBe("active");
    expect(agentStanding(agents[1], queries)).toBe("active"); // awaiting pages is INSIDE active
    expect(agentStanding(agents[2], queries)).toBe("noactive");
    expect(agentStanding(agents[3], queries)).toBe("never");
  });

  it("STANDING IS HISTORY ONLY — the door does not outrank it (the precedence is REMOVED)", () => {
    // agents[4] is closed with a rejected query; agents[5] is closed with a LIVE one
    expect(
      agentStanding(agents[4], queries),
      "a closed agent's history was overwritten by its door — the precedence is back, and every closed agent has just lost its query history",
    ).toBe("never");
    expect(
      agentStanding(agents[5], queries),
      "THE BUG IS BACK: an agency that shut its doors while holding a live query reads as 'closed' instead of 'active', so the query you are waiting on vanishes from the standing axis AND (because whose-turn is gated on active) from the turn axis too",
    ).toBe("active");
    expect(agentAxisCounts(agents, queries).standing.active).toBe(3);
  });

  it("Unknown is not Closed, so it never leaves the open standings", () => {
    const unknown = mkAgent({ id: "u", submissionStatus: SubmissionStatus.UNKNOWN });
    expect(agentStanding(unknown, [])).toBe("never");
    expect(agentDoor(unknown)).toBe("open");
  });
});

/**
 * AXIS C — THEIR DOOR. Independent of your history, which is the whole point: the two are facts
 * about different systems (theirs and yours) and neither outranks the other.
 */
describe("agentList · axis C (their door) is independent of your history", () => {
  const openActive = mkAgent({ id: "oa" });
  const openNever = mkAgent({ id: "on" });
  const shutActive = mkAgent({ id: "sa", submissionStatus: SubmissionStatus.CLOSED });
  const shutPrev = mkAgent({ id: "sp", submissionStatus: SubmissionStatus.CLOSED });
  const agents = [openActive, openNever, shutActive, shutPrev];
  const queries = [
    mkQuery({ id: "q1", agentId: "oa", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q2", agentId: "sa", status: QueryStatus.FULL_REQUESTED }),
    mkQuery({ id: "q3", agentId: "sp", status: QueryStatus.REJECTED }),
  ];

  it("AXIS C COUNTS SUM TO THE AGENT TOTAL", () => {
    const c = agentAxisCounts(agents, queries);
    expect(c.door.open + c.door.closed, "the door axis stopped partitioning the list").toBe(c.total);
    expect(c).toMatchObject({ door: { open: 2, closed: 2 } });
  });

  it("THE FIXTURE: an active query at a closed agency appears under BOTH, and keeps its turn", () => {
    // This is the case the removed precedence made invisible. It must hold on every axis at once.
    expect(
      agentStanding(shutActive, queries),
      "the live full at a shut agency stopped counting as active history",
    ).toBe("active");
    expect(
      agentDoor(shutActive),
      "the shut agency stopped reading as closed",
    ).toBe("closed");
    expect(
      agentTurn(shutActive, queries),
      "the agent holds a FULL REQUESTED — the writer owes pages — but the turn axis reports nothing, which is exactly how the old precedence hid a live query from both axes",
    ).toBe("you");

    // and through the filter set, from every direction
    const seen = (f: Parameters<typeof matchesFilterSet>[2]) =>
      agents.filter((a) => matchesFilterSet(a, queries, f)).map((a) => a.id);
    expect(seen({ ...emptyFilterSet(), standing: ["active"] })).toContain("sa");
    expect(seen({ ...emptyFilterSet(), door: ["closed"] })).toContain("sa");
    expect(seen({ ...emptyFilterSet(), turn: ["you"] })).toContain("sa");
    // and the intersection that a writer would actually reach for
    expect(seen({ ...emptyFilterSet(), standing: ["active"], door: ["closed"] })).toEqual(["sa"]);
  });

  it("the axes OVERLAP — an agent counted as active can also be counted as closed", () => {
    const c = agentAxisCounts(agents, queries);
    expect(c.standing.active).toBe(2);
    expect(c.door.closed).toBe(2);
    const inBoth = agents.filter((a) => agentStanding(a, queries) === "active" && agentDoor(a) === "closed");
    expect(
      inBoth.map((a) => a.id),
      "no agent is in both sets — either the fixture drifted or a precedence has crept back in to keep the axes artificially disjoint",
    ).toEqual(["sa"]);
  });

  it("door wording is always '…to queries' / '…for submissions', never a bare 'Closed'", () => {
    expect(DOOR_LABEL.open).toBe("Open to queries");
    expect(DOOR_LABEL.closed).toBe("Closed for submissions");
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

  it("the axis does not apply outside active queries — but a CLOSED DOOR no longer suppresses it", () => {
    expect(agentTurn(agents[4], queries)).toBeNull(); // only terminal queries
    expect(agentTurn(agents[5], queries)).toBeNull(); // never queried
    expect(
      agentTurn(agents[6], queries),
      "a closed agency holding a FULL REQUESTED reports no turn — the door precedence is back and it is hiding a query the writer owes pages on",
    ).toBe("you"); // closed door, live request: still the writer's move
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
    // "Closed for submissions" is NOT a standing — it belongs to the door axis
    expect(DOOR_LABEL.closed).toBe("Closed for submissions");
    expect(Object.keys(STANDING_LABEL)).toEqual(["active", "noactive", "never"]);
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

describe("agentList · sort (the four working orders)", () => {
  it("THE DEFAULT is star rating, stated explicitly so the grid can't drift", () => {
    expect(DEFAULT_AGENT_SORT).toBe("rating");
    expect(AGENT_SORT_OPTIONS.map((o) => o.key)).toEqual(["rating", "az", "recent", "speed"]);
  });

  it("rating: highest first, alphabetical within a tier; UNRATED sorts last", () => {
    const five = mkAgent({ id: "5", name: "Zed", starRating: 5 });
    const fiveA = mkAgent({ id: "5a", name: "Ada", starRating: 5 });
    const unrated = mkAgent({ id: "u", name: "Aaron" });
    expect(sortAgentList([unrated, five, fiveA], "rating").map((a) => a.id)).toEqual(["5a", "5", "u"]);
  });

  it("fastest to reply: quickest first, UNSTATED last (absence is not instant)", () => {
    const fast = mkAgent({ id: "f", responseTimeWeeks: 2 });
    const slow = mkAgent({ id: "s", responseTimeWeeks: 12 });
    const unknown = mkAgent({ id: "u" });
    expect(sortAgentList([unknown, slow, fast], "speed").map((a) => a.id)).toEqual(["f", "s", "u"]);
  });

  it("A–Z is alphabetical by name", () => {
    const z = mkAgent({ id: "o", name: "Zed" });
    const a = mkAgent({ id: "r", name: "Ada" });
    expect(sortAgentList([z, a], "az").map((x) => x.id)).toEqual(["r", "o"]);
  });

  it("recently queried: newest send first, NEVER-QUERIED last", () => {
    const old = mkAgent({ id: "old", name: "Old Olive" });
    const fresh = mkAgent({ id: "fresh", name: "Fresh Fred" });
    const never = mkAgent({ id: "never", name: "Aaron Never" });
    const queries = [
      mkQuery({ id: "q1", agentId: "old", dateSent: "2026-01-05T00:00:00.000Z" }),
      mkQuery({ id: "q2", agentId: "fresh", dateSent: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(sortAgentList([never, old, fresh], "recent", queries).map((a) => a.id)).toEqual(["fresh", "old", "never"]);
  });

  it("MULTI-QUERY AGENT: the key is max(dateSent), never the first query the fetch returns", () => {
    // the fetch order deliberately puts the OLDER query first — the naive "first match wins"
    // implementation would date this agent to January and bury them at the bottom of the sort
    const multi = mkAgent({ id: "multi", name: "Multi Mary" });
    const single = mkAgent({ id: "single", name: "Single Sid" });
    const queries = [
      mkQuery({ id: "old", agentId: "multi", manuscriptId: "m1", dateSent: "2026-01-10T00:00:00.000Z" }),
      mkQuery({ id: "new", agentId: "multi", manuscriptId: "m2", dateSent: "2026-07-20T00:00:00.000Z" }),
      mkQuery({ id: "mid", agentId: "single", manuscriptId: "m1", dateSent: "2026-04-01T00:00:00.000Z" }),
    ];
    expect(
      lastQueriedAt("multi", queries),
      "the last-queried key took the first query found rather than the newest — an agent's ordering then depends on fetch order, not on when you last contacted them",
    ).toBe(Date.parse("2026-07-20T00:00:00.000Z"));
    expect(
      sortAgentList([single, multi], "recent", queries).map((a) => a.id),
      "the two-query agent sorted below the single-query one — their July query was ignored in favour of their January one",
    ).toEqual(["multi", "single"]);
  });

  it("last-queried is DERIVED from the newest query send, not stored on the agent", () => {
    const queries = [
      mkQuery({ id: "q1", agentId: "a1", dateSent: "2026-01-05T00:00:00.000Z" }),
      mkQuery({ id: "q2", agentId: "a1", dateSent: "2026-06-05T00:00:00.000Z" }),
      mkQuery({ id: "q3", agentId: "other", dateSent: "2026-12-05T00:00:00.000Z" }),
    ];
    expect(lastQueriedAt("a1", queries)).toBe(Date.parse("2026-06-05T00:00:00.000Z"));
    expect(lastQueriedAt("nobody", queries)).toBeNull();
    // an undated query record cannot invent a date
    expect(lastQueriedAt("x", [mkQuery({ id: "q4", agentId: "x", dateSent: "" })])).toBeNull();
  });
});

describe("agentList · grouping partitions, it never reorders", () => {
  const five = mkAgent({ id: "five", name: "Zoe Five", starRating: 5 });
  const four = mkAgent({ id: "four", name: "Ada Four", starRating: 4 });
  const unrated = mkAgent({ id: "un", name: "Unrated Ursula" });
  const prev = mkAgent({ id: "prev", name: "Past Pat", starRating: 4 });
  const closed = mkAgent({ id: "shut", name: "Shut Sam", submissionStatus: SubmissionStatus.CLOSED });
  const agents = [five, four, unrated, prev, closed];
  const queries = [
    mkQuery({ id: "q1", agentId: "five", status: QueryStatus.FULL_REQUESTED }),
    mkQuery({ id: "q2", agentId: "four", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q3", agentId: "prev", status: QueryStatus.REJECTED }),
  ];

  it("the option list is None + the three axes + rating", () => {
    expect(AGENT_GROUP_OPTIONS.map((o) => o.key)).toEqual(["none", "standing", "turn", "door", "stars"]);
  });

  it("None returns no sections at all — the grid renders flat", () => {
    expect(groupAgents(agents, "none", queries)).toEqual([]);
  });

  it("SORT APPLIES WITHIN GROUPS — grouping only splits an already-sorted list", () => {
    const sorted = sortAgentList(agents, "az");
    const g = groupAgents(sorted, "standing", queries);
    const active = g.find((s) => s.key === "active")!;
    // alphabetical inside the section, not the input order
    expect(active.agents.map((a) => a.name)).toEqual(["Ada Four", "Zoe Five"]);
  });

  it("every agent lands in exactly one section, and empty sections are dropped", () => {
    const g = groupAgents(agents, "standing", queries);
    expect(g.flatMap((s) => s.agents).length).toBe(agents.length);
    expect(
      g.map((s) => s.key),
      "a 'closed' section appeared among the standings — the door is its own grouping now, and mixing it back in re-creates the precedence",
    ).toEqual(["active", "noactive", "never"]);
    // nobody is "never queried" once we remove that agent — the section disappears rather than showing empty
    const g2 = groupAgents([five, four], "standing", queries);
    expect(g2.map((s) => s.key)).toEqual(["active"]);
  });

  it("grouping by DOOR splits open from closed, independently of history", () => {
    const g = groupAgents(agents, "door", queries);
    expect(g.map((s) => s.key)).toEqual(["open", "closed"]);
    expect(g.flatMap((s) => s.agents).length).toBe(agents.length);
    expect(g.find((s) => s.key === "closed")!.agents.map((a) => a.id)).toEqual(["shut"]);
    expect(g.map((s) => s.title)).toEqual([DOOR_LABEL.open, DOOR_LABEL.closed]);
  });

  it("grouping by turn keeps the agents the axis DOESN'T apply to — a dropped remainder would be a lie", () => {
    const g = groupAgents(agents, "turn", queries);
    expect(g.map((s) => s.key)).toEqual(["you", "them", "na"]);
    expect(g.flatMap((s) => s.agents).length).toBe(agents.length);
    expect(g.find((s) => s.key === "you")!.agents.map((a) => a.id)).toEqual(["five"]);
  });

  it("rating groups run high→low and give the unrated their own honest section", () => {
    const g = groupAgents(sortAgentList(agents, "rating"), "stars", queries);
    expect(g.map((s) => s.key)).toEqual(["s5", "s4", "s0"]);
    expect(g[0].title).toBe("Five stars");
    expect(g[0].stars).toBe(5);
    expect(g[2].title).toBe("Not yet rated"); // NOT folded into "One star"
    expect(g[2].stars).toBeUndefined();
  });

  it("section titles come from the axis label maps, and stubs from the named palette", () => {
    const g = groupAgents(agents, "standing", queries);
    expect(g.map((s) => s.title)).toEqual([
      STANDING_LABEL.active, STANDING_LABEL.noactive, STANDING_LABEL.never,
    ]);
    expect(g.find((s) => s.key === "active")!.stub).toBe(GROUP_STUB.sage);
    const t = groupAgents(agents, "turn", queries);
    expect(t.find((s) => s.key === "you")!.title).toBe(TURN_LABEL.you);
    expect(t.find((s) => s.key === "you")!.stub).toBe(GROUP_STUB.pink); // the writer owes something
    expect(t.find((s) => s.key === "them")!.stub).toBe(GROUP_STUB.sage);
  });
});
