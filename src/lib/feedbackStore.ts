/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FEEDBACK PANEL'S OPEN DOOR (Dashboard v59). `FeedbackDock` is mounted ONCE, by `AppShell`, which
 * owns its open state; this store is how a page asks for it to open without a prop threaded through
 * the shell and the stage. There is one feedback panel in the app, never a second.
 */
type Listener = () => void;
const subs = new Set<Listener>();

/** Open the app's one feedback panel (the sidebar's Give feedback opens the same one). */
export function openFeedback(): void { for (const f of [...subs]) f(); }

/** The shell subscribes; returns the unsubscribe. */
export function subscribeFeedback(f: Listener): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
