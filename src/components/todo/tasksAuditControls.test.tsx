/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Button and control laws (tasks-audit pack, Phase 3): the disabled grammar, one control height
 * per tool row, and TAGS swatches in the FILTERS' filled-dot grammar.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const layoutCss = readFileSync(join(here, "tasksLayout.css"), "utf8");
const todayPage = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const side = readFileSync(join(here, "TodoSideContainer.tsx"), "utf8");

describe("⚠️ 'Work the list' — disabled grammar at zero, ink primary with one committed", () => {
  it("the disabled rule is the house grammar: paper fill, hairline, faint text, not-allowed", () => {
    const i = layoutCss.indexOf(".tpl-tools button[disabled]");
    expect(i).toBeGreaterThan(-1);
    const rule = layoutCss.slice(i, layoutCss.indexOf("}", i));
    expect(rule).toContain("background: #faf7f1");
    expect(rule).toContain("border: 1px solid #e8dfd1");
    expect(rule).toContain("color: #b3a394");
    expect(rule).toContain("cursor: not-allowed");
    // never opacity-only
    expect(rule).not.toContain("opacity");
  });

  it("the ENABLED state is the ink primary — and disabling is the zero-committed condition", () => {
    expect(todayPage).toContain('className="tdb-btnp tdt-work"');
    expect(todayPage).toContain("disabled={committed.length === 0}");
  });

  it("the attribute selector outweighs the ink fill — the grammar wins on a disabled primary", () => {
    /* Specificity, stated: .tpl-tools button[disabled] = (0,2,1) beats .tdb-btnp = (0,1,0),
       so the paper fill replaces the ink even though .tdb-btnp paints its own background. */
    expect(layoutCss).toContain(".tpl-tools button[disabled]");
  });
});

describe("⚠️ one control height across the tool row — nothing renders as a taller block", () => {
  it("the ink primary takes the row's 34px step (it is 42px on the board's own surfaces)", () => {
    const i = layoutCss.indexOf(".tpl-tools .tdb-btnp");
    expect(i).toBeGreaterThan(-1);
    const rule = layoutCss.slice(i, layoutCss.indexOf("}", i));
    expect(rule).toContain("height: 34px");
  });

  it("…matching the pink Add's own 34px grammar", () => {
    const todoCss = readFileSync(join(here, "todo.css"), "utf8");
    const i = todoCss.indexOf(".tdb-ghb, .tdb-addb {");
    const rule = todoCss.slice(i, todoCss.indexOf("}", i));
    expect(rule).toContain("height: 34px");
  });
});

describe("⚠️ TAGS swatches wear the FILTERS grammar — filled dots, never outlined rings", () => {
  it("the tag row's dot is a SOLID fill in the tag's strong tone, with no border", () => {
    const i = side.indexOf('className="tds-sw" style={{ background: TAG_PALETTE[t.colour].tx }}');
    expect(i).toBeGreaterThan(-1);
    // the outlined-ring form is extinct
    expect(side).not.toContain("border: `1px solid ${TAG_PALETTE");
  });

  it("…the same .tds-sw element the FILTERS rows use — one dot class, one grammar", () => {
    expect((side.match(/className="tds-sw"/g) ?? []).length).toBe(2); // FILTERS row + TAGS row
  });
});
