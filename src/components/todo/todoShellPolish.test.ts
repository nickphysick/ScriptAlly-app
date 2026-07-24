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
  it("the spine's panel owns its warm parchment tokens directly (the drawer-grammar superseded)", () => {
    const root = tRule(".spine-root");
    expect(root).toContain("--spine-pon: #e6ddcf");
    expect(root).toContain("--spine-phov: #ece5d9");
    expect(root).toContain("--spine-plab: #8a7a66");
    expect(root).toContain("--spine-prule: #ddd2c0");
  });
  it("section labels are the drawer's mono, hairline-ruled beneath (WORKSPACE + FILTER both)", () => {
    const nk = tRule(".spine-nk");
    expect(nk).toContain("font-family: var(--f12-mono)");
    expect(nk).toContain("color: var(--spine-plab)");
    expect(nk).toContain("border-bottom: 1px solid var(--spine-prule)"); // the ruled context label
    expect(tsh).toContain('<div className="spine-cat"'); // the category label
    expect(tsh).toContain('<div className="spine-nk"'); // the context label
  });
  it("rows are the drawer's grammar: icon + label, its height/radius/type, muted counts", () => {
    const ni = tRule(".spine-ni");
    expect(ni).toContain("height: 32px");
    expect(ni).toContain("border-radius: 9px");
    expect(ni).toContain("color: var(--spine-ptx)");
    expect(tRule(".spine-ic")).toContain("width: 14px"); // the panel row icon
    expect(tRule(".spine-n")).toContain("color: var(--spine-pmut)"); // muted count
    // the icons are lucide (TypeGlyph is locked to material types — see report)
    expect(page).toContain("import { LayoutGrid, Send, Users, ListTodo, Book");
    expect(page).toContain("icon: <Send size={16} />");
  });
  it("ACTIVE = the faint parchment fill ONLY — no border, no outline, no shadow; never burgundy", () => {
    const on = tRule(".spine-ni.on");
    expect(on).toContain("background: var(--spine-pon)");
    expect(on).not.toContain("border");
    expect(on).not.toContain("box-shadow");
    expect(on).not.toContain("outline");
    for (const burgundy of ["#7c3a2a", "#f5c7c2", "#f3e3dc"]) expect(on).not.toContain(burgundy);
    expect(tshCss).not.toContain("#fdfcfa"); // the white-card variant stays retired
  });
  it("the filter rows share it: active = the warm faint fill, the ink outline retired; reactive bits carry over", () => {
    const sel = rule(".tdb-fpill.sel");
    expect(sel).toContain("background: var(--spine-pon)"); // the panel's warm fill
    expect(sel).not.toContain("box-shadow");
    expect(sel).not.toContain("border-color: var(--ink)");
    expect(rule(".tdb-fpill.nar")).toContain("background: var(--spine-pon)");
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
    for (const sel of [".tdb-herobegin", ".tdb-hsearch", ".tdb-fpill", ".tdb-revlink", ".tdb-tile", ".tdb-today2"]) {
      expect(tour).toContain(sel);
    }
  });
});

describe("alignment fixes P1 — equal gutters + the grid fills the panel", () => {
  const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
  const tRule = (sel: string): string => {
    const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`tsh rule not found: ${sel}`);
    return m[1];
  };
  it("ONE scroller with a symmetric scrollbar gutter — the centred column can't sit left-heavy", () => {
    // tsh-body clips + column-lays; the wrap is the sole scroller and reserves the gutter both sides
    expect(tRule(".tsh-body")).toContain("overflow: hidden");
    expect(tRule(".tsh-body")).toContain("display: flex");
    expect(rule(".tdb-wrap")).toContain("overflow-y: auto");
    expect(rule(".tdb-wrap")).toContain("scrollbar-gutter: stable both-edges");
    // the column centres with equal side padding + auto margins (no one-sided inset)
    expect(rule(".tdb-col")).toContain("margin-inline: auto");
    expect(rule(".tdb-col")).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px");
    expect(rule(".tdb-col")).not.toMatch(/padding-left|padding-right/);
  });
  it("the grid is FLUID (1fr tracks) so cards fill the panel — no dead space right of the last column", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(3, 1fr)");
    expect(rule(".tdb-grid")).not.toContain("var(--tdb-cardw)"); // no fixed card width in the grid
  });
  it("the tier changes the COUNT only: 3-up standard, 4-up ONLY at ≥1700 (the always-4 rule retired)", () => {
    const m = css.match(/@media \(min-width: 1700px\) \{([\s\S]*?)\n\}/);
    expect(m![1]).toContain(".tdb-wrap .tdb-grid { grid-template-columns: repeat(4, 1fr); }");
    expect(css).not.toContain(".tdb-wrap.today-off .tdb-grid"); // the always-4-everywhere rule is gone
  });
  it("the sticker clearance still holds at the grown sizes (the gap ≥ the offset)", () => {
    const gap = parseInt(/--tdb-grid-gap:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    const off = parseInt(/--tdb-sticker-off:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    expect(gap).toBeGreaterThanOrEqual(off);
    // the batch + Expand-n cells are grid items → they stretch with their 1fr tracks
    expect(rule(".tdb-cell.b")).toContain("height: var(--tdb-cardh-g)");
  });
});

