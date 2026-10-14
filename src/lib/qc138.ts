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
import { MONTHS_SHORT } from "./dates";

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

/* ── Part E · THE ROWS ─────────────────────────────────────────────────────────────────────────────────────────
 * ⚠️ NO MONO CAPITALS IN ANY DETAIL LINE: row detail is serif in normal case. The shared row lines
 *    (`lib/qcRowLines`) are written in capitals for the v132 list, so they are re-cased here rather than forked.
 */
const MONTH_CAP = new Set(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
/** "OVERDUE SINCE 11 JUN" → "Overdue since 11 Jun" */
export const sentenceCase = (s: string): string =>
  s.toLowerCase().replace(/[a-z]+/g, (w) => (MONTH_CAP.has(w) ? w[0].toUpperCase() + w.slice(1) : w)).replace(/^[a-z]/, (c) => c.toUpperCase());

const MON138 = MONTHS_SHORT;
export const dayMonYear = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MON138[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
};
const DETAIL_VERB: Record<string, string> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Requested", [QueryStatus.FULL_REQUESTED]: "Requested", [QueryStatus.REVISE_RESUBMIT]: "Requested",
  [QueryStatus.PARTIAL_SENT]: "Sent", [QueryStatus.FULL_SENT]: "Sent", [QueryStatus.RESUBMITTED]: "Sent",
  [QueryStatus.OFFER]: "Offered", [QueryStatus.SIGNED]: "Signed", [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed", [QueryStatus.WITHDRAWN]: "Withdrawn",
};

/**
 * The stage's detail line: "Requested 2 Sep". None at Queried (the date is in First queried) and never "· day n".
 * `hot` (rust, upright, 600) when the row is the writer's to send and its send-by date has gone.
 */
export function stageDetail(r: Filterable & { stageStartMs: number | null }, nowMs: number): { text: string; hot: boolean } | null {
  if (r.status === QueryStatus.QUERIED) return null;
  const verb = DETAIL_VERB[r.status] ?? "Since";
  const text = r.stageStartMs != null ? `${verb} ${dayMonYear(r.stageStartMs, nowMs)}` : `${verb}, not dated`;
  const due = dueOf(r);
  return { text, hot: r.court === "you" && due != null && due < startOfDay(nowMs) };
}

/** the track's four stops */
export const TRACK_STOPS = ["Queried", "Partial", "Full", "Offer"] as const;
/** how far along the track a row has come: 0 queried, 1 partial, 2 full, 3 offer (its furthest, open or closed) */
export function trackLevel(r: { status: string; furthest: "query" | "partial" | "full" }): number {
  if (r.status === QueryStatus.OFFER || r.status === QueryStatus.SIGNED) return 3;
  if (r.furthest === "full" || [QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED].includes(r.status as QueryStatus)) return 2;
  if (r.furthest === "partial" || [QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT].includes(r.status as QueryStatus)) return 1;
  return 0;
}

/**
 * The due dial's arc: the share of the wait gone, from the last change to the due date, with a 4% minimum.
 * `over` when the date has passed (a solid disc then, no ring). Null for a closed or undated row.
 */
export const DIAL = { box: 52, r: 22, w: 3.5 } as const;
export const DIAL_C = 2 * Math.PI * DIAL.r;
export function dialOf(r: Filterable & { stageStartMs: number | null; lastMs: number }, nowMs: number): { frac: number; over: boolean; due: number } | null {
  const due = dueOf(r);
  if (due == null) return null;
  if (due < startOfDay(nowMs)) return { frac: 1, over: true, due };
  const from = r.stageStartMs ?? r.lastMs;
  const span = due - from;
  const gone = span > 0 ? (nowMs - from) / span : 1;
  return { frac: Math.min(1, Math.max(0.04, gone)), over: false, due };
}

/* ── THE PEEK'S EVENTS AND WORDS ───────────────────────────────────────────────────────────────────────────────
 * The timeline itself is lib/qcTl4 (v138.4: one positioned track at true scale). What stays here is what it and the
 * summary share: the event type, the your-move stages, the strict glyph map, whole-day counting and the gap wording.
 */
/**
 * v138.3 — `status` is the event's stage from the activity source itself (the panel's `RowSpec.status`), never parsed
 * from its label; null for an event that is not a status (a nudge, a holding reply), which draws no stage glyph.
 */
export interface PeekEvent { name: string; ms: number; status?: string | null }
/** the stages whose stretch is the writer's turn, and whose marker carries the dashed ring (v138.3 A/B) */
export const YOUR_MOVE_STATUSES: readonly string[] = [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER];
/** an event's stage glyph, strictly: null when the event is not a status or the status is unknown (no fallback) */
export const peekGlyph = (status: string | null | undefined): GlyphKey | null => (status ? BY_STATUS.get(status) ?? null : null);

const dayKey = (ms: number): number => startOfDay(ms);
export const dDays = (a: number, b: number): number => Math.max(0, Math.round((dayKey(b) - dayKey(a)) / DAY_MS));

/** "same day", "{n} days" (under 14), "{n} weeks" (under 60), "{n} months" (under 365), "{y} yrs {m} mo" */
export function gapWords(days: number): string {
  if (days <= 0) return "same day";
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) { const w = Math.round(days / 7); return `${w} ${w === 1 ? "week" : "weeks"}`; }
  if (days < 365) { const m = Math.max(2, Math.round(days / 30.44)); return `${m} months`; }
  const y = Math.floor(days / 365), m = Math.round((days - y * 365) / 30.44);
  return m > 0 && m < 12 ? `${y} ${y === 1 ? "yr" : "yrs"} ${m} mo` : `${m >= 12 ? y + 1 : y} ${(m >= 12 ? y + 1 : y) === 1 ? "yr" : "yrs"}`;
}

