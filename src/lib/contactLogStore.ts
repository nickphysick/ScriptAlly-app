/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 C4 — "+ Log a query" ON THE CONTACT LIST OPENS IN PLACE. While the Contact list is the page on
 * screen it hosts the log flow in its own panel; App's navigate bridge asks here first and, when the page has
 * registered a host, hands the request over instead of navigating to the Query Centre. Everywhere else nothing
 * changes. A module store (as queryPanelStore's picker is), so App needs no reference to the page.
 */
export interface ContactLogSeed { agentId: string | null; manuscriptId: string | null }
type Host = (seed: ContactLogSeed) => void;

let host: Host | null = null;

/** the Contact list registers while it is the page on screen; the returned function unregisters */
export function hostContactLog(fn: Host): () => void {
  host = fn;
  return () => { if (host === fn) host = null; };
}
export const contactLogHosted = (): boolean => host !== null;
/** true when a host took it */
export function openContactLog(seed: ContactLogSeed): boolean {
  if (!host) return false;
  host(seed);
  return true;
}
