/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's carousel (v126 §3) — which queries it deals, and in what order.
 *
 * ⚠️ TWO SETS, AND THEY ARE NOT THE SAME SHAPE. With no desk section chosen the carousel is
 * "Recently moved": the EIGHT queries that moved last, whatever court they are in. With a section
 * chosen it is EVERY query in that court — no cap, and no "recently moved" filter on top — because
 * the section has just stated a number and a carousel showing eight of thirteen would contradict it.
 * The court comes from `rowsForTile`, the function the desk counts with, so the two cannot disagree.
 *
 * ⚠️ THE SORT REORDERS THE SET; IT NEVER CHOOSES IT. "Oldest first" with nothing chosen is the same
 * eight queries, oldest of them first — not the eight that moved longest ago, which would turn a
 * sort control into a different list.
 *
 * ⚠️ AND THE DESK NEVER REACHES THE LIST. This module is read by the carousel and nothing else.
 */
import { rowsForTile, type QcRow, type TileCourt } from "./qcSummary";

export type CzSort = "recent" | "oldest";
/** How many "Recently moved" deals. */
export const CZ_RECENT = 8;

export const CZ_SORT_LABEL: Record<CzSort, string> = {
  recent: "Most recent first",
  oldest: "Oldest first",
};

const byRecent = (a: QcRow, b: QcRow) => b.lastMs - a.lastMs || a.id.localeCompare(b.id);

export function carouselRows(rows: readonly QcRow[], court: TileCourt | null, sort: CzSort): QcRow[] {
  const set = (court ? rowsForTile(rows, court) : rows.slice()).sort(byRecent);
  const dealt = court ? set : set.slice(0, CZ_RECENT);
  return sort === "oldest" ? dealt.reverse() : dealt;
}

/** The head's mono line: "LAST 8 OF 27", or the chosen court's whole count. */
export function carouselCountLine(total: number, dealt: number, court: TileCourt | null): string {
  if (court) return `${dealt} ${dealt === 1 ? "QUERY" : "QUERIES"} · FROM THE DESK`;
  return `LAST ${dealt} OF ${total}`;
}
