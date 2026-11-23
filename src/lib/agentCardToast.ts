/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.2 B4 — THE OPEN CARD'S SAVED MESSAGE IS IN THE CARD. While an agent card is open it takes every message
 * raised for it (a section saved, Agent fit, its Undo and "Changes undone") into its own toast bar above the footer (the
 * query card's `qc1522-toast`). The hosts raise them as before (HostAgentCard, the Contact list's AgentList); `say` hands
 * each to the open card, or to the app's snackbar when no card is listening. One card is open at a time.
 */
export interface CardToast { message: string; undo?: () => void | Promise<void>; duration?: number; replaces?: string }
type Sink = (t: CardToast) => void;
let sink: Sink | null = null;

/** the open card listens; the returned function stops it (only if it is still the listener) */
export function listenAgentCardToast(f: Sink): () => void {
  sink = f;
  return () => { if (sink === f) sink = null; };
}
/** a host's message: to the open card, else to `fallback` (the app's snackbar) */
export const sayForCard = (fallback: (t: CardToast) => void) => (t: CardToast): void => { (sink ?? fallback)(t); };
