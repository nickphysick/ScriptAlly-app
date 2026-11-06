/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the Corkboard's pure layer (Corkboard v2, 6 Nov; ref design-refs/corkboard-v13/).
 *
 * The notes, their store and their writes are lib/noteboard's and the app's; this file holds what the Corkboard page
 * ADDS, as functions of their arguments — no db, no React — so the locks call what the page calls.
 *
 * ⚠️ v1's board layer (the cork texture, tilt and pins derived from the id, free placement and `arrange`, the "Your
 *    tasks" card's rows, the add bar's labels) is retired with v1's board (recoverable at ce8aa34ee).
 */
import type { Agent, Manuscript, Query, UserTask } from "../types";
import { MONTHS_SHORT } from "./dates";
import { normaliseTagLabel } from "./todoTags";

/** How many notes carry each tag id; `null` is "All". Read from the UNFILTERED list, like the pills. */
export function chipCounts(notes: readonly Pick<UserTask, "tags">[]): Map<string | null, number> {
  const out = new Map<string | null, number>([[null, notes.length]]);
  for (const n of notes) for (const t of new Set(n.tags ?? [])) out.set(t, (out.get(t) ?? 0) + 1);
  return out;
}

/** the one-shot key the To-do list reads on arrival: open THIS task in its pane (ToDoPage, TodoTray) */
export const TODO_OPEN_TASK_KEY = "sa.todoOpenTask";

/* ══ Corkboard v2 (6 Nov; ref design-refs/corkboard-v13/) — a wall of post-its, with piles ══════════════════════
   Everything the v2 page states comes from these pure functions, so the locks call what the page calls. */

export type BoardView = "board" | "piles";
export type BoardSort = "mine" | "new" | "old" | "colour";
export interface BoardPrefs { view: BoardView; sort: BoardSort; order: string[]; started: string[] }

/**
 * The v2 preferences, read TOTALLY from `todoPrefs.noteboard`. v1's `free` / `tidy` read as `board`; an absent or
 * unknown sort reads `new`. `layout` and `dismissedExamples` are no longer read (they stay on the document).
 */
export function boardPrefs(user: { todoPrefs?: { noteboard?: { view?: unknown; sort?: unknown; order?: unknown; started?: unknown } } } | undefined | null): BoardPrefs {
  const raw = user?.todoPrefs?.noteboard;
  const sort: BoardSort = raw?.sort === "mine" || raw?.sort === "old" || raw?.sort === "colour" || raw?.sort === "new" ? raw.sort : "new";
  const order = Array.isArray(raw?.order) ? (raw!.order as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const started = Array.isArray(raw?.started) ? (raw!.started as unknown[]).filter((x): x is string => typeof x === "string" && !!x) : [];
  return { view: raw?.view === "piles" ? "piles" : "board", sort, order, started };
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
export function piles<T extends Pick<UserTask, "tags">>(notes: readonly T[], label: (id: string) => string, started: readonly string[] = []): Pile<T>[] {
  const m = new Map<string, T[]>();
  /* Corkboard v2.1: a pile started here with no notes yet is listed, empty (the caller passes only tags that exist) */
  for (const k of started) if (k) m.set(k, []);
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

/**
 * The drawing in the header's ring. ⚠️ NULL UNTIL NICK'S ILLUSTRATOR DELIVERS IT: the ring then shows the dashed
 * "Art to come" slot at the drawing's own box, so nothing moves when the image lands. Set this to its public path.
 */
export const CORKBOARD_RING_ART: string | null = null;

/* ── moved here when To-do list v51 retired the desk's compose card (v5/ComposeCard), which held them ── */
export type ComposeLink = { kind: "query" | "agent" | "manuscript"; id: string; label: string; sub: string };
/**
 * The note pop-up's link finder: queries (named by their agent), then agents, then manuscripts, filtered by `find` and
 * capped at 40. It was the desk compose card's finder, word for word; v51's own picker links agents and queries only,
 * and a note may also be linked to a manuscript.
 */
export function linkOptions(queries: Query[], agents: Agent[], manuscripts: Manuscript[], find: string): ComposeLink[] {
  const q = find.trim().toLowerCase();
  const out: ComposeLink[] = [
    ...queries.map((x) => {
      const a = agents.find((y) => y.id === x.agentId);
      const name = (a?.name || a?.agency || "A query").trim();
      return { kind: "query" as const, id: x.id, label: name, sub: [a?.agency, String(x.status)].filter(Boolean).join(" · ") };
    }),
    ...agents.map((a) => ({ kind: "agent" as const, id: a.id, label: (a.name || a.agency || "An agent").trim(), sub: [a.agency, "Agent"].filter(Boolean).join(" · ") })),
    ...manuscripts.map((m) => ({ kind: "manuscript" as const, id: m.id, label: m.title || "A manuscript", sub: "Manuscript" })),
  ];
  return (q ? out.filter((l) => `${l.label} ${l.sub}`.toLowerCase().includes(q)) : out).slice(0, 40);
}
const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOfYmd = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y, m - 1, d, 12); };
export const plusDays = (ymd: string, n: number) => { const d = dayOfYmd(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };
/** the Sunday that ends this week (Monday to Sunday); today, on a Sunday */
export const sundayOf = (todayYmd: string): string => plusDays(todayYmd, (7 - dayOfYmd(todayYmd).getDay()) % 7);
/** Turn into a task's three quick answers, each "by" a Sunday */
export const DUE_CHIPS = [
  { k: "this" as const, label: "This week", add: 0 },
  { k: "next" as const, label: "Next week", add: 7 },
  { k: "later" as const, label: "Later", add: 14 },
];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Sun 18 Oct" — the month from the app's one month table (lib/dates) */
export const dayLabel = (ymd: string) => { const d = dayOfYmd(ymd); return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/* ── Corkboard v2.1: starting a pile ── */
/** The Start a pile pop-up's suggestions, in the ref's order; those already piles are left out (up to six shown). */
export const PILE_SUGGESTIONS = ["agents", "letter", "synopsis", "comps", "ideas", "research", "to-check"] as const;
/** A typed pile name → the tag label it mints: no "#", spaces as hyphens, then the app's own tag normaliser. */
export const pileSlug = (raw: string): string => normaliseTagLabel(raw.trim().replace(/^#+/, "").replace(/\s+/g, "-"));
/** The started-here tags that are still empty: a started pile that has gained a note leaves the list. */
export function stillStarted(started: readonly string[], notes: readonly Pick<UserTask, "tags">[]): string[] {
  const used = new Set(notes.map(pileOf).filter(Boolean));
  return started.filter((k) => !used.has(k));
}
