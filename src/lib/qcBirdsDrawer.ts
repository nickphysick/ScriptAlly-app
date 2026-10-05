/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Birds-eye drawer's own view (Query Centre v126 §6): what it shows, grouped how, in what
 * order. Pure — the drawer renders it, a test calls it.
 *
 * ⚠️ IT IS THE DRAWER'S AND NOTHING ELSE'S. The list and the carousel keep their own controls
 * (`qcCalView`, `qcCarousel`); a filter chosen here narrows the drawer only.
 *
 * ⚠️ "WHEN" HAS A FOURTH BUCKET THE URGENCY DERIVATION DOES NOT. `attentionGroup` files an
 * agent's-turn query with no promised date under "watch and wait". The drawer separates it as "No
 * date": a date nobody promised is a different fact from a date comfortably far off. A with-you
 * query with no date stays where `attentionGroup` puts it (upcoming) — it is the writer's move
 * whatever its date. Overdue, upcoming and watch are `attentionGroup`'s, unchanged.
 *
 * ⚠️ THE DIRECTION TOGGLE REVERSES THE SORTED LIST; IT DOES NOT NEGATE THE COMPARATOR. Two rows
 * with equal keys keep their relative order under a stable sort either way round, so a negated
 * comparator would leave ties where they were and "reversed" would not be the reverse. Reversing
 * the array is what makes the toggle exactly undo itself.
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, stageOrder, tileCourt, type QcRow } from "./qcSummary";
import { attentionGroup, eyeRows, type EyeRow } from "./qcBirdsEye";

const DAY = 86_400_000;

export type BvdWhen = "overdue" | "upcoming" | "watch" | "nodate";
export const BVD_WHEN: readonly { key: BvdWhen; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "watch", label: "Watch and wait" },
  { key: "nodate", label: "No date" },
];
export function whenOf(row: QcRow, nowMs: number): BvdWhen {
  if (row.expectedMs == null && tileCourt(row.status) !== "you") return "nodate";
  return attentionGroup(row, nowMs);
}

/** The Stage filter's four, plus Revise & resubmit only while one is live (it has no other home). */
export type BvdStage = "queried" | "partial" | "full" | "rr" | "offer";
export const BVD_STAGE_LABEL: Record<BvdStage, string> = {
  queried: "Queried", partial: "Partial", full: "Full", rr: "Revise & resubmit", offer: "Offer",
};
export function stageKey(s: QueryStatus): BvdStage | null {
  switch (s) {
    case QueryStatus.QUERIED: return "queried";
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.PARTIAL_SENT: return "partial";
    case QueryStatus.FULL_REQUESTED: case QueryStatus.FULL_SENT: return "full";
    case QueryStatus.REVISE_RESUBMIT: case QueryStatus.RESUBMITTED: return "rr";
    case QueryStatus.OFFER: return "offer";
    default: return null;
  }
}

export type BvdGroup = "urgency" | "stage" | "agency" | "moved" | "none";
export const BVD_GROUPS: readonly { key: BvdGroup; label: string }[] = [
  { key: "urgency", label: "Urgency" },
  { key: "stage", label: "Stage" },
  { key: "agency", label: "Agency" },
  { key: "moved", label: "Last moved" },
  { key: "none", label: "No grouping" },
];
export type BvdSort = "due" | "moved" | "agent" | "agency";
export const BVD_SORTS: readonly { key: BvdSort; label: string; hint: string }[] = [
  { key: "due", label: "Due date", hint: "The date each query is due, soonest first" },
  { key: "moved", label: "Last moved", hint: "When each query last changed, most recent first" },
  { key: "agent", label: "Agent", hint: "By the agent's name, A to Z" },
  { key: "agency", label: "Agency", hint: "By the agency's name, A to Z" },
];
/** Each sort's natural order, in words — the direction toggle's accessible name. */
export const BVD_ORDER: Record<BvdSort, [string, string]> = {
  due: ["Soonest first", "Latest first"],
  moved: ["Most recent first", "Oldest first"],
  agent: ["A to Z", "Z to A"],
  agency: ["A to Z", "Z to A"],
};

export interface BvdView {
  find: string;
  when: BvdWhen[];
  stage: BvdStage[];
  groupBy: BvdGroup;
  sortBy: BvdSort;
  /** false = the sort's natural order; true = reversed */
  reversed: boolean;
}
export const BVD_DEFAULT: BvdView = { find: "", when: [], stage: [], groupBy: "urgency", sortBy: "due", reversed: false };

/** How many filters are on: Find counts as one, and each chosen When and Stage counts as one. */
export const bvdFilterCount = (v: BvdView): number => (v.find.trim() ? 1 : 0) + v.when.length + v.stage.length;
/** Choosing a sort resets the direction to that sort's natural order. */
export const pickSort = (v: BvdView, s: BvdSort): BvdView => ({ ...v, sortBy: s, reversed: false });

