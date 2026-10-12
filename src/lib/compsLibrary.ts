/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25: the library list's own logic, pure. Rows, the one filter, the three-click
 * sort, the optional grouping, each row's next move, and the strip's four figures. Everything is
 * derived from `lib/compUsage`; nothing here is stored.
 */
import { Agent, CompTitle, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { Attachment, CompUse, CompWhere, UnrecordedLetter, compKey, ready, whereOf } from "./compUsage";
import { agentInitials, agentPrimary, agentSecondary } from "./agentDisplay";
import { dayMonth } from "./dates";

export type CompKind = "book" | "film" | "tv";
/** Book, film and TV are an icon, never a colour. "other" draws the film mark. */
export const kindOf = (c: Pick<CompTitle, "media">): CompKind => {
  const m = c.media ?? "book";
  return m === "book" ? "book" : m === "tv" ? "tv" : "film";
};

export type LetterLite = Pick<ManuscriptVersion, "id" | "versionName" | "createdDate"> & Partial<Pick<ManuscriptVersion, "compIds" | "status">>;

/** "Query letter v2" reads "QL v2" on a chip; any other name is kept whole. */
export const letterShort = (name: string): string => name.replace(/^query letter\s+/i, "QL ");

export interface RowQuery {
  id: string;
  agentName: string;
  agency: string;
  initials: string;
  status: string;
  dateSent: string | null;
  letterId: string;
  packageName: string | null;
  asked: boolean;
}

export interface CompRow {
  key: string;
  index: number;
  comp: CompTitle;
  kind: CompKind;
  ready: boolean;
  where: CompWhere;
  /** the letters naming it, oldest first, each marked sent or not */
  letters: { id: string; name: string; short: string; sent: boolean; packages: string[] }[];
  /** names of the live packages holding any of those letters */
  packages: string[];
  queries: RowQuery[];
  askedForMore: number;
  /** the newest send among its queries, ISO, or null */
  lastSent: string | null;
}

export interface RowsInput {
  comps: readonly CompTitle[];
  usage: Map<string, CompUse>;
  letters: readonly LetterLite[];
  packages: readonly Pick<SubmissionPackage, "id" | "packageName" | "queryLetterVersionId" | "editions" | "status">[];
  queries: readonly Query[];
  agents: readonly Agent[];
  /** query id → reached a request (the analytics derivation, from compUsage's caller) */
  asked: ReadonlySet<string>;
  /** query id → its letter id */
  letterOfQuery: ReadonlyMap<string, string>;
}

const packagesHolding = (letterId: string, packages: RowsInput["packages"]): string[] =>
  packages
    .filter((p) => p.status !== "Retired")
    .filter((p) => p.queryLetterVersionId === letterId || (p.editions ?? []).some((e) => e.queryLetterVersionId === letterId))
    .map((p) => p.packageName);

export function buildRows(i: RowsInput): CompRow[] {
  const letterById = new Map(i.letters.map((l) => [l.id, l]));
  const queryById = new Map(i.queries.map((q) => [q.id, q]));
  const agentById = new Map(i.agents.map((a) => [a.id, a]));
  const pkgById = new Map(i.packages.map((p) => [p.id, p]));
  return i.comps.map((comp, index) => {
    const key = compKey(comp, index);
    const u = i.usage.get(key);
    const letters = (u?.letters ?? []).flatMap((id) => {
      const l = letterById.get(id);
      return l ? [{ id, name: l.versionName, short: letterShort(l.versionName), sent: (u?.sentLetters ?? []).includes(id), packages: packagesHolding(id, i.packages) }] : [];
    });
    const queries = (u?.queries ?? []).flatMap((id): RowQuery[] => {
      const q = queryById.get(id);
      if (!q) return [];
      const a = agentById.get(q.agentId);
      const pkg = pkgById.get(q.sentPackageId || q.packageId);
      return [{
        id, agentName: a ? agentPrimary(a) : "Agent not on file", agency: a ? agentSecondary(a) : "", initials: agentInitials(a),
        status: q.status, dateSent: q.dateSent ?? null, letterId: i.letterOfQuery.get(id) ?? "",
        packageName: q.sentPackageName || pkg?.packageName || null, asked: i.asked.has(id),
      }];
    });
    const dated = queries.map((q) => q.dateSent).filter((d): d is string => !!d).sort();
    return {
      key, index, comp, kind: kindOf(comp), ready: ready(comp), where: whereOf(u), letters,
      packages: [...new Set(letters.flatMap((l) => l.packages))],
      queries, askedForMore: u?.askedForMore ?? 0, lastSent: dated.length ? dated[dated.length - 1] : null,
    };
  });
}

/* ══ the one filter ═══════════════════════════════════════════════════════════════════════════ */

export type CompFilter = "sent" | "unsent" | "none" | "book" | "screen";
export const FILTERS: { key: CompFilter; label: string; narrow?: boolean }[] = [
  { key: "sent", label: "Sent to agents" },
  { key: "unsent", label: "In an unsent letter" },
  { key: "none", label: "Not in a letter" },
  { key: "book", label: "Books", narrow: true },
  { key: "screen", label: "Film and TV", narrow: true },
];
export const passes = (r: CompRow, f: CompFilter): boolean =>
  f === "book" ? r.kind === "book" : f === "screen" ? r.kind !== "book" : r.where === f;
export const filterCounts = (rows: readonly CompRow[]): Record<CompFilter, number> =>
  Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter((r) => passes(r, f.key)).length])) as Record<CompFilter, number>;

