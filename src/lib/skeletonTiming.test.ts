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
  SKELETON_DELAY_MS, SKELETON_MIN_MS, skeletonHold, skeletonShows,
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

describe("useSkeleton is bound to the rule it implements", () => {
  it("drives off the shared constants and helper, never its own numbers", () => {
    const hook = src.slice(src.indexOf("export function useSkeleton"));
    expect(hook).toContain("SKELETON_DELAY_MS");
    expect(hook).toContain("skeletonHold(");
    // No second opinion about the minimum, spelled as a literal.
    expect(hook).not.toMatch(/\b400\b/);
    expect(hook).not.toMatch(/\b200\b/);
  });

  it("⚠️ the moment it appeared is a REF — as state it would re-arm the timer every tick", () => {
    expect(src).toContain("const shownAt = useRef<number | null>(null)");
    expect(src).toMatch(/\}, \[loading, shown\]\);/);
  });

  it("a skeleton that never appeared cannot appear once the data has landed", () => {
    const hook = src.slice(src.indexOf("export function useSkeleton"));
    expect(hook).toContain("if (!shown) return;");
  });
});
