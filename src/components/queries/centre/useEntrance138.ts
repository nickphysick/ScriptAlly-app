/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §H — ONE PAGE-LOAD ENTRANCE, on the first mount of `/queries` once its data is ready. It never
 * replays: filtering, sorting and grouping change rows, never this state. After 1.7s the attribute comes off, so no
 * row carries a leftover animation (a hover or a re-render can then never fade one). Reduced motion: no entrance.
 *
 * ⚠️ TWO EFFECTS, THE SPLIT IS DELIBERATE (useQcLoad's lesson): one effect that both starts the run and arms its
 *    timer clears that timer in its own cleanup when the state it set re-runs it.
 */
import { useEffect, useState } from "react";

export const ENTRANCE_138_MS = 1700;
export type Entrance138 = "wait" | "run" | "done";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useEntrance138(ready: boolean): Entrance138 {
  const [state, setState] = useState<Entrance138>("wait");
  useEffect(() => {
    if (!ready || state !== "wait") return;
    setState(reduced() ? "done" : "run");
  }, [ready, state]);
  useEffect(() => {
    if (state !== "run") return undefined;
    const t = window.setTimeout(() => setState("done"), ENTRANCE_138_MS);
    return () => window.clearTimeout(t);
  }, [state]);
  return state;
}
