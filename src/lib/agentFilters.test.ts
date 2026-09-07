/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Four facets and six orders.
 */
import { describe, expect, it } from "vitest";
import {
  DOOR_VALUES, HISTORY_VALUES, SORTS, emptyFilters, facetOptions, filterCount, isFiltersEmpty,
  matchesFilters, sortAgents, sortSpec, DEFAULT_SORT,
} from "./agentFilters";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE } from "../components/agents/contactFixture";
import { Agent } from "../types";

const A = CONTACT_FIXTURE_AGENTS;
const Q = CONTACT_FIXTURE_QUERIES;
const ids = (f: Parameters<typeof matchesFilters>[2]) => A.filter((a) => matchesFilters(a, Q, f)).map((a) => a.id);

describe("the facets intersect", () => {
  it("an empty set constrains nothing", () => {
    expect(isFiltersEmpty(emptyFilters())).toBe(true);
    expect(filterCount(emptyFilters())).toBe(0);
    expect(ids(emptyFilters()).length).toBe(A.length);
  });

  it("ticks WITHIN a facet are alternatives", () => {
    const one = ids({ ...emptyFilters(), door: ["Open to queries"] });
    const both = ids({ ...emptyFilters(), door: [...DOOR_VALUES] });
    expect(one.length).toBeGreaterThan(0);
    expect(both.length, "ticking both door values should return everyone").toBe(A.length);
  });

  /* ⚠️ THE INTERSECTION IS THE FIX FOR A REAL DEFECT. A union across facets returned "open OR
     seeking thrillers" where a reader ticking both plainly means AND — and the counts gave it
     away by summing past the list's own length. */
  it("facets NARROW each other — never a union", () => {
    const door = ids({ ...emptyFilters(), door: ["Closed to queries"] });
    const hist = ids({ ...emptyFilters(), history: ["Active queries"] });
    const both = ids({ ...emptyFilters(), door: ["Closed to queries"], history: ["Active queries"] });
    expect(door.length).toBeGreaterThan(0);
    expect(hist.length).toBeGreaterThan(0);
    expect(both.length, "the two facets unioned instead of intersecting").toBeLessThan(door.length + hist.length);
    for (const id of both) {
      expect(door, `${id} survived an intersection it does not satisfy`).toContain(id);
      expect(hist).toContain(id);
    }
  });

  /* ⚠️ AND THIS IS THE QUESTION WORTH ASKING: an agency that shut its doors while holding your
     full. The door is its own facet precisely so the two can be combined. */
  it("closed-to-queries AND active-queries finds the agent that case exists for", () => {
    expect(ids({ ...emptyFilters(), door: ["Closed to queries"], history: ["Active queries"] })).toEqual(["fx-shut-live"]);
  });

  it("a genre facet matches any of the agent's genres", () => {
    const seeking = ids({ ...emptyFilters(), genre: [FIXTURE_GENRE] });
    expect(seeking.length).toBeGreaterThan(1);
    for (const id of seeking) expect(A.find((a) => a.id === id)!.genres).toContain(FIXTURE_GENRE);
  });
});

describe("the popover's row counts", () => {
  /* ⚠️ THE WHOLE LIST, NEVER THE FILTERED VIEW. A count of what you would see after clicking
     reads 0 for every option you have not chosen. */
  it("read the whole list, whatever is ticked", () => {
    const before = facetOptions(A, Q, "door");
    const total = before.reduce((n, o) => n + o.n, 0);
    expect(total, "the door facet's counts do not sum to the list").toBe(A.length);
  });

  /* ⚠️ A FIXED-VOCABULARY FACET SHOWS ITS ZEROES; a free one can only show what exists. */
  it("a fixed facet states every value even at zero; the genres state only what is there", () => {
    expect(facetOptions([], [], "door").map((o) => o.value)).toEqual([...DOOR_VALUES]);
    expect(facetOptions([], [], "history").map((o) => o.value)).toEqual([...HISTORY_VALUES]);
    expect(facetOptions([], [], "genre"), "an empty genre facet invented rows").toEqual([]);
  });
});

