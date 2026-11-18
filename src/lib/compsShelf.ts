/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 (design-refs/comps-v28/comps-v28.html), restyled by v30 (design-refs/comps-v30/): the shelf's
 * own logic, pure. Where a comp is used, its age chip, what its card's stat card says, the shelf's sort and filters,
 * the band's letter (v32 §B), the podium and the Comp-pendium (v32 §D, §E), and the picker's record and tip. Every figure comes from `lib/compUsage` through `compsLibrary.buildRows`;
 * nothing here is stored, and no rate is computed anywhere but here and compUsage.
 *
 * ⚠️ "NOW" IS A PARAMETER (`currentYear()` at the call site), so every age is testable. The mock fixes 2026.
 */
import type { CompTitle } from "../types";
import type { AskedRate, CompWhere, UnrecordedLetter } from "./compUsage";
import type { CompRow } from "./compsLibrary";
import { letterShort } from "./compsLibrary";

/* ══ where a comp is used ═════════════════════════════════════════════════════════════════════ */

/** The shelf's three places: in a letter that went out, in one that has not, in none. */
export type ShelfWhere = "sent" | "draft" | "shelf";
export const shelfWhere = (w: CompWhere): ShelfWhere => (w === "sent" ? "sent" : w === "unsent" ? "draft" : "shelf");
export const WHERE_ORDER: ShelfWhere[] = ["sent", "draft", "shelf"];
/** v32: the shelf filter's words ("Sent 2", "In a draft 1", "Not used 4"); the keys are v28's */
export const WHERE_LABEL: Record<ShelfWhere, string> = { sent: "Sent", draft: "In a draft", shelf: "Not used" };

/** sent · draft · shelf counts; they always sum to the comp count. */
export function whereCounts(rows: readonly CompRow[]): Record<ShelfWhere, number> {
  const out: Record<ShelfWhere, number> = { sent: 0, draft: 0, shelf: 0 };
  for (const r of rows) out[shelfWhere(r.where)]++;
  return out;
}

/* ══ the card ═════════════════════════════════════════════════════════════════════════════════ */

export const MEDIA_WORD: Record<NonNullable<CompTitle["media"]>, string> = { book: "Book", film: "Film", tv: "TV", other: "Other" };

/** The age past which a comp's chip turns rust: agents usually look for comps from the last five years. */
export const OLD_AFTER = 5;
export const OLD_TITLE = "Agents usually look for comps from the last five years";
/** ⚠️ v30: TWO TONES. v28's sage "new" tone is retired with every green on the page; every age up to five is plain. */
export type AgeTone = "plain" | "old";
export interface AgeChip { age: number; text: string; tone: AgeTone; title: string | null }

/** The age chip: none without a year; up to five plain, six and over rust. A year ahead of now reads "This year". */
export function ageChip(year: number | undefined, now: number): AgeChip | null {
  if (typeof year !== "number" || !Number.isFinite(year)) return null;
  const age = Math.max(0, now - year);
  const text = age === 0 ? "This year" : age === 1 ? "1 yr old" : `${age} yrs old`;
  const tone: AgeTone = age > OLD_AFTER ? "old" : "plain";
  return { age, text, tone, title: tone === "old" ? OLD_TITLE : null };
}
export const isOld = (year: number | undefined, now: number): boolean => ageChip(year, now)?.tone === "old";

/** The catalogue line's parts: the type word, the publisher (or `missing`), the year. */
export function catalogueLine(c: CompTitle): { type: string; publisher: string | null; missing: boolean; year: string | null } {
  const media = c.media ?? "book";
  const pub = c.publisher?.trim() || null;
  return { type: MEDIA_WORD[media], publisher: pub, missing: media === "book" && !pub, year: c.year ? String(c.year) : null };
}

/** v30 §B: what the stat card on a shelf card's foot says, by where the comp is used. */
export type Stat =
  | { kind: "sent"; queries: number; asked: number; pct: number; on: number; letters: string[]; early: boolean }
  | { kind: "draft"; letters: string[] }
  | { kind: "shelf" };

/**
 * ⚠️ A SENT CARD NAMES ONLY THE LETTERS THAT WENT OUT (v30 S3): a draft that also names the comp is not where its
 * figure came from. `on` is the meter's lit segments, of ten.
 */