describe("alignment fixes P2 — the warm active fill (no green cast)", () => {
  const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
  const tRule = (sel: string): string => {
    const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`tsh rule not found: ${sel}`);
    return m[1];
  };
  it("the active fill is #e6ddcf and the hover #ece5d9 — the sidebar's parchment, one step deeper", () => {
    const root = tRule(".spine-root");
    expect(root).toContain("--spine-pon: #e6ddcf"); // the panel active fill (warm parchment)
    expect(root).toContain("--spine-phov: #ece5d9");
    expect(root).toContain("--spine-pan: #f5f0e8"); // the base panel parchment the fill deepens
  });
  it("applied to nav items AND filter rows; still no border/outline/shadow", () => {
    const on = tRule(".spine-ni.on");
    expect(on).toContain("background: var(--spine-pon)");
    expect(on).not.toContain("border");
    expect(on).not.toContain("box-shadow");
    expect(on).not.toContain("outline");
    // the filter rows (in the panel context zone) take the same warm fill
    expect(rule(".tdb-fpill.sel")).toContain("background: var(--spine-pon)");
    expect(rule(".tdb-fpill.nar")).toContain("background: var(--spine-pon)");
    expect(rule(".tdb-fpill:hover")).toContain("background: var(--spine-phov)");
  });
  it("the green-cast token (--rail-pill / the sage #e9ece4) is not READ anywhere in the sidebar scope", () => {
    // the shell no longer reads the app's sage nav-pill; a mention survives only in a comment
    const liveTsh = tshCss.replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments
    expect(liveTsh).not.toContain("--rail-pill");
    expect(liveTsh).not.toContain("#e9ece4");
    expect(liveTsh).not.toContain("var(--rail-hov"); // the sage-adjacent hover read is gone too
    // and the filter rows in todo.css don't read the sage pill either
    expect(css).not.toContain("var(--rail-pill");
    expect(css).not.toContain("var(--rail-hov");
  });
});

describe("alignment fixes P3 — the sweep", () => {
  it("no fixed-width grid track survives (the grid is fully fluid)", () => {
    expect(css).not.toContain("repeat(3, var(--tdb-cardw))");
    expect(css).not.toContain("repeat(4, var(--tdb-cardw))");
  });
  it("no live sage/green fill read survives in the sidebar scope", () => {
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(tshCss).not.toContain("--rail-pill");
    expect(css).not.toContain("var(--rail-pill");
    expect(css).not.toContain("var(--rail-hov");
  });
  it("themes.md records the fluid-track law + the active-fill pair", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("EQUAL GUTTERS + FLUID TRACKS");
    expect(themes).toContain("THE WARM ACTIVE FILL");
    expect(themes).toContain("#e6ddcf");
    expect(themes).toContain("scrollbar-gutter: stable both-edges");
  });
});

