/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE ESCAPE KEY (Agent card v1 §6.6, §9). Every overlay layer — the agent card, its open
 * comboboxes and calendars, the query drawer (its own window listener retired in Phase 5) and the
 * parked chip's two asks — registers here, and ONE capture-phase listener decides which of them
 * hears the key.
 *
 * ⚠️ TWO CAPTURE LISTENERS ON ONE TARGET ARE RESOLVED BY REGISTRATION ORDER — a fact about which
 * element mounted last, not about what is on screen — so "the popover consumes the key and the
 * card does not" held or failed depending on render order (CLAUDE.md, "an Escape cascade is one
 * handler, not two listeners"). Here the TOP layer wins, always, and the layer under it gets the
 * next press.
 *
 * ⚠️ LAYERS ORDER BY LEVEL, NOT BY PUSH ORDER. React runs a child's effects before its parent's,
 * so a combobox that mounts open inside a card that mounts in the same commit would push FIRST
 * and sit UNDER the card. The level is what the layer IS (a card, a pop-up inside one, the drawer
 * over a docked card); ties go to the later push.
 *
 * ⚠️ THE LISTENER IS ON THE WINDOW, CAPTURE PHASE, and it stops immediate propagation once it has
 * handled the key: window capture runs before every document listener and before React's root,
 * so a layer's Escape can never ALSO reach a handler further down that would close something
 * else (the "+ Other" genre input's lost draft in the retired pop-up form was exactly that).
 * With no layers it does nothing at all, so pages that own Escape for themselves keep it.
 */
import { useEffect, useRef } from "react";

export const ESC_LEVEL = {
  /** a page's own popover (the Contact list's labelled pills) — under anything that opens over the page */
  page: 5,
  /** a page's half-screen drawer (Contact list v13 Housekeeping) — under the agent card, which opens over it */
  pageDrawer: 6,
  /** a modal opened from that drawer (Housekeeping's one-at-a-time session) — Escape closes it first */
  pageModal: 7,
  /** the agent card itself — view or editor */
  card: 10,
  /** anything open INSIDE the card: a combobox, the calendar, the ⋯ menu */
  cardPopup: 20,
  /** the query drawer, which stacks over a docked card */
  drawer: 30,
  /** the docked card shown above its chip (v13 §7) — folds before the drawer hears the key, after a
   *  popup inside the drawer (ruling Q5) */
  dockPeek: 35,
  /** anything open inside the drawer */
  drawerPopup: 40,
} as const;

interface Layer { level: number; order: number; handle: () => void }

export interface EscapeStack {
  /** register a layer; the returned function releases it */
  push(handle: () => void, level?: number): () => void;
  depth(): number;
}

export function createEscapeStack(target: EventTarget): EscapeStack {
  let layers: Layer[] = [];
  let order = 0;
  let installed = false;
  const onKey = (e: Event) => {
    if ((e as KeyboardEvent).key !== "Escape" || layers.length === 0) return;
    let top = layers[0];
    for (const l of layers) if (l.level > top.level || (l.level === top.level && l.order > top.order)) top = l;
    e.preventDefault();
    e.stopImmediatePropagation();
    top.handle();
  };
  return {
    push(handle, level = ESC_LEVEL.card) {
      if (!installed) { target.addEventListener("keydown", onKey, true); installed = true; }
      const layer: Layer = { level, order: ++order, handle };
      layers.push(layer);
      return () => { layers = layers.filter((l) => l !== layer); };
    },
    depth: () => layers.length,
  };
}

let appStack: EscapeStack | null = null;
const stack = (): EscapeStack | null => {
  if (typeof window === "undefined") return null;
  if (!appStack) appStack = createEscapeStack(window);
  return appStack;
};

/** Register an Escape layer for as long as `active` is true. The handler is read through a ref,
 *  so a new closure every render never re-orders the stack. */
export function useEscapeLayer(active: boolean, handle: () => void, level: number = ESC_LEVEL.card): void {
  const latest = useRef(handle);
  latest.current = handle;
  useEffect(() => {
    if (!active) return;
    return stack()?.push(() => latest.current(), level);
  }, [active, level]);
}
