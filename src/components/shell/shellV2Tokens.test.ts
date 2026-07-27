/**
 * Rule-text locks for the app-shell v2 chrome tokens (ref design-refs/scriptally-shell-v2.html;
 * the rollout pack's baked table wins where the mockup drifts — rail #2e2622). Asserts the two
 * token homes — index.css `--shell-*` custom properties and the designTokens.ts `shell*` JS
 * twins — BOTH carry the baked values, so the flagged duplication cannot drift.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dt from "../../lib/designTokens";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

const BAKED: Record<string, string> = {
  "--shell-rail": "#2e2622",
  "--shell-side": "#f1ebe4",
  "--shell-topbar": "#faf6f2",
  "--shell-canvas": "#faf6f2",
  "--shell-card": "#fdfaf5",
  "--shell-line": "#e3d9cf",
  "--shell-line-soft": "#ece3da",
  "--shell-side-edge": "rgba(124,58,42,.14)",
  "--shell-gutter": "16px",
  "--shell-group": "24px",
  "--shell-within": "8px",
  "--shell-card-pad": "12px",
  "--shell-ink": "#2e2723",
  "--shell-ink-soft": "#6a615a",
  "--shell-muted": "#9c8878",
  "--shell-inset": "#f2ede7",
};

describe("app-shell v2 tokens — index.css", () => {
  it("carries every baked value", () => {
    for (const [token, value] of Object.entries(BAKED)) {
      expect(css).toContain(`${token}: ${value}`);
    }
  });
});

describe("app-shell v2 tokens — designTokens.ts twins agree", () => {
  it("surfaces", () => {
    expect(dt.shellRail).toBe("#2e2622");
    expect(dt.shellSide).toBe("#f1ebe4");
    expect(dt.shellTopbar).toBe("#faf6f2");
    expect(dt.shellCanvas).toBe("#faf6f2");
    expect(dt.shellCard).toBe("#fdfaf5");
    expect(dt.shellLine).toBe("#e3d9cf");
    expect(dt.shellLineSoft).toBe("#ece3da");
    expect(dt.shellSideEdge).toBe("rgba(124,58,42,.14)");
    expect(dt.shellInk).toBe("#2e2723");
    expect(dt.shellInkSoft).toBe("#6a615a");
    expect(dt.shellMuted).toBe("#9c8878");
    expect(dt.shellInset).toBe("#f2ede7");
  });
  it("spacing scale", () => {
    expect(dt.shellGutter).toBe(16);
    expect(dt.shellGroup).toBe(24);
    expect(dt.shellWithin).toBe(8);
    expect(dt.shellCardPad).toBe(12);
  });
});
