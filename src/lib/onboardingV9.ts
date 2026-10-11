/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Onboarding v9 — the words and the small rules of the three set-up steps (design-refs/
 * onboarding-v9). Stated once so the screens, the lab and the locks read one set. Pure: no React.
 */

/* ── Step 1 · the welcome ─────────────────────────────────────────────────────────────────── */
export const WELCOME_EYEBROW = "Welcome";
export const WELCOME_SECOND = "Let's get you on board.";
export const WELCOME_LINE = "To make your set-up as quick as possible, let us know where you are in your querying journey.";
/** The first word of the account's display name, or "" when there is none. */
export const firstNameOf = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] ?? "";
/** The heading's two lines. With no name the first line drops it. */
export function welcomeHeading(name: string | null | undefined): [string, string] {
  const first = firstNameOf(name);
  return [first ? `Welcome to QueryHawk, ${first}.` : "Welcome to QueryHawk.", WELCOME_SECOND];
}

/* ── Step 2 · the acknowledgement and the title ───────────────────────────────────────────── */
export type V9Stage = "starting" | "early" | "deep" | "interest";
export const STAMP_EYEBROW = "Where you are";
export const STAMP_CHANGE = "Change";

/** One run of a passage line. `em` runs are italic, 600. */
export interface Run { text: string; em?: boolean }
/** The three lines: the first in the typewriter face, the next two in the serif. */
export type Passage = [Run[], Run[], Run[]];
const line = (text: string): Run[] => [{ text }];
const FIRST_TITLE: Run[] = [{ text: "First, your " }, { text: "manuscript title", em: true }, { text: "." }];

export const ACK: Record<V9Stage, Passage> = {
  early: [
    line("Got it. Your campaign is underway."),
    line("QueryHawk picks up from wherever you've got to. In a moment we'll give you hassle-free ways to import whatever list you're working from."),
    FIRST_TITLE,
  ],
  starting: [
    line("Got it. You're at the start."),
    line("QueryHawk records your querying from the first agent you look at. Nothing to piece together later."),
    [{ text: "First, your " }, { text: "manuscript", em: true }, { text: ", if it has a title yet." }],
  ],
  deep: [
    line("Got it. A lot in flight."),
    line("Who has what, and when each one is due a nudge: that's the job QueryHawk does. In a moment we'll give you hassle-free ways to import the list you're working from."),
    FIRST_TITLE,
  ],
  interest: [
    line("Got it. Something's on the table."),
    line("Requests and offers set the pace. QueryHawk keeps them in view alongside everything still waiting. In a moment we'll give you ways to import the list you're working from."),
    FIRST_TITLE,
  ],
};
export const lineText = (runs: readonly Run[]): string => runs.map((r) => r.text).join("");

export const TITLE_LABEL = "Manuscript title";
export const TITLE_PLACEHOLDER = "e.g. The October Test";
export const TITLE_TBC = "Title TBC";
/** What `Title TBC` puts in the field. It is held like any other title until the flow's one write. */
export const UNTITLED = "Untitled manuscript";
export const READINESS_Q = "Your manuscript is…";
export const STILL_WRITING_LEAD = "Still writing?";
export const STILL_WRITING_NOTE =
  "No problem. In the meantime, QueryHawk's smart database is a great place to build up your agent contact list and collate your materials.";

/* ── The typewriter ────────────────────────────────────────────────────────────────────────
   Letter by letter, no cursor. The first line at 38ms a letter, the serif lines at 13ms, and
   220ms more after each full stop. `typeSchedule` gives the moment (ms from the start) at which
   each character of the joined lines has appeared; the last entry is the whole passage's length. */
export const TYPE_LEAD_MS = 38;
export const TYPE_BODY_MS = 13;
export const TYPE_STOP_MS = 220;
export function typeSchedule(lines: readonly string[], leadMs = TYPE_LEAD_MS, bodyMs = TYPE_BODY_MS, stopMs = TYPE_STOP_MS): number[] {
  const at: number[] = [];
  let t = 0;
  lines.forEach((text, li) => {
    const per = li === 0 ? leadMs : bodyMs;
    for (const ch of text) {
      t += per;
      at.push(t);
      if (ch === ".") t += stopMs;
    }
  });
  return at;
}
/** How many characters have appeared by `elapsed` ms. */
export function typedCount(schedule: readonly number[], elapsed: number): number {
  let lo = 0, hi = schedule.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (schedule[mid] <= elapsed) lo = mid + 1; else hi = mid; }
  return lo;
}
