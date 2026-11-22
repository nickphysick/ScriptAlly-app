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

describe("v157 Phase 2 · the sheen on an offer (Stage colours v1: rose)", () => {
  it("the band: the sheen at 30% 0 / 260% 100% over the Offer band, a 1px white inset, a .7s position transition", () => {
    const r = rule(OFFER);
    expect(r.replace(/\s+/g, " ")).toContain(
      "linear-gradient(112deg, rgba(255, 255, 255, 0) 22%, rgba(255, 255, 255, 0.55) 40%, rgba(255, 255, 255, 0.12) 52%, rgba(255, 255, 255, 0) 66%) 30% 0 / 260% 100% no-repeat, #efcdc9;",
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

describe("v157 Phase 3 · the track reads on every band", () => {
  const v154 = readFileSync(resolve(__dirname, "qcv154.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const T = ".qc151.qc153 .qc154-card .qc153-trk:not(.is-ended)";
  it("no per-stage ink colours the card's track: --tink is gone and the card's track ink is #1c130f", () => {
    expect(v154).not.toContain("--tink");
    expect(v154).toMatch(/\.qc154-card \.qc153-trk \{ --ink: #1c130f;/);
  });
  it("a reached step and the current step ink; not yet reached and skipped ink at .42", () => {
    expect(rule(`${T} .qc153-nd.qc153-nd`)).toMatch(/color:\s*#1c130f/);
    expect(rule(`${T} .qc153-nd.qc153-nd--fut,\n  ${T} .qc153-nd.qc153-nd--skip`)).toMatch(/color:\s*rgba\(28, 19, 15, 0\.42\)/);
  });
  it("links: reached ink, not reached ink at .3, into a skipped step dotted ink at .5", () => {
    expect(rule(`${T} .qc153-ln.qc153-ln`)).toMatch(/background:\s*rgba\(28, 19, 15, 0\.3\)/);
    expect(rule(`${T} .qc153-ln.qc153-ln--done`)).toMatch(/background:\s*#1c130f/);
    expect(rule(`${T} .qc153-ln.qc153-ln--skip`)).toContain("repeating-linear-gradient(90deg, rgba(28, 19, 15, 0.5) 0 2px, transparent 2px 4px)");
  });
  it("a closed card's track keeps its grey: every colour rule is scoped to a track that has not ended", () => {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (/qc153-(nd|ln)/.test(m[1]) && !/qc153-arw/.test(m[1]) && /color|background/.test(m[2])) expect(m[1]).toContain(":not(.is-ended)");
  });
  it("the glyph in a step that is not current: 23px, 19px on the narrow card", () => {
    const all = rules(".qc151.qc153 .qc154-card .qc153-nd:not(.qc153-nd--cur) > span svg");
    expect(all).toHaveLength(2);
    expect(all[0]).toMatch(/width:\s*23px;\s*height:\s*23px/);
    expect(all[1]).toMatch(/width:\s*19px;\s*height:\s*19px/);
  });
});

describe("v157 Phase 4 · the Sent and Next boxes", () => {
  const v154 = readFileSync(resolve(__dirname, "qcv154.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("both boxes centre their contents top to bottom, at every card width (no container query undoes it)", () => {
    expect(rules(".qc151.qc153 .qc154-card.qc154-card .qc154-f.qc154-f")).toEqual([expect.stringMatching(/justify-content:\s*center/)]);
    expect(css).not.toMatch(/justify-content:\s*flex-start/);
  });
  it("a hot box is white with an inset 1.5px navy outline; the #f6eee8 fill goes", () => {
    const m = v154.match(/\.qc154-f\.is-hot, \.qc154-f\[data-state="over"\] \{([^}]*)\}/)?.[1] ?? "";
    expect(m).toMatch(/background:\s*#fff;/);
    expect(m).toContain("box-shadow: inset 0 0 0 1.5px #2a3a52");
    expect(v154).not.toContain("#f6eee8");
  });
  it("the navy dot after a hot value is removed, and nothing else draws one", () => {
    expect(v154).not.toMatch(/\.qc154-f[^{]*::after/);
    expect(css).not.toMatch(/\.qc154-f[^{]*::after/);
  });
  it("a box that is not hot keeps #fbf9f5 and no outline", () => {
    expect(v154).toMatch(/\.qc154-f \{[^}]*background: #fbf9f5;/);
    expect(v154.match(/\.qc154-f \{([^}]*)\}/)?.[1]).not.toContain("box-shadow");
  });
});
