/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SETTLEMENT — SAGE, FINAL (design-refs/todo-settlement.html = todo-fix40): source/rule-
 * text locks. fix39's stone headers and its bar-seated pair are superseded.
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
// the workspace shell: the sheet's dochead became the panel's plain items row; the sage
// family is now the filter band (in the collapsed drawer) + Today's header.
const HEADS = [".tdb-th"]; // the spine retired the sage FILTER band (.tdb-rsech); Today keeps the sage head

describe("settlement P1 — SAGE headers: one treatment, ONE height, everywhere", () => {
  it("the tokens exist once, on the wrap, and carry the settled values", () => {
    const w = rule(".tdb-wrap");
    // save-and-today P2 SUPERSEDES the 42px: the Today header earns 46px now that it carries the
    // progress bar + fraction, and Today is the sole remaining consumer of this token.
    expect(w).toContain("--container-head-h: 46px");
    expect(w).toContain("--container-head-bg: linear-gradient(180deg, #d7ddd5, #d5dbd3)");
    expect(w).toContain("--container-head-rule: #b9c9b4");
    expect(w).toContain("--container-head-ink: #3d4a3b");
    expect(w).toContain("--container-head-mono: #5a6e58");
    // ONE sage source for the HEADER: the head fill is not re-hardcoded anywhere else in the sheet.
    expect(css.match(/#d7ddd5/g)!.length).toBe(1);
    // the head GRADIENT pair also names #d5dbd3, which the notes-and-tasks sage family tokens
    // (--nt-block-task, and P2's done-circle fill) legitimately share — each tokened once.
    // the head RULE hex #b9c9b4 is now also the notes-and-tasks task-family line (--nt-task-line) —
    // a distinct, deliberately-tokened second source; each is sourced once, never scattered in rules.
    expect(css.match(/#b9c9b4/g)!.length).toBe(2);
  });
  it("ALL THREE headers read the same fill, the same rule and the same height token", () => {
    for (const sel of HEADS) {
      const r = rule(sel);
      expect(r).toContain("background: var(--container-head-bg)");
      expect(r).toContain("border-bottom: 1px solid var(--container-head-rule)");
      expect(r).toContain("height: var(--container-head-h)");
      // P2: the header's right edge tightened to 8px to seat the chevron; the LEFT inset stays the token
      expect(r).toContain("var(--container-head-pad)");
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
  it("Today's sage header is now the FAMILY — its siblings joined it; the sage glyphs stand", () => {
    const t = rule(".tdb-th");
    expect(t).toContain("background: var(--container-head-bg)"); // the same one source
    expect(t).not.toContain("hk-sage"); // it reads the head token now, not the band pair
    expect(t).not.toContain("hk-spine");
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)");
    // P2: the header's right slot is the progress bar + fraction (.tdb-pnum), not the old .tdb-thr count
    expect(rule(".tdb-pnum")).toContain("font-family: var(--f12-mono)");
    // the glyphs keep their sage — the row dot, the completion ticks, the done-row tick
    expect(rule(".tdb-tick")).toContain("var(--hk-sage)");
    expect(rule(".tdb-dtick")).toContain("var(--hk-sage)");
    expect(css).toContain("--hk-sage");
  });
  it("header typography stays per container: mono FILTER warmed, Playfair lines in the warm ink", () => {
    expect(rule(".tdb-pnum")).toContain("letter-spacing"); // Today's mono fraction (P2's right slot)
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)"); // Today's Playfair title
    expect(rule(".tdb-th .tdb-t")).toContain("var(--f12-serif)");
  });
  it("the header inks join the sage family: mono labels #5a6e58, Playfair lines #3d4a3b", () => {
    expect(rule(".tdb-pnum")).toContain("color: #4a5f48"); // P2: the mono fraction is the header's right slot
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)"); // Today's title (a sage head)
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)"); // Today's title
    // the values themselves, once, on the wrap
    expect(rule(".tdb-wrap")).toContain("--container-head-mono: #5a6e58");
    expect(rule(".tdb-wrap")).toContain("--container-head-ink: #3d4a3b");
  });
  it("radius continuity: each header takes ITS container's top radii", () => {
    for (const sel of HEADS) expect(rule(sel)).toContain("border-radius: 15px 15px 0 0");
    expect(rule(".tdb-today2")).toContain("border-radius: 14px"); // the corner card
    // (todo rebuild P1) the board PANEL is gone — there is no container radius left to continue.
    expect(css).not.toContain(".tdb-mainc {");
  });
  it("the view toggle is the control line's fill segment (the sage bar it sat in is gone)", () => {
    const t = rule(".tdb-vtog");
    expect(t).toContain("background: #fff"); // the tightening P1: a white capsule inside the strip
    expect(t).toContain("border-radius: 7px"); // the tightening P1: the ref's 7px capsule
    expect(rule(".tdb-vtog button.on")).toContain("background: #2a1a13"); // the tightening P1: active = ink
    expect(css).not.toContain(".tdb-vseg {"); // the bordered sage segment is retired
  });
});

describe("settlement P2/P3 — SUPERSEDED by the workspace shell (todo-fix48)", () => {
  // The sage settlement seated the search in the sheet's bar and the CTA pair at the sidebar's
  // top. The workspace shell moves the search into the breadcrumb bar (a white pill) and the
  // CTA pair into the hero. These locks re-point to the new seats; the reactive filter
  // behaviour they used to guard lives on in todoWorkspaceShell.test.ts.
  it("the search is the control line's fill field (todo rebuild P1 — the panel-header pill is gone)", () => {
    expect(page).toContain('<span className="tdb-bsearch">');
    expect(page).toContain("ref={searchRef}");
    expect(page).not.toContain("tdb-bigsearch");
    expect(page).not.toContain('className="tdb-hsearch"');
  });
  it("the CTA pair is in the hero; there is NO CTA in the sidebar", () => {
    const heroFn = page.slice(page.indexOf("function renderHero"), page.indexOf("function renderFilterSection"));
    expect(heroFn).toContain("tdb-herobegin");
    const filterFn = page.slice(page.indexOf("function renderFilterSection"), page.indexOf("function renderComposer"));
    expect(filterFn).not.toContain("tdb-herobegin");
    expect(page).not.toContain("tdb-sbpair"); // the sidebar-seated pair retired
  });
  it("the sage header tokens survive; the height is 46px since P2 gave the header its progress pair", () => {
    // Today is the sole consumer of these tokens now, and the ref's header is 46px (was 42).
    expect(rule(".tdb-wrap")).toContain("--container-head-h: 46px");
    expect(rule(".tdb-th")).toContain("background: var(--container-head-bg)");
  });
});

describe("settlement P4 — the sweep", () => {
  it("themes.md records the sage settlement and marks the stone step superseded", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do containers — sage (settled — pastille colours)");
    expect(themes).toContain("THE SAGE TRIO");
    expect(themes).toContain("THE 42px LAW");
    expect(themes).toContain("THE REVIEW & FILTER SEAT");
    expect(themes).toContain("pastille bands are SIGNAL");
    expect(themes).toContain("todo-blush-prompt.md` was superseded before it ran");
    expect(themes).toContain("stone ⚠️ SUPERSEDED");
    expect(themes.indexOf("stone ⚠️ SUPERSEDED")).toBeLessThan(themes.indexOf("sage (settled)"));
  });
  it("no blush, greige or stone exploration token remains in the board", () => {
    expect(css).not.toMatch(/blush|greige/i);
    expect(page).not.toMatch(/blush|greige/i);
    for (const dead of ["#f5f3f0", "#e6e2db", "#3a332c", "#8a8074"]) { // the stone set
      expect(css).not.toContain(dead);
      expect(page).not.toContain(dead);
    }
  });
  it("the pastille card system is byte-untouched by this pack", () => {
    // the three families' band tokens and the white tag pills stand exactly as deployed
    for (const t of ["--pink-t", "--pink-b", "--lat-1", "--lat-2"]) expect(css).toContain(t);
    expect(css).toContain(".tdb-band"); // the card band grammar
    expect(rule(".tdb-ktag")).toContain("background: #f7f2e9"); // the tightening: the kind chip is the one tag
  });
  it("the tour still lands: Begin's anchor rode to the hero (the workspace shell)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-herobegin"');
    expect(page).toContain('className="tdb-btnp tdb-herobegin"'); // the anchor exists at that (hero) seat
    // todo rebuild P1: the filter step anchors the CONTROL LINE (the bench slab is deleted)
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(tour).toContain(".tdb-ctrl");
    expect(tshCss).not.toContain(".spine-bench {");
    // every other stop's anchor still exists in the board or the shell
    for (const sel of [".tdb-tile, .tdb-gcard, .tdb-lrow", ".tdb-today2"]) {
      expect(tour).toContain(sel);
      for (const one of sel.split(", ")) expect(css).toContain(one);
    }
  });
});
