/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 — the page's pure model (ref design-refs/query-centre-v138/query-centre-v138.html).
 *
 * Part A · THE GLYPH ROW: seven stage glyphs whose counts sum to N and which filter the list.
 *
 * ⚠️ EVERY STATUS IS IN EXACTLY ONE GLYPH, so the seven counts sum to the header's N. The app has ten-plus
 *    statuses and the row draws seven, so four fold: Revise & Resubmit is a request for the full (Full requested),
 *    Resubmitted is the full gone back (Full sent), Signed is the offer taken (Offer), and Withdrawn is closed
 *    (Closed). A glyph filters to exactly the statuses it counts, so a press never shows a number of rows its own
 *    count does not state.
 * ⚠️ THE STAGE FILTER IS A SET OF STATUSES, shared with Part B's Stage pill: a glyph is pressed when the set is
 *    exactly its own statuses, and pressing it again empties the set.
 */
import { QueryStatus } from "../types";

export type GlyphKey = "q" | "pr" | "ps" | "fr" | "fs" | "of" | "cl";

export interface GlyphDef {
  key: GlyphKey;
  /** the two-line label, as drawn */
  lines: readonly [string, string?];
  /** the stage's name for the button's accessible label and the Stage pill */
  name: string;
  statuses: readonly QueryStatus[];
  /** a your-move stage: drawn with the dashed outer ring */
  yours: boolean;
}

export const GLYPHS: readonly GlyphDef[] = [
  { key: "q", lines: ["Queried"], name: "Queried", statuses: [QueryStatus.QUERIED], yours: false },
  { key: "pr", lines: ["Partial", "requested"], name: "Partial requested", statuses: [QueryStatus.PARTIAL_REQUESTED], yours: true },
  { key: "ps", lines: ["Partial", "sent"], name: "Partial sent", statuses: [QueryStatus.PARTIAL_SENT], yours: false },
  { key: "fr", lines: ["Full", "requested"], name: "Full requested", statuses: [QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT], yours: true },
  { key: "fs", lines: ["Full", "sent"], name: "Full sent", statuses: [QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED], yours: false },
  { key: "of", lines: ["Offer"], name: "Offer", statuses: [QueryStatus.OFFER, QueryStatus.SIGNED], yours: true },
  { key: "cl", lines: ["Closed"], name: "Closed", statuses: [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN], yours: false },
];

const BY_STATUS = new Map<string, GlyphKey>();
for (const g of GLYPHS) for (const s of g.statuses) BY_STATUS.set(s, g.key);

/** the glyph a status counts under; an unknown status reads as Queried rather than vanishing from the sum */
export const glyphFor = (status: string): GlyphKey => BY_STATUS.get(status) ?? "q";

export const glyphDef = (k: GlyphKey): GlyphDef => GLYPHS.find((g) => g.key === k)!;

/** the seven counts over the manuscript-scoped rows; they sum to `rows.length` */
export function glyphCounts(rows: readonly { status: string }[]): Record<GlyphKey, number> {
  const out: Record<GlyphKey, number> = { q: 0, pr: 0, ps: 0, fr: 0, fs: 0, of: 0, cl: 0 };
  for (const r of rows) out[glyphFor(r.status)] += 1;
  return out;
}

/** the stage filter: empty means every stage */
export type StageSet = readonly QueryStatus[];

export const sameSet = (a: StageSet, b: readonly QueryStatus[]): boolean =>
  a.length === b.length && a.every((s) => b.includes(s));

/** the glyph the set IS exactly, if any */
export const pressedGlyph = (set: StageSet): GlyphKey | null =>
  set.length === 0 ? null : GLYPHS.find((g) => sameSet(set, g.statuses))?.key ?? null;

/** pressing a glyph: its statuses, or none when it is already the whole set */
export const pressGlyph = (set: StageSet, k: GlyphKey): StageSet => {
  const g = glyphDef(k);
  return sameSet(set, g.statuses) ? [] : [...g.statuses];
};

export const inStages = (set: StageSet, status: string): boolean =>
  set.length === 0 || set.includes(status as QueryStatus);

/** "27 queries sent" / "1 query sent" */
export const sentWords138 = (n: number): string => (n === 1 ? "query sent" : "queries sent");
