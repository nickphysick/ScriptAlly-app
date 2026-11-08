/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 (design-refs/comps-v28/comps-v28.html), restyled by v30 (design-refs/comps-v30/): the shelf's
 * own logic, pure. Where a comp is used, its age chip, what its card's stat card says, the shelf's sort and filters,
 * the notice, the header's lead sentence and highlight (v30 §A), the letter cards (v30 §C), and the picker's record
 * and tip. Every figure comes from `lib/compUsage` through `compsLibrary.buildRows`;
 * nothing here is stored, and no rate is computed anywhere but here and compUsage.
 *
 * ⚠️ "NOW" IS A PARAMETER (`currentYear()` at the call site), so every age is testable. The mock fixes 2026.
 */
import type { CompTitle } from "../types";
import type { AskedRate, CompWhere, UnrecordedLetter } from "./compUsage";
import { letterRecorded } from "./compUsage";
import type { CompKind, CompRow, LetterLite } from "./compsLibrary";
import { letterShort } from "./compsLibrary";

/* ══ where a comp is used ═════════════════════════════════════════════════════════════════════ */

/** The shelf's three places: in a letter that went out, in one that has not, in none. */
export type ShelfWhere = "sent" | "draft" | "shelf";
export const shelfWhere = (w: CompWhere): ShelfWhere => (w === "sent" ? "sent" : w === "unsent" ? "draft" : "shelf");
export const WHERE_ORDER: ShelfWhere[] = ["sent", "draft", "shelf"];
export const WHERE_LABEL: Record<ShelfWhere, string> = { sent: "In a sent letter", draft: "In a draft letter", shelf: "On your shelf" };
/** The header card's swatches; the shelf's own chips are the same family. */
export const WHERE_SWATCH: Record<ShelfWhere, string> = { sent: "#e2e7ef", draft: "#f6e2d8", shelf: "#e4e1db" };

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

export interface Notice { lead: string; rest: string; button: string; letterId: string }
/** One banner, whatever the number of unrecorded letters; null when there are none. */
export function noticeOf(u: readonly UnrecordedLetter[]): Notice | null {
  if (!u.length) return null;
  if (u.length === 1) {
    const n = u[0].queries;
    return { lead: u[0].name, rest: ` went out with ${n} ${n === 1 ? "query" : "queries"} before its comps were logged. Log what it named and those queries count too.`, button: "Log it now", letterId: u[0].letterId };
  }
  const total = u.reduce((a, l) => a + l.queries, 0);
  return { lead: `${u.length} letters`, rest: ` went out with ${total} queries before their comps were logged. Log what they named and those queries count too.`, button: "Log them now", letterId: u[0].letterId };
}

/* ══ v30 §A · the header's lead sentence and highlight ═════════════════════════════════════════ */

/** A comp or letter needs about this many queries before its figure means much. */
export const READY_AT = 5;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Numbers up to ten as words; above, the figure. */
export const numberWord = (n: number): string => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The header's line, around the manuscript's title: `{before}<b>{title}</b>{after}`.
 *   "Seven comps on file for X. Two have gone out with your queries, and five are waiting to be used."
 *   "One comp on file for X. One has gone out with your queries."
 *   "Three comps on file for X. None has gone out with a query yet."
 * `sent` is the comps whose letters have gone out (`shelfWhere(r.where) === "sent"`).
 */
export function leadLine(total: number, sent: number): { before: string; after: string } {
  const before = `${cap(numberWord(total))} ${total === 1 ? "comp" : "comps"} on file for `;
  if (sent <= 0) return { before, after: ". None has gone out with a query yet." };
  const rest = total - sent;
  const head = sent === 1 ? "One has" : `${cap(numberWord(sent))} have`;
  const tail = rest > 0 ? `, and ${numberWord(rest)} ${rest === 1 ? "is" : "are"} waiting to be used.` : ".";
  return { before, after: `. ${head} gone out with your queries${tail}` };
}

export type Highlight =
  | { kind: "ready"; key: string; title: string; pct: number; asked: number; queries: number }
  | { kind: "soon"; busiest: number }
  | { kind: "none" };

/**
 * The header's right side: the comp agents ask for more with most, among comps with at least `READY_AT` queries.
 * Ties go to more queries, then the writer's own order. With none that ready but something out, "too soon";
 * with nothing out, "nothing sent". Every rate is `compRate`, over compUsage's figures.
 */
export function highlightOf(rows: readonly CompRow[]): Highlight {
  const ready = rows.filter((r) => r.queries.length >= READY_AT);
  if (ready.length) {
    const best = [...ready].sort((a, b) => (compRate(b)! - compRate(a)!) || (b.queries.length - a.queries.length) || (a.index - b.index))[0];
    return { kind: "ready", key: best.key, title: best.comp.title, pct: compRate(best)!, asked: best.askedForMore, queries: best.queries.length };
  }
  const busiest = rows.reduce((m, r) => Math.max(m, r.queries.length), 0);
  return busiest > 0 ? { kind: "soon", busiest } : { kind: "none" };
}

/* ══ v30 §C · which letter named which comps ══════════════════════════════════════════════════ */

export type LetterMiddle = "logged" | "unrecorded" | "empty";
export interface LetterCard {
  id: string;
  name: string;
  /** the queries it went out with; 0 is a draft */
  sent: number;
  draft: boolean;
  /** logged: its comps are recorded (a sent letter recorded as naming none is logged, with no rows) ·
   *  unrecorded: it went out before its comps were logged · empty: a draft with no comps chosen */
  middle: LetterMiddle;
  /** the comps it names, in the shelf's order */
  comps: { key: string; title: string; year: number | null; kind: CompKind }[];
  rate: AskedRate;
}

/**
 * One card per Query Letter: sent letters by queries (most first, ties by name), then drafts (by name).
 * `rateOf` is compUsage's `letterRate`; this file computes no rate of its own.
 */
export function letterCards(letters: readonly LetterLite[], rows: readonly CompRow[], sentByLetter: ReadonlyMap<string, number>, rateOf: (letterId: string) => AskedRate): LetterCard[] {
  const byName = (a: LetterCard, b: LetterCard) => a.name.localeCompare(b.name);
  const cards = letters.map((l): LetterCard => {
    const sent = sentByLetter.get(l.id) ?? 0;
    const recorded = letterRecorded(l);
    const ids = new Set(recorded ? l.compIds! : []);
    const comps = rows.filter((r) => !!r.comp.id && ids.has(r.comp.id)).map((r) => ({ key: r.key, title: r.comp.title, year: r.comp.year ?? null, kind: r.kind }));
    const draft = sent === 0;
    const middle: LetterMiddle = !draft && !recorded ? "unrecorded" : draft && comps.length === 0 ? "empty" : "logged";
    return { id: l.id, name: l.versionName, sent, draft, middle, comps, rate: rateOf(l.id) };
  });
  const sentCards = cards.filter((c) => !c.draft).sort((a, b) => (b.sent - a.sent) || byName(a, b));
  return [...sentCards, ...cards.filter((c) => c.draft).sort(byName)];
}

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
