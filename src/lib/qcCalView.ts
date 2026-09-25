/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The expanded Birds-eye view's controls (v65 §8.2, §8.3) — whose court, which attention groups,
 * how the rows are grouped and how they are sorted, as one value with one default.
 *
 * ⚠️ ONE STATE, ONE DEFAULT, AND "DIFFERS FROM IT" IS DERIVED RATHER THAN TRACKED. Filter goes ink
 * when ITS settings differ, Sort when ITS do, and the ↺ appears when ANYTHING does — three
 * questions about one value. A flag set by each handler would be a fourth thing to keep in step,
 * and the first handler somebody forgets is the one that leaves a reset button on a page with
 * nothing to reset.
 *
 * ⚠️ AND THE ROWS ARE `eyeRows`', NEVER A SECOND DERIVATION. The rail and the expanded view draw
 * the same bars, day counts and stage names from the same function; this module decides only WHICH
 * rows and in WHAT ORDER. A per-row derivation of its own is how two surfaces of one view come to
 * disagree about what a bar means.
 */
import { QueryStatus } from "../types";
import { ATTENTION_LABEL, ATTENTION_ORDER, eyeRows, type Attention, type EyeFocus, type EyeRow } from "./qcBirdsEye";
import { STAGE_NAME, stageOrder, type QcRow } from "./qcSummary";

export type GroupBy = "attention" | "status" | "action" | "package" | "none";
export type SortBy = "queried" | "changed" | "due";

/**
 * §D1 — WHEN A FACET IS DUE, and the window it names.
 *
 * ⚠️ THE WINDOWS NEST RATHER THAN PARTITION. "Next two weeks" includes this week and "Within a
 * month" includes both, because a reader asking what is due within a month means everything up to
 * then — not the fortnight-to-month slice. `dueBucket` partitions; `dueHit` nests, and the two are
 * separate for exactly that reason.
 */
export type DueKey = "any" | "overdue" | "week" | "fortnight" | "month" | "nodate";
export const DUE_OPTIONS: readonly { key: DueKey; label: string }[] = [
  { key: "any", label: "Any time" }, { key: "overdue", label: "Overdue" }, { key: "week", label: "This week" },
  { key: "fortnight", label: "Next two weeks" }, { key: "month", label: "Within a month" }, { key: "nodate", label: "No date set" },
];

export interface CalView {
  court: EyeFocus;
  /** Multi-select; empty means every group. */
  attention: Attention[];
  /** §D1 — multi-select; empty means every status. */
  statuses: QueryStatus[];
  /** §D1 — multi-select over package NAMES, with `""` meaning no package. Empty means all. */
  packages: string[];
  /** §D1 — one window, `"any"` meaning no constraint. */
  due: DueKey;
  groupBy: GroupBy;
  sortBy: SortBy;
  asc: boolean;
}

/** §8.3 — the page-load default, and what ↺ restores. Stated once. */
export const CAL_DEFAULT: CalView = {
  court: "all", attention: [], statuses: [], packages: [], due: "any",
  groupBy: "attention", sortBy: "due", asc: true,
};

export const GROUP_BY_OPTIONS: readonly { key: GroupBy; label: string }[] = [
  { key: "attention", label: "Urgency" }, { key: "status", label: "Status" },
  { key: "action", label: "Next action" },
  { key: "package", label: "Submission package" }, { key: "none", label: "No grouping" },
];
export const SORT_BY_OPTIONS: readonly { key: SortBy; label: string }[] = [
  { key: "queried", label: "Date queried" }, { key: "changed", label: "Status changed" }, { key: "due", label: "Next action due" },
];

const sameSet = <T,>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((k) => b.includes(k));

/**
 * ⚠️ THE ATTENTION FILTER BELONGS TO FILTER, NOT TO SORT — it is the stat cards' own state and the
 * popover's checkboxes are a second view of it (§8.3). Putting it on either side alone would make
 * one of the two buttons light for a setting it does not carry, and the cards are the half a reader
 * is most likely to have touched.
 */
export const filterDiffers = (v: CalView): boolean => activeFacets(v) > 0;

/**
 * §D1 — HOW MANY FACETS ARE NARROWING THE LIST. One per facet, never one per chosen value: three
 * statuses ticked is one answer to one question, and a badge reading 3 for it would say the reader
 * has filtered three different ways. It is what the header's "N active", the button's badge and
 * "is anything filtering?" all read, so those three cannot disagree.
 */
export const activeFacets = (v: CalView): number =>
  (v.court !== CAL_DEFAULT.court ? 1 : 0) + (v.attention.length ? 1 : 0)
  + (v.statuses.length ? 1 : 0) + (v.packages.length ? 1 : 0) + (v.due !== "any" ? 1 : 0);