const found = (r: CompRow, find: string): boolean =>
  !find || `${r.comp.title} ${r.comp.author ?? ""}`.toLowerCase().includes(find.trim().toLowerCase());

export const visibleRows = (rows: readonly CompRow[], filter: CompFilter | null, find: string): CompRow[] =>
  rows.filter((r) => (!filter || passes(r, filter)) && found(r, find));

/* ══ the sort: a column heading, three clicks ═════════════════════════════════════════════════ */

export type SortKey = "title" | "named" | "seen" | "next";
export interface SortState { key: SortKey; dir: 1 | -1 }
export const COLUMNS: { key: SortKey; label: string; tag: string }[] = [
  { key: "title", label: "Comp", tag: "title" },
  { key: "named", label: "Named in", tag: "letters" },
  { key: "seen", label: "Seen by", tag: "agents who saw it" },
  { key: "next", label: "Next move", tag: "next move" },
];
/** The first click's direction: A–Z for the title, highest first for the rest. */
const firstDir = (k: SortKey): 1 | -1 => (k === "title" ? 1 : -1);

/** First click sorts, the second reverses, the third returns to the writer's own order. */
export function nextSort(cur: SortState | null, key: SortKey): SortState | null {
  if (!cur || cur.key !== key) return { key, dir: firstDir(key) };
  if (cur.dir === firstDir(key)) return { key, dir: (cur.dir * -1) as 1 | -1 };
  return null;
}

const WHERE_RANK: Record<CompWhere, number> = { sent: 2, unsent: 1, none: 0 };
const sortValue = (r: CompRow, k: SortKey): string | number =>
  k === "title" ? r.comp.title.trim().replace(/^the\s+/i, "").toLowerCase()
    : k === "named" ? WHERE_RANK[r.where] * 100 + r.letters.length
      : k === "seen" ? r.queries.length
        : WHERE_RANK[r.where] + (r.ready ? 0 : -1);

/** Sorted, stably: equal rows keep the writer's own order. No sort is that order. */
export function sortRows(rows: readonly CompRow[], sort: SortState | null): CompRow[] {
  if (!sort) return [...rows].sort((a, b) => a.index - b.index);
  return [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
    const c = x < y ? -1 : x > y ? 1 : 0;
    return c !== 0 ? c * sort.dir : a.index - b.index;
  });
}
export const ariaSort = (sort: SortState | null, key: SortKey): "ascending" | "descending" | "none" =>
  sort?.key === key ? (sort.dir > 0 ? "ascending" : "descending") : "none";

/* ══ the grouping ═════════════════════════════════════════════════════════════════════════════ */

export type GroupBy = "none" | "where" | "media" | "letter";
export const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "none", label: "None" },
  { key: "where", label: "Where it’s used" },
  { key: "media", label: "Book or screen" },
  { key: "letter", label: "Query letter" },
];
export type BandTone = "powder" | "blush" | "grey";
export interface Band { key: string; name: string; tone: BandTone; hint: string; rows: CompRow[] }

/**
 * The bands for a grouping, empty ones dropped; null when ungrouped.
 * ⚠️ Under "Query letter" a comp named by two letters is in both bands, so those bands can sum to
 * more than the list. Every other grouping partitions it.
 */
