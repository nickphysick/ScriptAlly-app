/**
 * Query Centre v157 — the stylesheet's locks (qcv157.css). The rendered values are measured by
 * tests/e2e/qc157.measure.ts (QC157-1 … QC157-11).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGE_COLOURS } from "../../../lib/stageColours";

const css = readFileSync(resolve(__dirname, "qcv157.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** every rule body whose selector list is exactly `sel` (several blocks may share one, in different @-rules) */
const rules = (sel: string): string[] => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
};
const rule = (sel: string): string => rules(sel)[0] ?? "";
const OFFER = '.qc151.qc153 .qc154-card.qc154-card[data-tone="offer"] .qc154-hd.qc154-hd';

describe("v157 Phase 2 · the foil on an offer", () => {
  it("the band: the sheen at 30% 0 / 260% 100% over the Offer band, a 1px white inset, a .7s position transition", () => {
    const r = rule(OFFER);
    expect(r.replace(/\s+/g, " ")).toContain(
      "linear-gradient(112deg, rgba(255, 255, 255, 0) 22%, rgba(255, 255, 255, 0.5) 40%, rgba(255, 255, 255, 0.1) 52%, rgba(255, 255, 255, 0) 66%) 30% 0 / 260% 100% no-repeat, #8ea7c6;",
    );
    expect(r).toContain("box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5)");
    expect(r).toContain("transition: background-position 0.7s ease-out");
  });
  it("its hex is the table's Offer band", () => {
    expect(rule(OFFER)).toContain(STAGE_COLOURS.offer.band);
  });
  it("hovered or keyboard-focused it moves to 85% and stays: no animation, nothing loops", () => {
    expect(rule('.qc151.qc153 .qc154-card.qc154-card[data-tone="offer"]:is(:hover, :focus-visible) .qc154-hd.qc154-hd')).toMatch(/background-position:\s*85% 0/);
    expect(css).not.toMatch(/animation[^;]*infinite/);
  });
  it("under reduced motion there is no transition", () => {
    expect(rules(OFFER).some((r) => /transition:\s*none/.test(r))).toBe(true);
  });
  it("no other stage has it: the sheen is named on the offer tone only", () => {
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*linear-gradient\(112deg/g)) { expect(m[1]).toContain('[data-tone="offer"]'); expect(m[1]).not.toMatch(/data-tone="(queried|partial|full|closed)"/); }
  });
});
