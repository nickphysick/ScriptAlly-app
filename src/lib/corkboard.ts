/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the Corkboard's pure layer (Corkboard v1; ref design-refs/corkboard-v4/corkboard-v4.html).
 *
 * The Corkboard is the Noteboard renamed and redrawn: the notes, their store and their writes are
 * lib/noteboard's and are not restated here. This file holds what the cork board ADDS, as functions of their
 * arguments — no db, no React — so the locks call what the page calls.
 */
import type { LivingLine } from "./livingLine";
import type { UserTask } from "../types";

/* ── the header (a number page) ─────────────────────────────────────────────────────────────── */

export const CORKBOARD_SUBLINE = "Notes to self and your own tasks, kept in one place.";

/**
 * "8 notes pinned to your corkboard" / "One note pinned to your corkboard". The panel shows the count as its
 * number and the rest as its words (PanelHeader.wordsOf), so the singular is the words' business alone.
 * ⚠️ THE COUNT IS THE BOARD'S, NEVER THE FILTER'S: a search or a tag chip fades notes, it does not unpin them.
 */
export function corkboardHeaderCopy(count: number): LivingLine {
  return {
    headline: count === 1 ? "One note pinned to your corkboard" : `${count} notes pinned to your corkboard`,
    subline: [CORKBOARD_SUBLINE],
  };
}

/** The zero-notes header (header v3's empty rule): the page's name is in the bar, the heading is the situation. */
export const CORKBOARD_EMPTY = { heading: "Nothing pinned yet", subline: CORKBOARD_SUBLINE } as const;

/* ── the filter row ─────────────────────────────────────────────────────────────────────────── */

/** How many notes carry each tag id; `null` is "All". Read from the UNFILTERED list, like the chips. */
export function chipCounts(notes: readonly Pick<UserTask, "tags">[]): Map<string | null, number> {
  const out = new Map<string | null, number>([[null, notes.length]]);
  for (const n of notes) for (const t of new Set(n.tags ?? [])) out.set(t, (out.get(t) ?? 0) + 1);
  return out;
}

/** The three paper squares in the add bar, in the composer's own order, with the words a screen reader hears. */
export const PAD_LABEL = { yellow: "Pin a yellow note", pink: "Pin a pink note", sage: "Pin a sage note" } as const;
