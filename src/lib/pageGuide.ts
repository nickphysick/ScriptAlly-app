/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §4b — THE PAGE GUIDE'S STATE: whether a writer has seen a page's guide, and the one way to ask
 * for it again.
 *
 * ⚠️ IT IS MODULE-SCOPE, NOT A CONTEXT, for the reason the founding sign-up's store gives: a
 * provider has to be mounted by every page that carries a guide, and forgetting it is a silent
 * regression to per-instance state. Nothing to wire means nothing to forget.
 *
 * ⚠️ AND THE SEEN FLAG IS PER PAGE PER DEVICE. §4b says "once per page per writer"; this app has no
 * per-user store this component could reach without a write on every first visit, so it is
 * `localStorage` under the house `sa.` prefix — which means a writer who changes device sees it
 * again. Stated rather than hidden: the alternative is a Firestore write to show a tooltip.
 */

const KEY = (page: string) => `sa.guide.${page}`;

/** True when this writer has already finished or dismissed this page's guide on this device. */
export function guideSeen(page: string): boolean {
  try {
    return localStorage.getItem(KEY(page)) === "1";
  } catch {
    /* a private window, or site data blocked — show it, which is the harmless direction */
    return false;
  }
}

/** × or finishing: it never shows again by itself. */
export function markGuideSeen(page: string): void {
  try {
    localStorage.setItem(KEY(page), "1");
  } catch {
    /* nothing to do: the guide simply shows again next time */
  }
}

/* ── the "show it again" door, and which page currently has one ────────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();
let registered: string | null = null;
let openToken = 0;

/** A page with a guide says so while it is mounted, so the help menu can offer it only there. */
export function registerPageGuide(page: string | null): void {
  registered = page;
  listeners.forEach((l) => l());
}
export function registeredPageGuide(): string | null {
  return registered;
}
/** The help menu's "Show the page guide" — the one route back once it has been dismissed. */
export function requestPageGuide(): void {
  openToken += 1;
  listeners.forEach((l) => l());
}
export function pageGuideToken(): number {
  return openToken;
}
export function subscribePageGuide(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
