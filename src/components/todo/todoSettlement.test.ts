/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SETTLEMENT (design-refs/todo-settlement.html — the final board): source/rule-text locks.
 * The colour question is closed — the soft pastille card system is settled and untouched here;
 * this suite guards CONTAINER STRUCTURE and the hero's furniture only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
/** The three container headers, by their real selectors. */
const HEADS = [".tdb-rsech", ".tdb-dochead", ".tdb-th"];

describe("settlement P1 — stone headers: one treatment, ONE height, everywhere", () => {
  it("the tokens exist once, on the wrap, and carry the settled values", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--container-head-h: 36px");
    expect(w).toContain("--container-head-bg: #f5f3f0");
    expect(w).toContain("--container-head-rule: #e6e2db");
    expect(w).toContain("--container-head-ink: #3a332c");
    expect(w).toContain("--container-head-mono: #8a8074");
  });
  it("ALL THREE headers read the same fill, the same rule and the same height token", () => {
    for (const sel of HEADS) {
      const r = rule(sel);
      expect(r).toContain("background: var(--container-head-bg)");
      expect(r).toContain("border-bottom: 1px solid var(--container-head-rule)");
      expect(r).toContain("height: var(--container-head-h)");
      expect(r).toContain("padding: 0 var(--container-head-pad)");
      expect(r).toContain("box-sizing: border-box");
      expect(r).toContain("align-items: center"); // flex-centred, never baseline
    }
  });
  it("the heights are EQUAL because they are the same token — no padding-derived heights", () => {
    const hs = HEADS.map((s) => /height:\s*([^;]+);/.exec(rule(s))![1].trim());
    expect(new Set(hs).size).toBe(1);
    expect(hs[0]).toBe("var(--container-head-h)");
    // no vertical padding anywhere in the three
    for (const sel of HEADS) expect(rule(sel)).not.toMatch(/padding:\s*\d+px \d+px/);
  });
  it("Today's SAGE header is retired — and sage survives at glyph scale, untouched", () => {
    const t = rule(".tdb-th");
    expect(t).not.toContain("#d7ddd5");
    expect(t).not.toContain("hk-sage");
    expect(t).not.toContain("hk-spine");
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)");
    expect(rule(".tdb-th .tdb-thr")).toContain("color: var(--container-head-mono)");
    // the glyphs keep their sage — the row dot, the completion ticks, the done-row tick
    expect(rule(".tdb-tick")).toContain("var(--hk-sage)");
    expect(rule(".tdb-dtick")).toContain("var(--hk-sage)");
    expect(css).toContain("--hk-sage");
  });
  it("header typography stays per container: mono FILTER warmed, Playfair lines in the warm ink", () => {
    expect(rule(".tdb-rsech")).toContain("color: var(--container-head-mono)");
    expect(rule(".tdb-rsech")).toContain("var(--f12-mono)");
    expect(rule(".tdb-bartext")).toContain("color: var(--container-head-ink)");
    expect(rule(".tdb-bartext")).toContain("var(--f12-serif)");
    expect(rule(".tdb-th .tdb-t")).toContain("var(--f12-serif)");
  });
  it("radius continuity: each header takes ITS container's top radii", () => {
    for (const sel of HEADS) expect(rule(sel + (sel === ".tdb-rsech" ? ".fc1" : ""))).toContain("border-radius: 15px 15px 0 0");
    for (const c of [".tdb-mainc", ".tdb-today2", ".tdb-fbox"]) expect(rule(c)).toContain("border-radius: 16px");
  });
  it("the view toggle restyles onto stone; the active chip is unchanged", () => {
    const t = rule(".tdb-vseg");
    expect(t).toContain("background: rgba(255, 255, 255, 0.6)");
    expect(t).toContain("border: 1px solid var(--container-head-rule)");
    expect(t).toContain("height: 26px"); // inside the 36px bar
    const on = rule(".tdb-vseg button.on");
    expect(on).toContain("background: var(--white, #fff)");
    expect(on).toContain("border: 1px solid var(--ink)");
  });
});