describe("centring fix P1 — the single geometry owner (architecture, not pixels)", () => {
  // jsdom cannot measure viewport layout, so this asserts the ARCHITECTURE the pack prescribes:
  // one element (.tdb-col, the page-col) owns the horizontal geometry; no other element in the
  // content chain carries a max-width, an auto margin, or a one-sided horizontal padding. The
  // pixel symmetry is the report's manual devtools step (1440/1920).
  const CHAIN = [".tdb-ws", ".tdb-centre", ".tdb-mainc", ".tdb-sheetbody", ".tdb-grid"]; // grid ← … ← col
  it("the NAMED CULPRIT is removed: .tdb-asm no longer owns width/margin (it competed with .tdb-col)", () => {
    const asm = rule(".tdb-asm");
    expect(asm).toContain("width: 100%");
    expect(asm).not.toContain("var(--tdb-asm)"); // the fixed assembly width is gone
    expect(asm).not.toContain("margin"); // the competing auto-centre is gone
    // regression grep on the exact property that was found: no element sets width to --tdb-asm
    expect(css).not.toContain("width: var(--tdb-asm)");
  });
  it(".tdb-col is the SOLE geometry owner — max-width + auto margins + symmetric padding", () => {
    const col = rule(".tdb-col");
    expect(col).toContain("max-width: var(--tdb-col-max)");
    expect(col).toContain("margin-inline: auto");
    expect(col).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px"); // equal L/R via one token
  });
  it("NO other chain element carries a max-width, an auto margin, or a one-sided horizontal pad", () => {
    for (const sel of CHAIN) {
      const r = rule(sel);
      expect(r, `${sel} max-width`).not.toContain("max-width");
      expect(r, `${sel} margin auto`).not.toMatch(/margin[^;]*auto/);
      expect(r, `${sel} margin-inline`).not.toContain("margin-inline");
      // a one-sided horizontal pad is the classic left-heavy bug; the panel's symmetric inset is fine
      expect(r, `${sel} padding-left`).not.toContain("padding-left");
      expect(r, `${sel} padding-right`).not.toContain("padding-right");
    }
    // the main region right of the sidebar carries no horizontal padding of its own
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    const bodyRule = tshCss.match(/\n\.tsh-body\s*\{([^}]*)\}/)![1];
    expect(bodyRule).not.toContain("padding");
  });
  it("widths derive from the container, never from vw units (in the content chain)", () => {
    // the col + its chain use container-relative widths; the only vw in the file is on fixed/
    // absolute OVERLAYS (modals, toasts, the flow sheet) — never the centred content chain
    expect(rule(".tdb-col")).not.toContain("vw");
    for (const sel of CHAIN) expect(rule(sel)).not.toContain("vw");
    // the vw users are all overlays, asserted position:fixed/absolute
    for (const sel of [".tdb-amodal", ".tdb-toast", ".tdb-ffwrap"]) {
      expect(rule(sel)).toMatch(/position: (fixed|absolute|relative)/);
    }
  });
});

describe("centring fix P2 — the big search in the panel header", () => {
  it("the bar holds no search (breadcrumb + user only)", () => {
    const tsh = readFileSync(join(here, "..", "shell", "TodoShell.tsx"), "utf8");
    expect(tsh).not.toContain("tsh-search");
    expect(tsh).not.toContain("searchValue");
    expect(tsh).toContain("<F12Account"); // just the user block after the crumb
  });
  it("the pill is absolute-centred in the items row — the flanks can't push it off-centre", () => {
    const p = rule(".tdb-hsearch");
    expect(p).toContain("position: absolute");
    expect(p).toContain("left: 50%");
    expect(p).toContain("transform: translate(-50%, -50%)");
    expect(rule(".tdb-items")).toContain("position: relative"); // the containing block
  });
  it("the pill is the settled large design: 460×46, white, warm hairline, soft shadow, oat roundel", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-hsearch-w: 460px");
    expect(w).toContain("--tdb-hsearch-h: 46px");
    const p = rule(".tdb-hsearch");
    expect(p).toContain("height: var(--tdb-hsearch-h)");
    expect(p).toContain("background: #fff");
    expect(p).toContain("border: 1px solid var(--tsh-active-border)");
    expect(p).toContain("box-shadow: 0 6px 18px rgba(58, 28, 20, 0.08)");
    expect(page).toContain('placeholder="Search your list…"');
    const mag = rule(".tdb-hmag");
    expect(mag).toContain("width: 32px");
    expect(mag).toContain("background: var(--oat)");
  });
  it("NO hairline beneath the row; the toggle stands the pill's full 46px band (shared token)", () => {
    expect(rule(".tdb-items")).toContain("border-bottom: none");
    expect(rule(".tdb-items .tdb-vseg")).toContain("height: var(--tdb-hsearch-h)"); // same token as the pill
    // the active-chip law is unchanged (white + ink ring)
    expect(rule(".tdb-vseg button.on")).toContain("border: 1px solid var(--ink)");
  });
  it("the responsive floor is container-relative (never vw): shrinks before colliding with the flanks", () => {
    expect(rule(".tdb-hsearch")).toContain("width: min(var(--tdb-hsearch-w), calc(100% - var(--tdb-hsearch-reserve)))");
    expect(rule(".tdb-hsearch")).not.toContain("vw");
    expect(rule(".tdb-wrap")).toContain("--tdb-hsearch-reserve:");
  });
  it("behaviour intact: same handler, the sidebar chip + the Showing-count line, ⌘K to the new mount", () => {
    expect(page).toContain("value={search}");
    expect(page).toContain("onChange={(e) => setSearch(e.target.value)}");
    expect(page).toContain('className="tdb-fq tsh-fq"'); // the query chip stays in the sidebar
    expect(page).toContain("{active ? `Showing ${shownX} of ${shownY} items`"); // the count line
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)'); // ⌘K → searchRef
    expect(page).toContain("ref={searchRef}");
  });
  it("session: the search leaves with the panel (EXIT_FADE), no orphaned bar-clearing target", () => {
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain(".tdb-hsearch"); // in the gather's fade list
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(tshCss).not.toContain(".tsh-search"); // no bar search
    expect(tshCss).toContain(".spine-clearing .spine-panel"); // the panel slides (the rail stays)
  });
});

