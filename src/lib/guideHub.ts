/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Parts B and C — WHAT THE HELP MENU KNOWS ABOUT THE PAGE'S GUIDE, and the switch that turns every guide
 * off.
 *
 *   the hub      the page on screen's `PageChecklist` publishes its state (n of N, the next item, live / hidden /
 *                finished) and three commands (continue, open, restore). The Help menu in the shell reads it. The shell
 *                names no page and imports nothing of one, as with `lib/barSlot`.
 *   the switch   `sa.guides.off` in localStorage: off hides every page's guide pill and stops auto-opens.
 *   the session  `sa.guide.autoOpened` in sessionStorage: only one automatic open per browser session, across pages.
 *
 * ⚠️ MODULE-SCOPE, like `lib/barSlot` and `lib/pageGuide`: nothing to provide means nothing to forget.
 * ⚠️ EVERY PAGE STAYS MOUNTED: only the page whose route is on screen publishes; leaving clears it.
 */
import { useSyncExternalStore } from "react";

export type GuideHubState = "live" | "hidden" | "finished";

export interface GuideHubStatus {
  page: string;
  n: number;
  total: number;
  next: { key: string; title: string } | null;
  state: GuideHubState;
}

export interface GuideHubCommands {
  /** start the next undone item's spotlight (the checklist does not open) */
  continueNext: () => void;
  /** open the checklist (finished: every item ticked, every row still pressable) */
  open: () => void;
  /** clear "hidden" for this page and open the checklist */
  restore: () => void;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let snap: { status: GuideHubStatus; cmds: GuideHubCommands } | null = null;
const emit = () => [...listeners].forEach((l) => l());

export function publishGuide(status: GuideHubStatus, cmds: GuideHubCommands): void {
  const same = snap && snap.status.page === status.page && snap.status.n === status.n && snap.status.total === status.total
    && snap.status.state === status.state && snap.status.next?.key === status.next?.key && snap.cmds === cmds;
  if (same) return;
  snap = { status, cmds };
  emit();
}
/** The page left the screen: forget it (only if it is still the one published). */
export function clearGuide(page: string): void {
  if (snap?.status.page !== page) return;
  snap = null;
  emit();
}
export function guideHub(): { status: GuideHubStatus; cmds: GuideHubCommands } | null {
  return snap;
}
export function subscribeGuideHub(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function useGuideHub(): { status: GuideHubStatus; cmds: GuideHubCommands } | null {
  return useSyncExternalStore(subscribeGuideHub, guideHub, () => null);
}

/* ── the switch: every page's guide, on or off ── */

export const GUIDES_OFF_KEY = "sa.guides.off";
const offListeners = new Set<Listener>();
let offCache: boolean | null = null;

export function guidesOff(): boolean {
  if (offCache !== null) return offCache;
  try { offCache = localStorage.getItem(GUIDES_OFF_KEY) === "1"; } catch { offCache = false; }
  return offCache;
}
export function setGuidesOff(off: boolean): void {
  offCache = off;
  try { if (off) localStorage.setItem(GUIDES_OFF_KEY, "1"); else localStorage.removeItem(GUIDES_OFF_KEY); } catch { /* private mode: the switch lasts the session */ }
  [...offListeners].forEach((l) => l());
}
export function subscribeGuidesOff(l: Listener): () => void {
  offListeners.add(l);
  return () => { offListeners.delete(l); };
}
export function useGuidesOff(): boolean {
  return useSyncExternalStore(subscribeGuidesOff, guidesOff, () => false);
}

/* ── one automatic open per browser session ── */

export const AUTO_OPENED_KEY = "sa.guide.autoOpened";
let autoOpenedMem = false;
export function autoOpenedThisSession(): boolean {
  if (autoOpenedMem) return true;
  try { return sessionStorage.getItem(AUTO_OPENED_KEY) === "1"; } catch { return false; }
}
export function markAutoOpened(): void {
  autoOpenedMem = true;
  try { sessionStorage.setItem(AUTO_OPENED_KEY, "1"); } catch { /* the in-memory flag holds for this load */ }
}

/* ── per page: skips, and the last visit ── */

/** `Contact list` → `contact-list`: the slug in a page's storage keys */
export const guideSlug = (page: string) => page.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const skippedKey = (page: string) => `sa.guide.${guideSlug(page)}.skipped`;
export const lastVisitKey = (page: string) => `sa.guide.${guideSlug(page)}.last`;

export function readSkipped(page: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(skippedKey(page)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}
export function writeSkipped(page: string, keys: string[]): void {
  try {
    if (keys.length) localStorage.setItem(skippedKey(page), JSON.stringify(keys));
    else localStorage.removeItem(skippedKey(page));
  } catch { /* private mode: the skip lasts the session */ }
}

export const PULSE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** Stamp this visit; true when the last one was more than seven days ago (a first visit is not "after a week"). */
export function stampVisit(page: string, now = Date.now()): boolean {
  let last: number | null = null;
  try { const v = Number(localStorage.getItem(lastVisitKey(page))); last = Number.isFinite(v) && v > 0 ? v : null; } catch { /* none */ }
  try { localStorage.setItem(lastVisitKey(page), String(now)); } catch { /* none */ }
  return last !== null && now - last > PULSE_AFTER_MS;
}

/* ── Help Centre v1 — another route asks a page's guide to show one item, or to open ──
   "Show me in the app" on an article, and "Start on {Page}" on a guide card, navigate to the page and leave a request
   here. The page's `PageChecklist` takes it once its route is on screen AND its data is ready (`active && ready`), then
   starts that item's spotlight (or opens the checklist). A request nobody takes in 30 seconds is dropped, so a page
   visited later never acts on a stale press.
   ⚠️ A REQUEST NEVER TICKS ANYTHING. The spotlight points; only the writer's own action marks the item done. */

export interface GuideRequest {
  page: string;
  /** the item to spotlight; null opens the checklist */
  key: string | null;
  at: number;
}
export const GUIDE_REQUEST_TTL_MS = 30_000;
let request: GuideRequest | null = null;
const reqListeners = new Set<Listener>();
const emitReq = () => [...reqListeners].forEach((l) => l());

/** Ask `page`'s guide to spotlight `key` once that page is on screen and ready. */
export function requestGuideStep(page: string, key: string): void {
  request = { page, key, at: Date.now() };
  emitReq();
}
/** Ask `page`'s guide to open its checklist once that page is on screen and ready. */
export function requestGuideOpen(page: string): void {
  request = { page, key: null, at: Date.now() };
  emitReq();
}
/** The request waiting for `page` (null when none, or when it has gone stale). */
export function pendingGuideRequest(page: string, now = Date.now()): GuideRequest | null {
  if (!request || request.page !== page) return null;
  if (now - request.at > GUIDE_REQUEST_TTL_MS) { request = null; return null; }
  return request;
}
/** The page acted on it. */
export function takeGuideRequest(req: GuideRequest): void {
  if (request === req) { request = null; emitReq(); }
}
export function subscribeGuideRequest(l: Listener): () => void {
  reqListeners.add(l);
  return () => { reqListeners.delete(l); };
}
const requestSnap = () => request;
export function useGuideRequest(page: string): GuideRequest | null {
  const r = useSyncExternalStore(subscribeGuideRequest, requestSnap, () => null);
  return r && r.page === page ? pendingGuideRequest(page) : null;
}

/* ── Help Centre v1 — the date a guide was finished on this device, and a restart waiting for the page ── */

export const learnedKey = (page: string) => `sa.guide.${guideSlug(page)}.learned`;
export const restartKey = (page: string) => `sa.guide.${guideSlug(page)}.restart`;

/** ISO date the guide was finished in a visit on this device, or null (finished elsewhere, or before dates were kept). */
export function readLearned(page: string): string | null {
  try { const v = localStorage.getItem(learnedKey(page)); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; } catch { return null; }
}
export function stampLearned(page: string, now = new Date()): void {
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  try { localStorage.setItem(learnedKey(page), iso); } catch { /* none */ }
}
/** "Restart" on a guide card: forget this device's skips and learned date, and show the guide on the page's next visit. */
export function restartGuideLocal(page: string): void {
  writeSkipped(page, []);
  try { localStorage.removeItem(learnedKey(page)); localStorage.setItem(restartKey(page), "1"); } catch { /* none */ }
}
/** The page's next visit consumes the restart: true once. */
export function takeRestart(page: string): boolean {
  try {
    if (localStorage.getItem(restartKey(page)) !== "1") return false;
    localStorage.removeItem(restartKey(page));
    return true;
  } catch { return false; }
}
