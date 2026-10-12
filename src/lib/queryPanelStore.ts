/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query panel's store (Query panel v1) — how a page OTHER than the Query Centre opens a query in the
 * side panel without leaving itself.
 *
 * On the Query Centre the open query is `?q=<id>` and nothing else. Everywhere else there is no such
 * param, so a page asks here: `openQueryPanel(id, "dashboard")`. The Query Centre's component is always
 * mounted (every workspace page is), and it is the one place the query's card is composed, so it listens
 * and draws the panel over whichever page is on screen.
 *
 * Module scope, like `drawerStore`: nothing to mount means nothing to forget.
 */
export type PanelOrigin = "dashboard" | "feed" | "other";
export interface PanelRequest { id: string; from: PanelOrigin }

let current: PanelRequest | null = null;
const subs = new Set<() => void>();
const tell = () => { for (const f of [...subs]) f(); };

export const currentQueryPanel = (): PanelRequest | null => current;
export function openQueryPanel(id: string, from: PanelOrigin = "other"): void {
  if (current?.id === id && current.from === from) return;
  current = { id, from };
  tell();
}
export function closeQueryPanel(): void {
  if (!current) return;
  current = null;
  tell();
}
export function subscribeQueryPanel(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}

/**
 * Query panel v2 §E — "Record a response" from the shell's menu, on any page: the panel opens in its acting look
 * at the picker ("Who replied?"), with the query that was open listed first. The Query Centre's component hosts
 * the panel, so it listens.
 */
const pickerSubs = new Set<() => void>();
export function openResponsePicker(): void { for (const f of [...pickerSubs]) f(); }
export function subscribeResponsePicker(f: () => void): () => void {
  pickerSubs.add(f);
  return () => { pickerSubs.delete(f); };
}
/** true while something is listening: the shell falls back to the standalone drawer when nothing is */
export const responsePickerHosted = (): boolean => pickerSubs.size > 0;

/**
 * ONE RIGHT-HAND PANEL AT A TIME. The query panel, the activity feed drawer and the Birds-eye drawer share
 * the window's right edge; whoever opens says so here, and the others close themselves.
 */
export type RightPanelOwner = "query" | "feed" | "birds";
let owner: RightPanelOwner | null = null;
const ownerSubs = new Set<(o: RightPanelOwner | null) => void>();
export const rightPanelOwner = (): RightPanelOwner | null => owner;
export function claimRightPanel(o: RightPanelOwner): void {
  if (owner === o) return;
  owner = o;
  for (const f of [...ownerSubs]) f(owner);
}
export function releaseRightPanel(o: RightPanelOwner): void {
  if (owner !== o) return;
  owner = null;
  for (const f of [...ownerSubs]) f(owner);
}
export function subscribeRightPanel(f: (o: RightPanelOwner | null) => void): () => void {
  ownerSubs.add(f);
  return () => { ownerSubs.delete(f); };
}

/* The measurement harness opens the panel the way a page does, through the store. Development builds only:
   the MODE literal is replaced at build time, so a production bundle carries none of it. */
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  (window as unknown as { __saQueryPanel?: unknown }).__saQueryPanel = { open: (id: string, from: PanelOrigin = "dashboard") => openQueryPanel(id, from), close: closeQueryPanel };
}
