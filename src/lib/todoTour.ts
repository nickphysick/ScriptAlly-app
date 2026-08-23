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
    sel: ".svh-btn-primary",  // notes-and-tasks: the hero's "Add task or note" (the Form-11 primary)
    h: "A note, or a task.",
    p: "Jot a note — pinned, dateless, nothing chases you. Or set a task — give it a date and it joins the work, showing up as early as you like.",
    cta: "Next →",
  },
  {
    /* ⚠️ RETARGETED AND RE-WORDED (rail + workspace P4): the search MOVED into the rail's own
       tools block, so `.tdb-bsearch` matched nothing — and a stop whose selector misses is
       FILTERED OUT silently, which means this step would simply have stopped existing with
       nobody told. Its copy said "from the bar", which was the other half of the same staleness. */
    /* ⚠️ RE-POINTED WITH THE LIST PORT — `.tdw-search` was the rail's own field and went with the
       rail's toolbar; the contract draws the search inside the card as `.l-search`. A tour stop
       whose selector misses is DROPPED IN SILENCE, so this is the kind of rename that costs a stop
       without anything going red. */
    sel: ".l-search",
    h: "Search your list.",
    p: "It narrows the list beside it as you type — the card you are working on stays put. ⌘K from anywhere.",
    cta: "Next →",
  },
  {
    // todo rebuild P1: the filters are bare chips on the control line (the bench slab is gone)
    /* ⚠️ RETARGETED (board+dock P1): `.tdb-ctrl` was the standalone control bar, which is gone —
       its search, the sort, the session launcher and the Add are the header's tool row now. A
       tour stop whose selector matches nothing SKIPS SILENTLY, so it moves with the feature. */
    /* ⚠️ RETARGETED AGAIN (P4): the chips are the RAIL's now, beneath its search, and they are
       the groups rather than the old seven facets. `.tdb-tools` still exists — it is the page's
       sort and Add — so this one would NOT have skipped: it would have pointed confidently at the
       wrong controls and described them correctly. The worse failure of the two. */
    /* ⚠️ RETARGETED AGAIN (corrections, Phase 5): the chip strip folded into the filter MENU, so
       `.tdw-chips` stopped existing. Found by grepping the built bundle before a deploy — the
       census below passed it because an orphaned CSS rule still matched, which is a hole this
       commit also closes. */
    /* re-pointed with the list port — the filter/sort wrappers are the card's `.l-menuwrap` now */
    sel: ".l-menuwrap",
    h: "Narrow the list.",
    p: "Filter and sort sit beside the search. The filter fills with ink while a narrowing is on, so a short list is never a mystery.",
    cta: "Next →",
  },
  {
    // the workspace shell: the review is the underlined link beneath Begin in the hero
    sel: ".tdb-revlink",
    h: "Your week, reviewed.",
    p: "Every box ticked turns the dial in your favour \u2014 open it from the banner, or the chip beneath Begin.",
    cta: "Next →",
  },
  /* ⚠️ THIS STOP IS DEAD AND IS LEFT STANDING (completion-paths Phase 2). None of the three
     classes has been rendered since the board became a grouped list; `.tdb-tile` survived only
     inside `overlayCards`, a renderer with no caller, which is why the census could not see it.
     Retiring it is a product decision — its copy describes hover actions and batches expanding in
     place, so retargeting the selector at a list row would make the tour state something the app
     does not do, and new copy about the list is a decision rather than a repair. Named in
     `todoTour.test.ts`'s KNOWN_STALE and reported. */
  {
    sel: ".tdb-tile, .tdb-gcard, .tdb-lrow",
    h: "Every card works the same.",
    p: "Click to open it. Hover for the actions — Action now, Today\u2019s list, or snooze. Batches expand in place to show every agent.",
    cta: "Next →",
  },
  {
    /* ⚠️ RETARGETED (workspace P3): this stop pointed at `.tdb-today2`, the corner pop-up, which
       is retired — Today is a route now. A tour stop whose selector matches nothing does not
       fail, it silently skips, so the stop had to move with the feature rather than be left to
       rot. It anchors on the app sidebar's To-do group, which is where you actually go. */
    sel: '[aria-expanded][class*="asec"], .ws-navrow',
    h: "Today has its own page.",
    p: "Your committed list, the day\u2019s cleared work and a short bench of suggestions \u2014 under To-do in the sidebar.",
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
