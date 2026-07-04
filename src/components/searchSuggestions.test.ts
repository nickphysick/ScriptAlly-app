/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared search-suggestion machinery — pure-function coverage for the grouping/ranking/caps and
 * the ↑/↓ keyboard-wrap step (the single implementation behind both the rail search and the
 * dashboard top-bar search).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { buildSearchSuggestions, initialsOf, stepHighlight } from "../lib/searchSuggestionsCore";

const agent = (id: string, name: string, agency = "") => ({ id, name, agency }) as any;
const query = (id: string, agentId: string, manuscriptId: string, status: QueryStatus) =>
  ({ id, agentId, manuscriptId, status }) as any;
const ms = (id: string, title: string) => ({ id, title }) as any;

const AGENTS = [
  agent("a1", "Daniel O'Rourke", "Larkspur Literary"),
  agent("a2", "Priya Raman", "Saltmarsh Literary"),
  agent("a3", "Dan Field"),
  agent("a4", "Danielle Poe", "Poe & Co"),
  agent("a5", "Dana Marsh", "Marsh House"),
  agent("a6", "Greg Panetta", "The Bindery"),
];
const MANUSCRIPTS = [ms("m1", "Murphy's Day Out"), ms("m2", "The Winter Archivist")];
const QUERIES = [
  query("q1", "a1", "m1", QueryStatus.FULL_REQUESTED),
  query("q2", "a2", "m1", QueryStatus.PARTIAL_REQUESTED),
  query("q3", "a6", "m2", QueryStatus.QUERIED),
  query("q4", "missing", "missing", QueryStatus.REJECTED),
];

describe("buildSearchSuggestions", () => {
  it("returns nothing for an empty term", () => {
    const g = buildSearchSuggestions("", AGENTS, QUERIES, MANUSCRIPTS);
    expect(g.flat).toHaveLength(0);
  });

  it("matches agents by name OR agency, capped at 4, agents before queries in flat", () => {
    const g = buildSearchSuggestions("dan", AGENTS, QUERIES, MANUSCRIPTS);
    expect(g.agentResults.map((a) => a.id)).toEqual(["a1", "a3", "a4", "a5"]); // 4 of 4 — cap holds
    const byAgency = buildSearchSuggestions("larkspur", AGENTS, QUERIES, MANUSCRIPTS);
    expect(byAgency.agentResults.map((a) => a.id)).toEqual(["a1"]);
    expect(g.flat[0].kind).toBe("agent");
  });

  it("matches queries by agent name, manuscript title or status", () => {
    const byAgent = buildSearchSuggestions("panetta", AGENTS, QUERIES, MANUSCRIPTS);
    expect(byAgent.queryResults.map((r: any) => r.query.id)).toEqual(["q3"]);
    const byMs = buildSearchSuggestions("murphy", AGENTS, QUERIES, MANUSCRIPTS);
    expect(byMs.queryResults.map((r: any) => r.query.id)).toEqual(["q1", "q2"]);
    const byStatus = buildSearchSuggestions("partial requested", AGENTS, QUERIES, MANUSCRIPTS);
    expect(byStatus.queryResults.map((r: any) => r.query.id)).toEqual(["q2"]);
  });

  it("titles unknown manuscripts and tolerates a missing agent", () => {
    const g = buildSearchSuggestions("untitled", AGENTS, QUERIES, MANUSCRIPTS);
    expect(g.queryResults).toHaveLength(1);
    expect((g.queryResults[0] as any).manuscriptTitle).toBe("Untitled manuscript");
    expect((g.queryResults[0] as any).agent).toBeUndefined();
  });
});

describe("stepHighlight", () => {
  it("wraps in both directions", () => {
    expect(stepHighlight("ArrowDown", 0, 3)).toBe(1);
    expect(stepHighlight("ArrowDown", 2, 3)).toBe(0);
    expect(stepHighlight("ArrowUp", 0, 3)).toBe(2);
    expect(stepHighlight("ArrowUp", 2, 3)).toBe(1);
  });
  it("ignores other keys and empty lists", () => {
    expect(stepHighlight("Enter", 2, 3)).toBe(2);
    expect(stepHighlight("ArrowDown", 5, 0)).toBe(0);
  });
});

describe("initialsOf", () => {
  it("keeps the NavSearch contract", () => {
    expect(initialsOf("Eva Vance")).toBe("EV");
    expect(initialsOf("Arthur Conan Doyle")).toBe("ACD");
    expect(initialsOf("")).toBe("?");
  });
});
