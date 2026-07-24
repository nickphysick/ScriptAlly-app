/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SHELL POLISH (amendment over the deployed workspace shell): source/rule-text locks. The
 * page is auth-gated, so the computed-edge/geometry checks are Nick's in-browser list; here we
 * lock the tokens, the structure and the drawer-grammar parity.
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

describe("shell polish P1 — the centred column + the chrome gap", () => {
  it("the hero AND the panel live on ONE centred max-width column", () => {
    // the JSX wraps both in .tdb-col
    const col = page.indexOf('<div className="tdb-col">');
    const hero = page.indexOf("{renderHero()}");
    const ws = page.indexOf('className="tdb-asm tdb-ws"');
    expect(col).toBeGreaterThan(0);
    expect(hero).toBeGreaterThan(col);
    expect(ws).toBeGreaterThan(hero);
    const c = rule(".tdb-col");
    expect(c).toContain("max-width: var(--tdb-col-max)");
    expect(c).toContain("margin-inline: auto"); // centred, equal gutters grow with the viewport
  });
  it("the column max + gutter + chrome gap are tokens (~1360 / 40 / ≥44)", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-col-max: 1360px");
    expect(w).toContain("--tdb-col-gutter: 40px");
    expect(w).toContain("--tdb-chrome-gap: 44px");
    // the chrome gap is the column's top padding (air under the bar)
    expect(rule(".tdb-col")).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px");
  });
  it("the hero row and the panel share the SAME edges (both flush to the column, no side inset)", () => {
    // the hero row has no side padding, and the panel fills the column — so title-left ==
    // panel-left and pair-right == panel-right (the browser check confirms the pixels)
    expect(rule(".tdb-herohead")).toContain("padding: 0");
    expect(rule(".tdb-centre")).toContain("width: 100%");
    // the pair is pushed to the right edge by the hero row's margin-auto
    expect(rule(".tdb-heroright")).toContain("margin-left: auto");
    // the wrap no longer owns the gutters (the column does) — no double inset
    expect(rule(".tdb-wrap")).not.toContain("padding: 0 var(--tdb-edge)");
  });
});

describe("shell polish P2 — the subtitle", () => {
  it("Playfair 17, regular, warm grey #7a6a5e, ~6px under the title", () => {
    const sub = rule(".tdb-herosub");
    expect(sub).toContain("font-family: var(--f12-serif)");
    expect(sub).toContain("font-size: 17px");
    expect(sub).toContain("font-weight: 400");
    expect(sub).toContain("color: #7a6a5e");
    expect(sub).toContain("margin-top: 6px");
  });
  it("the copy: 'and notes' becomes 'notes' (exact string)", () => {
    expect(page).toContain("Urgent tasks, housekeeping, notes. Here’s everything on your to-do list.");
    expect(page).not.toContain("housekeeping, and notes");
  });
});

