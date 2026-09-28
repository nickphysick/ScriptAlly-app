/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ TO-DO LIST v2 — THE PAGE'S PURE MODEL (ref design-refs/todo-list-v2.html) ══════════════════
 *
 * Three tiles, rows, the When buckets, and the Filter · Group · Sort the controls row offers. Every
 * input is a fact some other derivation already owns — the card's category (`taskCategory`), its
 * due day (`dueFor` → `taskDue`), its two date cells (`ticketFacts`) — so nothing here decides
 * anything the rest of the app might come to disagree with. This file ARRANGES; it does not derive.
 *
 * ⚠️ THREE TILES, NOT SEVEN, AND NO CATEGORY IS LOST. Your move folds agent requests and your own
 * tasks; Chase or close folds nudges and gone quiet; Housekeeping is itself. Each tile states its
 * constituents in its sub-line, and the constituents partition the tile's count by construction —
 * `tileCounts` counts each card ONCE, into exactly one category.
 *
 * ⚠️ "PAST THE DATE", NEVER THE O-WORD. The page reports; it does not appraise. The word is kept out
 * of every label this file exports, and the page's rendered text is swept for it by
 * `tests/e2e/todoV2.measure.ts`.
 */
import type { BoardCard } from "./todoBoard";
import { CATEGORY_TAG, taskCategory, type Category } from "./todoCategory";
import { cardBucket } from "./todoBuckets";

/* ── tiles ─────────────────────────────────────────────────────────────────────────────────── */

export type Tile = "move" | "chase" | "house";
export const TILES: Tile[] = ["move", "chase", "house"];
export const TILE_LABEL: Record<Tile, string> = { move: "Your move", chase: "Chase or close", house: "Housekeeping" };
/** The page opens on Your move (the brief). */
export const DEFAULT_TILE: Tile = "move";

/** Which tile a category belongs to — exhaustive, so a sixth category cannot arrive tileless. */
export function tileOfCategory(cat: Category): Tile {
  switch (cat) {
    case "req": case "yours": return "move";
    case "nudge": case "quiet": return "chase";
    case "house": return "house";
    default: { const unhandled: never = cat; return unhandled; }
  }
}
export const tileOf = (c: BoardCard): Tile => tileOfCategory(taskCategory(c));

export interface TileCount { tile: Tile; n: number; parts: Partial<Record<Category, number>>; sub: string }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The three tiles' figures from ONE pass over ONE array. The sub-line names the constituents, and
 * its numbers sum to the headline — asserted in `todoV2.test.ts` as a property, not a literal.
 */
export function tileCounts(cards: BoardCard[]): Record<Tile, TileCount> {
  const by: Record<Category, number> = { req: 0, nudge: 0, quiet: 0, house: 0, yours: 0 };
  for (const c of cards) by[taskCategory(c)] += 1;
  return {
    move: {
      tile: "move", n: by.req + by.yours, parts: { req: by.req, yours: by.yours },
      sub: `${plural(by.req, "agent request", "agent requests")} · ${by.yours} yours`,
    },
    chase: {
      tile: "chase", n: by.nudge + by.quiet, parts: { nudge: by.nudge, quiet: by.quiet },
      sub: `${plural(by.nudge, "nudge", "nudges")} · ${by.quiet} gone quiet`,
    },
    /* the ref's own words — a single-category tile has no constituents to list */
    house: { tile: "house", n: by.house, parts: { house: by.house }, sub: "gaps worth filling in" },
  };
}

/* ── when ──────────────────────────────────────────────────────────────────────────────────── */

export type When = "past" | "this" | "next" | "later" | "none";
export const WHEN_ORDER: When[] = ["past", "this", "next", "later", "none"];
export const WHEN_LABEL: Record<When, string> = {
  past: "Past the date", this: "This week", next: "Next week", later: "Later", none: "No date",
};

const ymdMs = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const msYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86400000;

/** Days from `from` to `to`, calendar days, sign kept. */
export const dayDiff = (from: string, to: string): number => Math.round((ymdMs(to) - ymdMs(from)) / DAY);

/** The Sunday closing the (Monday-start, UK) week `ymd` falls in. */
export function weekEnd(ymd: string): string {
  const d = new Date(ymdMs(ymd)).getUTCDay(); // 0 Sun … 6 Sat
  return msYmd(ymdMs(ymd) + ((7 - d) % 7) * DAY);
}

/** Which When bucket a due day falls in. No day is "No date", never a guessed one. */
export function whenOf(dueYmd: string | null | undefined, todayYmd: string): When {
  if (!dueYmd) return "none";
  if (dueYmd < todayYmd) return "past";
  const end = weekEnd(todayYmd);
  if (dueYmd <= end) return "this";
  if (dueYmd <= msYmd(ymdMs(end) + 7 * DAY)) return "next";
  return "later";
}

