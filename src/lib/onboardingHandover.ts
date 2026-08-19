/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The handover — what was captured, and where the writer is being taken.
 *
 * ⚠️ IT REPORTS. IT NEVER CONGRATULATES. No "well done", no "you're all set", no exclamation
 * mark, no celebratory mark. A writer who has just typed their querying history into a new app has
 * done admin, not an achievement, and being congratulated for it is the app having an opinion about
 * their position — which is the one thing it never does.
 *
 * ⚠️ AND IT ONLY EXISTS WHEN SOMETHING EXISTS. A tally reading "0 agents, 0 queries" is a comment
 * on how far along someone is. `shouldHandOver` is the gate, and the branches that capture nothing
 * never reach this screen at all.
 */

/** What actually landed. Every figure is counted, never estimated and never rounded. */
export interface HandoverTally {
  agents: number;
  queries: number;
  manuscripts: number;
}

/**
 * ⚠️ THE GATE. Something must have been captured — anything at all — or there is no handover.
 * Zero counts are not shown, so the screen cannot become the app remarking on an empty start.
 */
export function shouldHandOver(tally: HandoverTally): boolean {
  return tally.agents > 0 || tally.queries > 0 || tally.manuscripts > 0;
}

/**
 * The tiles, with only the non-zero ones kept.
 *
 * ⚠️ A ZERO TILE IS NOT SHOWN AS A ZERO. Someone who imported nine queries against one manuscript
 * and merged every agent into existing records should read "9 queries · 1 manuscript", not a
 * proud "0 agents" beside them.
 */
export function handoverTiles(tally: HandoverTally): { n: number; label: string }[] {
  return [
    { n: tally.agents, label: tally.agents === 1 ? "Agent" : "Agents" },
    { n: tally.queries, label: tally.queries === 1 ? "Query" : "Queries" },
    { n: tally.manuscripts, label: tally.manuscripts === 1 ? "Manuscript" : "Manuscripts" },
  ].filter((t) => t.n > 0);
}

/*
 * ⚠️ A FOURTH LOCAL COPY OF THE NUMBER WORDS, AND IT IS DELIBERATE. `manuscriptTiles.ts`,
 * `todoBoard.ts` and `todoColumns.ts` each carry one; importing the exported `spellNumber` from
 * `todoColumns` would have avoided a copy but coupled the onboarding to a file another stream is
 * actively refactoring. Flagged for consolidation rather than resolved across a live boundary.
 */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const spell = (n: number): string => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));

/** Verbatim from design-refs/scriptally-onboarding-chrome-options.html, option E. */
export const HANDOVER_HEADING = "That's everything captured";
export const HANDOVER_EYEBROW = "Ready";
export const HANDOVER_SUB =
  "Here's what's now in ScriptAlly. Nothing is fixed — you can add, edit or remove any of it " +
  "whenever you like.";
export const HANDOVER_PRIMARY = "Open Query Centre";
export const HANDOVER_GHOST = "Take me to the dashboard instead";

/**
 * The destination note — the ref's sentence, with its count taken from what was captured.
 *
 * ⚠️ THE REF SAYS "your nine queries" BECAUSE ITS FIXTURE HAD NINE. The wording is the ref's; the
 * number is the writer's, and it is spelled the way every other count in this app is spelled.
 */
export function handoverDestinationNote(queries: number): { lead: string; rest: string } {
  return {
    lead: "Taking you to the Query Centre",
    rest:
      ` — that's where your ${spell(queries)} ${queries === 1 ? "query lives" : "queries live"}, ` +
      "and where you'll record anything that comes back.",
  };
}
