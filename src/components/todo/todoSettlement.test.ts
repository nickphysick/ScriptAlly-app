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
const HEADS = [".tdb-rsech", ".tdb-dochead", ".tdb-th"];

describe("settlement P1 — SAGE headers: one treatment, ONE height, everywhere", () => {
  it("the tokens exist once, on the wrap, and carry the settled values", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--container-head-h: 42px");
    expect(w).toContain("--container-head-bg: linear-gradient(180deg, #d7ddd5, #d5dbd3)");
    expect(w).toContain("--container-head-rule: #b9c9b4");
    expect(w).toContain("--container-head-ink: #3d4a3b");
    expect(w).toContain("--container-head-mono: #5a6e58");
    // ONE sage source: no near-duplicate of the head fill or rule anywhere else in the sheet
    expect(css.match(/#d7ddd5/g)!.length).toBe(1);
    expect(css.match(/#b9c9b4/g)!.length).toBe(1);
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
  it("Today's sage header is now the FAMILY — its siblings joined it; the sage glyphs stand", () => {
    const t = rule(".tdb-th");
    expect(t).toContain("background: var(--container-head-bg)"); // the same one source
    expect(t).not.toContain("hk-sage"); // it reads the head token now, not the band pair
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
  it("the header inks join the sage family: mono labels #5a6e58, Playfair lines #3d4a3b", () => {
    expect(rule(".tdb-rsech")).toContain("color: var(--container-head-mono)"); // the sidebar's mono label
    expect(rule(".tdb-th .tdb-thr")).toContain("color: var(--container-head-mono)"); // Today's count
    expect(rule(".tdb-bartext")).toContain("color: var(--container-head-ink)"); // the bar's Playfair line
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)"); // Today's title
    // the values themselves, once, on the wrap
    expect(rule(".tdb-wrap")).toContain("--container-head-mono: #5a6e58");
    expect(rule(".tdb-wrap")).toContain("--container-head-ink: #3d4a3b");
  });
  it("radius continuity: each header takes ITS container's top radii", () => {
    for (const sel of HEADS) expect(rule(sel + (sel === ".tdb-rsech" ? ".fc1" : ""))).toContain("border-radius: 15px 15px 0 0");
    for (const c of [".tdb-mainc", ".tdb-today2", ".tdb-fbox"]) expect(rule(c)).toContain("border-radius: 16px");
  });
  it("the view toggle restyles onto sage; the active chip is unchanged", () => {
    const t = rule(".tdb-vseg");
    expect(t).toContain("background: rgba(255, 255, 255, 0.55)");
    expect(t).toContain("border: 1px solid var(--container-head-rule)");
    expect(t).toContain("height: 26px"); // inside the 42px bar
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
  it("the band is EMPTY and independent of the head height — the token is its guaranteed floor", () => {
    // the hero's last child is the search row: nothing (label, chip, shadow) sits in the band
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("// ── Final Shape P2"));
    const iSearch = hero.indexOf("tdb-srchrow");
    expect(hero.slice(iSearch)).not.toContain("tdb-btnp");
    expect(hero.slice(iSearch)).not.toContain("tdb-rvchip");
    // the container row adds its own air ABOVE the token's floor; neither is negative, so the
    // real clear ground is the sum and can never fall below --tdb-search-clear
    const ws = rule(".tdb-ws");
    expect(ws).toMatch(/padding: \d+px 0 \d+px/);
    expect(ws).not.toContain("margin-top: -"); // nothing pulls the containers up into the band
    // and the band does not move when the header height changes
    expect(rule(".tdb-srchrow")).not.toContain("--container-head-h");
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

describe("settlement P3 — the pair's new seat: in the bar", () => {
  const bar = page.slice(page.indexOf('className="tdb-dochead"'), page.indexOf('className="tdb-sheetbody"'));
  it("the bar reads left to right: the Playfair line → the pair → the divider → the toggle", () => {
    const iLine = bar.indexOf("tdb-bartext");
    const iBegin = bar.indexOf("tdb-herobegin");
    const iChip = bar.indexOf("tdb-rvchip");
    const iDiv = bar.indexOf("tdb-bardiv");
    const iSeg = bar.indexOf("tdb-vseg");
    expect(iLine).toBeGreaterThan(-1);
    expect(iBegin).toBeGreaterThan(iLine);
    expect(iChip).toBeGreaterThan(iBegin);
    expect(iDiv).toBeGreaterThan(iChip);
    expect(iSeg).toBeGreaterThan(iDiv); // the toggle stays the bar's rightmost resident
    expect(rule(".tdb-barvt")).toContain("margin-left: auto");
    const d = rule(".tdb-bardiv");
    expect(d).toContain("width: 1px");
    expect(d).toContain("height: 20px");
    expect(d).toContain("background: var(--container-head-rule)");
  });
  it("the 36px bar holds the 28px pills WITHOUT growing", () => {
    expect(rule(".tdb-dochead")).toContain("height: var(--container-head-h)"); // still the token, unchanged
    const p = rule(".tdb-btnp.sm, .tdb-rvchip.sm");
    expect(p).toContain("height: 28px");
    expect(p).toContain("font-size: 11px"); // one step down from the hero's 12.5
    expect(p).toContain("padding: 0 12px");
    // 28 + 26 (toggle) both clear 36 — and nothing in the bar is taller than the bar
    expect(rule(".tdb-vseg")).toContain("height: 26px");
  });
  it("below the MEASURED collapse tier the pills go icon-only, labels carried by aria/title", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-bar-collapse: 680px");
    expect(css).toContain("@media (max-width: 679.98px) {");
    expect(css).toContain(".tdb-btnp.sm i, .tdb-rvchip.sm i { display: none; }");
    expect(bar).toContain('aria-label="Begin focused session"');
    expect(bar).toContain('title="Begin focused session"');
    expect(bar).toContain("aria-label={`Last week in review — week ${reviewWin.weekNumber}`}");
    expect(bar).toContain("<i>Begin focused session</i>");
    expect(bar).toContain("<i>Last week in review</i>");
    // the toggle NEVER collapses
    const collapse = css.slice(css.indexOf("@media (max-width: 679.98px) {"));
    expect(collapse.slice(0, collapse.indexOf("}\n"))).not.toContain("tdb-vseg");
    // nothing wraps instead: the bar's line and cluster stay on one line
    expect(rule(".tdb-barvt")).not.toContain("flex-wrap");
  });
  it("the hero is title + search ONLY", () => {
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("// ── Final Shape P2"));
    expect(hero).toContain("tdb-ask"); // the title
    expect(hero).toContain("tdb-bigsearch"); // the search
    expect(hero).not.toContain("tdb-herobegin");
    expect(hero).not.toContain("tdb-rvchip");
    expect(css).not.toContain(".tdb-heropair"); // the old seat is gone
  });
  it("the session unmounts the pair FROM THE BAR and returns it; the bar + toggle ride the bar's own exit", () => {
    expect(page).toContain('{heroSession.slot?.kind !== "session" && (');
    expect(page).toContain('<span className={`tdb-barpair${heroSession.clearing ? " insession" : ""}`}>');
    expect(rule(".tdb-barpair.insession")).toContain("opacity: 0");
    // the bar itself is the choreography's EXIT_BAR — it leaves with the sheet, not with the pair
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain('export const EXIT_BAR = ".tdb-dochead"');
    expect(stage).not.toContain("tdb-barpair"); // the pair is not separately choreographed
  });
  it("TAB ORDER: search → the bar's controls left-to-right → the filter rail", () => {
    // the render helpers are DEFINED below the return, so DOM order is the CALL order
    const iHero = page.indexOf("{renderHero()}");
    const iBar = page.indexOf('className="tdb-dochead"');
    const iRail = page.indexOf("{renderRail()}");
    expect(iHero).toBeLessThan(iBar); // the hero's search comes first
    expect(iBar).toBeLessThan(iRail); // then the bar's controls, then the rail
    expect(rule(".tdb-fside")).toContain("order: -1"); // …and the rail keeps its LEFT seat
    expect(page.indexOf("function renderHero")).toBeGreaterThan(iRail); // (the helper-below-return law)
  });
});

describe("settlement P4 — the sweep", () => {
  it("themes.md records the settlement, and no blush set was ever adopted", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do containers — stone (settled)");
    expect(themes).toContain("THE STONE PAIR");
    expect(themes).toContain("THE 36px LAW");
    expect(themes).toContain("SAGE AT GLYPH SCALE");
    expect(themes).toContain("pastille bands are SIGNAL");
    expect(themes).toContain("todo-blush-prompt.md` was superseded before it ran");
  });
  it("no blush or greige token ever entered the board", () => {
    expect(css).not.toMatch(/blush|greige/i);
    expect(page).not.toMatch(/blush|greige/i);
  });
  it("the pastille card system is byte-untouched by this pack", () => {
    // the three families' band tokens and the white tag pills stand exactly as deployed
    for (const t of ["--pink-t", "--pink-b", "--lat-1", "--lat-2"]) expect(css).toContain(t);
    expect(css).toContain(".tdb-band"); // the card band grammar
    expect(rule(".tdb-tag")).toContain("background: var(--white)"); // white tag pills
  });
  it("the tour still lands: Begin's anchor followed the seat into the bar", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-herobegin"');
    expect(tour).toContain("the settlement: Begin sits in the SHEET BAR");
    expect(page).toContain('className="tdb-btnp sm tdb-herobegin"'); // the anchor exists at that seat
    // every other stop's anchor still exists in the board
    for (const sel of [".tdb-bigsearch", ".tdb-fpill, .tdb-fpillbtn", ".tdb-rvchip", ".tdb-tile, .tdb-gcard, .tdb-lrow", ".tdb-today2, .tdb-todaychip"]) {
      expect(tour).toContain(sel);
      for (const one of sel.split(", ")) expect(css).toContain(one);
    }
  });
});