describe("centring fix P2B — the real brand in the corner", () => {
  const tsh = readFileSync(join(here, "..", "shell", "TodoShell.tsx"), "utf8");
  it("the placeholder glyph + text are gone; the real assets are mounted (no inline recreations)", () => {
    expect(tsh).not.toContain("aria-hidden>✈</span>"); // no fabricated glyph
    expect(tsh).not.toContain('<span className="tsh-brandtx">ScriptAlly</span>');
    // the real mark (rail) + the real wordmark (panel), both the actual assets
    expect(tsh).toContain('src="/scriptally-logo-new.png"');
    expect(tsh).toContain("import { ScriptAllyLogo }");
    expect(tsh).toContain("<ScriptAllyLogo heightPx={30} />");
  });
  it("the mark + wordmark order, alt text, and the home-route link", () => {
    // the mark leads (rail head), the wordmark follows (panel head)
    expect(tsh.indexOf("scriptally-logo-new.png")).toBeLessThan(tsh.indexOf("<ScriptAllyLogo"));
    expect(tsh).toContain('alt="" aria-hidden="true"'); // the mark is decorative; the wordmark carries alt="ScriptAlly"
    expect(tsh).toContain('aria-label="ScriptAlly — go to dashboard"');
    expect(tsh).toContain("onClick={onBrand}");
    expect(page).toContain('onBrand={() => onNavigate("dashboard")}');
  });
  it("the rail (with the mark) persists at the narrow tier; the panel collapses to an overlay", () => {
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    const collapse = tshCss.slice(tshCss.indexOf("@media (max-width: 1099.98px)"));
    expect(collapse).not.toContain(".spine-rail { display: none"); // the rail (mark) stays
    expect(collapse).toContain("position: fixed"); // the panel (wordmark) becomes the overlay
  });
  it("the real asset files exist in public/", () => {
    const pub = join(here, "..", "..", "..", "public");
    expect(readFileSync(join(pub, "scriptally-logo-new.png")).length).toBeGreaterThan(0);
    expect(readFileSync(join(pub, "scriptally-title-v2.png")).length).toBeGreaterThan(0);
  });
});

describe("centring fix P3 — the sweep", () => {
  it("the dead bar-search styles are gone", () => {
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(tshCss).not.toContain(".tsh-search");
    expect(tshCss).not.toContain(".tsh-mag");
  });
  it("no --tdb-asm / --tdb-sheet assembly-width remnant survives", () => {
    expect(css).not.toContain("--tdb-asm");
    expect(css).not.toContain("--tdb-sheet");
  });
  it("themes.md records the geometry-owner law + the panel-header search + the real brand", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do — true centring + the panel-header search (forensic fix)");
    expect(themes).toContain("THE SINGLE GEOMETRY OWNER");
    expect(themes).toContain("THE PANEL-HEADER SEARCH");
    expect(themes).toContain("THE REAL BRAND");
    expect(themes).toContain("The named culprit was `.tdb-asm`");
  });
});
