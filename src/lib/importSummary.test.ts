/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import summary's groupings partition their populations (onboarding v5 part 2 — the unit
 * half of lock S1), and its sentences are the Words table's.
 */
import { openAgentQuestions, openQueryQuestions, agentsAnswerLine, queriesAnswerLine } from "./reviewGate";
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { parseModel, reviewTallies } from "./smartImportReviewModel";
import { courtOf } from "./qcSummary";
import {
  agentKey, agentKeyParts, agentDiscs, queryCourts, summaryCourt, importSteps, stepCaption, duplicateSets,
  TIER_TEXT, TIER_NAME, DISC_MAX,
} from "./importSummary";
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
    it(`${name}: live + closed + not queried = the agents`, () => {
      const k = agentKey(agents, queries);
      expect(k.total).toBe(t.agents.total);
      expect(k.live + k.closed + k.none).toBe(k.total);
      expect(agentKeyParts(k).reduce((n, p) => n + p.n, 0)).toBe(k.total);
    });
    it(`${name}: with agents + with you + closed = the queries, and each group = its statuses`, () => {
      const courts = queryCourts(queries);
      expect(courts.map((c) => c.key)).toEqual(["agents", "you", "closed"]);
      expect(courts.reduce((n, c) => n + c.total, 0)).toBe(t.queries.total);
      for (const c of courts) expect(c.statuses.reduce((n, s) => n + s.count, 0), c.key).toBe(c.total);
    });
    it(`${name}: the discs and the rest account for every agent`, () => {
      const { discs, rest } = agentDiscs(agents, queries);
      expect(discs.length).toBeLessThanOrEqual(DISC_MAX);
      expect(discs.length + rest).toBe(t.agents.total);
      /* live first, then closed, then not queried */
      const order = discs.map((d) => ["live", "closed", "none"].indexOf(d.standing));
      expect(order).toEqual([...order].sort((a, b) => a - b));
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
  it("an agent with no queries is not queried, and the key line says so only then", () => {
    const { agents, queries } = parseModel({ agents: [{ ref: "x", name: "A B", agency: "C" }, { ref: "y", name: "D E", agency: "F" }], queries: [{ agentRef: "x", status: QueryStatus.QUERIED, sentDate: null }] });
    const k = agentKey(agents, queries);
    expect(k).toEqual({ total: 2, live: 1, closed: 0, none: 1 });
    expect(agentKeyParts(k).map((p) => p.text)).toEqual(["with a live query", "closed", "not queried"]);
    expect(agentKeyParts({ ...k, none: 0 }).map((p) => p.text)).toEqual(["with a live query", "closed"]);
  });
});

describe("the stepper's steps and captions", () => {
  it("Duplicates is a step only when the file had duplicate sets", () => {
    expect(importSteps(true)).toEqual(["duplicates", "agents", "queries", "import"]);
    expect(importSteps(false)).toEqual(["agents", "queries", "import"]);
    expect(duplicateSets(parseModel(REVIEW_FIXTURE_DUPES).agents)).toBeGreaterThan(0);
    expect(duplicateSets(parseModel(REVIEW_FIXTURE).agents)).toBe(0);
  });
  it("captions state what each step holds", () => {
    const n = { sets: 2, agentsOpen: 1, queriesOpen: 0 };
    expect(stepCaption("duplicates", n)).toBe("2 sets");
    expect(stepCaption("duplicates", { ...n, sets: 1 })).toBe("1 set");
    /* v9: nothing flagged is optional */
    expect(stepCaption("agents", n)).toBe("1 to answer");
    expect(stepCaption("queries", n)).toBe("Ready to go");
    expect(stepCaption("import", n)).toBe("You confirm");
  });
});

describe("the tier sentences are the Words table's", () => {
  /* RE-POINTED (onboarding v9): "Chances to sharpen" became "Need an answer", and its two sentences
     are built from the questions themselves (lib/reviewGate, with its own locks). */
  it("the fixture's own questions feed the agents' line", () => {
    const qs = openAgentQuestions(parseModel(REVIEW_FIXTURE).agents);
    expect(qs.some((q) => q.ask === "mapping")).toBe(true);
    expect(qs.filter((q) => q.ask === "no-agency").length).toBeGreaterThan(0);
    expect(agentsAnswerLine(qs)).toContain("have no agency. Add it, or say you're carrying on without one.");
  });
  it("no sentence carries a dash or the word Optional", () => {
    const m = parseModel(REVIEW_FIXTURE);
    const all = [TIER_TEXT.agentsReady, TIER_TEXT.agentsFix(1), TIER_TEXT.agentsFix(2), TIER_TEXT.queriesReady, agentsAnswerLine(openAgentQuestions(m.agents)), queriesAnswerLine(openQueryQuestions(m.queries))];
    for (const s of all) { expect(s.length).toBeGreaterThan(0); expect(s).not.toMatch(/[—–]/); expect(s).not.toMatch(/optional/i); }
    expect(TIER_TEXT.agentsFix(1)).toBe("1 possible duplicate set to merge. Sorted on the duplicates step.");
    expect(TIER_NAME).toEqual({ ready: "Ready to go", fix: "A quick fix", ask: "Need an answer" });
  });
});
