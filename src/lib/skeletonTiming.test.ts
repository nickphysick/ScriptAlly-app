/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The three timing paths the pack names, asserted against the rule rather than against a stopwatch.
 *
 * ⚠️ THE RULE IS TESTED, THE TIMERS ARE NOT — and that is the point of `skeletonShows` existing at
 * all. This repo's vitest runs in `node` with no jsdom and no testing-library, so a hook cannot be
 * rendered here; extracting the decision into a pure function is what makes the behaviour provable
 * instead of merely eyeballed. The hook is then locked at source to the helpers it must use, so it
 * cannot quietly grow a second, different opinion about when the skeleton is up.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SKELETON_DELAY_MS, SKELETON_MIN_MS, skeletonHold, skeletonShows, skeletonStep,
} from "./skeletonTiming";

const src = readFileSync(join(__dirname, "skeletonTiming.ts"), "utf8");

describe("skeletonTiming — the three paths", () => {
  it("PATH 1 · a fast resolve never shows it at all", () => {
    // Still waiting, but not long enough to admit to a wait.
    expect(skeletonShows({ loading: true, waited: 0, shownFor: null })).toBe(false);
    expect(skeletonShows({ loading: true, waited: 199, shownFor: null })).toBe(false);
    // Data lands at 150ms — the skeleton was never raised, so nothing can raise it now.
    expect(skeletonShows({ loading: false, waited: 150, shownFor: null })).toBe(false);
    // ⚠️ AND NOT EVEN LATER. A wait that resolved leaves `shownFor` null forever; a rule that
    // only checked `waited` would raise a skeleton over a page that had already rendered.
    expect(skeletonShows({ loading: false, waited: 5_000, shownFor: null })).toBe(false);
  });

  it("PATH 2 · shown, then data lands early — it holds the minimum", () => {
    expect(skeletonShows({ loading: true, waited: 200, shownFor: null })).toBe(true);
    // Data landed 30ms after it appeared: it stays, or we pay the flash the delay just bought off.
    expect(skeletonShows({ loading: false, waited: 230, shownFor: 30 })).toBe(true);
    expect(skeletonShows({ loading: false, waited: 599, shownFor: 399 })).toBe(true);
    // The minimum served, it goes — no extra hold beyond it.
    expect(skeletonShows({ loading: false, waited: 600, shownFor: SKELETON_MIN_MS })).toBe(false);
  });

  it("PATH 3 · a long wait keeps it until the data is ready, then releases at once", () => {
    expect(skeletonShows({ loading: true, waited: 5_000, shownFor: 4_800 })).toBe(true);
    // Past the minimum already, so the data landing releases it immediately — no residual hold.
    expect(skeletonShows({ loading: false, waited: 5_000, shownFor: 4_800 })).toBe(false);
    expect(skeletonHold(4_800)).toBe(0);
  });

  it("the boundaries are inclusive on the delay and exclusive on the minimum", () => {
    expect(skeletonShows({ loading: true, waited: SKELETON_DELAY_MS, shownFor: null })).toBe(true);
    expect(skeletonShows({ loading: true, waited: SKELETON_DELAY_MS - 1, shownFor: null })).toBe(false);
    expect(skeletonShows({ loading: false, waited: 0, shownFor: SKELETON_MIN_MS - 1 })).toBe(true);
    expect(skeletonShows({ loading: false, waited: 0, shownFor: SKELETON_MIN_MS })).toBe(false);
  });

  it("the hold counts down and never goes negative", () => {
    expect(skeletonHold(0)).toBe(SKELETON_MIN_MS);
    expect(skeletonHold(150)).toBe(SKELETON_MIN_MS - 150);
    expect(skeletonHold(SKELETON_MIN_MS)).toBe(0);
    expect(skeletonHold(SKELETON_MIN_MS + 10_000)).toBe(0);
  });

  it("⚠️ the two thresholds are the pack's, and a longer artificial hold was REJECTED", () => {
    expect(SKELETON_DELAY_MS).toBe(200);
    expect(SKELETON_MIN_MS).toBe(400);
    // A 1–2s hold is the thing this asserts against: measurably slower for no benefit.
    expect(SKELETON_MIN_MS).toBeLessThan(1_000);
  });
});

/**
 * ⚠️ THE THREE PATHS, DRIVEN — not asserted at source.
 *
 * `skeletonStep` is the whole of the hook's decision, so a stubbed clock can run the real timeline
 * through it and watch what happens. The loop below IS the hook's dispatcher: it arms a timer for
 * `wait`/`hold`, cancels a pending one whenever the input changes (which is precisely what the
 * effect's cleanup does), and applies `show`/`hide`. If the hook and this simulation ever disagree
 * about the shape of that dispatch, the source locks further down fail.
 */
