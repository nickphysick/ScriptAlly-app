/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import summary's groupings partition their populations (onboarding v5 part 2 — the unit
 * half of lock S1), and its sentences are the Words table's.
 */
import { openAgentQuestions, openQueryQuestions } from "./reviewGate";
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { parseModel, reviewTallies } from "./smartImportReviewModel";
import { courtOf } from "./qcSummary";
import { agentKey, queryCourts, summaryCourt, importSteps, duplicateSets } from "./importSummary";
import { REVIEW_FIXTURE, REVIEW_FIXTURE_DUPES, REVIEW_FIXTURE_CLEAR } from "../components/onboarding/SmartImportReviewFixture";

const FIXTURES = { review: REVIEW_FIXTURE, dupes: REVIEW_FIXTURE_DUPES, clear: REVIEW_FIXTURE_CLEAR };

describe("every status sits in exactly one of the summary's three groups", () => {
  const all = Object.values(QueryStatus) as QueryStatus[];
  it("covers every QueryStatus", () => {
    expect(all.length).toBeGreaterThan(8);
    for (const s of all) expect(["agents", "you", "closed"], s).toContain(summaryCourt(s));
  });
  it("with you = the Query Centre's you and offer courts; closed = its closed", () => {
    for (const s of all) {
      const c = courtOf(s);
      expect(summaryCourt(s), s).toBe(c === "agent" ? "agents" : c === "closed" ? "closed" : "you");
    }
    expect(summaryCourt(QueryStatus.OFFER)).toBe("you");
    expect(summaryCourt(QueryStatus.WITHDRAWN)).toBe("closed");
  });
});

describe("S1 — the groupings sum", () => {
  for (const [name, fx] of Object.entries(FIXTURES)) {
    const { agents, queries } = parseModel(fx);
    const t = reviewTallies(agents, queries);
    it(`${name}: with agents + with you + closed = the queries, and each group = its statuses`, () => {
      const courts = queryCourts(queries);
      expect(courts.map((c) => c.key)).toEqual(["agents", "you", "closed"]);
      expect(courts.reduce((n, c) => n + c.total, 0)).toBe(t.queries.total);
      for (const c of courts) expect(c.statuses.reduce((n, s) => n + s.count, 0), c.key).toBe(c.total);
    });
  }
  it("the fixtures between them enter every branch", () => {
    const seen = new Set<string>();
    for (const fx of Object.values(FIXTURES)) {
      const { agents, queries } = parseModel(fx);
      const k = agentKey(agents, queries);
      if (k.live) seen.add("live"); if (k.closed) seen.add("closed");
      for (const c of queryCourts(queries)) if (c.total) seen.add(c.key);
    }
    expect([...seen].sort()).toEqual(["agents", "closed", "live", "you"].sort().concat(["closed"]).filter((v, i, a) => a.indexOf(v) === i).sort());
  });
});

describe("the stepper's steps and captions", () => {
  it("Duplicates is a step only when the file had duplicate sets", () => {
    expect(importSteps(true)).toEqual(["duplicates", "agents", "queries", "import"]);
    expect(importSteps(false)).toEqual(["agents", "queries", "import"]);
    expect(duplicateSets(parseModel(REVIEW_FIXTURE_DUPES).agents)).toBeGreaterThan(0);
    expect(duplicateSets(parseModel(REVIEW_FIXTURE).agents)).toBe(0);
  });
});