/**
 * The composer's when-pill → the due day it records. ⚠️ A PILL IS A WEEK, AND A TASK NEEDS A DAY:
 * the day recorded is the END of the chosen week (Sunday), and the composer SAYS so in its
 * confirmation line, so the writer sees the date rather than having one chosen silently. "Later"
 * is the end of the week after next. There is no "No date" pill — see the note in `DeskComposer`.
 */
export type WhenPill = "this" | "next" | "later";
export const WHEN_PILLS: WhenPill[] = ["this", "next", "later"];
export function dueForPill(pill: WhenPill, todayYmd: string): string {
  const end = weekEnd(todayYmd);
  const weeks = pill === "this" ? 0 : pill === "next" ? 1 : 2;
  return msYmd(ymdMs(end) + weeks * 7 * DAY);
}

/* ── rows ──────────────────────────────────────────────────────────────────────────────────── */

export interface V2Row {
  key: string;
  card: BoardCard;
  cat: Category;
  tile: Tile;
  /** the card's own tag, singular — CATEGORY_TAG, the vocabulary the rest of the page uses */
  typeLabel: string;
  /** everything except Gone quiet is the writer's move (the ref's own data) */
  yours: boolean;
  deed: string;
  who: string;
  agency: string;
  dateKey: string;
  dateValue: string;
  spanValue: string | null;
  dueYmd: string | null;
  when: When;
  past: boolean;
  /** days since the due day, for "Time past the date"; 0 when not past */
  daysPast: number;
  verb: string;
  pkg: string;
  setAside: boolean;
}

export interface RowFacts {
  deed: string;
  agency: string | null;
  dateKey: string;
  dateValue: string;
  spanValue: string | null;
  dueYmd: string | null;
  pkg: string | null;
  setAside?: boolean;
}

/** What the row's button names — the ref's words, keyed on the category, exhaustive. It is a
 *  LABEL for where pressing leads, never a promise of a write: every press opens a surface. */
export function rowVerb(card: BoardCard): string {
  const cat = taskCategory(card);
  switch (cat) {
    case "req": return cardBucket(card) === "send" ? "Mark sent" : "Open";
    case "nudge": return "Nudge";
    case "quiet": return "Decide";
    case "house": return "Fill in";
    case "yours": return "Open";
    default: { const unhandled: never = cat; return unhandled; }
  }
}

export const NO_PACKAGE = "No package recorded";
export const NO_AGENT = "No agent attached";

export function buildRow(card: BoardCard, f: RowFacts, todayYmd: string): V2Row {
  const cat = taskCategory(card);
  const when = whenOf(f.dueYmd, todayYmd);
  const who = (card.who || "").trim();
  return {
    key: card.key, card, cat, tile: tileOfCategory(cat),
    typeLabel: CATEGORY_TAG[cat],
    yours: cat !== "quiet",
    deed: f.deed,
    who: who || "—",
    agency: who ? (f.agency || "") : NO_AGENT,
    dateKey: f.dateKey, dateValue: f.dateValue, spanValue: f.spanValue,
    dueYmd: f.dueYmd, when, past: when === "past",
    daysPast: when === "past" && f.dueYmd ? dayDiff(f.dueYmd, todayYmd) : 0,
    verb: rowVerb(card),
    pkg: f.pkg || NO_PACKAGE,
    setAside: !!f.setAside,
  };
}

/* ── filter ────────────────────────────────────────────────────────────────────────────────── */

export interface V2Filters {
  types: Category[];
  statuses: string[];
  pkgs: string[];
  showSetAside: boolean;
}
export const EMPTY_FILTERS: V2Filters = { types: [], statuses: [], pkgs: [], showSetAside: false };
export const filterCount = (f: V2Filters) => f.types.length + f.statuses.length + f.pkgs.length + (f.showSetAside ? 1 : 0);

/** A row's status name for the Status facet — the card's own status, or none (house, own tasks). */
export type StatusName = (card: BoardCard) => string | null;

/** Ticks WITHIN a facet are alternatives; facets narrow each other. Set-aside rows appear only when
 *  asked for. */
export function applyFilters(rows: V2Row[], f: V2Filters, statusName: StatusName): V2Row[] {
  return rows.filter((r) => {
    if (r.setAside && !f.showSetAside) return false;
    if (f.types.length && !f.types.includes(r.cat)) return false;
    if (f.statuses.length) {
      const s = statusName(r.card);
      if (!s || !f.statuses.includes(s)) return false;
    }
    if (f.pkgs.length && !f.pkgs.includes(r.pkg)) return false;
    return true;
  });
}

