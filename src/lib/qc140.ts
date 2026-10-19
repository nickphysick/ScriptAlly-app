/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 — the list's toolbar, its menus and the applied-filters row, as pure functions
 * (ref design-refs/query-centre-v140/). The components are `queries/centre/QcToolbar140.tsx`.
 *
 *   - THE JUMP ROW: one button per group in the group's order (its mark, its label, its count), or, with no grouping,
 *     the sort column's label and one button per month of that column's date, in list order.
 *   - THE FILTERS MENU'S ROWS: the four quick picks, the eight "Where it stands" rows, and the applied chips.
 *
 * ⚠️ ONE FILTER STATE (`Qc138Filters`). The Overdue quick pick IS the "Past their reply date" switch (`past`) and the
 *    Offers quick pick IS the Offers toggle (`offers`): a pick reads and writes the same field, so the two can never
 *    disagree and the applied row shows one chip. Only Your move and Waiting to hear back had no field of their own
 *    (`you`, `waiting`, added to `Qc138Filters`).
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import { SENT_NONE, type Qc138Filters, type Qc138SortKey } from "./qc138";
import type { GroupBy } from "./qcCalView";
import { placeOf } from "./responses";
import { sentWeeks, type SentWeek } from "./qcSentWeeks";

/* ── the jump row ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** Next action's short labels, in the jump row only (the bands keep their full names), keyed by the group's key */
export const JUMP_SHORT: Readonly<Record<string, string>> = {
  offer: "Offer",
  close: "Close?",
  [QueryStatus.NO_RESPONSE]: "No reply",
};
export const jumpLabel = (groupBy: GroupBy, key: string, label: string): string =>
  groupBy === "action" ? JUMP_SHORT[key] ?? label : label;

/** the date the ungrouped jump row reads: the sort column's, or the last change for any other heading */
export type JumpColumn = "due" | "queried" | "changed";
export const jumpColumn = (k: Qc138SortKey): JumpColumn => (k === "due" ? "due" : k === "first" ? "queried" : "changed");
export const JUMP_COLUMN_LABEL: Readonly<Record<JumpColumn, string>> = { due: "DUE", queried: "QUERIED", changed: "CHANGED" };

export interface MonthRow {
  id: string;
  court: string;
  expectedMs: number | null;
  sentMs: number | null;
  stageStartMs: number | null;
  lastMs: number;
}
/* the due date is `dueOf`'s: the expected date of a live query, none for a closed one */
const dateOf = (r: MonthRow, col: JumpColumn): number | null =>
  col === "due" ? (r.court === "closed" ? null : r.expectedMs) : col === "queried" ? r.sentMs : r.stageStartMs ?? r.lastMs;

export interface MonthJump { key: string; label: string; n: number; firstId: string }
/**
 * One button per month of the column's date, in LIST order (the order the rows are drawn): a month's button jumps to
 * its first row. A row with no date makes no button. "May ’24" when the year is not this one.
 */
