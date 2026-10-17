/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §F.1 — THE TOP BAR'S PAGE SLOT: one element in the shell's bar, immediately left of the "?", that a
 * page may portal its own control into (today, the Contact list's "Getting started" pill). The shell owns the element;
 * the page owns what goes in it. A page-owned slot rather than a page-specific branch inside the shell: the shell names
 * no page and imports nothing of one.
 *
 * ⚠️ MODULE-SCOPE, LIKE `lib/pageGuide`: the shell publishes the element from a callback ref and a page subscribes, so
 *    the order the two mount in cannot matter (a page reading once on mount would miss a slot that arrived later).
 * ⚠️ EVERY PAGE STAYS MOUNTED: a page portals into the slot only while its own route is the one on screen, or two pages'
 *    controls would stand side by side in one bar.
 */
import { useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
let slot: HTMLElement | null = null;

/** The shell's callback ref. */
export function setBarSlot(el: HTMLElement | null): void {
  if (el === slot) return;
  slot = el;
  listeners.forEach((l) => l());
}
export function barSlot(): HTMLElement | null {
  return slot;
}
export function subscribeBarSlot(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
/** The slot element, or null before the shell has drawn its bar. */
export function useBarSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribeBarSlot, barSlot, () => null);
}
