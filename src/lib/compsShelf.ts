/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 (design-refs/comps-v28/comps-v28.html): the shelf's own logic, pure. Where a comp is used,
 * its age chip, what its card's slip says, the shelf's sort and filters, the notice, "What's landing" by comp and by
 * letter, and the picker's record and tip. Every figure comes from `lib/compUsage` through `compsLibrary.buildRows`;
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

/** The age past which a comp turns blush: agents usually look for comps from the last five years. */
export const OLD_AFTER = 5;
export const OLD_TITLE = "Agents usually look for comps from the last five years";
export type AgeTone = "new" | "mid" | "old";
export interface AgeChip { age: number; text: string; tone: AgeTone; title: string | null }

/** The age chip: none without a year; 0–1 sage, 2–5 plain, 6 and over blush. A year ahead of now reads "This year". */
export function ageChip(year: number | undefined, now: number): AgeChip | null {
  if (typeof year !== "number" || !Number.isFinite(year)) return null;
  const age = Math.max(0, now - year);
  const text = age === 0 ? "This year" : age === 1 ? "1 yr old" : `${age} yrs old`;
  const tone: AgeTone = age > OLD_AFTER ? "old" : age <= 1 ? "new" : "mid";
  return { age, text, tone, title: tone === "old" ? OLD_TITLE : null };
}
export const isOld = (year: number | undefined, now: number): boolean => ageChip(year, now)?.tone === "old";

/** The catalogue line's parts: the type word, the publisher (or `missing`), the year. */
export function catalogueLine(c: CompTitle): { type: string; publisher: string | null; missing: boolean; year: string | null } {
  const media = c.media ?? "book";
  const pub = c.publisher?.trim() || null;
  return { type: MEDIA_WORD[media], publisher: pub, missing: media === "book" && !pub, year: c.year ? String(c.year) : null };
}

export type Slip =
  | { kind: "notready"; text: string; link: string }
  | { kind: "sent"; queries: number; asked: number; pct: number }
  | { kind: "draft"; letter: string }
  | { kind: "shelf" };

/** What the card's slip says, by state. Not ready wins over everything: a letter cannot name it yet. */
export function slipOf(r: CompRow): Slip {
  if (!r.ready) {
    const book = (r.comp.media ?? "book") === "book";
    const needPub = book && !r.comp.publisher?.trim();
    return needPub
      ? { kind: "notready", text: "A letter can name it once it has a publisher.", link: "Add publisher" }
      : { kind: "notready", text: "A letter can name it once it has a year.", link: "Add year" };
  }
  const w = shelfWhere(r.where);
  if (w === "sent") return { kind: "sent", queries: r.queries.length, asked: r.askedForMore, pct: Math.round((r.askedForMore / r.queries.length) * 100) };
  if (w === "draft") return { kind: "draft", letter: r.letters.find((l) => !l.sent)?.short ?? r.letters[0]?.short ?? "" };
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

export interface ShelfFilter { where: ShelfWhere | null; kind: CompKind | null; find: string }
export const NO_FILTER: ShelfFilter = { where: null, kind: null, find: "" };
export const filtered = (f: ShelfFilter): boolean => !!f.where || !!f.kind || !!f.find.trim();

/** Where, type and find narrow each other (AND). Find matches title, author or publisher. */
export function filterShelf(rows: readonly CompRow[], f: ShelfFilter): CompRow[] {
  const q = f.find.trim().toLowerCase();
  return rows.filter((r) =>
    (!f.where || shelfWhere(r.where) === f.where)
    && (!f.kind || r.kind === f.kind)
    && (!q || `${r.comp.title} ${r.comp.author ?? ""} ${r.comp.publisher ?? ""}`.toLowerCase().includes(q)));
}

export const KIND_ORDER: CompKind[] = ["book", "film", "tv"];
export const KIND_LABEL: Record<CompKind, string> = { book: "Books", film: "Films", tv: "TV" };
/** The types on the shelf; the toggles show only when there are two or more. */
export const kindsPresent = (rows: readonly CompRow[]): CompKind[] => KIND_ORDER.filter((k) => rows.some((r) => r.kind === k));

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

/* ══ what's landing ═══════════════════════════════════════════════════════════════════════════ */

/** Below this many queries a comp's rate is read lightly (a hollow dot). */
export const LIGHT_BELOW = 5;
export interface LandingRow { key: string; title: string; kind: CompKind; queries: number; asked: number; pct: number; light: boolean }

/** One row per comp that has gone out, most queries first (ties in the writer's order). */
export function landingRows(rows: readonly CompRow[]): LandingRow[] {
  return sortShelf(rows.filter((r) => r.queries.length > 0), "queries").map((r) => ({
    key: r.key, title: r.comp.title, kind: r.kind, queries: r.queries.length, asked: r.askedForMore,
    pct: compRate(r) ?? 0, light: r.queries.length < LIGHT_BELOW,
  }));
}

/** "4 comps haven't gone out yet: A, B (in QL v3)." — null when every comp has. */
export function restLine(rows: readonly CompRow[]): { lead: string; rest: string } | null {
  const rest = rows.filter((r) => r.queries.length === 0);
  if (!rest.length) return null;
  const names = rest.map((r) => (shelfWhere(r.where) === "draft" ? `${r.comp.title} (in ${r.letters.find((l) => !l.sent)?.short ?? r.letters[0]?.short})` : r.comp.title));
  return { lead: `${rest.length} ${rest.length === 1 ? "comp hasn’t" : "comps haven’t"}`, rest: ` gone out yet: ${names.join(", ")}.` };
}

export type LetterGroup = "sent" | "unrecorded" | "unsent";
export interface LetterBlock {
  id: string; name: string; group: LetterGroup; current: boolean; sent: number; recorded: boolean;
  /** the comps it names, in the shelf's order */
  comps: string[];
  rate: AskedRate;
}

/**
 * One block per Query Letter: sent and recorded, then sent and unrecorded, then not sent; oldest first within each.
 * `rateOf` is compUsage's `letterRate` (the page passes it; this file computes no rate of its own).
 */
export function letterBlocks(letters: readonly LetterLite[], comps: readonly CompTitle[], sentByLetter: ReadonlyMap<string, number>, currentId: string | null, rateOf: (letterId: string) => AskedRate): LetterBlock[] {
  const rank: Record<LetterGroup, number> = { sent: 0, unrecorded: 1, unsent: 2 };
  const blocks = letters.map((l): LetterBlock => {
    const sent = sentByLetter.get(l.id) ?? 0;
    const recorded = letterRecorded(l);
    const ids = new Set(recorded ? l.compIds! : []);
    return {
      id: l.id, name: l.versionName, current: l.id === currentId, sent, recorded,
      group: sent > 0 ? (recorded ? "sent" : "unrecorded") : "unsent",
      comps: comps.filter((c) => !!c.id && ids.has(c.id)).map((c) => c.title),
      rate: rateOf(l.id),
    };
  });
  return blocks.map((b, i) => ({ b, i })).sort((x, y) => rank[x.b.group] - rank[y.b.group] || x.i - y.i).map((x) => x.b);
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
