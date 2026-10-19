/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Part A — ONE POP-UP LAYER FOR THE TOP BAR.
 *
 *   the layer   `#qh-popovers`, the last child of <body>: fixed, inset 0, `pointer-events: none`, z-index 80 — above every
 *               page element and the floating tab (55), below the shortcuts sheet (90) and the phone sheets (1000). Its
 *               children take `pointer-events: auto` (see popoverLayer.css).
 *   one open    a top-bar pop-up claims the bar when it opens; every other one hears the claim and closes itself.
 *
 * ⚠️ WHY A LAYER AND NOT A BIGGER Z-INDEX. `.ws-pagebar` is `position: relative; z-index: 3`, which makes it a stacking
 *    context: a child's `z-index: 30` only competes INSIDE the bar, so the sheet's sticky lip (19) and the pinned list
 *    headers (4–6), which sit in the root context, painted over the Help menu whatever number it carried. Raising the
 *    bar's own z-index is not the fix either — the folder tab depends on it. Portalling out of the bar is.
 * ⚠️ MODULE-SCOPE, like `lib/barSlot`: nothing to provide means nothing to forget.
 */

export const POPOVER_LAYER_ID = "qh-popovers";

/** The layer element, created on first use (and re-created if something removed it). */
export function popoverLayer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(POPOVER_LAYER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = POPOVER_LAYER_ID;
    el.className = "qh-popovers";
    document.body.appendChild(el);
  } else if (el.parentElement !== document.body || el !== document.body.lastElementChild) {
    /* the LAST child of body: anything appended after it at the same z-index would paint over it */
    document.body.appendChild(el);
  }
  return el;
}

/* ── one top-bar pop-up at a time ── */

type Listener = (id: string) => void;
const listeners = new Set<Listener>();
let current: string | null = null;

/** A top-bar pop-up opened: every other one closes. */
export function claimTopbar(id: string): void {
  current = id;
  [...listeners].forEach((l) => l(id));
}
/** A top-bar pop-up closed by itself. */
export function releaseTopbar(id: string): void {
  if (current === id) current = null;
}
export function currentTopbar(): string | null {
  return current;
}
/** Hear every claim; close yourself when the claim is not yours. Returns the unsubscribe. */
export function onTopbarClaim(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
