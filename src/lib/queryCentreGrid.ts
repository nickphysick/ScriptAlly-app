/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryCentreGrid — the browsing grid's quick filters, grouping and sort. Pure.
 *
 * ⚠️ THIS IS NOT `queryCentreGroups`, AND THE TWO MUST NOT BE MERGED. That module groups the
 * DETAIL list by `"overdue" | "waiting" | "move" | "closed"` — a working order, with lateness as a
 * group you can work through. The grid groups by WHOSE COURT, and lateness is deliberately not a
 * group here: it is a marker on a card that keeps its own court's colour, because a card that
 * jumped between groups the day a date passed would move under the reader's hand.
 *
 * ⚠️ AND BOTH READ `turnFor`, SO NEITHER INVENTS A MEMBERSHIP. The quick filters, the group
 * headings and the card band all partition on the same function; a second status→bucket table
 * anywhere on this page is how two counts of the same thing come to disagree.
 */
import { QueryStatus } from "../types";
import { turnFor, turnWordFor, type Turn, type Stage } from "./queryCardFacts";

/* ── quick filters ──────────────────────────────────────────────────────────────────────────── */

export type QuickKey = "all" | "you" | "agent" | "offer" | "closed";

/**
 * ⚠️ `agent` COVERS `sand` TOO — a Queried query IS with the agent, it is simply not deeper in.
 * The BAND distinguishes them because the reader is looking at one card; the FILTER does not,
 * because "with the agent" is the question being asked. Splitting them here would give a writer
 * two pills that both mean "waiting" and no pill that means "everything I am waiting on".
 */
/**
 * ⚠️ THE SWATCH IS A LADDER RUNG, NOT A COURT — and the MIDDLE rung of each, deliberately. A pill
 * standing for three statuses cannot show three tints, so it shows the one in the middle: `in-2`
 * for With you, `out-2` for With the agent. Taking rung 1 would make both pills nearly white and
 * indistinguishable from each other; taking rung 3 would advertise the deepest case as the norm.
 */
export const QUICK_FILTERS: readonly { key: QuickKey; label: string; swatch: Stage | null }[] = [
  { key: "all", label: "All", swatch: null },
  { key: "you", label: "With you", swatch: "in-2" },
  { key: "agent", label: "With the agent", swatch: "out-2" },
  { key: "offer", label: "Offers", swatch: "offer" },
  { key: "closed", label: "Closed", swatch: "closed" },
];

export function inQuick(turn: Turn, key: QuickKey): boolean {
  if (key === "all") return true;
  if (key === "agent") return turn === "sand" || turn === "agent";
  return turn === key;
}

/** What each pill states beside its label. Counts the WHOLE set — never the filtered view. */
export function quickCounts(turns: readonly Turn[]): Record<QuickKey, number> {
  const out: Record<QuickKey, number> = { all: 0, you: 0, agent: 0, offer: 0, closed: 0 };
  for (const t of turns) for (const { key } of QUICK_FILTERS) if (inQuick(t, key)) out[key] += 1;
  return out;
}

/* ── grouping ───────────────────────────────────────────────────────────────────────────────── */

export type GroupKey = "none" | "turn" | "status" | "agency" | "month";

export const GRID_GROUPS: readonly { key: GroupKey; label: string }[] = [
  { key: "none", label: "None" },
  { key: "turn", label: "Whose court" },
  { key: "status", label: "Status" },
  { key: "agency", label: "Agency" },
  { key: "month", label: "Month sent" },
];

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface GridRow {
  id: string;
  status: QueryStatus;
  turn: Turn;
  agency: string;
  name: string;
  /** Last activity — what "recently active" orders on. */
  lastMs: number | null;
  /** First send — what the month headings and "date sent" order on. */
  sentMs: number | null;
  /** Resolved expected reply, or null where nobody stated one. */
  expectedMs: number | null;
}

export function groupLabelFor(row: GridRow, key: GroupKey): string {
  if (key === "turn") return turnWordFor(row.status);
  if (key === "status") return row.status;
  if (key === "agency") return row.agency;
  if (key === "month") {
    /* ⚠️ A QUERY WITH NO SEND DATE GETS ITS OWN HEADING, never today's month. Filing an undated
       import under whatever month it was imported in states a send that did not happen. */
    if (row.sentMs == null) return "No date recorded";
    const d = new Date(row.sentMs);
    return `${MON[d.getMonth()]} ${d.getFullYear()}`;
  }
  return "";
}

/**
 * ⚠️ WHOSE-COURT HEADINGS RUN IN THE ORDER THE WORK DOES — what needs you, then what you have been
 * offered, then what you are waiting on, then what is finished. Alphabetical would put "Closed"
 * first, which is the one group nobody opens this page to read.
 */