export function monthJumps(rows: readonly MonthRow[], col: JumpColumn, nowMs: number): MonthJump[] {
  const y0 = new Date(nowMs).getFullYear();
  const out: MonthJump[] = [];
  const at = new Map<string, MonthJump>();
  for (const r of rows) {
    const ms = dateOf(r, col);
    if (ms == null || !Number.isFinite(ms)) continue;
    const d = new Date(ms);
    const key = `m:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hit = at.get(key);
    if (hit) { hit.n += 1; continue; }
    const m: MonthJump = { key, label: `${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === y0 ? "" : ` ’${String(d.getFullYear()).slice(2)}`}`, n: 1, firstId: r.id };
    at.set(key, m);
    out.push(m);
  }
  return out;
}

/* ── the Filters menu ─────────────────────────────────────────────────────────────────────────────────────────── */

/** "Where it stands": the existing Stage filter, one row per stage, each the statuses it stands for */
export interface StandRow { key: string; label: string; statuses: readonly QueryStatus[] }
export const STAND_ROWS: readonly StandRow[] = [
  { key: "q", label: "Queried", statuses: [QueryStatus.QUERIED] },
  { key: "pr", label: "Partial requested", statuses: [QueryStatus.PARTIAL_REQUESTED] },
  { key: "ps", label: "Partial sent", statuses: [QueryStatus.PARTIAL_SENT] },
  { key: "fr", label: "Full requested", statuses: [QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT] },
  { key: "fs", label: "Full sent", statuses: [QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED] },
  { key: "of", label: "Offer", statuses: [QueryStatus.OFFER, QueryStatus.SIGNED] },
  { key: "rj", label: "Passed", statuses: [QueryStatus.REJECTED] },
  { key: "nr", label: "No reply", statuses: [QueryStatus.NO_RESPONSE] },
];
/** a stand row is on when every one of its statuses is in the stage set */
export const standOn = (f: Qc138Filters, row: StandRow): boolean => row.statuses.every((s) => f.stages.includes(s));
export const toggleStand = (f: Qc138Filters, row: StandRow): Qc138Filters => standOn(f, row)
  ? { ...f, stages: f.stages.filter((s) => !row.statuses.includes(s)) }
  : { ...f, stages: [...f.stages.filter((s) => !row.statuses.includes(s)), ...row.statuses] };

export type QuickKey = "you" | "over" | "wait" | "offers";
export interface QuickPick { key: QuickKey; title: string; line: string; field: "you" | "past" | "waiting" | "offers" }
/** ⚠️ Overdue writes `past` and Offers writes `offers`: the same fields as the switch and the toggle */
export const QUICK_PICKS: readonly QuickPick[] = [
  { key: "you", title: "Your move", line: "Requests, offers and nudges", field: "you" },
  { key: "over", title: "Overdue", line: "Past the date you expected", field: "past" },
  { key: "wait", title: "Waiting to hear back", line: "With agents, not yet due", field: "waiting" },
  { key: "offers", title: "Offers", line: "Waiting on your answer", field: "offers" },
];

/** "Waiting to hear back": an agent-court query not past its date */
export const waitingRow = (r: { court: string; pastExpected: boolean }): boolean => r.court === "agent" && !r.pastExpected;

/* ── the applied row ──────────────────────────────────────────────────────────────────────────────────────────── */

export interface AppliedSpec {
  key: string;
  label: string;
  /** a status chip carries its glyph: the first status it stands for */
  status?: QueryStatus;
  off: (f: Qc138Filters) => Qc138Filters;
}
const STAGE_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.WITHDRAWN]: "Withdrawn", [QueryStatus.SIGNED]: "Signed", [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit", [QueryStatus.RESUBMITTED]: "Resubmitted",
};
/**
 * One chip per active filter, in the menu's order: the quick picks, the stand rows, any status the stand rows do not
 * cover whole (the hero's Closed glyph sets Withdrawn too), what you sent, then the rest. Search is NOT here (the
 * Filters chip does not count it); the row adds its own chip for it.
 */
export function appliedChips(f: Qc138Filters, sentName: (k: string) => string): AppliedSpec[] {
  const out: AppliedSpec[] = [];
  if (f.you) out.push({ key: "qp:you", label: "Your move", off: (g) => ({ ...g, you: false }) });
  if (f.past) out.push({ key: "qp:over", label: "Overdue", off: (g) => ({ ...g, past: false }) });
  if (f.waiting) out.push({ key: "qp:wait", label: "Waiting to hear back", off: (g) => ({ ...g, waiting: false }) });
  if (f.offers) out.push({ key: "qp:offers", label: "Offers", off: (g) => ({ ...g, offers: false }) });
  const covered = new Set<QueryStatus>();
  for (const row of STAND_ROWS) {
    if (!standOn(f, row)) continue;
    row.statuses.forEach((s) => covered.add(s));
    out.push({ key: `st:${row.key}`, label: row.label, status: row.statuses[0], off: (g) => toggleStand(g, row) });
  }
  for (const s of f.stages) {
    if (covered.has(s)) continue;
    const row = STAND_ROWS.find((r) => r.statuses.includes(s));
    out.push({ key: `st:${s}`, label: STAGE_WORD[s] ?? row?.label ?? String(s), status: s, off: (g) => ({ ...g, stages: g.stages.filter((x) => x !== s) }) });
  }
  for (const k of f.sent) out.push({ key: `sent:${k === SENT_NONE ? "none" : k}`, label: k === SENT_NONE ? "Nothing recorded" : sentName(k), off: (g) => ({ ...g, sent: g.sent.filter((x) => x !== k) }) });
  if (f.dueWeek) out.push({ key: "more:dueWeek", label: "Due this week", off: (g) => ({ ...g, dueWeek: false }) });
  if (f.missing) out.push({ key: "more:missing", label: "Missing materials", off: (g) => ({ ...g, missing: false }) });
  if (f.overYear) out.push({ key: "more:overYear", label: "Over a year", off: (g) => ({ ...g, overYear: false }) });
  return out;
}

/* ── the pinned band (§C) ─────────────────────────────────────────────────────────────────────────────────────── */

export interface BandRow { status: QueryStatus; pastExpected: boolean; sentMs: number | null }
export interface BandFigures {
  /** every query on the list (the manuscript-scoped set; the practice query is never one of them) */
  total: number;
  /** an agent-court query past its expected date: the "Past their reply date" filter's set */
  overdue: number;
  /** asked for more (requested, sent, R&R, offer) + passed, over every query on the list, as a whole percentage */
  heardPct: number;
  /** asked for more: lib/responses' "more" placement */
  more: number;
  /** passed: lib/responses' "passed" placement */
  passed: number;
  /** the last eight Monday weeks, oldest first, this week last (lib/qcSentWeeks, the hero chart's weeks) */
  weeks: SentWeek[];
  thisWeek: number;
  weekBefore: number;
}
export const BAND_WEEKS = 8;
/**
 * The band's figures, from the rows the list is built from. ⚠️ Heard back reads `placeOf` and nothing else: a No reply
 * is a "noReply" placement and is NOT heard back; Queried, Withdrawn and Signed have no placement.
 */
export function bandFigures(rows: readonly BandRow[], nowMs: number): BandFigures {
  let more = 0, passed = 0, overdue = 0;
  for (const r of rows) {
    const g = placeOf(r.status)?.group;
    if (g === "more") more++;
    else if (g === "passed") passed++;
    if (r.pastExpected) overdue++;
  }
  const total = rows.length;
  const weeks = sentWeeks(rows.map((r) => r.sentMs), nowMs, BAND_WEEKS);
  return {
    total, overdue, more, passed,
    heardPct: total ? Math.round(((more + passed) / total) * 100) : 0,
    weeks, thisWeek: weeks[weeks.length - 1]?.n ?? 0, weekBefore: weeks[weeks.length - 2]?.n ?? 0,
  };
}
