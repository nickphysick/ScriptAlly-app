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

describe("settlement P3 — REVIEW & FILTER: the pair at the sidebar's top", () => {
  const card = page.slice(page.indexOf("function renderFilterCard"), page.indexOf("function renderRail"));
  it("the sidebar's band retitles to REVIEW & FILTER, on the same sage as the others", () => {
    expect(card).toContain('<div className="tdb-rsech fc1">REVIEW &amp; FILTER');
    expect(page).not.toContain('className="tdb-rsech fc1">FILTER');
    expect(rule(".tdb-rsech")).toContain("background: var(--container-head-bg)");
  });
  it("the pair is STACKED full-width at the top of the body: Begin (ink) then review (white)", () => {
    const iPair = card.indexOf("tdb-sbpair");
    const iBegin = card.indexOf("tdb-herobegin");
    const iChip = card.indexOf("tdb-rvchip");
    const iDiv = card.indexOf("tdb-sbdiv");
    const iPill = card.indexOf("railPill");
    expect(iPair).toBeGreaterThan(-1);
    expect(iBegin).toBeGreaterThan(iPair);
    expect(iChip).toBeGreaterThan(iBegin); // Begin first, the review chip second
    expect(iDiv).toBeGreaterThan(iChip); // the hairline closes the seat
    expect(iPill).toBeGreaterThan(iDiv); // the filter pills follow, unchanged
    const st = rule(".tdb-sbpair");
    expect(st).toContain("flex-direction: column");
    expect(st).toContain("gap: 7px");
    expect(st).toContain("padding: 11px 9px 4px");
    const btn = rule(".tdb-btnp.sb, .tdb-rvchip.sb");
    expect(btn).toContain("width: 100%");
    expect(btn).toContain("height: var(--tdb-sbpair-h)");
    expect(btn).toContain("justify-content: center"); // centred labels
    expect(rule(".tdb-wrap")).toContain("--tdb-sbpair-h: 34px");
    // the ink primary + white secondary treatments themselves are untouched
    expect(rule(".tdb-btnp")).toContain("#2a1a13");
    expect(rule(".tdb-rvchip")).toContain("background: var(--white, #fff)");
    expect(rule(".tdb-sbdiv")).toContain("height: 1px");
  });
  it("the sheet's bar keeps ONLY its Playfair line and the view toggle — no pair, no divider", () => {
    const bar = page.slice(page.indexOf('className="tdb-dochead"'), page.indexOf('className="tdb-sheetbody"'));
    expect(bar).toContain("tdb-bartext");
    expect(bar).toContain("tdb-vseg");
    expect(bar).not.toContain("tdb-herobegin");
    expect(bar).not.toContain("tdb-rvchip");
    expect(bar).not.toContain("tdb-bardiv");
    expect(rule(".tdb-vseg")).toContain("margin-left: auto"); // it holds the right on its own
    for (const dead of ["tdb-barvt", "tdb-barpair", "tdb-bardiv", "tdb-bar-collapse"]) {
      expect(css).not.toContain(dead);
      expect(page).not.toContain(dead);
    }
  });
  it("the hero is title + search ONLY", () => {
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("// ── Final Shape P2"));
    expect(hero).toContain("tdb-ask");
    expect(hero).toContain("tdb-bigsearch");
    expect(hero).not.toContain("tdb-herobegin");
    expect(hero).not.toContain("tdb-rvchip");
    expect(css).not.toContain(".tdb-heropair");
  });
  it("in session the pair leaves WITH THE SIDEBAR — one animation, no orphaned fade", () => {
    expect(card).toContain('{heroSession.slot?.kind !== "session" && (');
    // no fade of its own: the sidebar's slide is the whole departure
    expect(css).not.toContain(".tdb-sbpair.insession");
    expect(css).not.toContain(".tdb-barpair.insession");
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain('export const EXIT_LEFT = ".tdb-fside"'); // the sidebar is the mover
    expect(stage).not.toContain("tdb-sbpair"); // the pair is not separately choreographed
  });
  it("NO WRAP at the narrowest supported width — measured, so no font step is needed", () => {
    // 248px rail − 18 card inset − 24 pill padding = 206px of label room; the worst-case
    // label (Begin, 12.5px, with its glyph) measures 133px → 73px of slack. Ellipsis is
    // forbidden and unreachable; the size stays a token for any future rail width.
    expect(rule(".tdb-wrap")).toContain("--tdb-rail: 248px");
    expect(rule(".tdb-wrap")).toContain("--tdb-sbpair-fs: 12.5px");
    expect(rule(".tdb-btnp.sb, .tdb-rvchip.sb")).toContain("font-size: var(--tdb-sbpair-fs)");
    expect(rule(".tdb-btnp.sb, .tdb-rvchip.sb")).toContain("white-space: nowrap");
    expect(rule(".tdb-btnp.sb, .tdb-rvchip.sb")).not.toContain("text-overflow"); // never an ellipsis on a label
  });
  it("TAB ORDER: search → the sidebar's pair → its pills → the sheet", () => {
    // the render helpers are DEFINED below the return, so DOM order is the CALL order
    const iHero = page.indexOf("{renderHero()}");
    const iRail = page.indexOf("{renderRail()}");
    const iSheet = page.indexOf('className="tdb-dochead"');
    expect(iHero).toBeLessThan(iRail);
    expect(iRail).toBeLessThan(iSheet);
    expect(rule(".tdb-fside")).not.toContain("order:"); // the natural order is the right one again
    // and within the sidebar: the pair precedes the pills
    expect(card.indexOf("tdb-sbpair")).toBeLessThan(card.indexOf("tdb-sbdiv"));
  });
});

describe("settlement P4 — the sweep", () => {
  it("themes.md records the sage settlement and marks the stone step superseded", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do containers — sage (settled)");
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
    expect(rule(".tdb-tag")).toContain("background: var(--white)"); // white tag pills
  });
  it("the tour still lands: Begin's anchor followed the seat into the sidebar", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-herobegin"');
    expect(tour).toContain("the settlement: Begin sits at the SIDEBAR's top");
    expect(page).toContain('className="tdb-btnp sb tdb-herobegin"'); // the anchor exists at that seat
    // every other stop's anchor still exists in the board
    for (const sel of [".tdb-bigsearch", ".tdb-fpill, .tdb-fpillbtn", ".tdb-rvchip", ".tdb-tile, .tdb-gcard, .tdb-lrow", ".tdb-today2, .tdb-todaychip"]) {
      expect(tour).toContain(sel);
      for (const one of sel.split(", ")) expect(css).toContain(one);
    }
  });
});
