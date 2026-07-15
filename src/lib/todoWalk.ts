/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoWalk — pure selection logic for the Today's-list helpers.
 *   · choosePicks — "Help me pick": ≤4 Do-next (the column is already pressing-first, deadline-ordered)
 *     then 1–2 Housekeeping, capped at 5; if nothing urgent, ≤3 Housekeeping. Never a UserTask.
 *   · rolledOverCards — committed items whose day has passed (surfaced once in the gold Keep/Clear bar).
 * Pure + unit-tested; the component animates + writes, it never re-derives the choice by hand.
 */

import { BoardCard } from "./todoBoard";

export const MAX_TODAY = 5;
const MAX_DO = 4;
const MAX_HK_TOPUP = 2;
const MAX_HK_IF_EMPTY = 3;

export function choosePicks(opts: { doCards: BoardCard[]; hkCards: BoardCard[]; committedCount: number; max?: number }): string[] {
  const max = opts.max ?? MAX_TODAY;
  const room = max - opts.committedCount;
  if (room <= 0) return [];
  const doAvail = opts.doCards.filter((c) => !c.committed);
  const hkAvail = opts.hkCards.filter((c) => !c.committed);
  if (doAvail.length === 0) return hkAvail.slice(0, Math.min(MAX_HK_IF_EMPTY, room)).map((c) => c.key);
  const picks = doAvail.slice(0, Math.min(MAX_DO, room));
  const rest = room - picks.length;
  return [...picks, ...hkAvail.slice(0, Math.min(MAX_HK_TOPUP, rest))].map((c) => c.key);
}

/** Committed items whose committedDate is a day BEFORE today — the roll-over set (surfaced once). */
export function rolledOverCards(cards: BoardCard[], today: string): BoardCard[] {
  return cards.filter((c) => c.committedDate != null && c.committedDate < today);
}
