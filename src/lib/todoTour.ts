/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTour — the pure layer of the first-visit spotlight tour (design ref:
 * Final Shape P6 rewire — SIX stops: the hero's Begin → the floating search → the rail's
 * pills (or the ⚲ FILTER pill) → the review docband → a card's hover verbs → Today. The last
 * stop's button reads "Done" and ends the tour.
 *
 * The seen flag is `User.tourSeenAt` (ISO timestamp) — the established additive user-doc pattern
 * (the Package Workshop's `hasSeenTour`), written through `updateUserProfile`; NEVER localStorage
 * (it wouldn't follow the writer across devices). Set on completion OR skip.
 */
import { DeskState } from "./todoEmpty";

export interface TourStop {
  /** Runtime target selector on the board. */
  sel: string;
  h: string;
  p: string;
  /** The primary button label ("Next →", or "Done" on the last stop). */
  cta: "Next →" | "Done";
}

export const TOUR_STOPS: TourStop[] = [
  {
    sel: ".tdb-fsb2",  // v4: the button lives in the rail now
    h: "Say go, any time.",
    p: "Begin a focused session — it walks your whole desk for you, one sheet at a time, no distractions.",
    cta: "Next →",
  },
  {
    sel: ".tdb-bigsearch",
    h: "Search floats above it all.",
    p: "One pill for both views — start typing and the desk narrows as you go. ⌘K from anywhere.",
    cta: "Next →",
  },
  {
    // the rail's pills ≥1428; the ⚲ FILTER pill fronting the drawer below
    sel: ".tdb-fpill, .tdb-fpillbtn",
    h: "Narrow the desk.",
    p: "Quiet filters with live counts: click one to see only that kind of work. RESET brings everything back.",
    cta: "Next →",
  },
  {
    sel: ".tdb-docband",
    h: "Your week, reviewed.",
    p: "Last week\u2019s progress report lives here every day. Every box ticked turns the dial in your favour.",
    cta: "Next →",
  },
  {
    sel: ".tdb-tile, .tdb-gcard, .tdb-step",
    h: "Every card works the same.",
    p: "Click to open it. Hover for the quick verbs — done, Today, or later.",
    cta: "Next →",
  },
  {
    sel: ".tdb-today2, .tdb-todaychip",
    h: "Today lives beside your work.",
    p: "Your committed list and everything you\u2019ve done today, struck through as you go.",
    cta: "Done",
  },
];

/**
 * Auto-run once: the flag is absent AND the board is NOT the new desk (a new desk has no targets
 * and nothing to tour — the welcome card is its doorway). A desk-cleared board still auto-runs;
 * missing per-stop targets are filtered at open.
 */
export function shouldAutoRunTour(tourSeenAt: string | undefined | null, desk: DeskState): boolean {
  return !tourSeenAt && desk !== "new-desk";
}
