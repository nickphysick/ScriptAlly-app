/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTour — the pure layer of the first-visit spotlight tour (design ref:
 * Final Shape P6 rewire — SIX stops: the hero's Begin → the floating search → the rail's
 * pills (or the ⚲ FILTER pill) → the review chip → a card's hover actions → Today. The last
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
    sel: ".spine-rail",  // the hardback spine: the category rail
    h: "Your whole workspace, spined.",
    p: "Switch between Dashboard, Querying, Agents and Manuscripts from the rail — you're in Querying now.",
    cta: "Next →",
  },
  {
    sel: ".tdb-herobegin",  // the workspace shell: Begin sits on the hero's right, over the subtitle
    h: "Say go, any time.",
    p: "Begin a focused session — it walks your whole desk for you, one sheet at a time, no distractions.",
    cta: "Next →",
  },
  {
    sel: ".tdb-hsearch",  // centring/search: the big pill is centred in the panel header
    h: "Search from the bar.",
    p: "One pill for both views — start typing and the desk narrows as you go. ⌘K from anywhere.",
    cta: "Next →",
  },
  {
    // panel-final: the filters are the chip bench in the panel's context zone
    sel: ".spine-bench",
    h: "Narrow the desk.",
    p: "Quiet filters with live counts in the panel: click one to see only that kind of work. Show all brings everything back.",
    cta: "Next →",
  },
  {
    // the workspace shell: the review is the underlined link beneath Begin in the hero
    sel: ".tdb-revlink",
    h: "Your week, reviewed.",
    p: "Every box ticked turns the dial in your favour \u2014 open it from the banner, or the chip beneath Begin.",
    cta: "Next →",
  },
  {
    sel: ".tdb-tile, .tdb-gcard, .tdb-lrow",
    h: "Every card works the same.",
    p: "Click to open it. Hover for the actions — Action now, Today\u2019s list, or snooze. Batches expand in place to show every agent.",
    cta: "Next →",
  },
  {
    sel: ".tdb-today2",  // the shell: Today lives in the corner pop-up
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
