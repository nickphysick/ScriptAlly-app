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
import { PARKED_KEY, bareRequest, fromStored, sameJourney, toStored, type ParkedJourney } from "./parking";

export type { ParkedJourney } from "./parking";

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
  /** How the last log was recorded — "Log another" repeats it as it was (Nick, 28 Sep). */
  how?: "package" | "individual";
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
   * Opened from a card (a query card, or the agent card): the card docks to a chip beside the
   * drawer while it is open, and comes back after. The object carries what the chip shows — the
   * name, and a status line (Agent card v1 §6.1).
   */
  dock?: { initials: string; name: string; status: string };
  /**
   * The docked card is told when to step aside and when to come back: true while the drawer is on
   * screen, false the moment it is not — saved, cancelled, parked, or hidden by a failed save — so
   * no path can leave a card stepped aside behind a drawer that has gone (§6.1).
   */
  onDock?: (docked: boolean) => void;
  /**
   * K2 — opened from a task row that shows its own receipt strip. The drawer then shows NO undo
   * bar, so there is one Undo where the writer is looking; the row is told through `onSaved`.
   */
  receipt?: boolean;
  onSaved?: (r: SavedResult) => void;
  onCancel?: () => void;
  /** Set by the store: which drawer instance this is. A park keeps the instance — the journey stays
   *  mounted, hidden — and a resume in the same tab hands it back, answers and step intact. */
  instance?: number;
  /** A journey resumed after a RELOAD starts from its parked answers — its own `snapshot()` (§6.4)… */
  seed?: unknown;
  /** …and at the step it was parked on, with the steps it had opened. */
  resume?: { step: number; seen: number[] };
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
let instanceSeq = 0;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l(current));

/**
 * ⚠️ ONE JOURNEY AT A TIME (Continuity: "Starting another while one is parked"). While a journey is
 * parked, a door asking for ANOTHER turns the parked chip into the ask — "Finish it" or "Discard
 * and start", never a silent replace — and a door asking for the SAME one resumes it.
 */
export function openQueryDrawer(req: OpenRequest): void {
  if (parked) {
    if (sameJourney(parked.req, req)) { resumeQueryDrawer(req); return; }
    clash = req;
    notifyParked();
    return;
  }
  current = { ...req, instance: ++instanceSeq };
  notify();
}
export function closeQueryDrawer(): void {
  current = null;
  notify();
}
export function currentDrawerRequest(): OpenRequest | null {
  return current;
}
export function subscribeDrawer(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* ---------- parking (Agent card v1 §6.3–§6.5) ---------- */

type ParkedListener = (p: ParkedJourney | null, clash: OpenRequest | null) => void;
let parked: ParkedJourney | null = null;
/** the door that asked while a journey was parked — the chip's "Finish it / Discard and start" */
let clash: OpenRequest | null = null;
const parkedListeners = new Set<ParkedListener>();
const notifyParked = () => parkedListeners.forEach((l) => l(parked, clash));

/** sessionStorage, this tab only (§6.4) — every access guarded, since storage can be refused. */
const store = {
  write: (p: ParkedJourney) => { try { window.sessionStorage.setItem(PARKED_KEY, toStored(p)); } catch { /* the chip still works in this tab */ } },
  clear: () => { try { window.sessionStorage.removeItem(PARKED_KEY); } catch { /* nothing to clear */ } },
  read: (): string | null => { try { return window.sessionStorage.getItem(PARKED_KEY); } catch { return null; } },
};

/**
 * The card a resumed journey docks: the agent card's host registers it, and answers with the card
 * open NOW (Continuity: Resume — "if any agent's card is open, it docks while you finish and comes
 * back after; otherwise you stay on the page you're on").
 */
export type DockProvider = () => Pick<OpenRequest, "dock" | "onDock" | "onSaved"> | null;
let dockProvider: DockProvider | null = null;
export function provideDock(p: DockProvider | null): void {
  dockProvider = p;
}

/** Park the open journey: the drawer goes, the chip stays, and a reload brings the chip back. */
export function parkQueryDrawer(p: Omit<ParkedJourney, "live" | "req"> & { req: OpenRequest }): void {
  parked = { ...p, req: bareRequest(p.req), live: true };
  clash = null;
  current = null;
  store.write(parked);
  notify();
  notifyParked();
}

/** Resume it — with the hooks of the door that asked, or of the card open now. */
export function resumeQueryDrawer(via?: OpenRequest): void {
  const p = parked;
  if (!p) return;
  const hooks = via
    ? { dock: via.dock, onDock: via.onDock, onSaved: via.onSaved, onCancel: via.onCancel, receipt: via.receipt }
    : (dockProvider?.() ?? {});
  parked = null;
  clash = null;
  store.clear();
  current = p.live
    ? { ...p.req, ...hooks }
    : { ...p.req, ...hooks, instance: ++instanceSeq, seed: p.answers, resume: { step: p.step, seen: p.seen } };
  notify();
  notifyParked();
}

/** Discard it: nothing was saved, so nothing is undone. */
export function discardParked(): void {
  parked = null;
  clash = null;
  store.clear();
  notify();
  notifyParked();
}

/** The clash's second answer: put the parked one away and start the one that asked. */
export function discardAndStart(): void {
  const next = clash;
  discardParked();
  if (next) openQueryDrawer(next);
}

/** The clash or the chip's own ask, withdrawn — the parked journey stays as it was. */
export function keepParked(): void {
  if (!clash) return;
  clash = null;
  notifyParked();
}

export function currentParked(): ParkedJourney | null {
  return parked;
}
export function currentClash(): OpenRequest | null {
  return clash;
}
export function subscribeParked(l: ParkedListener): () => void {
  parkedListeners.add(l);
  return () => parkedListeners.delete(l);
}

/**
 * On load: a journey parked before a reload comes back as the CHIP only — its journey mounts when
 * the writer presses Resume, seeded at the saved step (§6.4). Whether its agent and query still
 * exist is the host's to check once the data has arrived (`discardParked` drops it silently).
 */
export function restoreParked(): ParkedJourney | null {
  if (parked) return parked;
  const p = fromStored(store.read());
  if (!p) { store.clear(); return null; }
  parked = p;
  notifyParked();
  return parked;
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

/** v1.1 — the drawer's query picker asks App to open the Pro paste-an-email flow. */
export const PASTE_RESPONSE_EVENT = "sa:paste-response-email";
