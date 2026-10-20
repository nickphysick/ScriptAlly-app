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

/* ── Help system v1, Part E — where the panel opens, which page it was opened on, and the draft ── */

/** The sidebar's Give feedback buttons (three shapes, one shown at a time) register here; the panel sits beside the
 *  one on screen. Registered rather than queried, so the panel never reads the page it sits on. */
const anchors = new Set<HTMLElement>();
export function registerFeedbackAnchor(el: HTMLElement): () => void {
  anchors.add(el);
  return () => { anchors.delete(el); };
}
/** The registered button that is on screen, or null (the phone draws none). */
export function feedbackAnchor(): HTMLElement | null {
  for (const el of anchors) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return el; }
  return null;
}

/** The page's NAME (the folder tab's), set by the shell — the panel sends a name, never a route the writer did not see. */
let pageName: string | null = null;
export function setFeedbackPage(name: string | null): void { pageName = name; }
export function feedbackPage(): string | null { return pageName; }

/** The draft: kept when the panel closes for any reason but a send. Module state: it lasts the session, not a reload. */
export interface FeedbackDraft {
  kind: string | null;
  message: string;
  severity: string | null;
  shot: { file: File; url: string; name: string } | null;
  reply: boolean;
}
export const EMPTY_DRAFT: FeedbackDraft = { kind: null, message: "", severity: null, shot: null, reply: true };
let draft: FeedbackDraft = { ...EMPTY_DRAFT };
export function feedbackDraft(): FeedbackDraft { return draft; }
export function setFeedbackDraft(next: FeedbackDraft): void { draft = next; }
export function clearFeedbackDraft(): void {
  if (draft.shot) { try { URL.revokeObjectURL(draft.shot.url); } catch { /* none */ } }
  draft = { ...EMPTY_DRAFT };
}
