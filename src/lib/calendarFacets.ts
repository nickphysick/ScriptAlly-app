/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE FACET MODEL (v64 §E) ════════════════════════════════════════════════════════════════
 *
 * A row HAS facets — a type, a status, a holder, attention flags that co-occur, an activity age —
 * and everything else reads them: the groups derive from them by the priority rule, the filter
 * hides rows whose carried facets are unticked, and the sidebar's counts are a census over them.
 * One derivation; the sidebar, the board and any future surface (the To-do list's "Needs you now",
 * Query Centre's pills) cannot disagree because there is nothing separate to disagree with.
 *
 * ⚠️ EVERY FACET IS READ FROM WHAT THE BOARD ALREADY DERIVES — the bar pass's flags, the builder's
 * own dates — never re-derived from raw queries. A second opinion about whether a row is overdue is
 * how a filter comes to hide a row the board calls urgent.
 */
import { QueryStatus } from "../types";
import type { CalSection } from "./calendarSections";

/* ── the vocabulary ────────────────────────────────────────────────────────────────────────── */

export type FacetSection = "type" | "move" | "att" | "status" | "oc" | "act";
export type MoveKey = "you" | "them" | "offer";
export type AttKey = "overdue" | "soon" | "quiet" | "nudged" | "reminder";
export type ActKey = "today" | "week" | "month" | "older";

export interface RowFacets {
  type: "query" | "task";
  oc: "open" | "shut";
  /** the exact enum string, or the literal `Task` — a task has no query status */
  status: QueryStatus | "Task";
  /** whose move — empty on a closed row: a closed relationship is nobody's move */
  move: MoveKey[];
  /** the attention flags, which CO-OCCUR — a row can be overdue AND nudged AND gone quiet */
  att: AttKey[];
  act: ActKey;
}

/** what the facet derivation needs to know — all of it already derived by the board */
export interface FacetFacts {
  isTask: boolean;
  isClosed: boolean;
  status: QueryStatus | null;
  /** any card on the row is owed, or an agency estimate passed on a running wait — the board's
      own urgency, `calSectionOf`'s `isUrgent` */
  isUrgent: boolean;
  /** the long-silence flag — the bar pass's `ghost` state */
  isQuiet: boolean;
  /** a reminder is set on the row — the bar pass's `nudged`/`rem` state */
  hasReminder: boolean;
  /** the writer has nudged — `lastNudgeSentDate` exists on any of the row's queries */
  wasNudged: boolean;
  /** the writer holds the next move on any open card */
  writerHolds: boolean;
  /** days until the next dated thing on the row; null where nothing is dated */
  nextDatedIn: number | null;
  /** days since the row's newest recorded event; null where nothing is on the record */
  daysSinceActive: number | null;
}

/* ── the derivation ────────────────────────────────────────────────────────────────────────── */

export function rowFacets(f: FacetFacts): RowFacets {
  const att: AttKey[] = [];
  if (f.isUrgent) att.push("overdue");
  if (f.nextDatedIn != null && f.nextDatedIn >= 0 && f.nextDatedIn <= 14) att.push("soon");
  if (f.isQuiet) att.push("quiet");
  if (f.wasNudged) att.push("nudged");
  if (f.hasReminder) att.push("reminder");
  /* ⚠️ `move` IS EMPTY ON A CLOSED ROW. A closed relationship is nobody's move; giving it a holder
     so the filter has something to match would state that somebody owes something on it. */
  const move: MoveKey[] = f.isTask
    ? ["you"]
    : f.isClosed ? []
    : f.status === QueryStatus.OFFER ? ["offer"]
    : f.writerHolds ? ["you"] : ["them"];
  const d = f.daysSinceActive;
  return {
    type: f.isTask ? "task" : "query",
    oc: f.isClosed ? "shut" : "open",
    status: f.isTask ? "Task" : (f.status ?? "Task"),
    move, att,
    /* ⚠️ NULL SINKS TO `older`, not to `today`. A row with nothing on its record has not been
       active today; filing it under the freshest bucket would surface exactly the rows with the
       least going on. */
    act: d == null ? "older" : d <= 0 ? "today" : d <= 7 ? "week" : d <= 30 ? "month" : "older",
  };
}

/* ── the filter ────────────────────────────────────────────────────────────────────────────── */

/** which options are OFF, per section — everything ticked at rest, so the empty state hides nothing */
export type FacetOff = Record<FacetSection, ReadonlySet<string>>;

export const emptyOff = (): FacetOff =>
  ({ type: new Set(), move: new Set(), att: new Set(), status: new Set(), oc: new Set(), act: new Set() });

/**
 * ⚠️ A ROW IS HIDDEN IF ANY FACET IT CARRIES IS UNTICKED — the pack's own sentence. For the array
 * facets that means: unticking `Overdue` hides every row that IS overdue, even though it also
 * carries `Nudged`. The row's presence on the board requires every one of its facts to be wanted.
 * A closed row carries no `move` facet, so the Whose-move section cannot hide it.
 */
export function rowPasses(fx: RowFacets, off: FacetOff): boolean {
  if (off.type.has(fx.type)) return false;
  if (off.oc.has(fx.oc)) return false;
  if (off.status.has(String(fx.status))) return false;
  if (off.act.has(fx.act)) return false;
  for (const m of fx.move) if (off.move.has(m)) return false;
  for (const a of fx.att) if (off.att.has(a)) return false;
  return true;
}

/** how many options are off across every section — the Filter row's `N hidden` figure */
export const hiddenCount = (off: FacetOff): number =>
  (Object.values(off) as ReadonlySet<string>[]).reduce((n, s) => n + s.size, 0);

/* ── the sections, as the sidebar draws them ───────────────────────────────────────────────── */

export const FACET_SECTIONS: readonly {
  key: FacetSection; label: string; options: readonly { key: string; label: string }[];
}[] = [
  { key: "type", label: "Type", options: [
    { key: "query", label: "Queries" }, { key: "task", label: "Tasks" }] },
  { key: "move", label: "Whose move", options: [
    { key: "you", label: "With you" }, { key: "them", label: "With the agent" },
    { key: "offer", label: "Offer on the table" }] },
  { key: "att", label: "Attention", options: [
    { key: "overdue", label: "Overdue" }, { key: "soon", label: "Due within 14 days" },
    { key: "quiet", label: "Gone quiet" }, { key: "nudged", label: "Nudged" },
    { key: "reminder", label: "Reminder set" }] },
  /* ⚠️ NINE STATUSES BY THE APP'S OWN NAMES — the v63 deviation stands: no `R&R`, no folding
     Rejected and Withdrawn into a single `Closed` option. The section is the enum, plus `Task`
     nowhere: a task's absence of status is the Type section's business. */
  { key: "status", label: "Status", options: [
    QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER, QueryStatus.NO_RESPONSE, QueryStatus.REJECTED,
  ].map((s) => ({ key: s as string, label: s as string })) },
  { key: "oc", label: "Open or closed", options: [
    { key: "open", label: "Open" }, { key: "shut", label: "Closed" }] },
  { key: "act", label: "Last activity", options: [
    { key: "today", label: "Today" }, { key: "week", label: "Last 7 days" },
    { key: "month", label: "Last 30 days" }, { key: "older", label: "Older" }] },
];

/** does a row CARRY this option — the census's question, and the hide rule's other half */
export function rowCarries(fx: RowFacets, sec: FacetSection, key: string): boolean {
  const v = fx[sec === "att" ? "att" : sec === "move" ? "move" : sec] as string | string[];
  return Array.isArray(v) ? v.includes(key) : String(v) === key;
}

/* ── grouping by whose move (v64's `move` group) ───────────────────────────────────────────── */

export type MoveGroup = "you" | "them" | "offer" | "shut";
export const MOVE_GROUP_ORDER: readonly MoveGroup[] = ["you", "them", "offer", "shut"];
export const MOVE_GROUP_LABEL: Record<MoveGroup, string> = {
  you: "With you", them: "With the agent", offer: "Offer on the table", shut: "Closed",
};
/** one bucket per row — the first move facet, or Closed */
export const moveGroupOf = (fx: RowFacets): MoveGroup =>
  fx.oc === "shut" ? "shut" : (fx.move[0] ?? "them");

/** the section a facet row falls in under the ATTENTION grouping — the board's own partition,
    imported by the census so the two cannot disagree */
export type { CalSection };
