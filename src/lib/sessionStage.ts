/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The focused session's stage maths + timing tokens — THE FINAL, IN-PLACE design
 * (design-refs/session-final.html v6.1): the chrome and the title never leave; the board
 * transforms around them. The GATHER flies every other item onto the first task, the pile
 * morphs to the centred rest position, and the deal runs at the rest line. Pure: the
 * component feeds real geometry in; everything here is unit-testable. The engine (the
 * queue) lives in ToDoPage's boardCards order — this file is presentation arithmetic only.
 *
 * (The dark-room opening — nearest-edge fly-out, canvas veil, wandering spotlight — is
 * SUPERSEDED and removed with the room pack's presentation.)
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One gathered item's flight onto the first task's footprint. */
export interface GatherFly {
  dx: number;
  dy: number;
  scale: number;
  /** degrees — small ALTERNATING rotation, growing with the index, capped at ±6. */
  rot: number;
}

/** The gather law (the ref's maths): centre-align onto the first rect, scale to its footprint. */
export function gatherTransform(item: Rect, first: Rect, i: number): GatherFly {
  return {
    dx: first.left - item.left + (first.width - item.width) / 2,
    dy: first.top - item.top + (first.height - item.height) / 2,
    scale: item.width > 0 ? first.width / item.width : 1,
    rot: (i % 2 ? 1 : -1) * Math.min(6, 1.5 + i * 0.8),
  };
}

/** The per-item stagger, capped so a crowded board still lands inside the budget. */
export function staggerFor(count: number): number {
  if (count <= 1) return 0;
  return Math.min(GATHER.staggerMs, Math.floor(GATHER.staggerBudgetMs / (count - 1)));
}

/** The session card's rest position: the vertical centre of the region below the hero. */
export function restTop(regionH: number, cardH: number): number {
  return Math.max(GATHER.restMinTopPx, (regionH - cardH) / 2 - 14);
}

/** The ritual lines — played in the search's vacated slot (ink-muted; we are on a light page). */
export const RITUAL_LINES = ["Gathering your tasks…", "Stacking the deck…", "Choosing where to start…"] as const;

/**
 * The gather's timing spine (ms). Full length ≤ the 3.5s budget: exits 0–800 · lines
 * 350 + 3×780 · the gather from 900 (stagger capped by budget, flight 650) · the morph 700
 * with the edges settling ~50 after — ≈3.5s at the cap.
 */
export const GATHER = {
  exitMs: 700, // the sidebars' slide-away
  exitSlidePct: 140, // translateX ∓140%
  dissolveMs: 800, // the sheet's white dissolving to transparent
  docBarMs: 550, // the document bar's slide up and out
  searchFadeMs: 400,
  ritualStartMs: 350,
  lineMs: 780,
  gatherStartMs: 900,
  staggerMs: 95,
  staggerBudgetMs: 600, // the whole stagger fits inside this, however many items
  flyMs: 650,
  gatherOpacity: 0.85, // the pile behind the first task
  morphMs: 700, // first-rect → the rest position, mild overshoot
  edgesAtMs: 750, // the deck edges fade in as the morph settles
  restMinTopPx: 24,
  subtitleMs: 500,
  sessionCardW: 500,
  reverseMs: 700, // Back to your desk — the compressed reassembly
  totalBudgetMs: 3500,
} as const;

/** The exit choreography's selectors (the board transforms; the chrome + title stay). */
export const EXIT_LEFT = ".tdb-fside"; // the filter card slides off left
export const EXIT_RIGHT = ".tdb-railr"; // Today slides off right
export const EXIT_FADE = ".tdb-rvbox, .tdb-colo, .tdb-lh2, .tdb-lsech"; // the centre's free cards + the headings fade (v7: the HERO owns the search/pair crossfade — see ToDoPage renderHero)
export const EXIT_BAR = ".tdb-dochead"; // the document bar slides up and out
export const DISSOLVE = ".tdb-mainc, .tdb-lsec"; // white/border/shadow dissolve; the items float
/** The gatherable items — cards, group bars, or ledger rows, whichever view is up. */
export const GATHER_SELECTOR = ".tdb-cell, .tdb-gbar, .tdb-gpage, .tdb-lrow, .tdb-lsub, .tdb-lpage, .tdb-laddrow";

/**
 * THE DEAL's timing spine (session-deal.html option A at the rest line). The stamp lands
 * with its pop, holds the beat, the sheet sweeps off left, and the next rises from the
 * stack 180ms into the sweep; the advance (the session line + next-up) fires WITH the rise.
 */
export const DEAL = {
  stampPopMs: 350, // the sage stamp's scale-pop (rotated −8°)
  stampHoldMs: 520, // the beat before the sweep (the ref's stampThen wait)
  sweepMs: 500, // off left with the tilt
  riseDelayMs: 180, // the next sheet starts rising this far into the sweep
  riseMs: 450, // the rise's mild overshoot (the final pack's figure)
  skipMs: 450, // down and behind — the honest requeue
  skipAdvanceMs: 250, // the next rises mid-slide
  /** At most this many sheet-edges peek beneath the current sheet — never more. */
  deckMax: 2,
} as const;
