/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTour — the pure layer of the first-visit spotlight tour (design ref:
 * design-refs/todo-onboarding-tour.html, ACT 1 ONLY — the Act-2 desk-walk sheets are DROPPED by
 * the pack). Five stops, copy VERBATIM from the ref; the 5th stop's button reads "Done" (not the
 * ref's "Try it →") and ends the tour.
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
    p: "Three post-its, three kinds of work: pressing things, tidy-up jobs, and your own notes. Tap one to jump to its pile.",
    cta: "Next →",
  },
  {
    sel: "#tdb-lane-do",
    h: "Urgent — where your move matters.",
    p: "Requests, deadlines and offers land here, most pressing first. Click any card to work through it, one question at a time.",
    cta: "Next →",
  },
  {
    sel: "#tdb-lane-do .tdb-pill",
    h: "Build a list you’ll finish.",
    p: "Commit up to five things to today. Small on purpose — a finished list beats a long one.",
    cta: "Next →",
  },
  {
    sel: ".tdb-fab",
    h: "Today lives in the corner.",
    p: "Your committed list and everything you’ve done today, struck through as you go. Watch the ring fill.",
    cta: "Next →",
  },
  {
    sel: ".tdb-ribbon .tdb-btn-pri",
    h: "Or just say go.",
    p: "This walks your urgent pile for you — one sheet at a time, nothing saved until you approve the lot.",
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
