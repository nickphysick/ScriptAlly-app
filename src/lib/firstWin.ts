/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — THE FIRST-WIN STAMP'S HAND-OFF (Part B).
 *
 * A writer's first query on a manuscript, first agent, or first import is recorded HERE, at the moment the
 * write succeeds, by the code that made it (`db.addQuery`, `db.addAgent`, the import's commit). The dashboard
 * then shows the stamp on its next render, wherever the action happened — over the dashboard itself, or after
 * the writer comes back from the Contact list or the Import page.
 *
 * ⚠️ WHY A HAND-OFF AND NOT A DERIVATION: "the first query exists" is true for every writer who already has
 * one, so deriving the stamp from data would show it to the whole existing user base the day this shipped. Only
 * the act of creating it is the event.
 *
 * ⚠️ MODULE SCOPE, NOT A CONTEXT (the founding store's precedent): nothing to mount, so nothing to forget, and
 * it survives a route change. Mirrored to sessionStorage so a reload between the action and the dashboard does
 * not lose it. "Once only" is the dashboard's job — it records each stamp it shows in the user's prefs
 * (`winKey`), so a pending stamp that was already shown is dropped rather than repeated.
 */
import type { WinCopy, WinKind } from "./dashFirstVisit";

export interface PendingWin extends WinCopy {
  kind: WinKind;
  uid: string;
  msId: string | null;
  at: number;
}

const KEY = "sa.firstWin";
const EVENT = "sa:firstwin";

let pending: PendingWin[] = [];
let loaded = false;

const load = () => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as PendingWin[]) : [];
    pending = Array.isArray(v) ? v.filter((w) => w && typeof w.kind === "string" && typeof w.uid === "string") : [];
  } catch { pending = []; }
};
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(pending)); } catch { /* private mode: in memory only */ } };
const announce = () => { try { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT)); } catch { /* no window */ } };

/** Recorded by the code that made the write, after it succeeded. One pending stamp per kind and manuscript. */
export function noteFirstWin(w: Omit<PendingWin, "at">): void {
  load();
  pending = [...pending.filter((p) => !(p.uid === w.uid && p.kind === w.kind && p.msId === w.msId)), { ...w, at: Date.now() }];
  save();
  announce();
}

/** This writer's pending stamps, oldest first. */
export function pendingWins(uid: string): PendingWin[] {
  load();
  return pending.filter((p) => p.uid === uid).sort((a, b) => a.at - b.at);
}

/** Taken once shown (or found already shown). */
export function clearWin(w: Pick<PendingWin, "uid" | "kind" | "msId">): void {
  load();
  pending = pending.filter((p) => !(p.uid === w.uid && p.kind === w.kind && p.msId === w.msId));
  save();
}

export function onFirstWin(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Tests only. */
export function __resetFirstWins(): void { pending = []; loaded = true; save(); }
