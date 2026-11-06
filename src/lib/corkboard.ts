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
export const PAD_LABEL = { butter: "Pin a butter note", blush: "Pin a blush note", powder: "Pin a powder note", sand: "Pin a sand note", stone: "Pin a stone note" } as const;

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

/* ── the "Your tasks" card (Part D) ─────────────────────────────────────────────────────────── */

export const TASKS_CARD_MAX = 6;
export const TASKS_DONE_DAYS = 7;
/** the one-shot key the To-do list reads on arrival: open THIS task in its pane (see ToDoPage) */
export const TODO_OPEN_TASK_KEY = "sa.todoOpenTask";

export interface OwnTaskRow { id: string; text: string; dueDate: string; done: boolean }
export interface OwnTasks { rows: OwnTaskRow[]; total: number; more: boolean }

/**
 * The writer's own DATED tasks that are not already on the board as notes: open first, by date; then the
 * ones finished in the last 7 days. At most six rows; `more` says there are others on the To-do list.
 *
 * ⚠️ A DATED TASK WITH A PAPER IS A NOTE (lib/noteboard `sortNotes`: the note that became a task keeps its
 * place on the board and wears the stitched badge), so it is NOT listed here — one object, drawn once.
 * ⚠️ A DATELESS TASK IS A NOTE TOO (the two-natures law), finished or not, and is never a row.
 */
export function ownTaskRows(tasks: readonly UserTask[], nowMs: number): OwnTasks {
  const own = tasks.filter((t) => !!t.dueDate && t.colour === undefined);
  const open = own.filter((t) => !t.done).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : (a.createdAt || "").localeCompare(b.createdAt || "")));
  const since = nowMs - TASKS_DONE_DAYS * 86400000;
  const done = own
    .filter((t) => t.done && Number.isFinite(Date.parse(t.completedAt ?? "")) && Date.parse(t.completedAt!) >= since)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const all = [...open, ...done].map((t) => ({ id: t.id, text: t.text, dueDate: t.dueDate!, done: t.done }));
  return { rows: all.slice(0, TASKS_CARD_MAX), total: all.length, more: all.length > TASKS_CARD_MAX };
}

/* ══ Corkboard v2 (6 Nov; ref design-refs/corkboard-v13/) — a wall of post-its, with piles ══════════════════════
   Everything the v2 page states comes from these pure functions, so the locks call what the page calls. */

export type BoardView = "board" | "piles";
export type BoardSort = "mine" | "new" | "old" | "colour";
export interface BoardPrefs { view: BoardView; sort: BoardSort; order: string[] }

/**
 * The v2 preferences, read TOTALLY from `todoPrefs.noteboard`. v1's `free` / `tidy` read as `board`; an absent or
 * unknown sort reads `new`. `layout` and `dismissedExamples` are no longer read (they stay on the document).
 */