/**
 * v138.2 §A — the open peek's tone, which tints the whole row: "over" when the due date has gone (the same day test
 * the chain's "Was due" stop and the due dial use), "closed" for a closed query, else "wait".
 */
export type PeekTone = "wait" | "over" | "closed";
export const peekLate = (due: number | null, now: number): boolean => due != null && startOfDay(due) < startOfDay(now);
export const peekTone = (due: number | null, now: number, closed: boolean): PeekTone => (closed ? "closed" : peekLate(due, now) ? "over" : "wait");

/**
 * v138.2 §C — THE SUMMARY under Agent: how long the query has been out, and where it stands against its date.
 * ⚠️ THE SAME DATES AS THE PEEK AND THE DIAL: the date queried, the row's due date (`dueOf`) and today, counted in
 *    whole days by the chain's own start-of-day `dDays`, worded by the chain's own `gapWords`. Never re-derived.
 * Line 1: "Out {d}" ("Closed" when closed). Line 2: "{d} past the date" (hot) · "{d} until their reply date" ·
 * "{d} until your send-by date" · "closed {d} after you queried" · "No date set". Same-day forms are said plainly.
 */
export interface PeekSummary { head: string; line: string; hot: boolean }
export function peekSummary(o: { sent: number | null; due: number | null; closedAt: number | null; closed: boolean; yours: boolean; now: number }): PeekSummary {
  const { sent, due, closedAt, closed, yours, now } = o;
  if (closed) {
    if (sent == null || closedAt == null) return { head: "Closed", line: "closed, not dated", hot: false };
    const d = dDays(sent, closedAt);
    return { head: "Closed", line: d === 0 ? "closed the day you queried" : `closed ${gapWords(d)} after you queried`, hot: false };
  }
  const out = sent == null ? "Out, not dated" : dDays(sent, now) === 0 ? "Out today" : `Out ${gapWords(dDays(sent, now))}`;
  if (due == null) return { head: out, line: "No date set", hot: false };
  if (peekLate(due, now)) return { head: out, line: `${gapWords(dDays(due, now))} past the date`, hot: true };
  const left = dDays(now, due);
  if (left === 0) return { head: out, line: yours ? "your send-by date is today" : "their reply date is today", hot: false };
  return { head: out, line: `${gapWords(left)} until ${yours ? "your send-by date" : "their reply date"}`, hot: false };
}

