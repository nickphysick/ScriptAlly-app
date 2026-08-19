/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The handover — what it reports, and the branches that never see it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  HANDOVER_HEADING, HANDOVER_SUB, HANDOVER_PRIMARY, HANDOVER_GHOST,
  handoverDestinationNote, handoverTiles, shouldHandOver,
} from "./onboardingHandover";

const tally = (agents: number, queries: number, manuscripts: number) => ({ agents, queries, manuscripts });

describe("⚠️ it renders only when something was captured", () => {
  /**
   * A tally reading "0 agents, 0 queries" is the app commenting on how far along someone is. The
   * empty case is not a quiet version of this screen — it is a screen that does not exist.
   */
  it("refuses an empty capture outright", () => {
    expect(shouldHandOver(tally(0, 0, 0))).toBe(false);
  });

  it("appears as soon as anything landed", () => {
    expect(shouldHandOver(tally(1, 0, 0))).toBe(true);
    expect(shouldHandOver(tally(0, 1, 0))).toBe(true);
    expect(shouldHandOver(tally(0, 0, 1))).toBe(true);
  });

  /** ⚠️ AND A ZERO IS NEVER SHOWN BESIDE REAL FIGURES. Every agent merged into an existing record
   *  means agentsCreated is 0 — a proud "0 Agents" beside nine queries is a remark, not a report. */
  it("drops the zero tiles rather than printing them", () => {
    expect(handoverTiles(tally(0, 9, 1)).map((t) => t.label)).toEqual(["Queries", "Manuscript"]);
    expect(handoverTiles(tally(14, 9, 1))).toHaveLength(3);
  });

  it("agrees with itself in the singular", () => {
    expect(handoverTiles(tally(1, 1, 1)).map((t) => t.label)).toEqual(["Agent", "Query", "Manuscript"]);
  });
});

describe("⚠️ it reports; it never congratulates", () => {
  const COPY = [HANDOVER_HEADING, HANDOVER_SUB, HANDOVER_PRIMARY, HANDOVER_GHOST,
    handoverDestinationNote(9).lead, handoverDestinationNote(9).rest].join(" ");

  it("carries no congratulation and no exclamation", () => {
    expect(COPY).not.toMatch(/!/);
    expect(COPY).not.toMatch(/\b(well done|congratulations?|nice work|great|brilliant|perfect|you're all set|all set|success)\b/i);
  });

  /** No verdict about the writer's position either — the counts speak, the app does not. */
  it("passes no judgement on how much was captured", () => {
    expect(COPY).not.toMatch(/\b(already|only|just|plenty|impressive|good start|off to)\b/i);
  });

  it("states the facts it has", () => {
    expect(HANDOVER_HEADING).toBe("That's everything captured");
  });
});

describe("the destination note counts what was captured", () => {
  it("names the Query Centre and the real figure", () => {
    expect(handoverDestinationNote(9).lead).toBe("Taking you to the Query Centre");
    expect(handoverDestinationNote(9).rest).toContain("your nine queries live");
  });

  it("agrees in the singular", () => {
    expect(handoverDestinationNote(1).rest).toContain("your one query lives");
  });

  /** ⚠️ NEVER ROUNDED, NEVER ESTIMATED — a real number past the spelled range stays a numeral. */
  it("states a large count exactly", () => {
    expect(handoverDestinationNote(147).rest).toContain("your 147 queries live");
  });
});

describe("⚠️ the exit routing — which branches see it at all", () => {
  const BRANCH_B = readFileSync(resolve(__dirname, "../components/onboarding/BranchB.tsx"), "utf8");
  const FORK = readFileSync(resolve(__dirname, "../components/onboarding/CaptureFork.tsx"), "utf8");

  /**
   * Smart Import and the template both commit and then hand over. By-hand and
   * nothing-to-capture leave onboarding without one, because there is nothing to report.
   */
  it("only the committed-import path reaches the handover", () => {
    expect(BRANCH_B).toContain("<HandoverScreen");
    // It is gated on a real commit outcome AND on something having landed.
    const at = BRANCH_B.indexOf("<HandoverScreen");
    const gate = BRANCH_B.slice(BRANCH_B.indexOf('screen === "done"'), at);
    expect(gate).toContain("shouldHandOver(tally)");
    expect(gate).toContain("ok &&");
  });

  /** By-hand leaves through the agent form; it never commits an import, so it never tallies one. */
  it("the by-hand route does not render it", () => {
    expect(FORK).toContain("onUploadTemplate");
    expect(FORK).not.toContain("HandoverScreen");
    expect(BRANCH_B).toMatch(/onAddByHand\(\)/);
  });

  /** "I've nothing to capture yet" is wired to the skip, which leaves for the dashboard. */
  it("the nothing-to-capture route does not render it", () => {
    expect(FORK).toContain("onNothingYet");
    expect(FORK).not.toContain("Handover");
  });

  it("offers the named destination and the dashboard, in that order of weight", () => {
    expect(BRANCH_B).toContain('onImportComplete(outcome, "queries")');
    expect(BRANCH_B).toContain('onImportComplete(outcome, "dashboard")');
  });
});
