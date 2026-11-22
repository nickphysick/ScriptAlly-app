/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v160 — WHEN A SAVE OR AN UNDO LANDS. The page says a save has started, or Undo was pressed (`motion`, a
 * new `n` each time); the card's drawing changes later, when the local write reaches it. This hook waits for that
 * change: the first render whose signature (the status, the state, the footer's phase, the thread's steps) differs from
 * the one the motion started on is the landing, and `onLand(kind, true)` runs in that render's layout phase — the same
 * frame the change is painted in. A further change inside the next 1.2s (a write that reaches the card in two parts)
 * runs `onLand(kind, false)`: it eases, but the card does not bump twice.
 *
 * ⚠️ Nothing lands on another query: stepping to the next one drops the motion. A save that fails is withdrawn by the
 *    page (`motion` null); one that never draws is dropped after 8s.
 */
import { useLayoutEffect, useRef } from "react";

/** `done`: the save or the undo has finished (its write acknowledged) — the card releases its held motion after it (v161) */
export interface Motion160 { kind: "save" | "undo"; n: number; done?: boolean }
const WINDOW_MS = 1200, GIVE_UP_MS = 8000;

export function useLanding160(
  motion: Motion160 | null | undefined, sig: string, rId: string,
  on: { start?: (kind: Motion160["kind"]) => void; land: (kind: Motion160["kind"], first: boolean) => void },
): { started: () => Motion160["kind"] | null } {
  const seen = useRef<number | null>(motion?.n ?? null);
  const pend = useRef<{ kind: Motion160["kind"]; sig0: string; rId: string; t0: number; landed: number | null } | null>(null);
  useLayoutEffect(() => {
    /* the page withdrew it (the save failed) */
    if (!motion) { pend.current = null; return; }
    if (motion.n !== seen.current) {
      seen.current = motion.n;
      pend.current = { kind: motion.kind, sig0: sig, rId, t0: performance.now(), landed: null };
      on.start?.(motion.kind);
      return;
    }
    const p = pend.current;
    if (!p) return;
    const now = performance.now();
    if (p.rId !== rId || (p.landed == null && now - p.t0 > GIVE_UP_MS) || (p.landed != null && now - p.landed > WINDOW_MS)) { pend.current = null; return; }
    if (sig === p.sig0) return;
    const first = p.landed == null;
    p.landed ??= now;
    p.sig0 = sig;
    on.land(p.kind, first);
  });
  /* under way and not yet landed — from the render the motion arrives in (its layout phase has not run yet) */
  return {
    started: () => (!motion ? null : motion.n !== seen.current ? motion.kind : pend.current && pend.current.landed == null && pend.current.rId === rId ? pend.current.kind : null),
  };
}