describe("the six orders", () => {
  it("are the ref's six, each with its own words and its own most-useful-first direction", () => {
    expect(SORTS.map((s) => s.key)).toEqual(["name", "agency", "added", "reply", "priority", "genre"]);
    expect(sortSpec("added").defaultDir, "date added should open newest-first").toBe("desc");
    expect(sortSpec("priority").defaultDir, "priority should open highest-first").toBe("desc");
    expect(sortSpec("reply").defaultDir, "response time should open shortest-first").toBe("asc");
    expect(sortSpec("name").defaultDir).toBe("asc");
  });

  /* ⚠️ THE SEGMENT'S WORDS RELABEL PER KEY — "A to Z" is meaningless over a date and "Newest" is
     meaningless over a name; one pair for all six would be wrong for four of them. */
  it("each key states its own two words, and no two keys share a meaningless pair", () => {
    expect(sortSpec("name").dir).toEqual(["A to Z", "Z to A"]);
    expect(sortSpec("added").dir).toEqual(["Oldest", "Newest"]);
    expect(sortSpec("reply").dir).toEqual(["Shortest", "Longest"]);
    expect(sortSpec("priority").dir).toEqual(["Lowest", "Highest"]);
    for (const s of SORTS) expect(s.dir[0], `${s.key} has no words`).not.toBe(s.dir[1]);
  });

  it("sorts by the chosen key, in the chosen direction", () => {
    const byName = sortAgents(A, "name", "asc").map((a) => a.name);
    expect(byName).toEqual([...byName].sort((x, y) => x.localeCompare(y)));
    expect(sortAgents(A, "name", "desc").map((a) => a.name)).toEqual([...byName].reverse());
  });

  /* ⚠️ ABSENCE LAST IN BOTH DIRECTIONS. An unrated agent is not a zero-star agent and an unstated
     window is not an instant reply; reversing must not promote "we do not know" to the top. */
  it("an unstated value sorts LAST whichever way the order runs", () => {
    const bare = A.find((a) => a.starRating === undefined)!;
    expect(sortAgents(A, "priority", "desc").slice(-1)[0].id, "an unrated agent led a descending priority sort").toBe(bare.id);
    expect(sortAgents(A, "priority", "asc").slice(-1)[0].id, "an unrated agent led an ascending priority sort").toBe(bare.id);
    const noWeeks = A.find((a) => a.responseTimeWeeks === undefined)!;
    expect(sortAgents(A, "reply", "asc").slice(-1)[0].id).toBe(noWeeks.id);
    expect(sortAgents(A, "reply", "desc").slice(-1)[0].id).toBe(noWeeks.id);
  });

  it("an agent with no agency sorts last by agency, not first", () => {
    const noAgency = A.filter((a) => !a.agency.trim());
    expect(noAgency.length, "the fixture lost its agency-less agent — this claim has no subject").toBeGreaterThan(0);
    const tail = sortAgents(A, "agency", "asc").slice(-noAgency.length).map((a) => a.id);
    for (const a of noAgency) expect(tail).toContain(a.id);
  });

  /* two agents with the same window must not swap between renders */
  it("is stable — equal values tiebreak on the name", () => {
    const same = [
      { ...A[0], id: "z", name: "Zoe", responseTimeWeeks: 6 },
      { ...A[0], id: "a", name: "Ada", responseTimeWeeks: 6 },
    ] as Agent[];
    expect(sortAgents(same, "reply", "asc").map((a) => a.id)).toEqual(["a", "z"]);
    expect(sortAgents(same, "reply", "desc").map((a) => a.id)).toEqual(["a", "z"]);
  });

  it("the default is stated once and is a real key", () => {
    expect(SORTS.some((s) => s.key === DEFAULT_SORT)).toBe(true);
  });
});
