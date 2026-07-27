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

describe("shell polish P4 — superseded (shell follow-up P3): the spine sidebar retired; the bench chips carry on in the page body", () => {
  const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
  const tRule = (sel: string): string => {
    const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`tsh rule not found: ${sel}`);
    return m[1];
  };
  it("the chips carry the reactive behaviour: selected = the ink fill, zero fades, the search chip", () => {
    expect(tRule(".spine-chip.on")).toContain("background: var(--spine-chip-on-bg)"); // selected = ink fill
    expect(tRule(".spine-chip.on")).not.toContain("box-shadow");
    expect(tRule(".spine-chip.zero")).toContain("opacity: 0.45"); // zero-count fades, still rendered
    expect(tRule(".spine-chipn .tdb-was")).toContain("line-through"); // the struck prior total
    expect(page).toContain('className="spine-chip q"'); // the active-search chip, chip grammar
    expect(page).toContain('className="spine-benchhead"'); // the bench's own funnel + FILTER header
    expect(tshCss).not.toContain("#fdfcfa"); // the white-card variant stays retired
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
    for (const sel of [".tdb-herobegin", ".tdb-hsearch", ".spine-bench", ".tdb-revlink", ".tdb-tile", ".tdb-today2"]) {
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
    // the page root clips + column-lays (follow-up P3: .spine-root took over tsh-body's contract);
    // the wrap is the sole scroller and reserves the gutter both sides
    expect(tRule(".spine-root")).toContain("overflow: hidden");
    expect(tRule(".spine-root")).toContain("display: flex");
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
  it("the panel active-fill law left with the panel (follow-up P3); the bench chips carry their own ink-fill selection", () => {
    expect(tshCss).not.toContain(".spine-ni"); // the panel rows are gone
    // panel-final: a selected bench chip fills deep ink (a deliberate divergence from the old
    // nav warm fill; a tinted fill would read as a nav pill)
    expect(tRule(".spine-chip.on")).toContain("background: var(--spine-chip-on-bg)");
    expect(tRule(".spine-chip.on")).not.toContain("outline");
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
    // (the tsh-body main region died with the shell — follow-up P3; .spine-root carries no
    // horizontal padding either, asserted via its rule in the scroller lock above)
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
  it("the breadcrumb bar retired with the shell (follow-up P3) — no bar, no bar search", () => {
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(tshCss).not.toContain(".tsh-bcbar");
    expect(tshCss).not.toContain(".tsh-search");
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
    expect(page).toContain('className="spine-chip q"'); // panel-final P2: the query chip now rides the bench
    expect(page).toContain("{active ? `Showing ${shownX} of ${shownY} items`"); // the count line
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)'); // ⌘K → searchRef
    expect(page).toContain("ref={searchRef}");
  });
  it("session: the search leaves with the panel (EXIT_FADE), no orphaned bar-clearing target", () => {
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain(".tdb-hsearch"); // in the gather's fade list
    const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
    expect(tshCss).not.toContain(".tsh-search"); // no bar search
    expect(tshCss).not.toContain(".spine-clearing"); // the session panel-slide died with the panel (follow-up P3)
  });
});

describe("centring fix P2B — superseded (shell follow-up P3): the spine corner brand retired with the shell; the assets live on", () => {
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
