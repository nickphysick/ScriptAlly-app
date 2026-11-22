/**
 * Query Centre v156.1 — the stylesheet's locks (qcv1561.css). The rendered values are measured by
 * tests/e2e/qc1561.measure.ts (W2 the boxes, W3 the chip).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "qcv1561.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string): string => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

describe("v156.1 §2 · the Sent and Next boxes line up", () => {
  it("the row stretches its two boxes to one height", () => {
    expect(rule(".qc151.qc153 .qc154-card .qc154-fx.qc154-fx")).toMatch(/align-items:\s*stretch/);
  });
  it("both boxes: one padding (10 12 11), 86px at least, their lines stacked 2px apart", () => {
    const r = rule(".qc151.qc153 .qc154-card .qc154-f.qc154-f");
    expect(r).toMatch(/padding:\s*10px 12px 11px/);
    expect(r).toMatch(/min-height:\s*86px/);
    expect(r).toMatch(/display:\s*flex;\s*flex-direction:\s*column;\s*gap:\s*2px/);
  });
  it("the value carries no margin of its own (the gap spaces it); the progress bar has 5px above (2 gap + 3)", () => {
    expect(rule(".qc151.qc153 .qc154-card .qc154-f.qc154-f > b")).toMatch(/margin-top:\s*0/);
    expect(rule(".qc151.qc153 .qc154-card .qc154-f .qc154-bar.qc154-bar")).toMatch(/margin:\s*3px 0 0/);
  });
  it("the narrow card keeps 8px at the sides (the same for both boxes) so no value is cut short", () => {
    expect(css).toMatch(/@container \(max-width: 380px\)\s*\{\s*\.qc151\.qc153 \.qc154-card \.qc154-f\.qc154-f\s*\{\s*padding:\s*10px 8px 11px/);
  });
});