/**
 * §6 — GROUP IS ITS OWN CONTROL NOW, so "differs" splits with it. Sort used to carry the grouping,
 * which lit the Sort button for a setting it did not hold; three buttons and three questions about
 * one value keeps each one honest about what it owns.
 */
export const groupDiffers = (v: CalView): boolean => v.groupBy !== CAL_DEFAULT.groupBy;
export const sortDiffers = (v: CalView): boolean => v.sortBy !== CAL_DEFAULT.sortBy || v.asc !== CAL_DEFAULT.asc;
export const anyDiffers = (v: CalView): boolean => filterDiffers(v) || groupDiffers(v) || sortDiffers(v);

/** Click to select, click again to release; multi-select (§8.2). */
export const toggleAttention = (v: CalView, k: Attention): CalView =>
  ({ ...v, attention: v.attention.includes(k) ? v.attention.filter((a) => a !== k) : [...v.attention, k] });
export const toggleStatus = (v: CalView, k: QueryStatus): CalView =>
  ({ ...v, statuses: v.statuses.includes(k) ? v.statuses.filter((a) => a !== k) : [...v.statuses, k] });
export const togglePackage = (v: CalView, k: string): CalView =>
  ({ ...v, packages: v.packages.includes(k) ? v.packages.filter((a) => a !== k) : [...v.packages, k] });
/** §D1 — the due window is one choice, and pressing the chosen one releases it back to "any". */
export const setDue = (v: CalView, k: DueKey): CalView => ({ ...v, due: v.due === k ? "any" : k });
/** §D1 — every facet back to its default, leaving the grouping and the sort alone. */
export const clearFilters = (v: CalView): CalView => ({
  ...v, court: CAL_DEFAULT.court, attention: [], statuses: [], packages: [], due: CAL_DEFAULT.due,
});

/* ── the rows ── */

export interface CalGroup { key: string; label: string; count: number; rows: EyeRow[]; hint?: string }

/* ── §6 · what to do next ── */

export type NextAction = "offer" | "revision" | "full" | "partial" | "nudge" | "close" | "wait";

/**
 * §6 — THE NEXT-ACTION GROUPS, most pressing first, each saying what the action IS.
 *
 * ⚠️ `revision` IS THIS APP'S OWN, AND IT IS NOT AN INVENTED GROUP. The mockup's fixture has no
 * Revise & Resubmit, so its classifier names three with-you statuses and lets everything else fall
 * through to the date-based branch — which would file a live R&R under "Waiting on the agent", a
 * confident wrong statement about a query where the writer owes a new version. `isWithYou` is one
 * definition in this app (partial requested · full requested · R&R) and it governs here too; a
 * group that appears only while a live R&R exists is the same shape `stageOrder` already uses for
 * the summary's seventh column.
 */
export const ACTION_GROUPS: readonly { key: NextAction; label: string; hint: string }[] = [
  { key: "offer", label: "Offer pending", hint: "your decision to make" },
  { key: "revision", label: "Revision owed", hint: "send the new version" },
  { key: "full", label: "Full owed", hint: "send the full manuscript" },
  { key: "partial", label: "Partial owed", hint: "send the partial" },
  { key: "nudge", label: "Nudge due", hint: "chase a query, partial or full" },
  { key: "close", label: "Consider closing", hint: "no word for a long while" },
  { key: "wait", label: "Waiting on the agent", hint: "nothing to do yet" },
];

/** past its date by more than this, and it is not a nudge any more */
export const CLOSE_OVER_DAYS = 28;
/** …and an UNDATED stage this long with no word says the same thing */
export const CLOSE_UNDATED_DAYS = 84;
const DAY = 86_400_000;

/**
 * §6 — what a row's next action is.
 *
 * ⚠️ THE WITH-YOU STATUSES ARE ANSWERED BY STATUS AND NEVER BY A DATE. A query where the agent has
 * asked for something is owed material whatever the clock says, so the date branch below is reached
 * only by rows in the AGENT's court — which is what makes "Waiting on the agent" true of everything
 * in it rather than true of everything the classifier had nothing better to say about.
 */
export function nextAction(r: QcRow, nowMs: number): NextAction {
  if (r.status === QueryStatus.OFFER) return "offer";
  if (r.status === QueryStatus.REVISE_RESUBMIT) return "revision";
  if (r.status === QueryStatus.FULL_REQUESTED) return "full";
  if (r.status === QueryStatus.PARTIAL_REQUESTED) return "partial";
  const past = r.expectedMs != null && r.expectedMs < nowMs;
  const over = past ? (nowMs - r.expectedMs!) / DAY : 0;
  const inStage = r.stageStartMs != null ? (nowMs - r.stageStartMs) / DAY : 0;
  if ((past && over > CLOSE_OVER_DAYS) || (r.expectedMs == null && inStage > CLOSE_UNDATED_DAYS)) return "close";
  if (past) return "nudge";
  return "wait";
}

