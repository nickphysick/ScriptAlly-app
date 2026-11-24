/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 — THE ONE DOOR to the add journey on a desktop. Every way to add an agent (the top bar's Quick actions,
 * the Dashboard, the Contact list, its empty state, search, the To-do's starting task, Log a query's "Add a new agent")
 * arrives here, and the panel mounted once for the workspace (AddAgentPanel) opens the journey over the page on screen.
 * Nothing navigates.
 *
 *   openAddAgent()                               → "Who are you adding?"
 *   openAddAgent({ name })                       → the name already typed (search, Log a query's find)
 *   openAddAgent({ over: "laq", onAdded })       → from inside Log a query: it steps back behind, and is handed the new
 *                                                  agent's id once, when it is added
 *
 * ⚠️ THE PHONE DOES NOT LISTEN (below 768px nothing subscribes): `hasAddAgentHost()` is false there, and the old opener
 *    keeps the phone's own flow.
 */

export interface AddAgentRequest {
  name?: string;
  /** opened from inside Log a query, which steps back behind it */
  over?: "laq" | null;
  /** told once, with the new agent's id and name, when the agent is added */
  onAdded?: (id: string, name: string) => void;
  /** told when the journey closes without adding (Cancel, Escape, Discard) */
  onCancel?: () => void;
}
type Listener = (r: AddAgentRequest) => void;
const listeners = new Set<Listener>();

export function subscribeAddAgent(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
/** is a desktop host listening? (false on the phone, and in node) */
export const hasAddAgentHost = (): boolean => listeners.size > 0;

/** open the journey; returns false when no host is listening, so the caller can fall back */
export function openAddAgent(r: AddAgentRequest = {}): boolean {
  if (!listeners.size) return false;
  for (const l of [...listeners]) l(r);
  return true;
}
