/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useQcLoad — when the Query Centre shows its skeleton, and when its one entrance runs (v11).
 *
 * ⚠️ DO NOT FLASH IT. If the data is ready within 150ms the skeleton is never shown; once shown it
 * stays at least 400ms. Until the 150ms has passed the page draws its real frames with NOTHING in
 * them (`blank`) — never the placeholders, and never the content it does not have yet.
 *
 * ⚠️ THE ENTRANCE RUNS ONCE, WHEN THE DATA LANDS, AND IS REMOVED BY A TIMER — never `animationend`. A
 * harness that suppresses animation never fires that event, and a class that depends on it then
 * never leaves; a `fill-mode` that outlives its class also holds transforms on rows that have sticky
 * children. Filter, sort, view change and selection never replay it: the hook's state is per mount,
 * and the workspace keeps this page mounted.
 */
import { useEffect, useRef, useState } from "react";

export const SKELETON_DELAY_MS = 150;
export const SKELETON_MIN_MS = 400;
/** Everything in the entrance is done inside this; the class comes off when it has passed. */
export const ENTRANCE_MS = 800;

export type QcLoadPhase = "blank" | "skeleton" | "content";

/** when the skeleton may first show, and how long it then stays at least */
export interface QcLoadTiming { delayMs: number; minMs: number }
const DEFAULT_TIMING: QcLoadTiming = { delayMs: SKELETON_DELAY_MS, minMs: SKELETON_MIN_MS };
/** v155 §3 — the desktop Query Centre's: no skeleton before 200ms, and once shown it gives way the moment the data lands */
export const QC155_LOAD: QcLoadTiming = { delayMs: 200, minMs: 0 };

/** PURE — what to show, given what has happened. `skeletonForMs` is null until the skeleton has been shown. */
export function qcLoadPhase(s: { ready: boolean; sinceMountMs: number; skeletonForMs: number | null }, t: QcLoadTiming = DEFAULT_TIMING): QcLoadPhase {
  if (s.skeletonForMs == null) {
    if (s.ready) return "content";
    return s.sinceMountMs >= t.delayMs ? "skeleton" : "blank";
  }
  return s.ready && s.skeletonForMs >= t.minMs ? "content" : "skeleton";
}

/** A review aid: `window.__SA_QC_HOLD_MS = 4000` holds the skeleton. Never read in a production build. */
function holdMs(): number {
  if (import.meta.env.MODE === "production" || typeof window === "undefined") return 0;
  const v = (window as unknown as { __SA_QC_HOLD_MS?: number }).__SA_QC_HOLD_MS;
  return typeof v === "number" && v > 0 ? v : 0;
}

export function useQcLoad(dataReady: boolean, timing: QcLoadTiming = DEFAULT_TIMING): { phase: QcLoadPhase; loading: boolean; blank: boolean; entering: boolean } {
  const mountedAt = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0);
  const shownAt = useRef<number | null>(null);
  const [held, setHeld] = useState<boolean>(() => holdMs() > 0);
  const [, tick] = useState(0);
  const [entered, setEntered] = useState<"no" | "running" | "done">("no");
  const ready = dataReady && !held;

  useEffect(() => {
    const h = holdMs();
    if (!h) return undefined;
    const t = window.setTimeout(() => setHeld(false), h);
    return () => window.clearTimeout(t);
  }, []);

  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const phase = qcLoadPhase({ ready, sinceMountMs: now - mountedAt.current, skeletonForMs: shownAt.current == null ? null : now - shownAt.current }, timing);
  if (phase === "skeleton" && shownAt.current == null) shownAt.current = now;

  /* wake at the two moments the answer can change without any prop changing */
  useEffect(() => {
    if (phase === "content") return undefined;
    const at = performance.now();
    const wait = phase === "blank"
      ? Math.max(0, timing.delayMs - (at - mountedAt.current))
      : Math.max(0, timing.minMs - (at - (shownAt.current ?? at)));
    const t = window.setTimeout(() => tick((n) => n + 1), wait + 1);
    return () => window.clearTimeout(t);
  }, [phase, ready, timing.delayMs, timing.minMs]);

  /**
   * ⚠️ TWO EFFECTS, AND THE SPLIT IS THE FIX. As one effect keyed on `entered` it armed the timer and
   * set `entered` in the same pass — and that state change re-ran the effect, whose CLEANUP cleared
   * the timer it had just armed. The class then never came off: measured, `qcv-page--enter` was still
   * on the page 900ms later, with tsc, every unit test and the build all green. The timer is armed by
   * the effect that sees `running`, so nothing it depends on changes until it fires.
   */
  useEffect(() => {
    if (phase === "content" && entered === "no") setEntered("running");
  }, [phase, entered]);
  useEffect(() => {
    if (entered !== "running") return undefined;
    const t = window.setTimeout(() => setEntered("done"), ENTRANCE_MS);
    return () => window.clearTimeout(t);
  }, [entered]);

  return { phase, loading: phase !== "content", blank: phase === "blank", entering: entered === "running" };
}
