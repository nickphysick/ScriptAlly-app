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
 * ⚠️ Nothing lands on another query: stepping to the next one drops the motion. A save that never draws (it failed)
 *    is dropped after 8s.
 */
import { useLayoutEffect, useRef } from "react";

export interface Motion160 { kind: "save" | "undo"; n: number }
const WINDOW_MS = 1200, GIVE_UP_MS = 8000;

export function useLanding160(
  motion: Motion160 | null | undefined, sig: string, rId: string,
  on: { start?: (kind: Motion160["kind"]) => void; land: (kind: Motion160["kind"], first: boolean) => void },
): { pending: () => Motion160["kind"] | null } {
  const seen = useRef<number | null>(motion?.n ?? null);
  const pend = useRef<{ kind: Motion160["kind"]; sig0: string; rId: string; t0: number; landed: number | null } | null>(null);
  useLayoutEffect(() => {
    if (motion && motion.n !== seen.current) {
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
  return { pending: () => (pend.current && pend.current.landed == null ? pend.current.kind : null) };
}