export function statOf(r: CompRow): Stat {
  const w = shelfWhere(r.where);
  if (w === "sent") {
    const pct = compRate(r) ?? 0;
    return { kind: "sent", queries: r.queries.length, asked: r.askedForMore, pct, on: Math.round(pct / 10), letters: r.letters.filter((l) => l.sent).map((l) => l.name), early: r.queries.length < READY_AT };
  }
  if (w === "draft") return { kind: "draft", letters: r.letters.filter((l) => !l.sent).map((l) => l.name) };
  return { kind: "shelf" };
}

/** A comp's asked-for-more rate (null when it has gone out with no query). */
export const compRate = (r: Pick<CompRow, "queries" | "askedForMore">): number | null =>
  r.queries.length ? Math.round((r.askedForMore / r.queries.length) * 100) : null;

/* ══ the shelf's sort and filters ═════════════════════════════════════════════════════════════ */

export type ShelfSort = "own" | "queries" | "rate" | "newest" | "az";
export const SHELF_SORTS: { key: ShelfSort; label: string }[] = [
  { key: "own", label: "Your order" },
  { key: "queries", label: "Most queries" },
  { key: "rate", label: "Best response" },
  { key: "newest", label: "Newest first" },
  { key: "az", label: "A to Z" },
];
const azKey = (t: string): string => t.trim().replace(/^the\s+/i, "").toLowerCase();

/** The shelf in the chosen order. Ties keep the writer's own order. "Best response" puts never-sent comps last. */
export function sortShelf(rows: readonly CompRow[], key: ShelfSort): CompRow[] {
  const by: Record<ShelfSort, ((r: CompRow) => number | string) | null> = {
    own: null,
    queries: (r) => -r.queries.length,
    rate: (r) => { const p = compRate(r); return p === null ? 1 : -p; },
    newest: (r) => -(r.comp.year ?? 0),
    az: (r) => azKey(r.comp.title),
  };
  const f = by[key];
  if (!f) return [...rows];
  return [...rows].sort((a, b) => {
    const x = f(a), y = f(b);
    return x < y ? -1 : x > y ? 1 : a.index - b.index;
  });
}

/** ⚠️ v30: NO TYPE FILTER. Book, film and TV show in the card's band and the list's disc, never as a toggle. */
export interface ShelfFilter { where: ShelfWhere | null; find: string }
export const NO_FILTER: ShelfFilter = { where: null, find: "" };
export const filtered = (f: ShelfFilter): boolean => !!f.where || !!f.find.trim();

/** Where and find narrow each other (AND). Find matches title, author or publisher. */
export function filterShelf(rows: readonly CompRow[], f: ShelfFilter): CompRow[] {
  const q = f.find.trim().toLowerCase();
  return rows.filter((r) =>
    (!f.where || shelfWhere(r.where) === f.where)
    && (!q || `${r.comp.title} ${r.comp.author ?? ""} ${r.comp.publisher ?? ""}`.toLowerCase().includes(q)));
}

/* ══ the notice ═══════════════════════════════════════════════════════════════════════════════ */

export interface Notice { letterId: string; name: string; queries: number }
/** v32 §B: the striped band's one letter — of the sent letters whose comps were never chosen, the one with the most
 *  queries (ties: the oldest); null when there are none. The next appears once that one is saved. */
export function noticeOf(u: readonly UnrecordedLetter[]): Notice | null {
  if (!u.length) return null;
  const top = u.reduce((best, l) => (l.queries > best.queries ? l : best), u[0]);
  return { letterId: top.letterId, name: top.name, queries: top.queries };
}

/* ══ the threshold ════════════════════════════════════════════════════════════════════════════ */

/** A comp or letter needs about this many queries before its figure means much. */
export const READY_AT = 5;

