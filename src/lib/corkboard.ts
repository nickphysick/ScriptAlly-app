/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the Corkboard's pure layer (Corkboard v1; ref design-refs/corkboard-v4/corkboard-v4.html).
 *
 * The Corkboard is the Noteboard renamed and redrawn: the notes, their store and their writes are
 * lib/noteboard's and are not restated here. This file holds what the cork board ADDS, as functions of their
 * arguments — no db, no React — so the locks call what the page calls.
 */
import type { LivingLine } from "./livingLine";
import type { UserTask } from "../types";

/* ── the header (a number page) ─────────────────────────────────────────────────────────────── */

export const CORKBOARD_SUBLINE = "Notes to self and your own tasks, kept in one place.";

/**
 * "8 notes pinned to your corkboard" / "One note pinned to your corkboard". The panel shows the count as its
 * number and the rest as its words (PanelHeader.wordsOf), so the singular is the words' business alone.
 * ⚠️ THE COUNT IS THE BOARD'S, NEVER THE FILTER'S: a search or a tag chip fades notes, it does not unpin them.
 */
export function corkboardHeaderCopy(count: number): LivingLine {
  return {
    headline: count === 1 ? "One note pinned to your corkboard" : `${count} notes pinned to your corkboard`,
    subline: [CORKBOARD_SUBLINE],
  };
}

/** The zero-notes header (header v3's empty rule): the page's name is in the bar, the heading is the situation. */
export const CORKBOARD_EMPTY = { heading: "Nothing pinned yet", subline: CORKBOARD_SUBLINE } as const;

/* ── the filter row ─────────────────────────────────────────────────────────────────────────── */

/** How many notes carry each tag id; `null` is "All". Read from the UNFILTERED list, like the chips. */
export function chipCounts(notes: readonly Pick<UserTask, "tags">[]): Map<string | null, number> {
  const out = new Map<string | null, number>([[null, notes.length]]);
  for (const n of notes) for (const t of new Set(n.tags ?? [])) out.set(t, (out.get(t) ?? 0) + 1);
  return out;
}

/** The three paper squares in the add bar, in the composer's own order, with the words a screen reader hears. */
export const PAD_LABEL = { yellow: "Pin a yellow note", pink: "Pin a pink note", sage: "Pin a sage note" } as const;

/* ── the board (Part C) ─────────────────────────────────────────────────────────────────────── */

/**
 * The cork's two noise layers, BYTE FOR BYTE from the ref's `--tex` (a dark fleck over a pale fleck).
 * ⚠️ A TS CONSTANT, APPLIED INLINE — never a rule in the stylesheet: the Tailwind v4 CSS parser has rejected a
 * data-URI in a .css file here before, and a texture that fails to parse leaves a flat brown board with no
 * error. corkboard.test.ts compares this string with the ref's.
 */
export const CORK_TEXTURE =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' seed='11'/%3E%3CfeColorMatrix values='0 0 0 0 .24  0 0 0 0 .13  0 0 0 0 .05  0 0 0 1.5 -.62'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='340'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.5' numOctaves='3' seed='29'/%3E%3CfeColorMatrix values='0 0 0 0 .93  0 0 0 0 .78  0 0 0 0 .56  0 0 0 1.3 -.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const NOTE_W = 204;
export const CARD_W = 272;
export const COMPOSE_W = 300;
/** the board's inner height never falls below this, and grows to the lowest item plus `BOARD_FOOT` */
export const BOARD_MIN_H = 790;
export const BOARD_FOOT = 60;
/** an item stays this far inside the board: the sides allow for its tilt, the top for its pin */
export const EDGE = { x: 8, top: 12, bottom: 8 } as const;
/** the layout key of the one "Your tasks" card (never a note id: ids are [A-Za-z0-9_-] and never start "__") */
export const TASKS_KEY = "__tasks";

/** FNV-1a over the id, then an avalanche: the one source of everything "derived from the note's id". Never stored. */
export function idHash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  /* ⚠️ THE FINALISER IS LOAD-BEARING. Bare FNV-1a barely moves its HIGH bits when only the last character
     changes, and ids differ in exactly that way (`…-n1`, `…-n2`): read as a fraction, eight notes drew
     eight navy pins at one tilt (seen on the first render, not reasoned). This is murmur3's avalanche. */
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
/** a second, independent draw from the same id */
const draw = (id: string, salt: string) => idHash(`${salt}:${id}`) / 0xffffffff;

/** The tilt, in degrees: −2.6 … +2.6 in tenths, the same on every render. */
export function tiltFor(id: string): number {
  return Math.round((draw(id, "tilt") * 5.2 - 2.6) * 10) / 10;
}

export const PIN_COLOURS = ["#b9683c", "#2d3a50", "#6A89A7"] as const;
export type Fixing = { kind: "pin"; colour: (typeof PIN_COLOURS)[number] } | { kind: "tape"; tape: "slate" | "cream" };
/** About three notes in four are pinned (rust, navy or slate); the rest are taped (slate or cream). */
export function fixingFor(id: string): Fixing {
  const r = draw(id, "fix");
  if (r < 0.75) return { kind: "pin", colour: PIN_COLOURS[Math.min(2, Math.floor(draw(id, "pin") * 3))] };
  return { kind: "tape", tape: draw(id, "tape") < 0.5 ? "slate" : "cream" };
}

/** A saved place: `x` is the item's left edge as a fraction of the board's inner width, `y` its top in px. */
export interface CorkPos { x: number; y: number }
export type CorkView = "free" | "tidy";
export interface CorkPrefs { layout: Record<string, CorkPos>; view: CorkView }

