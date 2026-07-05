/**
 * demoTimeline — the two-act hero demo choreography, ported from the <script> in
 * design-refs/landing-v13.html (the spec: same waypoints, same durations, same order).
 *
 * Pure module: the DOM lives behind the DemoEffects interface (DashboardDemo supplies the
 * adapter), sleeps are injected, and cancellation is an AbortSignal — so the tests can walk
 * a full iteration with fake effects and assert the sequencing, and unmount cleanup is a
 * plain abort. Waypoints are ELEMENT-ANCHORED, never hard-coded: pointInReplica converts a
 * target's viewport rect into unscaled replica coordinates using the CURRENT scale, and the
 * loop re-reads them every iteration so a resize can't break aim.
 */

export interface Point { x: number; y: number }

/** Viewport rect → unscaled replica-space point (the ref's pointOf, scale-aware). */
export function pointInReplica(
  target: { left: number; top: number },
  replicaOrigin: { left: number; top: number },
  scale: number,
  dx = 0,
  dy = 0
): Point {
  return {
    x: (target.left - replicaOrigin.left) / scale + dx,
    y: (target.top - replicaOrigin.top) / scale + dy,
  };
}

/** The ref script's timings, named. All in milliseconds. */
export const DEMO_TIMINGS = {
  resetHold: 900,
  cursorPlace: 60,
  glideToSpark: 1650,
  arriveSettle: 1720, // sleep covering the glide — the popup appears only after this
  popupHold: 4000,
  popupFade: 350,
  glideToChip: 1350,
  chipSettle: 1400,
  hoverBeat: 250,
  pressClear: 260,
  splitHold: 4200,
  glideToX: 1250,
  xSettle: 1320,
  closeBeat: 700,
  departGlide: 1150,
  departSettle: 880,
  idleGap: 1100,
} as const;

/**
 * The DOM seam. `point*` getters are called fresh each time they are needed —
 * element-anchored aim, recomputed per iteration.
 */
export interface DemoEffects {
  /** Clear split/popup/hover, hide the cursor (loop reset). */
  reset(): void;
  /** Measure + place the popup above the sparkline end point; returns that end point. */
  positionPopup(): Point;
  /** Jump the cursor (no transition) to a point. */
  teleportCursor(pt: Point): void;
  setCursorVisible(visible: boolean): void;
  /** Glide the cursor to a point over ms (CSS-eased transform). */
  moveCursor(pt: Point, ms: number): void;
  setPopupShown(shown: boolean): void;
  setChipHovered(hovered: boolean): void;
  /** Press-squash animation; the adapter clears it after pressClear ms. */
  pressCursor(): void;
  setSplit(split: boolean): void;
  /** The attention chip's click point (centre-bottom, per the ref). */
  pointOfChip(): Point;
  /** The to-do panel's × close glyph point. */
  pointOfTodoX(): Point;
}

export type SleepFn = (ms: number) => Promise<void>;

/** One full two-act iteration — the ref's loop body, verbatim in order and delay. */
export async function runDemoIteration(fx: DemoEffects, sleep: SleepFn): Promise<void> {
  const T = DEMO_TIMINGS;

  // reset
  fx.reset();
  await sleep(T.resetHold);

  // ACT 1 — land on the latest Active-queries point, then the popup materialises above it
  const end = fx.positionPopup();
  fx.teleportCursor({ x: end.x + 260, y: end.y - 140 });
  await sleep(T.cursorPlace);
  fx.setCursorVisible(true);
  fx.moveCursor(end, T.glideToSpark);
  await sleep(T.arriveSettle); // cursor has ARRIVED…
  fx.setPopupShown(true); // …then the popup materialises
  await sleep(T.popupHold);
  fx.setPopupShown(false);
  await sleep(T.popupFade);

  // ACT 2 — over to the attention chip, click, the dashboard does its thing
  fx.moveCursor(fx.pointOfChip(), T.glideToChip);
  await sleep(T.chipSettle);
  fx.setChipHovered(true);
  await sleep(T.hoverBeat);
  fx.pressCursor();
  fx.setSplit(true); // faithful: track slides, panel arrives, minis unfold, stats fold away
  await sleep(T.splitHold);

  // close it like a person would: click the × (measured ONCE, while the split is open —
  // the ref reuses this point for the depart glide; a re-read after close would measure
  // the collapsed side column and mis-aim)
  const xpt = fx.pointOfTodoX();
  fx.moveCursor(xpt, T.glideToX);
  await sleep(T.xSettle);
  fx.pressCursor();
  fx.setSplit(false);
  fx.setChipHovered(false);
  await sleep(T.closeBeat);

  // leave
  fx.moveCursor({ x: xpt.x + 220, y: xpt.y + 160 }, T.departGlide);
  await sleep(T.departSettle);
  fx.setCursorVisible(false);
  await sleep(T.idleGap);
}

/** Reduced-motion branch: no cursor, no loop — the static tableau with the split open. */
export function applyStaticTableau(fx: Pick<DemoEffects, "positionPopup" | "setPopupShown" | "setSplit">): void {
  fx.positionPopup();
  fx.setPopupShown(true);
  fx.setSplit(true);
}

/**
 * The forever loop with abort-based cleanup. The sleep it builds rejects on abort, which
 * unwinds the iteration mid-await; the AbortError is swallowed here — unmount is not an error.
 */
export async function runDemoLoop(fx: DemoEffects, signal: AbortSignal): Promise<void> {
  const sleep: SleepFn = (ms) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      // Bare timers (not window.*) so the loop also runs under the node test environment.
      const id = setTimeout(() => { cleanup(); resolve(); }, ms);
      const onAbort = () => { clearTimeout(id); cleanup(); reject(new DOMException("Aborted", "AbortError")); };
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  try {
    for (;;) {
      if (signal.aborted) return;
      await runDemoIteration(fx, sleep);
    }
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return;
    throw e;
  }
}
