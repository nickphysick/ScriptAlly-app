/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §1.3 — the accent, its derived three, and the resting values the stylesheet states.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BE_ACCENT, BE_DARK_BELOW, beAccent, luminance } from "./beAccent";

const css = readFileSync(join(process.cwd(), "src/components/queries/centre/qcvPage.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("§1.3 · the Birds-eye accent", () => {
  it("the delivered accent is blush, and it takes INK text", () => {
    expect(BE_ACCENT).toBe("#e9c9b8");
    const a = beAccent();
    expect(a.dark).toBe(false);
    expect(a.ink).toBe("#1c130f");
    expect(a.mute).toBe("rgba(28, 19, 15, 0.62)");
    expect(a.soft).toBe("rgba(28, 19, 15, 0.07)");
  });
  /**
   * ⚠️ THE STYLESHEET'S FOUR ARE ASSERTED AGAINST THE FUNCTION, NEVER AGAINST LITERALS ON BOTH
   * SIDES. They are the resting values so the first painted frame is right; the moment they are a
   * second source of truth, an accent change leaves the page painting the old one until somebody
   * notices. Two derivations against each other, which is the only form that cannot drift.
   */
  it("the sheet's resting values ARE the derivation's output", () => {
    const a = beAccent();
    const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    expect(root).toContain(`--be-accent: ${a.accent};`);
    expect(root).toContain(`--be-ink: ${a.ink};`);
    expect(root).toContain(`--be-mute: ${a.mute};`);
    expect(root).toContain(`--be-soft: ${a.soft};`);
  });
  it("⚠️ a DARK accent flips to cream — the whole point of deriving it", () => {
    const d = beAccent("#2a3a52");
    expect(d.dark).toBe(true);
    expect(d.ink).toBe("#f5f1eb");
    expect(d.mute).toBe("rgba(245, 241, 235, 0.72)");
    expect(d.soft).toBe("rgba(245, 241, 235, 0.14)");
  });
  it("the threshold is the mock's .36, not the usual half", () => {
    expect(BE_DARK_BELOW).toBe(0.36);
    /* a mid blush sits above it and still wants ink; a navy sits below and wants cream */
    expect(luminance("#e9c9b8")).toBeGreaterThan(BE_DARK_BELOW);
    expect(luminance("#2a3a52")).toBeLessThan(BE_DARK_BELOW);
    /* and the cut really is below the midpoint — at .5 this palette would flip the wrong way */
    expect(BE_DARK_BELOW).toBeLessThan(0.5);
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });
});