/**
 * The Corkboard's own preferences, read TOTALLY: anything missing or malformed is its default. They live
 * beside `order` in `todoPrefs.noteboard` (the user document; `todoPrefs` is an unconstrained map in the rules).
 * ⚠️ A PREFERENCE, NEVER A SOURCE — the same law as `order`: the map names ids, the notes are still the notes.
 */
export function corkPrefs(user: { todoPrefs?: { noteboard?: { layout?: unknown; view?: unknown } } } | undefined | null): CorkPrefs {
  const raw = user?.todoPrefs?.noteboard;
  const layout: Record<string, CorkPos> = {};
  if (raw?.layout && typeof raw.layout === "object") {
    for (const [k, v] of Object.entries(raw.layout as Record<string, unknown>)) {
      const p = v as { x?: unknown; y?: unknown } | null;
      if (p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)) layout[k] = { x: p.x, y: p.y };
    }
  }
  return { layout, view: raw?.view === "tidy" ? "tidy" : "free" };
}

export interface Size { w: number; h: number }
export interface Placed { left: number; top: number; saved: boolean }
export interface Arrangement { at: Record<string, Placed>; height: number; columns: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(Math.max(lo, hi), v));
/** Keep an item's left edge inside a board `W` wide. */
export const clampLeft = (left: number, w: number, W: number) => Math.round(clamp(left, EDGE.x, W - w - EDGE.x));
/** Keep an item's top inside a board `H` tall (a drag cannot leave the board). */
export const clampTop = (top: number, h: number, H: number) => Math.round(clamp(top, EDGE.top, H - h - EDGE.bottom));
/** Where a saved place is drawn on a board `W` wide: `x` scales with the width and is clamped inside it. */
export const savedLeft = (pos: CorkPos, w: number, W: number) => clampLeft(pos.x * W, w, W);
/** The place to save for an item drawn at `left`, `top`. */
export const toPos = (left: number, top: number, W: number): CorkPos => ({ x: W > 0 ? Math.round(clamp(left / W, 0, 1) * 10000) / 10000 : 0, y: Math.round(Math.max(0, top)) });

const COL = 290, TOP = 30, GAP = 38, JITTER = 14;
export const columnsFor = (W: number) => Math.max(1, Math.floor(W / COL));
/** the hand-pinned offset of an unsaved item: ±14px each way, from its id */
export const jitterFor = (id: string) => ({ dx: Math.round(draw(id, "jx") * 2 * JITTER - JITTER), dy: Math.round(draw(id, "jy") * 2 * JITTER - JITTER) });

const hits = (a: { left: number; top: number; w: number; h: number }, b: { left: number; top: number; w: number; h: number }, pad: number) =>
  a.left < b.left + b.w + pad && b.left < a.left + a.w + pad && a.top < b.top + b.h + pad && b.top < a.top + a.h + pad;

/**
 * Where everything is drawn.
 *
 * FREE: an item with a saved place is drawn there. An item with none takes the FIRST FREE SPACE — the column
 * whose earliest gap is highest — in the order given (the board's own `orderNotes`), then a small id-derived
 * jitter, so an unarranged board is the built order flowed into columns and looks pinned by hand. Defaults
 * are computed here and never written.
 * TIDY: every item straight, flowed into columns in the order given (the old masonry); saved places are kept
 * in the preferences and simply not read, so switching back restores them.
 *
 * ⚠️ TOTAL OVER `keys`: a saved entry for a key that is not in `keys` places nothing, and a key with no
 * entry is still placed. The map can never hide a note or draw one that is not there.
 */
export function arrange(keys: readonly string[], size: (key: string) => Size, saved: Readonly<Record<string, CorkPos>>, W: number, view: CorkView): Arrangement {
  const n = columnsFor(W), cw = W / n;
  const at: Record<string, Placed> = {};
  let low = 0;
  if (view === "tidy") {
    const h = Array.from({ length: n }, () => TOP);
    for (const k of keys) {
      const s = size(k), c = h.indexOf(Math.min(...h));
      at[k] = { left: Math.max(0, Math.round(c * cw + (cw - s.w) / 2)), top: h[c], saved: false };
      h[c] += s.h + GAP;
      low = Math.max(low, at[k].top + s.h);
    }
    return { at, height: Math.max(BOARD_MIN_H, low + BOARD_FOOT), columns: n };
  }
  const placed: { left: number; top: number; w: number; h: number }[] = [];
  for (const k of keys) {
    const p = saved[k]; if (!p) continue;
    const s = size(k);
    at[k] = { left: savedLeft(p, s.w, W), top: Math.max(EDGE.top, Math.round(p.y)), saved: true };
    placed.push({ left: at[k].left, top: at[k].top, w: s.w, h: s.h });
  }
  for (const k of keys) {
    if (at[k]) continue;
    const s = size(k);
    let best = { left: 0, top: Infinity };
    for (let c = 0; c < n; c++) {
      const left = Math.max(EDGE.x, Math.round(c * cw + (cw - s.w) / 2));
      let top = TOP;
      for (let guard = 0; guard < 500; guard++) {
        const blocker = placed.find((b) => hits({ left, top, w: s.w, h: s.h }, b, GAP / 2));
        if (!blocker) break;
        top = blocker.top + blocker.h + GAP;
      }
      if (top < best.top) best = { left, top };
    }
    placed.push({ left: best.left, top: best.top, w: s.w, h: s.h });
    const j = jitterFor(k);
    at[k] = { left: clampLeft(best.left + j.dx, s.w, W), top: Math.max(EDGE.top, best.top + j.dy), saved: false };
  }
  for (const k of keys) low = Math.max(low, at[k].top + size(k).h);
  return { at, height: Math.max(BOARD_MIN_H, low + BOARD_FOOT), columns: n };
}