export function bvdMatches(r: EyeRow, v: BvdView, nowMs: number): boolean {
  const f = v.find.trim().toLowerCase();
  if (f && !r.row.agentName.toLowerCase().includes(f) && !r.row.agency.toLowerCase().includes(f)) return false;
  if (v.when.length && !v.when.includes(whenOf(r.row, nowMs))) return false;
  if (v.stage.length) { const k = stageKey(r.row.status); if (!k || !v.stage.includes(k)) return false; }
  return true;
}

/** Counts per When and per Stage over the live rows, whatever else is chosen. */
export function bvdCounts(rows: readonly EyeRow[], nowMs: number): { when: Record<BvdWhen, number>; stage: Record<BvdStage, number> } {
  const when: Record<BvdWhen, number> = { overdue: 0, upcoming: 0, watch: 0, nodate: 0 };
  const stage: Record<BvdStage, number> = { queried: 0, partial: 0, full: 0, rr: 0, offer: 0 };
  for (const r of rows) {
    when[whenOf(r.row, nowMs)] += 1;
    const k = stageKey(r.row.status); if (k) stage[k] += 1;
  }
  return { when, stage };
}

const name = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });
const cmp: Record<BvdSort, (a: EyeRow, b: EyeRow) => number> = {
  /* undated sorts after every dated row, by agent */
  due: (a, b) => {
    const x = a.row.expectedMs, y = b.row.expectedMs;
    if (x == null && y == null) return name(a.row.agentName, b.row.agentName);
    if (x == null) return 1;
    if (y == null) return -1;
    return x - y || name(a.row.agentName, b.row.agentName);
  },
  moved: (a, b) => b.row.lastMs - a.row.lastMs || name(a.row.agentName, b.row.agentName),
  agent: (a, b) => name(a.row.agentName, b.row.agentName) || name(a.row.agency, b.row.agency),
  agency: (a, b) => name(a.row.agency, b.row.agency) || name(a.row.agentName, b.row.agentName),
};
export function bvdSort(rows: readonly EyeRow[], v: Pick<BvdView, "sortBy" | "reversed">): EyeRow[] {
  const out = rows.slice().sort(cmp[v.sortBy]);
  return v.reversed ? out.reverse() : out;
}

/** "this week" · "this month" · "last three months" · "earlier" — by how long since it last moved. */
export type MovedBucket = "week" | "month" | "quarter" | "earlier";
export const MOVED_LABEL: Record<MovedBucket, string> = { week: "This week", month: "This month", quarter: "Last three months", earlier: "Earlier" };
export function movedBucket(row: QcRow, nowMs: number): MovedBucket {
  const d = (nowMs - row.lastMs) / DAY;
  return d <= 7 ? "week" : d <= 31 ? "month" : d <= 92 ? "quarter" : "earlier";
}

export interface BvdGroupOut {
  key: string;
  label: string;
  /** shown rows, and the group's whole size before any filter */
  shown: number;
  of: number;
  rows: EyeRow[];
  /** Stage grouping: the stage colour's state key, for the band's dot */
  dot?: string;
}

/**
 * The drawer's groups. Rows are filtered, then partitioned, then sorted WITHIN each group. A group
 * left with nothing after filtering is dropped; "of" is its size before the filter, so a heading can
 * read "3 of 6" while filtered.
 */
export function bvdGroups(rows: readonly QcRow[], v: BvdView, nowMs: number): BvdGroupOut[] {
  const all = eyeRows(rows, nowMs);
  const keep = (r: EyeRow) => bvdMatches(r, v, nowMs);
  const make = (key: string, label: string, mine: EyeRow[], dot?: string): BvdGroupOut => {
    const shown = bvdSort(mine.filter(keep), v);
    return { key, label, shown: shown.length, of: mine.length, rows: shown, dot };
  };
  let out: BvdGroupOut[];
  if (v.groupBy === "none") out = [make("all", "", all)];
  else if (v.groupBy === "urgency") out = BVD_WHEN.map((w) => make(w.key, w.label, all.filter((r) => whenOf(r.row, nowMs) === w.key)));
  else if (v.groupBy === "stage") {
    out = stageOrder(all.map((r) => r.row)).map((s) => make(String(s), STAGE_NAME[s], all.filter((r) => r.row.status === s), all.find((r) => r.row.status === s)?.row.state));
  } else if (v.groupBy === "agency") {
    const names = [...new Set(all.map((r) => r.row.agency || "No agency"))].sort(name);
    out = names.map((a) => make(`ag:${a}`, a, all.filter((r) => (r.row.agency || "No agency") === a)));
  } else {
    out = (["week", "month", "quarter", "earlier"] as MovedBucket[]).map((b) => make(b, MOVED_LABEL[b], all.filter((r) => movedBucket(r.row, nowMs) === b)));
  }
  return out.filter((g) => g.shown > 0);
}
