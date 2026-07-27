/**
 * Rule-text locks for the app-shell CAPSULE tokens (ref design-refs/scriptally-capsule-shell.html
 * — supersedes the flat scheme and its canvas-lightness law). Asserts the two token homes —
 * index.css `--shell-*` and the designTokens.ts `shell*` JS twins — BOTH carry the baked values,
 * so the flagged duplication cannot drift; and locks the NEW depth law: one shared capsule
 * surface floating on a DARKER ground (depth is geometry, not tone steps between chrome).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dt from "../../lib/designTokens";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

const BAKED: Record<string, string> = {
  "--shell-ground": "#e7e0d5",
  "--shell-rail": "#fdfbf8",
  "--shell-side": "#fdfbf8",
  "--shell-topbar": "#fdfbf8",
  "--shell-canvas": "#fdfbf8",
  "--shell-card": "#fdfaf5",
  "--shell-panel": "#f2ede7",
  "--shell-inset": "#f2ede7",
  "--shell-line": "#e3d9cf",
  "--shell-line-soft": "#ece3da",
  "--shell-cap-radius": "20px",
  "--shell-cap-gap": "14px",
  "--shell-cap-shadow": "0 10px 30px rgba(58,28,20,.09)",
  "--shell-gutter": "16px",
  "--shell-group": "24px",
  "--shell-within": "8px",
  "--shell-card-pad": "12px",
  "--shell-ink": "#2e2723",
  "--shell-ink-soft": "#6a615a",
  "--shell-muted": "#9c8878",
};

describe("capsule tokens — index.css", () => {
  it("carries every baked value", () => {
    for (const [token, value] of Object.entries(BAKED)) {
      expect(css).toContain(`${token}: ${value}`);
    }
  });
  it("the flat scheme's dark rail and side edge are gone", () => {
    expect(css).not.toContain("#2e2622"); // the dark umber rail
    expect(css).not.toContain("--shell-side-edge");
  });
});

describe("capsule tokens — designTokens.ts twins agree", () => {
  it("surfaces + fills", () => {
    expect(dt.shellGround).toBe("#e7e0d5");
    expect(dt.shellRail).toBe("#fdfbf8");
    expect(dt.shellSide).toBe("#fdfbf8");
    expect(dt.shellTopbar).toBe("#fdfbf8");
    expect(dt.shellCanvas).toBe("#fdfbf8");
    expect(dt.shellCard).toBe("#fdfaf5");
    expect(dt.shellPanel).toBe("#f2ede7");
    expect(dt.shellInset).toBe("#f2ede7");
    expect(dt.shellLine).toBe("#e3d9cf");
    expect(dt.shellLineSoft).toBe("#ece3da");
    expect(dt.shellInk).toBe("#2e2723");
    expect(dt.shellInkSoft).toBe("#6a615a");
    expect(dt.shellMuted).toBe("#9c8878");
  });
  it("capsule geometry", () => {
    expect(dt.shellCapRadius).toBe(20);
    expect(dt.shellCapGap).toBe(14);
    expect(dt.shellCapShadow).toBe("0 10px 30px rgba(58,28,20,.09)");
  });
  it("spacing scale", () => {
    expect(dt.shellGutter).toBe(16);
    expect(dt.shellGroup).toBe(24);
    expect(dt.shellWithin).toBe(8);
    expect(dt.shellCardPad).toBe(12);
  });
});

/** Relative luminance of a #rrggbb hex (an ordering lock, not colour science). */
const lum = (hex: string): number => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("the capsule depth law — paper on ground, one chrome surface", () => {
  it("the ground is DARKER than the capsule surface (depth by geometry, not tone steps)", () => {
    expect(lum(dt.shellGround)).toBeLessThan(lum(dt.shellCanvas));
  });
  it("rail, panel, top bar and content plane share ONE surface", () => {
    expect(dt.shellRail).toBe(dt.shellCanvas);
    expect(dt.shellSide).toBe(dt.shellCanvas);
    expect(dt.shellTopbar).toBe(dt.shellCanvas);
  });
  it("the interior fill sits between capsule surface and ground", () => {
    expect(lum(dt.shellInset)).toBeLessThan(lum(dt.shellCanvas));
    expect(lum(dt.shellInset)).toBeGreaterThan(lum(dt.shellGround));
  });
});