/** One panel, one set of numbers per facet over the rows the tile shows. */
export function facetCounts(rows: V2Row[], statusName: StatusName) {
  const types = new Map<Category, number>();
  const statuses = new Map<string, number>();
  const pkgs = new Map<string, number>();
  let setAside = 0;
  for (const r of rows) {
    if (r.setAside) { setAside += 1; continue; }
    types.set(r.cat, (types.get(r.cat) ?? 0) + 1);
    const s = statusName(r.card);
    if (s) statuses.set(s, (statuses.get(s) ?? 0) + 1);
    pkgs.set(r.pkg, (pkgs.get(r.pkg) ?? 0) + 1);
  }
  return { types, statuses, pkgs, setAside };
}

/* ── group ─────────────────────────────────────────────────────────────────────────────────── */

export type GroupKey = "when" | "type" | "agent" | "pkg" | "none";
export const GROUP_KEYS: GroupKey[] = ["when", "type", "agent", "pkg", "none"];
export const GROUP_LABEL: Record<GroupKey, string> = {
  when: "When", type: "Task type", agent: "Agent", pkg: "Submission package", none: "None",
};

export interface V2Group { id: string; label: string; rows: V2Row[] }

/** Partitions an ALREADY-SORTED list, so the order inside a group is the sort's for free. */
export function groupRows(rows: V2Row[], key: GroupKey): V2Group[] {
  if (key === "none") return [{ id: "all", label: "", rows }];
  const label = (r: V2Row): string =>
    key === "when" ? WHEN_LABEL[r.when]
      : key === "type" ? r.typeLabel
      : key === "agent" ? (r.who === "—" ? NO_AGENT : r.who)
      : r.pkg;
  const map = new Map<string, V2Row[]>();
  for (const r of rows) {
    const k = label(r);
    const arr = map.get(k);
    if (arr) arr.push(r); else map.set(k, [r]);
  }
  const whenIdx = (l: string) => WHEN_ORDER.findIndex((w) => WHEN_LABEL[w] === l);
  const keys = [...map.keys()].sort((a, b) => {
    if (key === "when") return whenIdx(a) - whenIdx(b);
    /* the "none of these" group sorts last, whatever its name */
    const lastA = a === NO_AGENT || a === NO_PACKAGE, lastB = b === NO_AGENT || b === NO_PACKAGE;
    if (lastA !== lastB) return lastA ? 1 : -1;
    return a.localeCompare(b);
  });
  return keys.map((k) => ({ id: k, label: k, rows: map.get(k)! }));
}

/* ── sort ──────────────────────────────────────────────────────────────────────────────────── */

export type SortKey = "date" | "pastBy" | "agent" | "type";
export const SORT_KEYS: SortKey[] = ["date", "pastBy", "agent", "type"];
/** ⚠️ No label here may use the word the page has retired — swept by the unit test. */
export const SORT_LABEL: Record<SortKey, string> = {
  date: "Date on the task", pastBy: "Time past the date", agent: "Agent", type: "Task type",
};

const TYPE_RANK: Record<Category, number> = { req: 0, yours: 1, nudge: 2, quiet: 3, house: 4 };

/** Undated rows sort LAST in every order; ties fall back to the deed so the order is stable. */
export function sortRows(rows: V2Row[], key: SortKey): V2Row[] {
  const byDeed = (a: V2Row, b: V2Row) => a.deed.localeCompare(b.deed);
  const byDate = (a: V2Row, b: V2Row) => {
    if (!a.dueYmd && !b.dueYmd) return byDeed(a, b);
    if (!a.dueYmd) return 1;
    if (!b.dueYmd) return -1;
    return a.dueYmd === b.dueYmd ? byDeed(a, b) : a.dueYmd < b.dueYmd ? -1 : 1;
  };
  const cmp: Record<SortKey, (a: V2Row, b: V2Row) => number> = {
    date: byDate,
    pastBy: (a, b) => (b.daysPast - a.daysPast) || byDate(a, b),
    agent: (a, b) => {
      const an = a.who === "—", bn = b.who === "—";
      if (an !== bn) return an ? 1 : -1;
      return a.who.localeCompare(b.who) || byDate(a, b);
    },
    type: (a, b) => (TYPE_RANK[a.cat] - TYPE_RANK[b.cat]) || byDate(a, b),
  };
  return [...rows].sort(cmp[key]);
}

/* ── search ────────────────────────────────────────────────────────────────────────────────── */

export function searchRows(rows: V2Row[], q: string): V2Row[] {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((r) => [r.deed, r.who, r.agency, r.typeLabel].some((s) => s.toLowerCase().includes(t)));
}

/* ── export ────────────────────────────────────────────────────────────────────────────────── */

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function rowsCsv(rows: V2Row[]): string {
  const head = ["Task", "Type", "Agent", "Agency", "When", "Due", "Package"];
  const body = rows.map((r) => [r.deed, r.typeLabel, r.who === "—" ? "" : r.who, r.agency, WHEN_LABEL[r.when], r.dueYmd ?? "", r.pkg]);
  return [head, ...body].map((l) => l.map(csvCell).join(",")).join("\n");
}