const TURN_HEADING_ORDER = ["With you", "Offer", "With the agent", "No response", "Closed"];

export function compareGroupLabels(a: string, b: string, key: GroupKey): number {
  if (key === "turn") {
    const ia = TURN_HEADING_ORDER.indexOf(a), ib = TURN_HEADING_ORDER.indexOf(b);
    return (ia < 0 ? TURN_HEADING_ORDER.length : ia) - (ib < 0 ? TURN_HEADING_ORDER.length : ib);
  }
  if (key === "month") {
    /* Newest first; the undated heading sinks to the bottom rather than sorting as a word. */
    if (a === "No date recorded") return 1;
    if (b === "No date recorded") return -1;
    const ms = (s: string) => {
      const [mon, yr] = s.split(" ");
      return new Date(Number(yr), MON.indexOf(mon), 1).getTime();
    };
    return ms(b) - ms(a);
  }
  if (key === "status") {
    /* ⚠️ PIPELINE ORDER, TAKEN FROM THE ENUM ITSELF — never alphabetical, where "Full Sent"
       precedes "Partial Requested" and the reading order stops meaning anything, and never a
       hand-written list, which would go stale the day a status is added and go stale silently. */
    const order = Object.values(QueryStatus) as string[];
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
  }
  return a.localeCompare(b);
}

/* ── sort ───────────────────────────────────────────────────────────────────────────────────── */

export type SortKey = "activity" | "sent" | "expect" | "name" | "agency";

export const GRID_SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "activity", label: "Last activity" },
  { key: "sent", label: "Date sent" },
  { key: "expect", label: "Reply expected" },
  { key: "name", label: "Agent name" },
  { key: "agency", label: "Agency" },
];

/**
 * ⚠️ ABSENCE SORTS LAST IN EVERY ORDER, AND THAT IS ONE RULE RATHER THAN FIVE. A missing date is
 * not "the beginning of time" — sorting it as `0` would put every undated import at the top of a
 * date order, which reads as the oldest thing you have rather than as the thing nobody dated.
 */
const nullsLast = (a: number | null, b: number | null, dir: 1 | -1): number => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
};

export function compareRows(a: GridRow, b: GridRow, key: SortKey): number {
  switch (key) {
    case "activity":
      return nullsLast(a.lastMs, b.lastMs, -1) || a.name.localeCompare(b.name);
    case "sent":
      return nullsLast(a.sentMs, b.sentMs, -1) || a.name.localeCompare(b.name);
    case "expect":
      return nullsLast(a.expectedMs, b.expectedMs, 1) || a.name.localeCompare(b.name);
    case "name":
      return a.name.localeCompare(b.name);
    case "agency":
      return a.agency.localeCompare(b.agency) || a.name.localeCompare(b.name);
    default: {
      /* ⚠️ AN UNRECOGNISED SORT REORDERS NOTHING. The house rule: a default branch may not act —
         and here "act" means impose an order nobody asked for. */
      const unhandled: never = key;
      void unhandled;
      return 0;
    }
  }
}

/* ── the narrowing filters ──────────────────────────────────────────────────────────────────── */

export interface GridFilters {
  status: ReadonlySet<string>;
  agency: ReadonlySet<string>;
  via: ReadonlySet<string>;
  /** Material slots that must ALL be present — `queryLetter`, `synopsis`, `sample`, `other`. */
  included: ReadonlySet<string>;
}

/**
 * ⚠️ BUILT, NEVER TYPED OUT. `Clear all` calling a hand-written literal is how a facet added later
 * silently stops being cleared — which has happened on the agent list, to the door facet, on the
 * day it was added.
 */
export const emptyGridFilters = (): GridFilters => ({
  status: new Set(),
  agency: new Set(),
  via: new Set(),
  included: new Set(),
});

export const gridFilterCount = (f: GridFilters): number =>
  f.status.size + f.agency.size + f.via.size + f.included.size;

export const gridFiltersAreEmpty = (f: GridFilters): boolean => gridFilterCount(f) === 0;

/** Ticks WITHIN a facet are alternatives; facets NARROW each other. */
export function matchesGridFilters(
  row: GridRow & { via: string; slots: ReadonlySet<string> },
  f: GridFilters,
): boolean {
  if (f.status.size && !f.status.has(row.status)) return false;
  if (f.agency.size && !f.agency.has(row.agency)) return false;
  if (f.via.size && !f.via.has(row.via)) return false;
  for (const k of f.included) if (!row.slots.has(k)) return false;
  return true;
}

export { turnFor, turnWordFor };
export type { Turn, Stage };