/**
 * ⚠️ THE COURT HIDES HERE AND FADES IN THE RAIL (§6.1 against §8.3), and the difference is
 * deliberate rather than an inconsistency to reconcile. The rail is a glance at the shape of
 * everything, so taking rows out of it would change the shape being glanced at; the expanded view
 * is a working surface with a filter on it, and a filter that only dimmed would leave a reader
 * scrolling past the very rows they had just put aside.
 */
const inCourt = (r: EyeRow, court: EyeFocus): boolean => court === "all" || r.court === court;

/* ── §D1 · the five facets ── */

/** Which window a row's expected date falls in. A partition — `dueHit` is what nests. */
export function dueBucket(r: QcRow, nowMs: number): Exclude<DueKey, "any"> | "later" {
  if (r.expectedMs == null) return "nodate";
  const n = Math.round((r.expectedMs - nowMs) / DAY);
  return n < 0 ? "overdue" : n <= 6 ? "week" : n <= 13 ? "fortnight" : n <= 30 ? "month" : "later";
}
export function dueHit(r: QcRow, k: DueKey, nowMs: number): boolean {
  if (k === "any") return true;
  const d = dueBucket(r, nowMs);
  if (k === "fortnight") return d === "week" || d === "fortnight";
  if (k === "month") return d === "week" || d === "fortnight" || d === "month";
  return d === k;
}

/** §D1 — a row's package NAME, with `""` for none. The one place the resolver is applied. */
export const rowPackage = (r: QcRow, packageName?: (id: string) => string | null): string =>
  (r.query.packageId ? packageName?.(r.query.packageId) ?? null : null) ?? "";

export type Facet = "court" | "attention" | "status" | "package" | "due";

/**
 * §D1 — AND ACROSS FACETS, OR WITHIN ONE.
 *
 * ⚠️ `skip` IS WHAT MAKES THE COUNTS FACETED, and it is the whole reason this is one function. An
 * option's count is "how many would I have if I chose this as well" — which means every OTHER facet
 * applies and its own does not. Counting with all five applied makes every unticked option in a
 * narrowed facet read 0, so the panel tells a reader that choosing any of them would empty the
 * list; counting with none applied ignores the filtering they have already done. Both are one
 * argument away from correct, and neither looks wrong on the page.
 */
export function matchesFilters(
  r: EyeRow, v: CalView, nowMs: number, skip?: Facet, packageName?: (id: string) => string | null,
): boolean {
  if (skip !== "court" && !inCourt(r, v.court)) return false;
  if (skip !== "attention" && v.attention.length && !v.attention.includes(r.group)) return false;
  if (skip !== "status" && v.statuses.length && !v.statuses.includes(r.row.status)) return false;
  if (skip !== "package" && v.packages.length && !v.packages.includes(rowPackage(r.row, packageName))) return false;
  if (skip !== "due" && !dueHit(r.row, v.due, nowMs)) return false;
  return true;
}

export interface FacetCounts {
  court: Record<string, number>;
  attention: Record<string, number>;
  status: Partial<Record<QueryStatus, number>>;
  /** package name → count, `""` for none; the keys ARE the packages the account holds */
  package: Record<string, number>;
  due: Partial<Record<DueKey, number>>;
  /** what the panel's foot states */
  shown: number;
  total: number;
}

/** §D1 — package names A–Z with "no package" (`""`) LAST, however its name would sort. */
export const packageNames = (rows: readonly QcRow[], packageName?: (id: string) => string | null): string[] =>
  [...new Set(rows.map((r) => rowPackage(r, packageName)))]
    .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));

export function facetCounts(
  rows: readonly QcRow[], v: CalView, nowMs: number, packageName?: (id: string) => string | null,
): FacetCounts {
  const live = eyeRows(rows, nowMs);
  const under = (skip: Facet) => live.filter((r) => matchesFilters(r, v, nowMs, skip, packageName));
  const tally = <K extends string>(skip: Facet, key: (r: EyeRow) => K | null): Record<K, number> => {
    const out = {} as Record<K, number>;
    for (const r of under(skip)) { const k = key(r); if (k != null) out[k] = (out[k] ?? 0) + 1; }
    return out;
  };
  const courtRows = under("court");
  const dueRows = under("due");
  const due: Partial<Record<DueKey, number>> = {};
  for (const o of DUE_OPTIONS) if (o.key !== "any") due[o.key] = dueRows.filter((r) => dueHit(r.row, o.key, nowMs)).length;
  return {
    court: {
      all: courtRows.length,
      you: courtRows.filter((r) => r.court === "you").length,
      agent: courtRows.filter((r) => r.court === "agent").length,
    },
    attention: tally("attention", (r) => r.group as string),
    status: tally("status", (r) => r.row.status as unknown as string) as Partial<Record<QueryStatus, number>>,
    package: tally("package", (r) => rowPackage(r.row, packageName)),
    due,
    shown: live.filter((r) => matchesFilters(r, v, nowMs, undefined, packageName)).length,
    total: live.length,
  };
}