/** "A and B", "A, B and C". */
export function andList(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/* ══ the picker ═══════════════════════════════════════════════════════════════════════════════ */

export type PickRecord = { kind: "rate"; pct: number; queries: number } | { kind: "old"; age: number } | { kind: "unsent" };
/** What a picker row shows on its right: its record if it has gone out, else its age past five years, else "not sent yet". */
export function pickRecord(r: Pick<CompRow, "queries" | "askedForMore" | "comp">, now: number): PickRecord {
  const pct = compRate(r);
  if (pct !== null) return { kind: "rate", pct, queries: r.queries.length };
  const a = ageChip(r.comp.year, now);
  if (a && a.tone === "old") return { kind: "old", age: a.age };
  return { kind: "unsent" };
}

/** Most letters name two or three; more than this draws the tip. */
export const TIP_MORE_THAN = 3;
export interface TipPart { strong: string; rest: string }
/** The picker's advice for the ticked comps. Never a block: Save stays enabled whatever it says. */
export function pickTip(ticked: readonly Pick<CompTitle, "title" | "year">[], now: number): TipPart[] {
  const out: TipPart[] = [];
  if (ticked.length > TIP_MORE_THAN) out.push({ strong: `${ticked.length} comps`, rest: " is more than most letters name. Two or three usually reads cleaner." });
  const old = ticked.filter((c) => isOld(c.year, now));
  if (old.length) out.push({ strong: old.map((c) => c.title).join(", "), rest: ` ${old.length === 1 ? "is" : "are"} more than five years old. Agents tend to prefer recent comps.` });
  return out;
}

/** The letter a draft chip names, shortened as the picker's chips are. */
export { letterShort };

/* ══ v32 §D · the podium ══════════════════════════════════════════════════════════════════════ */

export interface PodiumPlace {
  row: CompRow;
  /** 1, 2 or 3; equal rates share a place, so two firsts are followed by a third (1, 1, 3) */
  place: 1 | 2 | 3;
  /** another comp on the podium has the same rate */
  equal: boolean;
  /** `compRate`, never computed again here */
  pct: number;
}

/** The ranked comps, best first: at least `READY_AT` queries, by `compRate` descending, then more queries, then the
 *  writer's own order. Every ranked comp, not only the top three (the Comp-pendium lists them all in this order). */
export function rankedOf(rows: readonly CompRow[]): CompRow[] {
  return rows
    .filter((r) => r.queries.length >= READY_AT)
    .sort((a, b) => (compRate(b)! - compRate(a)!) || (b.queries.length - a.queries.length) || (a.index - b.index));
}

/**
 * The podium: up to three comps from `rankedOf`. A comp's place is one more than the number of comps on the podium
 * with a higher rate, so equal rates share a place (1, 1, 3) and say so (`equal`).
 * ⚠️ EVERY RATE IS `compRate`, over compUsage's figures (`CompRow.queries`, `askedForMore`).
 */
export function podiumOf(rows: readonly CompRow[]): PodiumPlace[] {
  const top = rankedOf(rows).slice(0, 3);
  return top.map((row, i) => {
    const pct = compRate(row)!;
    const place = (top.findIndex((x) => compRate(x) === pct) + 1) as 1 | 2 | 3;
    return { row, place, equal: top.some((x, k) => k !== i && compRate(x) === pct), pct };
  });
}

/** v32 §E · the Comp-pendium's order: the ranked comps in podium order, then the rest by queries, then letters,
 *  then the writer's own order. */
export function pendiumOrder(rows: readonly CompRow[]): CompRow[] {
  const ranked = rankedOf(rows);
  const keys = new Set(ranked.map((r) => r.key));
  const rest = rows.filter((r) => !keys.has(r.key))
    .sort((a, b) => (b.queries.length - a.queries.length) || (b.letters.length - a.letters.length) || (a.index - b.index));
  return [...ranked, ...rest];
}

/**
 * v32 §E · the Comp-pendium's note: `lq` of the writer's `tot` queries went with a letter that mentions at least one
 * comp, and `lm` of those asked for more. Null when no query mentioned comps.
 * ⚠️ COUNTS ONLY: `lq` and `lm` are `letterRate`'s, per letter, summed; `tot` is `averageAsked`'s denominator.
 */
export function pendiumNote(
  letters: readonly { id: string; compIds?: string[] | null }[],
  rateOf: (letterId: string) => AskedRate,
  tot: number,
): { lq: number; lm: number; tot: number } | null {
  let lq = 0, lm = 0;
  for (const l of letters) {
    if (!Array.isArray(l.compIds) || !l.compIds.length) continue;
    const r = rateOf(l.id);
    lq += r.sent; lm += r.asked;
  }
  return lq ? { lq, lm, tot } : null;
}

/** The Query Centre's own status words (moved here from v30's comp drawer, retired). */
export const queryStatusWord = (s: string): string =>
  s === "Rejected" ? "Passed" : s === "No Response" ? "Closed with no reply" : s.replace(/ (Requested|Sent)$/, (m) => m.toLowerCase());

/** "7 years old", "1 year old", "this year"; a year ahead of now reads "this year". */
export const ageWords = (year: number, now: number): string => {
  const a = Math.max(0, now - year);
  return a === 0 ? "this year" : a === 1 ? "1 year old" : `${a} years old`;
};