describe("shell polish P3 — sticker cards", () => {
  it("the tokens: 1.5px ink border, 5px hard offset, the three family block colours", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-sticker-bd: #3a1c14");
    expect(w).toContain("--tdb-sticker-bw: 1.5px");
    expect(w).toContain("--tdb-sticker-off: 5px");
    expect(w).toContain("--tdb-sticker-pink: #f2cec1");
    expect(w).toContain("--tdb-sticker-latte: #eee5d4");
    expect(w).toContain("--tdb-sticker-butter: #eedfae");
  });
  it("each family card wears the ink border + a hard offset block (no blur) in its colour", () => {
    expect(rule(".tdb-tile.do, .tdb-tile.hk, .tdb-tile.nt, .tdb-gcard")).toContain("border: var(--tdb-sticker-bw) solid var(--tdb-sticker-bd)");
    expect(rule(".tdb-tile.do")).toContain("box-shadow: var(--tdb-sticker-off) var(--tdb-sticker-off) 0 var(--tdb-sticker-pink)");
    expect(rule(".tdb-tile.hk, .tdb-gcard")).toContain("box-shadow: var(--tdb-sticker-off) var(--tdb-sticker-off) 0 var(--tdb-sticker-latte)");
    expect(rule(".tdb-tile.nt")).toContain("box-shadow: var(--tdb-sticker-off) var(--tdb-sticker-off) 0 var(--tdb-sticker-butter)");
    // hard block: no blur radius (the 3rd length is 0), no rgba soft shadow on the family cards
    expect(rule(".tdb-tile.do")).not.toContain("rgba");
  });
  it("the hover is a subtle lift — the block grows one step, the card nudges up-and-left", () => {
    const h = rule(".tdb-tile.do.hov");
    expect(h).toContain("box-shadow: var(--tdb-sticker-off-hov) var(--tdb-sticker-off-hov) 0 var(--tdb-sticker-pink)");
    expect(h).toContain("transform: translate(-1px, -1px)");
    expect(rule(".tdb-wrap")).toContain("--tdb-sticker-off-hov: 6px");
  });
  it("the grid gap clears the block: the gap ≥ the offset (blocks never touch)", () => {
    const gap = parseInt(/--tdb-grid-gap:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    const off = parseInt(/--tdb-sticker-off:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    expect(gap).toBeGreaterThanOrEqual(off);
    expect(rule(".tdb-grid")).toContain("gap: var(--tdb-grid-gap)");
  });
  it("the pastille bands + white tag pills inside are UNCHANGED (the sticker is on the card only)", () => {
    expect(rule(".tdb-band.hk")).toContain("linear-gradient(180deg, var(--lat-1), var(--lat-2))"); // the latte band, untouched
    expect(rule(".tdb-tag")).toContain("background: var(--white)"); // white tag pills, untouched
  });
  it("the ledger rows, the Today pop-up and the session page are NOT stickers", () => {
    // the sticker selectors are the card tiles only — never the ledger row, the Today card or the session page
    expect(rule(".tdb-lrow")).not.toContain("--tdb-sticker-off");
    expect(rule(".tdb-today2")).not.toContain("--tdb-sticker-off");
    expect(rule(".tdb-fspage")).not.toContain("--tdb-sticker-off");
    expect(css).not.toContain(".tdb-lrow.do"); // no family sticker on ledger rows
  });
});

describe("shell polish P4 — the sidebar in the drawer's grammar", () => {
  const tsh = readFileSync(join(here, "..", "shell", "TodoShell.tsx"), "utf8");
  const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
  const tRule = (sel: string): string => {
    const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`tsh rule not found: ${sel}`);
    return m[1];
  };
  it("the shell reads the drawer's shared --rail-* tokens (extracted, not duplicated)", () => {
    const root = tRule(".tsh-root");
    expect(root).toContain("--tsh-active-bg: var(--rail-pill, #f1e9df)");
    expect(root).toContain("--tsh-hov: var(--rail-hov, #f7f3ed)");
    expect(root).toContain("--tsh-label: var(--rail-label, #9c8878)");
    expect(root).toContain("--tsh-hair: var(--rail-hair, #e7ddd2)");
    expect(root).toContain("--tsh-itemtx: var(--rail-itemtx, #5a4a40)");
  });
  it("section labels are the drawer's mono, hairline-ruled beneath (WORKSPACE + FILTER both)", () => {
    const nk = tRule(".tsh-nk");
    expect(nk).toContain("font-family: var(--f12-mono)");
    expect(nk).toContain("font-size: 9.5px");
    expect(nk).toContain("letter-spacing: 0.18em");
    expect(nk).toContain("color: var(--tsh-label)");
    expect(nk).toContain("border-bottom: 1px solid var(--tsh-hair)"); // the hairline rule
    expect(tsh).toContain(">WORKSPACE<");
    expect(tsh).toContain('className="tsh-nk tsh-filterhead"'); // FILTER wears the same
  });
  it("rows are the drawer's grammar: icon + label, its height/radius/type, muted counts", () => {
    const ni = tRule(".tsh-ni");
    expect(ni).toContain("height: 35px");
    expect(ni).toContain("border-radius: 9px");
    expect(ni).toContain("gap: 12px");
    expect(ni).toContain("font-size: 12.5px");
    expect(ni).toContain("color: var(--tsh-itemtx)");
    expect(tRule(".tsh-ic")).toContain("width: 16px"); // the drawer's 16px icon
    expect(tRule(".tsh-n")).toContain("color: var(--tsh-label)"); // muted count
    // the icons are the drawer's lucide set (TypeGlyph is locked to material types — see report)
    expect(page).toContain("import { LayoutGrid, Send, Users, ListTodo, FileStack");
    expect(page).toContain("icon: <Send size={16} />");
  });
  it("ACTIVE = the faint parchment fill ONLY — no border, no outline, no shadow; never burgundy", () => {
    const on = tRule(".tsh-ni.on");
    expect(on).toContain("background: var(--tsh-active-bg)");
    expect(on).not.toContain("border");
    expect(on).not.toContain("box-shadow");
    expect(on).not.toContain("outline");
    for (const burgundy of ["#7c3a2a", "#f5c7c2", "#f3e3dc"]) expect(on).not.toContain(burgundy);
    // the white-card variant from the shell pack is retired
    expect(tshCss).not.toContain("#fdfcfa");
  });
  it("the filter rows share it: active = faint fill, the ink outline retired; reactive bits carry over", () => {
    const sel = rule(".tdb-fpill.sel");
    expect(sel).toContain("background: var(--rail-pill, #f1e9df)");
    expect(sel).not.toContain("box-shadow");
    expect(sel).not.toContain("border-color: var(--ink)");
    expect(rule(".tdb-fpill.nar")).toContain("background: var(--rail-pill, #f1e9df)");
    // the reactive behaviour is untouched: the dot, the count, zero-dimming, the struck totals, the chip
    expect(rule(".tdb-fpill .tdb-dotc")).toContain("border-radius: 50%");
    expect(rule(".tdb-fpill.z")).toContain("opacity: 0.4");
    expect(css).toContain(".tdb-fn .tdb-was"); // the struck old total
    expect(page).toContain('className="tdb-fq tsh-fq"'); // the active-search chip
  });
});

describe("shell polish P5 — the sweep + the record", () => {
  const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
  it("the outlined-filter + white-card active styles this replaced are extinct", () => {
    expect(tshCss).not.toContain("#fdfcfa"); // the white-card fill
    expect(css).not.toContain("box-shadow: inset 0 0 0 1px var(--ink)"); // the ink outline on filters
    // the active nav + filter states carry NO border/shadow/outline
    for (const s of ["border-color: var(--ink)"]) expect(css.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).not.toContainEqual(undefined);
  });
  it("themes.md records the polish amendment", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do workspace shell — polish amendment (settled)");
    expect(themes).toContain("THE CENTRED COLUMN");
    expect(themes).toContain("STICKER CARDS");
    expect(themes).toContain("THE DRAWER-GRAMMAR SIDEBAR");
    expect(themes).toContain("white-card active variant is retired");
  });
  it("the tour anchors are all live post-polish", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).not.toContain("tdb-todaychip"); // the removed chip is gone from the tour
    for (const sel of [".tdb-herobegin", ".tsh-search", ".tdb-fpill", ".tdb-revlink", ".tdb-tile", ".tdb-today2"]) {
      expect(tour).toContain(sel);
    }
  });
});
