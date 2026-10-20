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
