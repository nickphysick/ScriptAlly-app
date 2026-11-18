/**
 * Query card v158.1 (design-refs/query-card-v158-1/query-card-v158-1.html) — the source halves of the QC1581 locks;
 * the measured halves are tests/e2e/qc1581.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("QC1581-1 (source) the one-row footer cannot spill", () => {
  it("the pill grows with its words: min-height 52px, 8px above and below; no fixed height", () => {
    const r = css("qcv152card.css").match(/\.qc152 \.qc152-rf \{([^}]*)\}/)?.[1] ?? "";
    expect(r).toContain("min-height: 52px");
    expect(r).toContain("padding: 8px 16px 8px 10px");
    expect(r).not.toMatch(/(^|;)\s*height: 52px/);
  });
  it("its lines wrap and are never clipped", () => {
    const c = css("qcv152card.css");
    expect(c).toMatch(/\.qc152 \.qc152-rf b \{[^}]*white-space: normal; overflow: visible;/);
    expect(c).toMatch(/\.qc152 \.qc152-rft span \{[^}]*white-space: normal; overflow: visible;/);
    expect(c + css("qcv1522card.css")).not.toMatch(/\.qc152-rft (span|b) \{[^}]*text-overflow: ellipsis/);
  });
});