export function groupRows(rows: readonly CompRow[], by: GroupBy, letters: readonly LetterLite[], sentQueries: ReadonlyMap<string, number>): Band[] | null {
  if (by === "none") return null;
  let bands: Band[];
  if (by === "where") {
    bands = [
      { key: "sent", name: "Sent to agents", tone: "powder", hint: "named in letters that went out", rows: rows.filter((r) => r.where === "sent") },
      { key: "unsent", name: "In an unsent letter", tone: "blush", hint: "named in a letter not yet sent", rows: rows.filter((r) => r.where === "unsent") },
      { key: "none", name: "Not in a letter yet", tone: "grey", hint: "on your shelf only", rows: rows.filter((r) => r.where === "none") },
    ];
  } else if (by === "media") {
    bands = [
      { key: "book", name: "Books", tone: "powder", hint: "novels and memoirs", rows: rows.filter((r) => r.kind === "book") },
      { key: "screen", name: "Film and TV", tone: "grey", hint: "screen comps", rows: rows.filter((r) => r.kind !== "book") },
    ];
  } else {
    bands = [
      ...letters.filter((l) => Array.isArray(l.compIds)).map((l): Band => {
        const n = sentQueries.get(l.id) ?? 0;
        return {
          key: `letter:${l.id}`, name: l.versionName, tone: n ? "powder" : "blush",
          hint: n ? `sent with ${n} ${n === 1 ? "query" : "queries"}` : "not sent yet",
          rows: rows.filter((r) => r.letters.some((x) => x.id === l.id)),
        };
      }),
      { key: "none", name: "Not in a letter", tone: "grey", hint: "on your shelf only", rows: rows.filter((r) => r.where === "none") },
    ];
  }
  return bands.filter((b) => b.rows.length > 0);
}

/* ══ the next move ════════════════════════════════════════════════════════════════════════════ */

export type NextAct = "edit" | "open" | "pick" | "pick-for";
export interface NextMove { text: string; mono: string; hot: boolean; tray: string; act: NextAct; letterId?: string }

export function nextMove(r: CompRow): NextMove {
  const needs = r.kind === "book" && !r.comp.publisher?.trim() ? "a publisher" : "a year";
  if (!r.ready) return { text: `Add ${needs}`, mono: "NEEDED BEFORE A LETTER", hot: true, tray: needs === "a publisher" ? "Add publisher" : "Add year", act: "edit" };
  if (r.where === "sent") {
    const n = r.queries.length;
    return { text: `In ${n} ${n === 1 ? "query" : "queries"}`, mono: r.lastSent ? `LAST SENT ${dayMonth(r.lastSent).toUpperCase()}` : "SENT, DATE NOT RECORDED", hot: false, tray: "See the queries", act: "open" };
  }
  if (r.where === "unsent") {
    const l = r.letters[0];
    return { text: "Waiting to go out", mono: `IN ${l.short.toUpperCase()} · NOT SENT`, hot: false, tray: `Open ${l.short}`, act: "pick", letterId: l.id };
  }
  return { text: "Log in a letter", mono: "ON YOUR SHELF ONLY", hot: false, tray: "Log in a letter", act: "pick-for" };
}

/* ══ the heading's tag ════════════════════════════════════════════════════════════════════════ */

export function libraryTag(total: number, sort: SortState | null, group: GroupBy): string {
  const head = `${total} ${total === 1 ? "title" : "titles"}`;
  const order = sort ? `sorted by ${COLUMNS.find((c) => c.key === sort.key)!.tag}` : "in your own order";
  const grouped = group === "none" ? "" : ` · grouped by ${GROUP_OPTIONS.find((g) => g.key === group)!.label.toLowerCase()}`;
  return `${head} · ${order}${grouped}`;
}

/* ══ at a glance ══════════════════════════════════════════════════════════════════════════════ */

export interface Glance {
  total: number;
  books: number;
  screen: number;
  attachment: Attachment;
  /** the three most used, most queries first (ties keep the shelf's order) */
  top: { title: string; n: number }[];
  notInLetter: CompRow[];
  needFirst: number;
}

export function glance(rows: readonly CompRow[], attachment: Attachment): Glance {
  const none = rows.filter((r) => r.where === "none");
  return {
    total: rows.length,
    books: rows.filter((r) => r.kind === "book").length,
    screen: rows.filter((r) => r.kind !== "book").length,
    attachment,
    top: [...rows].sort((a, b) => b.queries.length - a.queries.length || a.index - b.index).slice(0, 3).map((r) => ({ title: r.comp.title, n: r.queries.length })),
    notInLetter: none,
    needFirst: none.filter((r) => !r.ready).length,
  };
}

/** The heading's two pills: letters to log, and comps not letter-ready. */
export const libraryPills = (rows: readonly CompRow[], unrecorded: readonly UnrecordedLetter[]): { toLog: number; needs: number } => ({
  toLog: unrecorded.length,
  needs: rows.filter((r) => !r.ready).length,
});
