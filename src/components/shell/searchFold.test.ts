/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2, Phase 3 — when space runs short, search folds first (`planWithFold`), and the two widths the fit
 * reasons with are the CSS's own. The measured half (no tab cut or overlapped at 1100) is ST2-C2 in
 * tests/e2e/shellTabsV2.measure.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { planWithFold, SEARCH_W, SEARCH_FOLD_W } from "./FolderTab";

const css = readFileSync("src/components/shell/inkShell.css", "utf8");
const rule = (sel: RegExp) => css.match(sel)?.[1] ?? "";

describe("planWithFold — the search folds before any tab loses its name", () => {
  const rest = [100, 120, 90, 110, 130];
  const icon = [37, 37, 37, 37, 37];
  /* every tab named: 100+120+140+110+130 + 4×2 = 608 */
  it("does not fold while every tab keeps its name beside the open field", () => {
    expect(planWithFold(rest, icon, 2, 140, 58, 608, 738)).toEqual({ modes: ["full", "full", "cur", "full", "full"], folded: false });
  });
  it("folds the field, and only the field, when that is what keeps the names", () => {
    expect(planWithFold(rest, icon, 2, 140, 58, 607, 737)).toEqual({ modes: ["full", "full", "cur", "full", "full"], folded: true });
  });
  it("still folds, then falls back to icons from the right, when even the folded room is short", () => {
    expect(planWithFold(rest, icon, 2, 140, 58, 430, 560)).toEqual({ modes: ["full", "full", "cur", "full", "ic"], folded: true });
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
});
