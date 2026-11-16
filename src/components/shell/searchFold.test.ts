/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2 Phase 3 and v2.1 Phase 1 — when space runs short, search folds first, then the guide pill, and only then
 * may a tab lose its name (`planWithFolds`); the widths the fit reasons with are the CSS's own. The measured halves are
 * ST2-C2 (tests/e2e/shellTabsV2.measure.ts) and ST2.1-F1…F4 (tests/e2e/shellTabsV21.measure.ts).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { planWithFolds, SEARCH_W, SEARCH_FOLD_W, PILL_FOLD_W } from "./FolderTab";

const css = readFileSync("src/components/shell/inkShell.css", "utf8");
const rule = (sel: RegExp) => css.match(sel)?.[1] ?? "";

describe("planWithFolds — search folds first, then the pill, and only then a tab", () => {
  const rest = [100, 120, 90, 110, 130];
  const icon = [37, 37, 37, 37, 37];
  const whole = ["full", "full", "cur", "full", "full"];
  /* every tab named: 100+120+140+110+130 + 4×2 = 608 */
  it("folds nothing while every tab keeps its name beside the open field", () => {
    expect(planWithFolds(rest, icon, 2, 140, 58, [608, 738, 922])).toEqual({ modes: whole, level: 0 });
  });
  it("folds the field, and only the field, when that is what keeps the names", () => {
    expect(planWithFolds(rest, icon, 2, 140, 58, [607, 737, 921])).toEqual({ modes: whole, level: 1 });
  });
  it("folds the pill second, when the folded field alone is not enough", () => {
    expect(planWithFolds(rest, icon, 2, 140, 58, [400, 530, 608])).toEqual({ modes: whole, level: 2 });
  });
  it("falls back to icons from the right only once both have folded", () => {
    expect(planWithFolds(rest, icon, 2, 140, 58, [300, 430, 560])).toEqual({ modes: ["full", "full", "cur", "full", "ic"], level: 2 });
  });
  it("with no pill in the bar there is no second fold", () => {
    expect(planWithFolds(rest, icon, 2, 140, 58, [430, 560])).toEqual({ modes: ["full", "full", "cur", "full", "ic"], level: 1 });
  });
  it("unfolds in the reverse order as the room grows: the pill first, then the field", () => {
    /* one window widening: with both folded the strip has W; the open pill takes 184 of it, the open field 130 more */
    const at = (w: number) => planWithFolds(rest, icon, 2, 140, 58, [w - 184 - 130, w - 184, w]).level;
    expect([610, 700, 791, 792, 900, 921, 922].map(at)).toEqual([2, 2, 2, 1, 1, 1, 0]);
  });
});

describe("the widths the fit reasons with are the stylesheet's", () => {
  it("the open field is 168px and the folded one 38px", () => {
    expect(rule(/\n {2}\.ws-sfield \{[^}]*?\bwidth: (\d+)px;/)).toBe(String(SEARCH_W));
    expect(rule(/\.ws-pagebar \.ws-sfield\[data-fold\] \{[^}]*?\bwidth: (\d+)px;/)).toBe(String(SEARCH_FOLD_W));
  });
  it("folded, the field keeps nothing but its icon", () => {
    expect(css).toMatch(/\.ws-pagebar \.ws-sfield\[data-fold\] \.ws-sfield-l,\s*\.ws-pagebar \.ws-sfield\[data-fold\] \.ws-sfield-k \{ display: none; \}/);
  });
  it("the folded guide pill is 38px, square, with nothing but its ring", () => {
    const pill = css.match(/\.ws-pagebar \.ws-pageslot\[data-fold\] \.pck-pill \{([^}]*)\}/)?.[1] ?? "";
    expect(pill).toMatch(new RegExp(`width: ${PILL_FOLD_W}px; height: ${PILL_FOLD_W}px;`));
    expect(css).toMatch(/\.ws-pagebar \.ws-pageslot\[data-fold\] \.pck-pill \.pck-pt,\s*\.ws-pagebar \.ws-pageslot\[data-fold\] \.pck-pill \.pck-pn \{ display: none; \}/);
  });
});
