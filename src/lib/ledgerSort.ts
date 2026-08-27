/**
 * ⚠️ THE LEDGER'S COUNT SORT (D21) — pure, so the direction cannot drift from what the head shows.
 *
 * Reference: `design-refs/builder-refined.html`, `sortBy()` and `th.num.sorted`.
 */
export type SortKey = "sent" | "replies" | "requests";
export interface SortState { key: SortKey; desc: boolean }

/**
 * Clicking a head sorts by it, descending first; clicking the SAME head again reverses.
 *
 * ⚠️ DESCENDING FIRST, BECAUSE THE QUESTION IS "WHICH IS DOING BEST". A writer clicking `Requests`
 * wants the package drawing the most, not the one drawing none — ascending first would put the
 * answer at the bottom and read as a broken sort.
 */
export const nextSort = (cur: SortState | null, key: SortKey): SortState =>
  cur && cur.key === key ? { key, desc: !cur.desc } : { key, desc: true };

/**
 * ⚠️ A STABLE SORT OVER A COPY. `Array.prototype.sort` mutates, and the rows come from a memo —
 * sorting in place would reorder the derivation's own output and leave the next render sorted by
 * whatever was clicked last, with nothing on screen saying so.
 *
 * ⚠️ AND TIES KEEP THEIR ORIGINAL ORDER. Two packages on 3 requests are not ranked against each
 * other by anything the writer can see, so inventing an order between them would make the list
 * shuffle on every re-render for no stated reason.
 */
export const sortRows = <T extends Record<SortKey, number>>(
  rows: readonly T[],
  sort: SortState | null,
): T[] => {
  if (!sort) return [...rows];
  const dir = sort.desc ? -1 : 1;
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const d = (a.r[sort.key] - b.r[sort.key]) * dir;
      return d !== 0 ? d : a.i - b.i;
    })
    .map((x) => x.r);
};

/** `▾` / `▴` beside the sorted head, or nothing. */
export const sortArrow = (sort: SortState | null, key: SortKey): string =>
  sort && sort.key === key ? (sort.desc ? "▾" : "▴") : "";

/**
 * The width of a count's scale bar, as a percentage of the column's own maximum (D21).
 *
 * ⚠️ THE COLUMN'S MAXIMUM, NOT THE TABLE'S. A `Sent` of 7 and a `Requests` of 2 are different
 * quantities; scaling them against one number would draw the requests bar as a quarter of the sent
 * bar and invite the reader to compare two things that do not compare.
 *
 * ⚠️ AND A ZERO MAXIMUM DRAWS NOTHING rather than dividing by zero — a column where nothing has
 * happened has no scale to be a proportion of.
 */
export const barPct = (value: number, max: number): number =>
  max > 0 ? Math.round((value / max) * 100) : 0;
