/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's entrance timing (the well round, §5).
 *
 * ⚠️ THE TOTAL IS DERIVED FROM THE TABLE, NEVER TYPED BESIDE IT. The brief states a per-element
 * table AND a total of 520ms, and the two disagree: the last card in the first row starts at
 * 180 + 30x2 = 240 and runs 340, which ends at 580. A hand-written 520 here would take the
 * attribute off while three cards were still moving — an entrance that ends mid-flight, and the
 * kind of number nobody re-checks. The table is the specific instruction, so the table wins and
 * the total is computed from it.
 */
export const QCC_ENTRANCE = {
  rise: 10,
  ease: "cubic-bezier(.2, .8, .2, 1)",
  masthead: { dur: 340, delay: 0 },
  tile: { dur: 340, step: 40, count: 5 },
  well: { dur: 380, delay: 100 },
  card: { dur: 340, delay: 180, step: 30, firstRow: 3 },
  reduced: { dur: 160 },
} as const;

/** the last moment anything is still moving — what the attribute's lifetime must cover */
export const QCC_ENTRANCE_TOTAL_MS = Math.max(
  QCC_ENTRANCE.masthead.delay + QCC_ENTRANCE.masthead.dur,
  QCC_ENTRANCE.tile.step * (QCC_ENTRANCE.tile.count - 1) + QCC_ENTRANCE.tile.dur,
  QCC_ENTRANCE.well.delay + QCC_ENTRANCE.well.dur,
  QCC_ENTRANCE.card.delay + QCC_ENTRANCE.card.step * (QCC_ENTRANCE.card.firstRow - 1) + QCC_ENTRANCE.card.dur,
);
