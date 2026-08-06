/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoBoardSort — the board's sort, and the FILTERS facet (board+dock pack, Phases 1–2).
 *
 * Both are page-level narrowings that apply to ALL FOUR COLUMNS at once. That is the point of
 * putting them in the header and the side container rather than on a column: a sort or a filter
 * that applied to one column would mean the board was showing you four differently-ordered views
 * of one set, and you would have to remember which.
 */

import { BoardCard } from "./todoBoard";

/* ── SORT ──────────────────────────────────────────────────────────────────────────────────── */

export type TodoSortId = "pressing" | "newest" | "oldest" | "az";

export interface TodoSortDef {
  id: TodoSortId;
  label: string;
}

export const TODO_SORTS: TodoSortDef[] = [
  { id: "pressing", label: "Most pressing" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "az", label: "A–Z" },
];

export const DEFAULT_TODO_SORT: TodoSortId = "pressing";

/**
 * ⚠️ "MOST PRESSING" IS A REAL ORDER, not a synonym for the array as it arrived.
 *
 * It is the order you would work in: an offer first, because it has a clock someone else set;
 * then whatever the writer is holding up (a requested partial or full); then the things going
 * quiet; then housekeeping, which is real work that nothing bad happens if you leave until
 * Thursday. Within a rank, the older item leads — the one that has been waiting longest.
 */
const PRESSING_RANK: Record<string, number> = {
  offer_received: 0,
  full_requested: 1,
  partial_requested: 1,
  revise_resubmit: 2,
  nudge_overdue: 3,
  no_response_close: 4,
  data_quality_poor: 5,
};

/** A card's own age anchor, for the date sorts. Absent sorts LAST in every order. */
function cardMs(c: BoardCard): number | null {
  if (c.whenMs != null) return c.whenMs;               // cleared cards carry their completion time
  if (c.dueYmd) { const t = Date.parse(c.dueYmd); return Number.isNaN(t) ? null : t; }
  return null;
}

function pressingRank(c: BoardCard): number {
  if (c.taskType && c.taskType in PRESSING_RANK) return PRESSING_RANK[c.taskType];
  // A user task the writer dated for today or earlier is pressing; a future one is not.
  if (c.nature === "task") return c.dueState === "future" ? 6 : 2;
  return 7;
}

/**
 * Sort one column's cards. PURE and STABLE — `Array.prototype.sort` is stable in every engine
 * this ships to, so equal-ranked cards keep the order the derivation gave them rather than
 * shuffling between renders.
 *
 * ⚠️ ABSENCE SORTS LAST in every order (the repo's standing rule), so a card with no date never
 * leads "Newest" by virtue of having nothing to compare.
 */
export function sortBoardCards(cards: BoardCard[], sort: TodoSortId): BoardCard[] {
  const out = [...cards];
  switch (sort) {
    case "pressing":
      return out.sort((a, b) => pressingRank(a) - pressingRank(b));
    case "az":
      return out.sort((a, b) => a.title.localeCompare(b.title, "en-GB"));
    case "newest":
    case "oldest": {
      const dir = sort === "newest" ? -1 : 1;
      return out.sort((a, b) => {
        const x = cardMs(a); const y = cardMs(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;   // absence last, whichever direction
        if (y == null) return -1;
        return (x - y) * dir;
      });
    }
  }
}

/* ── FILTERS (Phase 2) ─────────────────────────────────────────────────────────────────────── */

export type TodoFacetId = "all" | "urgent" | "housekeeping" | "yours";

export interface TodoFacetDef {
  id: TodoFacetId;
  label: string;
  /** The dot beside the row. `all` wears the neutral ink-grey; the rest wear their family. */
  swatch: string;
}

/**
 * ⚠️ FOUR ROWS, AND THE TWO THAT LEFT ARE AS DELIBERATE AS THE ONES THAT STAYED.
 *
 * **Snoozed is gone because it is a COLUMN, not a facet.** Filtering the board down to "snoozed"
 * would leave one populated column and three empty ones — a filter whose only honest result is
 * the thing already on screen.
 *
 * **Notes is gone because notes are not on this board at all** (audit item 2: a note has no date
 * and no tick, so three of four columns are meaningless for it). A facet that could only ever
 * return nothing is worse than no facet: it reads as a fault. Its row is replaced by a road sign
 * to the Noteboard, which is where notes actually live.
 */
export const TODO_FACETS: TodoFacetDef[] = [
  { id: "all", label: "Everything", swatch: "#8a7a6d" },
  { id: "urgent", label: "Urgent", swatch: "var(--td-sw-urgent)" },
  { id: "housekeeping", label: "Housekeeping", swatch: "var(--td-sw-hk)" },
  { id: "yours", label: "Your tasks", swatch: "var(--td-sw-yours)" },
];

/** Which facet a card belongs to — one card, one facet, so the counts partition the board. */
export function facetOf(c: BoardCard): Exclude<TodoFacetId, "all"> {
  if (c.userTaskId || c.nature) return "yours";
  if (c.hk) return "housekeeping";
  return "urgent";
}

/** Apply the facet to a column. `all` is the identity — never a filter that happens to pass. */
export function applyFacet(cards: BoardCard[], facet: TodoFacetId): BoardCard[] {
  if (facet === "all") return cards;
  return cards.filter((c) => facetOf(c) === facet);
}

/**
 * The FILTERS row counts — derived from the SAME cards the columns render, which is what makes
 * the row's number and the board's contents incapable of disagreeing. `all` counts the whole
 * set, so it is always the sum of the other three.
 */
export function facetCounts(cards: BoardCard[]): Record<TodoFacetId, number> {
  const counts: Record<TodoFacetId, number> = { all: cards.length, urgent: 0, housekeeping: 0, yours: 0 };
  for (const c of cards) counts[facetOf(c)] += 1;
  return counts;
}
