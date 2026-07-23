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

describe("settlement P2 — the search, grown, and the clearance band", () => {
  it("one step up: 460 × 46, font 13, and the responsive floor kept", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-search-w: 460px");
    expect(w).toContain("--tdb-search-h: 46px");
    const bs = rule(".tdb-bigsearch");
    expect(bs).toContain("width: var(--tdb-search-w)");
    expect(bs).toContain("height: var(--tdb-search-h)");
    expect(bs).toContain("font-size: 13px");
    expect(bs).toContain("max-width: calc(100vw - 2 * var(--tdb-edge))"); // the floor: it never overruns the gutter
    expect(rule(".tdb-bigsearch input")).toContain("font-size: 13px");
  });
  it("the mag roundel scales with it (32px), placement and behaviour unchanged", () => {
    const m = rule(".tdb-mag");
    expect(m).toContain("width: 32px");
    expect(m).toContain("height: 32px");
    expect(m).toContain("margin-left: auto"); // still the right-hand glass
    expect(page).toContain('placeholder="Search"');
    expect(page).toContain("ref={searchRef}"); // ⌘K still lands here
  });
  it("THE CLEARANCE: ≥40px of clear ground below the pill, as a token, at every tier", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-search-clear: 40px");
    expect(rule(".tdb-srchrow")).toContain("margin: 20px 0 var(--tdb-search-clear)");
    // it is the ROW's own bottom margin — no child can collapse through it — and NOTHING
    // redefines it or the token anywhere else in the sheet, so it holds at every width tier
    expect(css.match(/--tdb-search-clear:/g)!.length).toBe(1);
    expect(css.match(/\n\.tdb-srchrow \{/g)!.length).toBe(1);
    expect(css.match(/\.tdb-srchrow\s*\{[^}]*margin:/g)!.length).toBe(1);
  });
  it("the v9 sub-slot spacing law still holds with the taller pill", () => {
    const slot = rule(".tdb-srchrow");
    expect(slot).toContain("min-height: var(--tdb-search-h)"); // the slot tracks the pill exactly
    expect(slot).toContain("position: relative"); // the single crossfading occupant rides it
    expect(rule(".tdb-heroslot")).toContain("position: absolute; inset: 0");
    // the session's region is MEASURED from the row's real bottom, so a taller pill just moves it
    const ss = readFileSync(join(here, "FocusedSession.tsx"), "utf8");
    expect(ss).toContain("const region = sessionRegion(sr ? sr.bottom : slotTop + 30, window.innerHeight);");
  });
});
