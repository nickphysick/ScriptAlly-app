/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The cover's timing — first-frame on, ~500ms held, 250ms dissolve.
 *
 * ⚠️ THE 200ms FAST-PATH DELAY IS DELETED, AND ITS ABSENCE IS THE FIRST THING LOCKED. That delay
 * meant the cover never mounted on a warm Firestore load (cache resolves under 200ms), so the
 * user's whole loading experience was the OTHER skeleton system — the instant per-card `.isload`
 * bars — snapping to content in one frame. Three successive fixes to this module's reveal changed
 * nothing on screen because nothing in this module was on screen. The full account is in
 * skeletonTiming.ts; the lock here is that no delay constant and no "wait" machinery return.
 *
 * ⚠️ BEHAVIOUR IS TESTED THROUGH THE PURE PARTS AND THE SOURCE ONLY WHERE SOURCE IS THE CLAIM.
 * This repo's vitest is node-only (no jsdom), so the hook cannot be rendered here — but the last
 * regression in this file taught the sharper lesson: a source lock that quotes an expression
 * passes while the expression is wrong. Where these tests read source, they assert PROPERTIES
 * (one state, no derived phase), which were each verified RED against the fault they guard.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKELETON_FADE_MS, SKELETON_MIN_MS, SKELETON_SETTLE_MS, skeletonHold } from "./skeletonTiming";

const src = readFileSync(join(__dirname, "skeletonTiming.ts"), "utf8");
const hook = src.slice(src.indexOf("export function useSkeleton"));
const css = readFileSync(
  join(__dirname, "../components/dashboard/oneScreen.css"),
  "utf8",
);

describe("the constants, and the one that must never return", () => {
  it("the cover holds ~half a second and dissolves in a standard beat", () => {
    expect(SKELETON_MIN_MS).toBe(500);
    expect(SKELETON_FADE_MS).toBe(250);
  });

  /* ⚠️ THE SETTLE BEAT — measured, not chosen. Fading in the same breath as the data put the
     populated page's arrival work (a ~200ms main-thread stall in the trace) in the MIDDLE of the
     dissolve. The beat keeps that jank under the opaque cover; the fade then starts on a quiet
     thread. Long enough to absorb the measured stall's onset, short enough not to read as a wait. */
  it("⚠️ the cover always outlives `loading` by the settle beat", () => {
    expect(SKELETON_SETTLE_MS).toBe(200);
    expect(hook).toContain("Math.max(\n      SKELETON_SETTLE_MS,");
    // never an immediate "out" on data — the beat is a floor, not a fallback
    expect(hook.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")).not.toMatch(/owed === 0/);
  });

  it("⚠️ no delay constant, no 'wait' action, no shows/step machinery — the delay is DELETED", () => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ""); // the history is ALLOWED to name the dead
    expect(code).not.toContain("SKELETON_DELAY_MS");
    expect(code).not.toContain("skeletonShows");
    expect(code).not.toContain("skeletonStep");
    expect(code).not.toContain('"wait"');
  });

  it("⚠️ the CSS dissolve and SKELETON_FADE_MS are the same number — hook unmount meets fade end", () => {
    expect(css).toContain(`transition: opacity ${SKELETON_FADE_MS}ms ease`);
  });
});

describe("the hold — the only arithmetic left", () => {
  it("counts down from the minimum and never goes negative", () => {
    expect(skeletonHold(0)).toBe(SKELETON_MIN_MS);
    expect(skeletonHold(200)).toBe(SKELETON_MIN_MS - 200);
    expect(skeletonHold(SKELETON_MIN_MS)).toBe(0);
    expect(skeletonHold(SKELETON_MIN_MS + 10_000)).toBe(0);
  });
});

describe("the driver's three properties, each verified red against its fault", () => {
  /* ⚠️ FIRST-FRAME COVER: the phase is INITIALISED from `loading`, never raised by an effect. An
     effect runs after the first paint, so a cover it raises is one frame late — one frame of the
     per-card bars, the exact flash this module exists to remove. */
  it("⚠️ the cover is in the FIRST render — phase initialised from the prop", () => {
    expect(hook).toContain('useState<SkeletonPhase>(loading ? "on" : "off")');
    expect(hook).toContain("useRef(loading)");
  });

  /* ⚠️ ONE PHASE STATE: a previous version derived the phase from two booleans set in different
     updates, and for the render between them the derivation answered "off" — the element
     unmounted, re-mounted transparent, and the "fade" was invisible. It shipped. */
  it("⚠️ ONE phase state — never derived from two booleans that can disagree for a render", () => {
    expect(hook.match(/useState/g) ?? []).toHaveLength(1);
    expect(hook).toContain("return { phase, wasShown: everShown.current };");
    expect(hook).not.toMatch(/phase:\s*\w+\s*\?/);
    expect(hook).not.toContain("setLeaving");
  });

  /* ⚠️ MOUNTED THROUGH THE DISSOLVE: "on" goes to "out", and only the fade's own timer may reach
     "off" — so the element is still mounted, still opaque, when the fade class lands. */
  it('⚠️ data landing goes straight to "out"; only the fade timer ends in "off"', () => {
    expect(hook).toContain('setPhase("out")');
    expect(hook.match(/setPhase\("off"\)/g) ?? []).toHaveLength(1);
    expect(hook).toContain('if (phase !== "out") return;');
    expect(hook).toContain("SKELETON_FADE_MS");
  });

  it("the minimum is measured from when the cover appeared, through the shared hold", () => {
    expect(hook).toContain("skeletonHold(");
    expect(hook).toContain("shownAt.current");
    // no second opinion about either threshold, spelled as a literal
    expect(hook).not.toMatch(/\b500\b/);
    expect(hook).not.toMatch(/\b250\b/);
  });

  it("⚠️ wasShown is sticky — a refetch raises the cover again but never the stagger", () => {
    expect(hook).toContain("everShown.current = true");
    expect(hook).not.toContain("everShown.current = false");
  });
});
