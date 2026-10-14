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

/* ── Part B · THE FILTERS ─────────────────────────────────────────────────────────────────────────────────────
 * ⚠️ ONE STATE, EVERY CONTROL READS IT: the glyph row, the Stage pill, the two toggles, What you sent and the More
 *    filters switches all read and write this one value, so no control can show a copy of another's. Facets are
 *    ANDed; ticks inside the Stage and What you sent facets are alternatives.
 */
export const SENT_NONE = "__none__";

export interface Qc138Filters {
  stages: StageSet;
  dueWeek: boolean;
  offers: boolean;
  /** package ids, and/or SENT_NONE for "Nothing recorded" */
  sent: readonly string[];
  past: boolean;
  missing: boolean;
  overYear: boolean;
}
export const emptyQc138Filters = (): Qc138Filters => ({ stages: [], dueWeek: false, offers: false, sent: [], past: false, missing: false, overYear: false });
/** how many facets are on (the glyph row's stage counts as one) */
export const qc138FilterCount = (f: Qc138Filters): number =>
  (f.stages.length ? 1 : 0) + (f.dueWeek ? 1 : 0) + (f.offers ? 1 : 0) + (f.sent.length ? 1 : 0) + (f.past ? 1 : 0) + (f.missing ? 1 : 0) + (f.overYear ? 1 : 0);
export const moreCount = (f: Qc138Filters): number => (f.past ? 1 : 0) + (f.missing ? 1 : 0) + (f.overYear ? 1 : 0);

export const MORE_SWITCHES: { key: "past" | "missing" | "overYear"; label: string; line: string }[] = [
  { key: "past", label: "Past their reply date", line: "Quiet past the date you expected" },
  { key: "missing", label: "Missing materials", line: "What you sent isn’t recorded" },
  { key: "overYear", label: "Over a year", line: "Queried more than a year ago" },
];

/** the Stage pill's panel: every status the app has, grouped by whose court it is in */
export const STAGE_GROUPS: { title: string; statuses: { s: QueryStatus; label: string }[] }[] = [
  { title: "With you", statuses: [
    { s: QueryStatus.PARTIAL_REQUESTED, label: "Partial requested" }, { s: QueryStatus.FULL_REQUESTED, label: "Full requested" },
    { s: QueryStatus.REVISE_RESUBMIT, label: "Revise & resubmit" }, { s: QueryStatus.OFFER, label: "Offer" },
  ] },
  { title: "With agents", statuses: [
    { s: QueryStatus.QUERIED, label: "Queried" }, { s: QueryStatus.PARTIAL_SENT, label: "Partial sent" },
    { s: QueryStatus.FULL_SENT, label: "Full sent" }, { s: QueryStatus.RESUBMITTED, label: "Resubmitted" },
  ] },
  { title: "Closed", statuses: [
    { s: QueryStatus.REJECTED, label: "Passed" }, { s: QueryStatus.NO_RESPONSE, label: "No reply" },
    { s: QueryStatus.WITHDRAWN, label: "Withdrawn" }, { s: QueryStatus.SIGNED, label: "Signed" },
  ] },
];
const STAGE_LABEL = new Map<string, string>(STAGE_GROUPS.flatMap((g) => g.statuses.map((x) => [x.s as string, x.label] as const)));

/** the Stage pill's words: the glyph's name when the set is a glyph's, one status's label, or "{n} stages" */
export function stagePillLabel(set: StageSet): string {
  if (set.length === 0) return "Stage";
  const g = pressedGlyph(set);
  if (g) return glyphDef(g).name;
  if (set.length === 1) return STAGE_LABEL.get(set[0]) ?? "Stage";
  return `${set.length} stages`;
}

const DAY_MS = 86_400_000;
export const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** the minimum a row needs for the filters: QcRow carries all of it */
export interface Filterable {
  status: string;
  expectedMs: number | null;
  court: string;
  pastExpected: boolean;
  sentMs: number | null;
  materialsRecorded: boolean;
  query: { sentPackageId?: string | null; packageId?: string | null };
}

/** the package a row's send names, or null */
export const pkgKeyOf = (r: Filterable): string | null => r.query.sentPackageId || r.query.packageId || null;
/** "Nothing recorded": no package and no pieces ticked */
export const nothingRecorded = (r: Filterable): boolean => !pkgKeyOf(r) && !r.materialsRecorded;
/** the next action's date: the expected date for a live query, nothing for a closed one */
export const dueOf = (r: Filterable): number | null => (r.court === "closed" ? null : r.expectedMs);
/** due in the next seven days, today included, and not yet past */
export const dueThisWeek = (r: Filterable, now: number): boolean => {
  const d = dueOf(r);
  if (d == null) return false;
  const t0 = startOfDay(now);
  return d >= t0 && d < t0 + 7 * DAY_MS;
};
export const overAYear = (r: Filterable, now: number): boolean => r.sentMs != null && r.sentMs < now - 365 * DAY_MS;

