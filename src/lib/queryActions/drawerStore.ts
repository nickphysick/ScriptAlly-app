/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE DOOR TO THE QUERY DRAWER. Every surface that lets a writer change a query — a Query
 * Centre row, the open card's footer, a to-do row's tick, a feed link, another session's packages
 * page — calls `openQueryDrawer(…)` and nothing else. The drawer is mounted once, by the shell.
 *
 * ⚠️ MODULE-SCOPE, NOT A CONTEXT — for the reason `foundingStore` gives: a provider has to be
 * mounted by every page that opens the drawer, and forgetting it is a silent no-op on a button that
 * looks live. Nothing to wire means nothing to forget. The host subscribes; callers only call.
 */

export type DrawerMode = "log" | "resp" | "sent" | "nudge" | "close" | "offer" | "edit";

/** What a caller may pre-answer. Each journey reads only its own keys. */
export interface DrawerPreset {
  /** D2: the response type, e.g. "pass" when D5's "They said no" hands over. */
  respType?: "partial" | "full" | "rr" | "pass" | "offer";
  /** D4: which path is chosen on "Where it stands". */
  nudgeTab?: "sent" | "plan";
  /** D5: the reason, e.g. "noreply" from a "Consider closing" task. */
  closeWhy?: "noreply" | "withdraw" | "gone";
  /** Open at this step index rather than the first. */
  step?: number;
}

export interface LogAgain {
  sent: Date;
  via: string;
  pkg: string;
  mat: unknown;
  manuscriptId: string;
}

export interface OpenRequest {
  mode: DrawerMode;
  queryId?: string;
  agentId?: string;
  manuscriptId?: string;
  packageId?: string;
  /** D7: the activity id of the entry being corrected. */
  entryId?: string;
  preset?: DrawerPreset;
  /** "Log another": the kept date, method and package. */
  again?: LogAgain;
  /**
   * Opened from a query card: the card docks to a chip while the drawer is open, and comes back
   * refreshed on save. The object carries what the chip shows.
   */
  dock?: { initials: string; name: string; status: string };
  /**
   * K2 — opened from a task row that shows its own receipt strip. The drawer then shows NO undo
   * bar, so there is one Undo where the writer is looking; the row is told through `onSaved`.
   */
  receipt?: boolean;
  onSaved?: (r: SavedResult) => void;
  onCancel?: () => void;
}

export interface SavedResult {
  mode: DrawerMode;
  queryId: string | null;
  message: string;
  sub: string;
  undo: () => Promise<void>;
}

type Listener = (r: OpenRequest | null) => void;
let current: OpenRequest | null = null;
const listeners = new Set<Listener>();

export function openQueryDrawer(req: OpenRequest): void {
  current = req;
  listeners.forEach((l) => l(current));
}
export function closeQueryDrawer(): void {
  current = null;
  listeners.forEach((l) => l(current));
}
export function currentDrawerRequest(): OpenRequest | null {
  return current;
}
export function subscribeDrawer(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* ---------- the undo bar ---------- */

export interface UndoToast {
  id: number;
  message: string;
  sub: string;
  undo?: () => Promise<void>;
  view?: () => void;
  again?: () => void;
  /** A failed save: the bar says so and "Try again" reopens the drawer as entered. */
  failed?: { retry: () => void };
  /** Set once undone: the bar reads "Undone" and offers nothing. */
  done?: boolean;
}

type ToastListener = (t: UndoToast | null) => void;
let toast: UndoToast | null = null;
let seq = 0;
const toastListeners = new Set<ToastListener>();

export function showUndoBar(t: Omit<UndoToast, "id">): void {
  toast = { ...t, id: ++seq };
  toastListeners.forEach((l) => l(toast));
}
export function hideUndoBar(): void {
  toast = null;
  toastListeners.forEach((l) => l(toast));
}
export function subscribeUndoBar(l: ToastListener): () => void {
  toastListeners.add(l);
  return () => toastListeners.delete(l);
}
