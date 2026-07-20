/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTour — the pure layer of the first-visit spotlight tour (design ref:
 * Deck v2 P5 rewire — SIX stops over the definitive page: post-its → the resident review
 * banner → the deck pills → the rail's Focus square → a card (the hover verbs) → Today. The
 * last stop's button reads "Done" and ends the tour.
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
    sel: ".tdb-postits",
    h: "Your desk, counted.",
    p: "Three post-its, three kinds of work: pressing things, tidy-up jobs, and your own notes. Tap one to see only that pile — tap again for everything.",
    cta: "Next →",
  },
  {
    // Deck v2: the review banner is a strip resident — always here, never dismissed.
    sel: ".tdb-rvhead",
    h: "Your week, reviewed.",
    p: "Last week\u2019s progress report lives here every day. Every box ticked turns the dial in your favour.",
    cta: "Next →",
  },
  {
    // the deck's quiet pill rail (the first pill anchors the spotlight)
    sel: ".tdb-pt",
    h: "Narrow the desk.",
    p: "Quiet filters: click one to see only that kind of work. RESET brings everything back.",
    cta: "Next →",
  },
  {
    // the rail's Focus square (or the icon rail's ▶ below 1420)
    sel: ".tdb-lrail",
    h: "Or just say go.",
    p: "Focus mode walks your whole desk for you, one sheet at a time — no distractions.",
    cta: "Next →",
  },
  {
    sel: ".tdb-tile, .tdb-gcard",
    h: "Every card works the same.",
    p: "Click a card to open it. Hover for the quick verbs — done, Today, or later.",
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