/** one facet's test; `skip` leaves that facet out, for the counts beside each control */
export function matches138(r: Filterable, f: Qc138Filters, now: number, skip?: keyof Qc138Filters): boolean {
  if (skip !== "stages" && !inStages(f.stages, r.status)) return false;
  if (skip !== "dueWeek" && f.dueWeek && !dueThisWeek(r, now)) return false;
  if (skip !== "offers" && f.offers && r.status !== QueryStatus.OFFER) return false;
  if (skip !== "sent" && f.sent.length) {
    const k = pkgKeyOf(r);
    const ok = (k && f.sent.includes(k)) || (f.sent.includes(SENT_NONE) && nothingRecorded(r));
    if (!ok) return false;
  }
  if (skip !== "past" && f.past && !r.pastExpected) return false;
  if (skip !== "missing" && f.missing && !nothingRecorded(r)) return false;
  if (skip !== "overYear" && f.overYear && !overAYear(r, now)) return false;
  return true;
}

/* ── Part C · THE HEADINGS SORT ────────────────────────────────────────────────────────────────────────────────
 * ⚠️ THERE IS NO SORT CONTROL: each heading is the sort. Rows sort WITHIN each group, because the groups are cut
 *    from an already-sorted list. A row with nothing to sort on goes LAST in either direction (the house rule),
 *    so reversing a sort never floats the empties to the top.
 */
export type Qc138SortKey = "agent" | "first" | "stage" | "sent" | "next" | "due";
export interface Qc138Sort { key: Qc138SortKey; reversed: boolean }
export const DEFAULT_SORT_138: Qc138Sort = { key: "due", reversed: false };

/** a heading press: the same key reverses, another key sorts by it ascending */
export const pressHeading = (s: Qc138Sort, key: Qc138SortKey): Qc138Sort =>
  s.key === key ? { key, reversed: !s.reversed } : { key, reversed: false };

/** stage order: Queried, Partial requested, Partial sent, Full requested, Full sent, Offer, Passed, No reply */
const STAGE_ORDER: Record<string, number> = {
  [QueryStatus.QUERIED]: 0, [QueryStatus.PARTIAL_REQUESTED]: 1, [QueryStatus.PARTIAL_SENT]: 2,
  [QueryStatus.FULL_REQUESTED]: 3, [QueryStatus.REVISE_RESUBMIT]: 3.5, [QueryStatus.FULL_SENT]: 4, [QueryStatus.RESUBMITTED]: 4.5,
  [QueryStatus.OFFER]: 5, [QueryStatus.SIGNED]: 5.5, [QueryStatus.REJECTED]: 6, [QueryStatus.NO_RESPONSE]: 7, [QueryStatus.WITHDRAWN]: 8,
};
export const stageRank = (status: string): number => STAGE_ORDER[status] ?? 0;

/** the surname: the last word of the name, lower-cased */
export const surnameKey = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? "").toLowerCase();
};

export interface SortCtx<T> {
  /** the row's package name, or null when none is recorded */
  packageName: (r: T) => string | null;
  /** the next move's label, or null */
  nextLabel: (r: T) => string | null;
}

export function sort138<T extends Filterable & { id: string; agentName: string }>(rows: readonly T[], s: Qc138Sort, ctx: SortCtx<T>): T[] {
  const val = (r: T): string | number | null => {
    switch (s.key) {
      case "agent": return surnameKey(r.agentName) || null;
      case "first": return r.sentMs;
      case "stage": return stageRank(r.status);
      case "sent": return ctx.packageName(r)?.toLowerCase() ?? null;
      case "next": return ctx.nextLabel(r)?.toLowerCase() ?? null;
      case "due": return dueOf(r);
    }
  };
  const dir = s.reversed ? -1 : 1;
  return rows.map((r, i) => ({ r, i, v: val(r) })).sort((a, b) => {
    if (a.v == null && b.v == null) return a.i - b.i;
    if (a.v == null) return 1;
    if (b.v == null) return -1;
    const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : String(a.v).localeCompare(String(b.v));
    return c !== 0 ? c * dir : a.i - b.i;
  }).map((x) => x.r);
}

export const HEADINGS: { key: Qc138SortKey; label: string }[] = [
  { key: "agent", label: "Agent" }, { key: "first", label: "First queried" }, { key: "stage", label: "Where it stands" },
  { key: "sent", label: "What you sent" }, { key: "next", label: "Next move" }, { key: "due", label: "Due" },
];
