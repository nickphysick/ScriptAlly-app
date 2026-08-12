/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Smart Import confirm step's sentence — pure, so it can be tested without the component.
 *
 * ⚠️ THIS SCREEN EXISTS TO NAME THE FILE. It is the beat where a writer spends a one-shot
 * entitlement (one free Smart Import ever, or one a month on Pro), so "which file?" is the only
 * question it asks. The named and unnamed forms are therefore NOT interchangeable: the unnamed one
 * is a fallback for a state that should not happen, not a neutral alternative.
 *
 * The bug this replaces: `fileName` was set at the top of `runMapping`, which is what this screen's
 * own primary button calls — so the name arrived one screen too late and the fallback rendered every
 * time. It is set in `pickFile` now, before the screen mounts.
 */

/**
 * ⚠️ THE OVERVIEW'S LEAD NAMES ONLY CATEGORIES THAT ACTUALLY HAVE A COUNT.
 *
 * It used to be a single hardcoded sentence chosen by `allClear`, so a file with zero agent
 * problems and three query flags was still told "a couple of agents need a quick fix first" —
 * next to an Agents column showing zero of both non-ready tiers. The page contradicted itself in
 * one view. This composes the clause list from the counts, so a category that is zero is simply
 * not mentioned.
 *
 * Reports, never appraises: it states what is there, and does not tell the writer whether that is
 * a lot, a little, good or bad.
 */
export function overviewLead(counts: {
  agentsFix: number;
  agentsSharpen: number;
  queriesSharpen: number;
}): string {
  const { agentsFix, agentsSharpen, queriesSharpen } = counts;
  if (agentsFix === 0 && agentsSharpen === 0 && queriesSharpen === 0) {
    return "It all read cleanly — your history's ready to come straight in.";
  }

  const clauses: string[] = [];
  if (agentsFix > 0) {
    clauses.push(
      agentsFix === 1
        ? "one agent needs a decision"
        : `${agentsFix} agents need a decision`,
    );
  }
  if (agentsSharpen > 0) {
    clauses.push(
      agentsSharpen === 1
        ? "one agent has a detail to sharpen"
        : `${agentsSharpen} agents have details to sharpen`,
    );
  }
  if (queriesSharpen > 0) {
    clauses.push(
      queriesSharpen === 1
        ? "one query has a detail to sharpen"
        : `${queriesSharpen} queries have details to sharpen`,
    );
  }

  // "a, b and c" — the list reads as prose, however many clauses survived.
  const list =
    clauses.length === 1
      ? clauses[0]
      : `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;
  return `Most of it's ready to go — ${list}.`;
}

/** The lead sentence: names the file when we have one, and says so plainly when we do not. */
export function confirmFileLead(fileName: string | null | undefined): {
  /** Text before the filename (or the whole sentence when there is no name). */
  before: string;
  /** The filename to emphasise, or null when unnamed. */
  name: string | null;
  /** Text after the filename; empty when unnamed. */
  after: string;
} {
  const name = (fileName || "").trim();
  if (!name) {
    return {
      before: "We'll read your file and show you everything before anything is saved — you confirm what lands.",
      name: null,
      after: "",
    };
  }
  return {
    before: "We'll read ",
    name,
    after: " and show you everything before anything is saved — you confirm what lands.",
  };
}