function runTimeline(events: { at: number; loading: boolean }[], until: number) {
  let now = 0;
  let loading = events[0]!.loading;
  let shown = false;
  let shownAt: number | null = null;
  let timer: { at: number; fire: () => void } | null = null;
  const frames: { at: number; shown: boolean }[] = [];

  const plan = () => {
    timer = null;
    const step = skeletonStep({ loading, shown, shownFor: shownAt === null ? null : now - shownAt });
    if (step.kind === "wait") {
      timer = { at: now + step.ms, fire: () => { shownAt = now; shown = true; frames.push({ at: now, shown: true }); } };
    } else if (step.kind === "hold") {
      timer = { at: now + step.ms, fire: () => { shown = false; frames.push({ at: now, shown: false }); } };
    } else if (step.kind === "hide") {
      shown = false;
      frames.push({ at: now, shown: false });
    }
  };

  plan();
  for (let t = 1; t <= until; t++) {
    now = t;
    const ev = events.find((e) => e.at === t);
    // an input change re-runs the effect: the cleanup cancels any pending timer first
    if (ev) { loading = ev.loading; plan(); continue; }
    if (timer && timer.at === t) { timer.fire(); plan(); }
  }
  return { frames, endedShown: shown };
}

describe("the driver, run against a stubbed clock", () => {
  it("PATH 1 · resolves in 150ms → the skeleton never appears at all", () => {
    const { frames, endedShown } = runTimeline(
      [{ at: 0, loading: true }, { at: 150, loading: false }],
      2_000,
    );
    expect(frames).toEqual([]); // it was never raised, so there is nothing to take down
    expect(endedShown).toBe(false);
  });

  it("PATH 2 · resolves at 230ms → it appears at 200 and holds until 600", () => {
    const { frames, endedShown } = runTimeline(
      [{ at: 0, loading: true }, { at: 230, loading: false }],
      2_000,
    );
    expect(frames).toEqual([{ at: 200, shown: true }, { at: 600, shown: false }]);
    // 400ms on screen — the minimum, served exactly
    expect(frames[1]!.at - frames[0]!.at).toBe(SKELETON_MIN_MS);
    expect(endedShown).toBe(false);
  });

  it("PATH 3 · a 5s wait → it appears at 200, stays, and leaves the instant data lands", () => {
    const { frames, endedShown } = runTimeline(
      [{ at: 0, loading: true }, { at: 5_000, loading: false }],
      6_000,
    );
    expect(frames).toEqual([{ at: 200, shown: true }, { at: 5_000, shown: false }]);
    expect(endedShown).toBe(false);
  });

  /* ⚠️ THE MINIMUM RUNS FROM WHEN IT APPEARED, NOT FROM WHEN THE DATA LANDED — which is the only
     moment the reader can perceive. Data at 201ms leaves 399ms owed, so it goes at 600: exactly
     400ms on screen, the same as any other early resolve. Without the hold this is a 1ms flash,
     the precise fault the delay was paid to avoid. */
  it("⚠️ the boundary case the minimum exists for: data 1ms after it appeared", () => {
    const { frames } = runTimeline([{ at: 0, loading: true }, { at: 201, loading: false }], 2_000);
    expect(frames).toEqual([{ at: 200, shown: true }, { at: 600, shown: false }]);
    expect(frames[1]!.at - frames[0]!.at).toBe(SKELETON_MIN_MS);
  });

  it("data already in hand → nothing is ever armed", () => {
    expect(runTimeline([{ at: 0, loading: false }], 2_000).frames).toEqual([]);
  });
});

describe("useSkeleton is bound to the rule it implements", () => {
  it("dispatches over skeletonStep and holds no numbers of its own", () => {
    const hook = src.slice(src.indexOf("export function useSkeleton"));
    expect(hook).toContain("skeletonStep({");
    expect(hook).toContain("step.ms");
    // no second opinion about either threshold, spelled as a literal
    expect(hook).not.toMatch(/\b400\b/);
    expect(hook).not.toMatch(/\b200\b/);
  });

  it("⚠️ it handles every action the step can return — a missed case is a stuck skeleton", () => {
    const hook = src.slice(src.indexOf("export function useSkeleton"));
    for (const k of ["wait", "hold", "hide"]) expect(hook).toContain(`case "${k}"`);
    expect(hook).toContain("default:"); // "stay" and "idle" both mean leave it alone
  });

  it("⚠️ the moment it appeared is a REF — as state it would re-arm the timer every tick", () => {
    expect(src).toContain("const shownAt = useRef<number | null>(null)");
    expect(src).toMatch(/\}, \[loading, shown\]\);/);
  });

  it("⚠️ the pending show is CANCELLED on cleanup — that is what makes the fast path fast", () => {
    const hook = src.slice(src.indexOf("export function useSkeleton"));
    expect(hook).toContain("window.clearTimeout(id)");
  });
});
