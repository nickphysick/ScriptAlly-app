/**
 * Locks for the two-act demo timeline (ported from the landing-v13 ref script): phase
 * sequencing with the ref's exact delays, element-anchored waypoint maths, the
 * reduced-motion tableau, and abort-based cleanup (the unmount path).
 */

import { describe, it, expect } from "vitest";
import {
  runDemoIteration, runDemoLoop, applyStaticTableau, pointInReplica,
  DEMO_TIMINGS, DemoEffects, Point,
} from "./demoTimeline";

/** Recording fake — every effect call and sleep lands in `log`, in order. */
function makeFake(overrides: Partial<DemoEffects> = {}) {
  const log: string[] = [];
  const fx: DemoEffects = {
    reset: () => { log.push("reset"); },
    positionPopup: () => { log.push("positionPopup"); return { x: 500, y: 120 }; },
    teleportCursor: (pt: Point) => { log.push(`teleport(${pt.x},${pt.y})`); },
    setCursorVisible: (v: boolean) => { log.push(`cursor:${v}`); },
    moveCursor: (pt: Point, ms: number) => { log.push(`move(${Math.round(pt.x)},${Math.round(pt.y)},${ms})`); },
    setPopupShown: (s: boolean) => { log.push(`popup:${s}`); },
    setChipHovered: (h: boolean) => { log.push(`chipHover:${h}`); },
    pressCursor: () => { log.push("press"); },
    setSplit: (s: boolean) => { log.push(`split:${s}`); },
    pointOfChip: () => { log.push("pointOfChip"); return { x: 300, y: 400 }; },
    pointOfTodoX: () => { log.push("pointOfTodoX"); return { x: 900, y: 250 }; },
    ...overrides,
  };
  const sleeps: number[] = [];
  const sleep = (ms: number) => { sleeps.push(ms); log.push(`sleep(${ms})`); return Promise.resolve(); };
  return { fx, sleep, log, sleeps };
}

describe("runDemoIteration — the two-act script", () => {
  it("runs the ref's sequence: arrive first, popup only after arrival, split on chip press", async () => {
    const { fx, sleep, log } = makeFake();
    await runDemoIteration(fx, sleep);

    expect(log).toEqual([
      "reset", `sleep(${DEMO_TIMINGS.resetHold})`,
      // Act 1
      "positionPopup", "teleport(760,-20)", `sleep(${DEMO_TIMINGS.cursorPlace})`, "cursor:true",
      `move(500,120,${DEMO_TIMINGS.glideToSpark})`,
      `sleep(${DEMO_TIMINGS.arriveSettle})`, // the glide completes inside this sleep…
      "popup:true",                          // …and only then the popup materialises
      `sleep(${DEMO_TIMINGS.popupHold})`, "popup:false", `sleep(${DEMO_TIMINGS.popupFade})`,
      // Act 2
      "pointOfChip", `move(300,400,${DEMO_TIMINGS.glideToChip})`, `sleep(${DEMO_TIMINGS.chipSettle})`,
      "chipHover:true", `sleep(${DEMO_TIMINGS.hoverBeat})`, "press", "split:true",
      `sleep(${DEMO_TIMINGS.splitHold})`,
      // close via the × — measured once while the split is open, reused for the depart
      "pointOfTodoX", `move(900,250,${DEMO_TIMINGS.glideToX})`, `sleep(${DEMO_TIMINGS.xSettle})`,
      "press", "split:false", "chipHover:false", `sleep(${DEMO_TIMINGS.closeBeat})`,
      // depart (same xpt + the ref's 220/160 nudge — no post-close re-measure)
      `move(1120,410,${DEMO_TIMINGS.departGlide})`, `sleep(${DEMO_TIMINGS.departSettle})`,
      "cursor:false", `sleep(${DEMO_TIMINGS.idleGap})`,
    ]);
  });

  it("keeps the arrival settle at least as long as the glide (the popup never pre-empts)", () => {
    expect(DEMO_TIMINGS.arriveSettle).toBeGreaterThanOrEqual(DEMO_TIMINGS.glideToSpark);
    expect(DEMO_TIMINGS.chipSettle).toBeGreaterThanOrEqual(DEMO_TIMINGS.glideToChip);
    expect(DEMO_TIMINGS.xSettle).toBeGreaterThanOrEqual(DEMO_TIMINGS.glideToX);
  });

  it("re-reads the anchored waypoints each iteration (aim survives a between-loop resize)", async () => {
    let chipReads = 0;
    const { fx, sleep } = makeFake({
      pointOfChip: () => { chipReads += 1; return { x: chipReads * 100, y: 0 }; },
    });
    await runDemoIteration(fx, sleep);
    await runDemoIteration(fx, sleep);
    expect(chipReads).toBe(2); // fresh getBoundingClientRect-backed read per pass, never cached
  });
});

describe("pointInReplica — scale maths", () => {
  it("divides the viewport offset by the current scale and applies the nudge", () => {
    const pt = pointInReplica({ left: 350, top: 130 }, { left: 100, top: 30 }, 0.5, 2, 2);
    expect(pt).toEqual({ x: 502, y: 202 });
  });

  it("matches the ref's 0.623 desktop case", () => {
    const pt = pointInReplica({ left: 233.4, top: 100 }, { left: 100, top: 50 }, 0.623);
    expect(pt.x).toBeCloseTo(214.1, 1);
    expect(pt.y).toBeCloseTo(80.3, 1);
  });
});

describe("reduced motion", () => {
  it("applies the static tableau: popup positioned + shown, split open, no cursor calls", () => {
    const { fx, log } = makeFake();
    applyStaticTableau(fx);
    expect(log).toEqual(["positionPopup", "popup:true", "split:true"]);
  });
});

describe("runDemoLoop — cleanup on unmount", () => {
  it("stops mid-iteration when aborted and resolves without throwing", async () => {
    const controller = new AbortController();
    const log: string[] = [];
    const { fx } = makeFake({
      reset: () => { log.push("reset"); },
      setPopupShown: (s: boolean) => { log.push(`popup:${s}`); },
    });
    // Abort during the very first sleep (resetHold) — the loop must unwind quietly.
    const done = runDemoLoop(fx, controller.signal);
    controller.abort();
    await expect(done).resolves.toBeUndefined();
    expect(log).toEqual(["reset"]); // nothing after the aborted sleep — no popup ever showed
  });

  it("does not start an iteration on an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const { fx, log } = makeFake();
    await runDemoLoop(fx, controller.signal);
    expect(log).toEqual([]);
  });
});
