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
  return Math.max(GATHER.restMinTopPx, (regionH - cardH) / 2 - 10);
}

/**
 * v9 — THE SPACING LAW. The session's content region begins a CLEAR BAND below the hero's
 * progress row and ends at the stage foot (the quiet exit line's reserved strip). Nothing is
 * ever absolutely positioned over anything: the band is real space.
 *   heroBottom → the measured bottom of the progress row
 *   viewportH  → window.innerHeight
 * Returns the region's top and height; the page then centres inside it (restTop).
 */
export function sessionRegion(heroBottom: number, viewportH: number): { top: number; height: number } {
  const top = heroBottom + FRAME.bandPx;
  return { top, height: Math.max(FRAME.regionMinPx, viewportH - top - FRAME.footPx) };
}

/**
 * v9 — THE FRAME (session-v9-journey.html + session-v9-header.html V2). The app bar is
 * exempt: the curtains and the dim begin at its bottom edge, never over it. The hero carries
 * "In focus" over a thin progress bar with a Playfair fraction; no kicker, no other text.
 */
export const FRAME = {
  bandPx: 48, // the minimum clear band below the progress row before any session content
  footPx: 76, // the stage foot reserved for the quiet exit line (28 above the bottom + its hit area)
  regionMinPx: 200,
  progWidthPx: 340, // the progress row's width (V2)
  progTrackPx: 4, // the bar's height — ink fill on #ddd2c2
} as const;

/** The progress bar's fill for task i of n (i is 1-based; the first task already shows a sliver). */
export function progressPct(i: number, n: number): number {
  if (n <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((i / n) * 100)));
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
  exitSlidePct: 150, // translateX ∓150% (v7)
  dissolveMs: 800, // the sheet's white dissolving to transparent
  docBarMs: 550, // the document bar's slide up and out
  searchFadeMs: 400,
  ritualStartMs: 350,
  lineMs: 780,
  gatherStartMs: 900,
  staggerMs: 90, // v7
  staggerBudgetMs: 600, // the whole stagger fits inside this, however many items
  flyMs: 650,
  gatherOpacity: 0.85, // the pile behind the first task
  morphMs: 700, // first-rect → the rest position, mild overshoot
  edgesAtMs: 750, // the composed session lands as the morph settles
  restMinTopPx: 20, // v7 — min top clearance below the hero
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
 * v7 — THE CURTAINS + THE DIM (session-v7.html). The ink panels close in from the screen
 * edges; a slight wash dims the work area (never the card). Width: 200px at ≥1500px viewport,
 * else proportional (~13vw, floor 96) so a laptop keeps the curtains narrower.
 */
export function curtainWidth(vw: number): number {
  return vw >= 1500 ? 200 : Math.max(96, Math.round(vw * 0.13));
}
export const CURTAIN = {
  closeMs: 1100, // the panels close (and withdraw) over this
  dimMs: 900, // the wash settles / lifts
  dimDelayMs: 500, // the dim follows the curtains starting to close
  dim: 0.16, // rgba(58,28,20,.16) — SLIGHT (no vignette, no heavy dark)
  fullWidthVw: 1500,
  fullWidthPx: 200,
  floorPx: 96,
} as const;

/**
 * v7 — THE CARRIAGE (session-v7.html transition A, the straight carriage): on handled the
 * sage stamp lands and holds, then the card slides straight out LEFT while the NEXT slides
 * straight in from the RIGHT, overlapping in flight; the session line increments in sync.
 * Skip: no stamp — the same out-left slide, the engine's requeue deciding what slides in.
 */
export const CARRIAGE = {
  stampPopMs: 350, // the sage stamp's scale-pop (rotated −8°)
  stampHoldMs: 440, // the beat before the slide (handled only)
  slideOutMs: 500, // the outgoing card slides straight out left
  slideInMs: 500, // the incoming card slides straight in from the right
  overlapMs: 170, // the incoming starts this far into the out-slide (they overlap)
} as const;