/**
 * ⚠️ AN UNDATED ROW SORTS LAST IN EITHER DIRECTION (§8.3), which is the one place a sort must NOT
 * be symmetric. Treating a missing date as a number is where "no date promised" quietly becomes
 * "the year 1970": it puts those rows at the head of an ascending list and the foot of a descending
 * one — the same rows moving for a reason that has nothing to do with what was asked for.
 */
function sortKey(r: QcRow, by: SortBy): number | null {
  if (by === "queried") return r.sentMs;
  if (by === "changed") return r.stageStartMs;
  return r.expectedMs;
}
export function sortRows(rows: readonly EyeRow[], by: SortBy, asc: boolean): EyeRow[] {
  return rows.slice().sort((a, b) => {
    const ka = sortKey(a.row, by); const kb = sortKey(b.row, by);
    if (ka == null && kb == null) return a.row.agentName.localeCompare(b.row.agentName);
    if (ka == null) return 1;
    if (kb == null) return -1;
    return asc ? ka - kb : kb - ka;
  });
}

/**
 * The rows, filtered, grouped and sorted.
 *
 * ⚠️ SORTING APPLIES WITHIN EACH GROUP WHEN GROUPED, ACROSS EVERYTHING WHEN NOT (§8.3). Sorting
 * first and bucketing after gives exactly that, which is why it is done in that order here and not
 * left to a caller: bucketing first and sorting the buckets is the same code one line apart and a
 * different answer whenever two groups interleave.
 *
 * ⚠️ AND THE HEADINGS SHOW WHENEVER GROUPING IS ON, even where there is a single group — only
 * "Nothing" removes them. A heading that appears once a second group exists teaches a reader that
 * the grouping has just started working.
 */
export function groupRows(
  rows: readonly QcRow[],
  view: CalView,
  nowMs: number,
  packageName?: (id: string) => string | null,
): CalGroup[] {
  const live = eyeRows(rows, nowMs).filter((r) => matchesFilters(r, view, nowMs, undefined, packageName));
  const sorted = sortRows(live, view.sortBy, view.asc);
  const mk = (key: string, label: string, mine: EyeRow[]): CalGroup => ({ key, label, count: mine.length, rows: mine });

  if (view.groupBy === "none") return sorted.length ? [mk("all", "", sorted)] : [];

  if (view.groupBy === "attention") {
    return ATTENTION_ORDER
      .map((k) => mk(k, ATTENTION_LABEL[k], sorted.filter((r) => r.group === k)))
      .filter((g) => g.count > 0);
  }

  if (view.groupBy === "action") {
    /* §6 — most pressing first, and an empty group is not drawn */
    return ACTION_GROUPS
      .map((g) => ({ ...mk(g.key, g.label, sorted.filter((r) => nextAction(r.row, nowMs) === g.key)), hint: g.hint }))
      .filter((g) => g.count > 0);
  }

  if (view.groupBy === "status") {
    /* §8.3 — status groups in PIPELINE order, never alphabetical and never by count. */
    return stageOrder(sorted.map((r) => r.row))
      .map((s: QueryStatus) => mk(String(s), STAGE_NAME[s], sorted.filter((r) => r.row.status === s)))
      .filter((g) => g.count > 0);
  }

  /* §8.3 — packages A–Z, with "No package" LAST however its name would sort. */
  const named = new Map<string, EyeRow[]>();
  const none: EyeRow[] = [];
  for (const r of sorted) {
    const name = r.row.query.packageId ? packageName?.(r.row.query.packageId) ?? null : null;
    if (!name) { none.push(r); continue; }
    const list = named.get(name) ?? [];
    list.push(r);
    named.set(name, list);
  }
  const out = [...named.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, mine]) => mk(`pkg:${name}`, name, mine));
  if (none.length) out.push(mk("pkg:none", "No package", none));
  return out;
}

/**
 * §8.2 — the stat cards' counts.
 *
 * ⚠️ THE COUNTS STAY THE WHOLE PIPELINE'S, WHATEVER FILTER'S "WHOSE COURT" SAYS. They are what the
 * cards are FOR: a reader glances at them to decide what to look at, and a count that had already
 * narrowed itself would be answering a question they have not asked yet.
 */
export function attentionCounts(rows: readonly QcRow[], nowMs: number): Record<Attention, number> {
  const out: Record<Attention, number> = { overdue: 0, upcoming: 0, watch: 0 };
  for (const r of eyeRows(rows, nowMs)) out[r.group] += 1;
  return out;
}
