/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dockPeek — the docked card shown above its chip, read-only, while the drawer stays open
 * (Contact list v13 §7, app-wide: the agent card and the Query Centre's centred card).
 *
 * ONE flag, module-scope like `drawerStore`, because three things read it and none of them owns the
 * others: the drawer draws the chip and flips it; whichever card is docked shows itself above the
 * chip; and an escape layer folds it. A prop would have to thread from the drawer to a card it
 * never renders.
 *
 * ⚠️ IT IS ONLY OFFERED AT 1100px OF WINDOW AND WIDER (`PEEK_MIN_WIDTH`). Below that there is no
 * room beside a 500px drawer for a 548px card, and the chip keeps its Agent card v1 behaviour —
 * back to the card, parking a journey with answers.
 *
 * ⚠️ AND IT NEVER OUTLIVES THE DOCK. The drawer calls `setDockPeek(false)` the moment the card
 * stops being docked, whatever the reason — saved, cancelled, parked or hidden by a failed save —
 * so no path can leave a card hanging above a chip that has gone.
 */
import { useSyncExternalStore } from "react";

export const PEEK_MIN_WIDTH = 1100;

let peeking = false;
const subs = new Set<() => void>();

export function isDockPeeking(): boolean {
  return peeking;
}

export function setDockPeek(on: boolean): void {
  if (peeking === on) return;
  peeking = on;
  subs.forEach((f) => f());
}

export function subscribeDockPeek(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}

/** Whether a peek can be offered at this window width. */
export function peekOffered(width: number): boolean {
  return width >= PEEK_MIN_WIDTH;
}

export function useDockPeek(): boolean {
  return useSyncExternalStore(subscribeDockPeek, isDockPeeking, () => false);
}
