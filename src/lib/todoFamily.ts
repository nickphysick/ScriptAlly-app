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

/**
 * ⚠️ THE ROW PILL'S PAINT — BY FAMILY, WHILE ITS WORDS STAY THE KIND (rail + workspace, Phase 3;
 * ref todo-workspace-concept-v3.html `.pill.*`). Restated in todoGroups.css (CSS cannot read TS)
 * and LOCKED equal there, exactly as FAMILY_BAND is.
 *
 * ⚠️ THIS IS NOT THE REVERSAL IT LOOKS LIKE. The nine per-KIND tones this replaces were written
 * against a real fault — a family-coloured pill "said one thing twice while the thing a pill is
 * FOR, which kind of work this is, went unsaid". That complaint was about a pill carrying the
 * family in BOTH its colour and its words. Here the words still name the kind — Offer, Chase,
 * Data gap, Stale — and only the hue drops to the family. The kind is still said, in the register
 * that can actually say it: nine hues were never distinguishable as nine meanings anyway, and the
 * words always were. So the earlier rationale is satisfied rather than overturned.
 *
 * `snoozed` rides beside the four families for the same reason `EXTRA_SWATCH` does: a sleeping
 * card is a state, not a family, and the Snoozed rows need a tone that is neither its lane's
 * housekeeping nor an invented sixth family.
 */
export const FAMILY_PILL: Record<BandFamily | "snoozed", { bg: string; tx: string; bd: string }> = {
  urgent: { bg: "#fbeee7", tx: "#a05a42", bd: "#f2dccf" },
  housekeeping: { bg: "#eef1ec", tx: "#5a6e58", bd: "#dfe5dc" },
  yours: { bg: "#faf4e8", tx: "#a08a58", bd: "#efe4cc" },
  done: { bg: "#f2f4f1", tx: "#7a8878", bd: "#dfe5dd" },
  snoozed: { bg: "#f3f0ec", tx: "#8a7666", bd: "#e6ded4" },
};

/**
 * ⚠️ THE CALENDAR'S PIP TONES LIVE IN THE SAME MODULE AS THE FAMILY MAP (tasks-pages P3) — the
 * one place colour vocabulary is allowed to live, per this file's own history. The tie to the
 * band families is deliberate and visible: `agent` is the urgent pink family at pip strength,
 * `task` the sage, `snoozed` the parchment the snoozed cards' latte descends from, `note` the
 * butter EXTRA_SWATCH.notes belongs to, `done` the muted sage. The legend renders FROM this
 * record — a legend drawn from a second list is the half-copied map all over again.
 */
/* ⚠️ THE BUTTER "DATED NOTES" FAMILY IS RETIRED (tasks-audit P4). Under the two-natures law a
   dated user card IS a task, so the set was STRUCTURALLY EMPTY — a legend entry and a pip
   branch for a thing that cannot exist taught a category the model does not have. It returns
   only if the model ever records note-ORIGIN on tasks (themes.md carries the note). No dead
   render path survives: the type, the tone and the legend row all went together. */
export type CalPipFamily = "agent" | "task" | "snoozed" | "done";

export const CAL_PIP: Record<CalPipFamily, { bg: string; tx: string; bd: string }> = {
  agent: { bg: "#f8e2d9", tx: "#7a3a28", bd: "#eecfc2" },
  task: { bg: "#e9ede6", tx: "#3f5a3d", bd: "#c9d6c5" },
  snoozed: { bg: "#f4efe7", tx: "#6b5a4e", bd: "#e6dccc" },
  done: { bg: "#f2f4f1", tx: "#7a8878", bd: "#dfe5dd" },
};

/** The legend's order and wording — the LIVE families only, exactly. */
export const CAL_LEGEND: { family: CalPipFamily; label: string }[] = [
  { family: "agent", label: "AGENT DEADLINES" },
  { family: "task", label: "YOUR TASKS" },
  { family: "snoozed", label: "SNOOZED RETURNS" },
  { family: "done", label: "COMPLETED" },
];

/**
 * ⚠️ THE TAG PALETTE (tasks-pages P5) — the FIXED set of chip tones, one per family colour,
 * assigned at creation and changeable, never free-form. pink/sage/butter are the ref's own mtag
 * pairs; latte and parchment complete the family vocabulary at the same strength. Keys are the
 * TagColour union — a colour outside this record cannot be stored.
 */
export const TAG_PALETTE: Record<"pink" | "sage" | "butter" | "latte" | "parchment", { bg: string; tx: string }> = {
  pink: { bg: "#f6e3db", tx: "#8a4a36" },
  sage: { bg: "#e9ede6", tx: "#4a5f48" },
  butter: { bg: "#f4ecd4", tx: "#7a6030" },
  latte: { bg: "#f0e8d8", tx: "#6b5a4e" },
  parchment: { bg: "#f4efe7", tx: "#6b5a4e" },
};