export function boardPrefs(user: { todoPrefs?: { noteboard?: { view?: unknown; sort?: unknown; order?: unknown } } } | undefined | null): BoardPrefs {
  const raw = user?.todoPrefs?.noteboard;
  const sort: BoardSort = raw?.sort === "mine" || raw?.sort === "old" || raw?.sort === "colour" || raw?.sort === "new" ? raw.sort : "new";
  const order = Array.isArray(raw?.order) ? (raw!.order as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return { view: raw?.view === "piles" ? "piles" : "board", sort, order };
}

export const SORT_LABEL: Readonly<Record<BoardSort, string>> = { mine: "My order", new: "Newest first", old: "Oldest first", colour: "By colour" };
export const SORTS: readonly BoardSort[] = ["mine", "new", "old", "colour"];

/** A note's link: at most one of the three is set (the page never writes two). */
export type NoteLink = { kind: "agent" | "query" | "manuscript"; id: string };
export function linkOf(n: Pick<UserTask, "agentId" | "queryId" | "manuscriptId">): NoteLink | null {
  if (n.queryId) return { kind: "query", id: n.queryId };
  if (n.agentId) return { kind: "agent", id: n.agentId };
  if (n.manuscriptId) return { kind: "manuscript", id: n.manuscriptId };
  return null;
}
/**
 * The link fields for a write that sets `link` (or clears every link with null): the chosen one carries its id, the
 * other two are cleared, so a note never ends up carrying two. `null` here means "clear" (updateUserTask's convention).
 */
export function linkFields(link: NoteLink | null): { agentId: string | null; queryId: string | null; manuscriptId: string | null } {
  return {
    agentId: link?.kind === "agent" ? link.id : null,
    queryId: link?.kind === "query" ? link.id : null,
    manuscriptId: link?.kind === "manuscript" ? link.id : null,
  };
}

/** A note's pile: its FIRST tag id, or "" for Loose notes. Piles are tags; there is no second grouping. */
export const pileOf = (n: Pick<UserTask, "tags">): string => n.tags?.[0] ?? "";

/** The header's three glance figures. "Linked" is any link (agent, query or manuscript), as the ref counts it. */
export interface Glance { linked: number; onTodo: number; pinned: number }
export function glance(notes: readonly Pick<UserTask, "agentId" | "queryId" | "manuscriptId" | "dueDate" | "pinned">[]): Glance {
  let linked = 0, onTodo = 0, pinned = 0;
  for (const n of notes) {
    if (linkOf(n)) linked++;
    if (n.dueDate) onTodo++;
    if (n.pinned) pinned++;
  }
  return { linked, onTodo, pinned };
}
export type GlanceKey = keyof Glance;
/** Does a note belong to a glance row (the header's filter)? */
export function inGlance(n: Pick<UserTask, "agentId" | "queryId" | "manuscriptId" | "dueDate" | "pinned">, k: GlanceKey): boolean {
  return k === "linked" ? !!linkOf(n) : k === "onTodo" ? !!n.dueDate : !!n.pinned;
}
/** The rows the header shows, in order, each with its words; a row at zero is not shown. */
export function glanceRows(g: Glance): { k: GlanceKey; n: number; words: string }[] {
  const rows: { k: GlanceKey; n: number; words: string }[] = [
    { k: "linked", n: g.linked, words: g.linked === 1 ? "linked to an agent" : "linked to agents" },
    { k: "onTodo", n: g.onTodo, words: "on your to-do list" },
    { k: "pinned", n: g.pinned, words: "pinned to top" },
  ];
  return rows.filter((r) => r.n > 0);
}

/** The header's sentence, as runs: `b` is bold. */
export function boardSentence(count: number, onTodo: number): { t: string; b?: true }[] {
  if (count === 0) return [{ t: "Jot down anything worth remembering while you query." }];
  const out: { t: string; b?: true }[] = count === 1
    ? [{ t: "One", b: true }, { t: " note on your board." }]
    : [{ t: String(count), b: true }, { t: " notes on your board." }];
  if (onTodo > 0) out.push({ t: " " }, { t: String(onTodo), b: true }, { t: onTodo === 1 ? " is on your to-do list." : " are on your to-do list." });
  return out;
}

const PAPER_ORDER = ["butter", "blush", "powder", "sand", "stone"];
/**
 * The wall's order. ⚠️ PINNED NOTES ARE ALWAYS FIRST, in every sort, and the sort orders each half: My order is the
 * writer's stored order (anything unplaced newest first), By colour is the five papers' order then newest first.
 * `paper` is passed in (lib/noteboard's mapping) so this file never holds a second colour table.
 */
export function sortBoard<T extends Pick<UserTask, "id" | "createdAt" | "pinned">>(
  notes: readonly T[], sort: BoardSort, order: readonly string[], paper: (n: T) => string,
): T[] {
  const newest = (a: T, b: T) => (b.createdAt || "").localeCompare(a.createdAt || "");
  let list: T[];
  if (sort === "mine") {
    const rank = new Map<string, number>();
    order.forEach((id, i) => { if (!rank.has(id)) rank.set(id, i); });
    list = [...notes].sort((a, b) => {
      const ra = rank.get(a.id), rb = rank.get(b.id);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return newest(a, b);
    });
  } else if (sort === "old") list = [...notes].sort((a, b) => -newest(a, b));
  else if (sort === "colour") list = [...notes].sort((a, b) => PAPER_ORDER.indexOf(paper(a)) - PAPER_ORDER.indexOf(paper(b)) || newest(a, b));
  else list = [...notes].sort(newest);
  return [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)];
}

/**
 * Move `from` before (or after) `target` in the list as SHOWN. The whole shown list becomes the stored order, so the
 * first drag in another sort fixes the order the writer was looking at. Total: the same ids out as in.
 */
export function dropOrder(shown: readonly string[], from: string, target: string, after: boolean): string[] {
  if (from === target || !shown.includes(from) || !shown.includes(target)) return [...shown];
  const next = shown.filter((id) => id !== from);
  const ti = next.indexOf(target);
  next.splice(after ? ti + 1 : ti, 0, from);
  return next;
}
/** Move to the front or the back of the list as shown. */
export function frontBack(shown: readonly string[], id: string, where: "front" | "back"): string[] {
  const rest = shown.filter((x) => x !== id);
  return where === "front" ? [id, ...rest] : [...rest, id];
}

/** Piles, A to Z by the tag's label, Loose notes last. `label` resolves a tag id. */
export interface Pile<T> { k: string; notes: T[] }
export function piles<T extends Pick<UserTask, "tags">>(notes: readonly T[], label: (id: string) => string): Pile<T>[] {
  const m = new Map<string, T[]>();
  for (const n of notes) { const k = pileOf(n); if (!m.has(k)) m.set(k, []); m.get(k)!.push(n); }
  const keys = [...m.keys()].filter((k) => k).sort((a, b) => label(a).localeCompare(label(b)));
  if (m.has("")) keys.push("");
  return keys.map((k) => ({ k, notes: m.get(k)! }));
}
/** A note moved onto pile `k`: `k` becomes its first tag and every other tag stays ("" = Loose: the first tag goes). */
export function tagsForPile(tags: readonly string[] | undefined, k: string): string[] {
  const rest = (tags ?? []).slice(1).filter((t) => t !== k);
  return k ? [k, ...rest] : rest;
}

/** A note longer than this many lines is cut on the wall, with "Read all". */
export const LINE_CLAMP = 8;
