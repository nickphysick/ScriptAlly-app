/**
 * Query card v160 — source locks for the card's motion (design-refs/query-card-v160/). The motion itself is measured
 * in tests/e2e/qc160.measure.ts; these hold the rules a reading can miss.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MOTION = read("./qcMotion160.ts");
const LANDING = read("./useLanding160.ts");
const CARD = read("./QcCard152.tsx");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Query card v160 · Phase 1 — the bump", () => {
  it("animates the frame's `scale` (1 → 1.022 at 35% → 1, 500ms), never `transform`", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/frame\.animate\(/);
    expect(fn).toMatch(/scale:/);
    expect(fn).not.toMatch(/transform/);
    expect(MOTION).toMatch(/ms: 500, peak: 1\.022, at: 0\.35, ease: "cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)"/);
  });
  it("a new bump ends the running one at once (they never stack), and nothing moves under reduced motion", () => {
    const fn = code(MOTION).match(/export function bump[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn.indexOf("reduced()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeGreaterThan(-1);
    expect(fn.indexOf(".cancel()")).toBeLessThan(fn.indexOf("frame.animate("));
  });
  it("the card bumps only on a landing's first change, on its own frame", () => {
    expect(CARD).toMatch(/useLanding160\(p\.motion, sig160, r\.id/);
    expect(code(CARD)).toMatch(/if \(first\) bump\(rootRef\.current\?\.closest<HTMLElement>\("\.spanel"\)/);
    expect(LANDING).toMatch(/p\.rId !== rId/);
  });
  it("no var() and no color-mix() in the motion", () => {
    for (const s of [MOTION, LANDING]) { expect(code(s)).not.toMatch(/var\(--/); expect(code(s)).not.toMatch(/color-mix\(/); }
  });
});
