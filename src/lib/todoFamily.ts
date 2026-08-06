/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoFamily — THE kind→family map, in one exported module (board fixes II, Phase 4; ref
 * design-refs/todo-board-settled.html).
 *
 * ⚠️ THIS MAP HAS SHIPPED WRONG TWICE, AND BOTH TIMES THE CAUSE WAS A SECOND COPY.
 *
 * First: the board's band rule was written fresh from the one urgent card the ref drew, so every
 * family wore the urgent tint. Second, subtler and live until this pack: the classification
 * existed in TWO functions (`bandFamily` in todoColumns, `facetOf` in todoBoardSort) and the
 * swatch VALUES in a THIRD place (the `--td-sw-*` tokens in index.css) — written under a
 * different semantic entirely, so the FILTERS panel drew Urgent with a SAGE dot and Your-tasks
 * with a PINK one, the exact reverse of the bands. And both classifier copies keyed on `c.hk`,
 * which is the housekeeping GLYPH flag — derivedCopy sets it false for STALE cards, so STALE
 * rendered urgent pink on the board while the counting law filed it under housekeeping.
 *
 * THE LAW (the pack's words): urgent kinds — OFFER, AGENT WAITING — take the pink family;
 * housekeeping — STALE, MATERIALS, WISH LIST — the latte; the writer's own tasks the sage; done
 * work the muted sage. Urgent ALONE carries the 1px ink border.
 *
 * Classification keys on the LANE (`stream`), because the lane IS the counting law's own split —
 * the badge files stale under housekeeping, so the colour now cannot disagree with the count.
 * Every consumer — the band class, the ink border, the FILTERS swatches, the sidebar list rows —
 * reads THIS module. The band gradients themselves must live in the stylesheet, so they are
 * restated there UNDER LOCK: todoBoardFamily.test.ts fails the moment the CSS and FAMILY_BAND
 * disagree. One source; the copy that cannot move is tested against it.
 */
import { BoardCard } from "./todoBoard";

export type BandFamily = "urgent" | "housekeeping" | "yours" | "done";

/** The live families — what a card is while it still wants something from you. */
export function liveFamily(c: BoardCard): Exclude<BandFamily, "done"> {
  if (c.userTaskId || c.nature || c.stream === "nt") return "yours";
  /* the lane, not the glyph flag: STALE (`no_response_close`) lives in the hk lane with hk:false,
     and the snoozed rebuilds hardcode stream "hk" — both are housekeeping HERE because they are
     housekeeping in the count. */
  if (c.stream === "hk") return "housekeeping";
  return "urgent";
}

/** The full map. Done beats everything — a finished thing is finished, whatever it was. */
export function cardFamily(c: BoardCard): BandFamily {
  if (c.done) return "done";
  return liveFamily(c);
}

/**
 * The swatch dots (FILTERS rows, sidebar lists) — the ref's own hexes, mid-tones of each band.
 * `done` has no swatch consumer today (Done is a column, not a facet); its value is the done
 * head-rule sage so a future consumer inherits something honest rather than inventing a sixth.
 */
export const FAMILY_SWATCH: Record<BandFamily, string> = {
  urgent: "#e8a68e",
  housekeeping: "#d9c49a",
  yours: "#a8bca4",
  done: "#b9c9b4",
};

/** Swatches that sit BESIDE the families in list rows without being band families themselves:
 *  the neutral Everything dot, and the notes/snoozed rows' own tones. */
export const EXTRA_SWATCH = {
  everything: "#8a7a6d",
  notes: "#eedfae",
  snoozed: "#c4bcb2",
} as const;

/** The band paint per family — restated in todoBoard.css (CSS cannot read TS) and LOCKED equal
 *  there. `from`/`to` are the 24px band's gradient stops; `bd` its bottom hairline. */
export const FAMILY_BAND: Record<BandFamily, { from: string; to: string; bd: string }> = {
  urgent: { from: "#f8e2d9", to: "#f4d5c9", bd: "#e8c8bc" },
  housekeeping: { from: "#f6f0e4", to: "#f0e8d8", bd: "#ddd0bc" },
  yours: { from: "#dee4dc", to: "#d5dbd3", bd: "#b9c9b4" },
  done: { from: "#e7ebe5", to: "#e7ebe5", bd: "#cfd8cc" },
};
