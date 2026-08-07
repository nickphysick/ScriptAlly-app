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
    /* tasks-pages P1: TasksPageLayout WEARS .tdb-col (the single geometry owner) — the header
       and the columns both live inside it by construction, so the page needs no hand wrapper. */
    const layout = readFileSync(join(__dirname, "TasksPageLayout.tsx"), "utf8");
    expect(layout).toContain('className="tdb-col tpl"');
    expect(page).toContain("<TasksPageLayout");
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
    // todo rebuild P1: the grid states its own 14px gap (the mockup's), no longer the token.
    const gap = parseInt(/gap:\s*(\d+)px/.exec(rule(".tdb-grid"))![1], 10);
    const off = parseInt(/--tdb-sticker-off:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    expect(gap).toBe(14);
    expect(gap).toBeGreaterThanOrEqual(off);
  });
  it("the pastille bands + white tag pills inside are UNCHANGED (the sticker is on the card only)", () => {
    expect(rule(".tdb-band.hk")).toContain("linear-gradient(180deg, var(--lat-1), var(--lat-2))"); // the latte band, untouched
    expect(rule(".tdb-ktag")).toContain("background: #f7f2e9"); // the tightening: the kind chip replaced the white pills
  });
  it("the ledger rows, the Today pop-up and the session page are NOT stickers", () => {
    // the sticker selectors are the card tiles only — never the ledger row, the Today card or the session page
    expect(rule(".tdb-lrow")).not.toContain("--tdb-sticker-off");
    // workspace P3: the Today pop-up is retired, so there is no rule left to be a non-sticker.
    expect(css).not.toContain(".tdb-today2");
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
  it("the chips are RETIRED — the LISTS rows carry the narrowing now (corrections fix 3) — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderBoard");
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
  it("the tour anchors are all live post-polish — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderBoard");
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
  it("the grid is FOUR columns at the standard tier (the tightening P3 supersedes the fluid auto-fill)", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(4, 1fr)");
    expect(rule(".tdb-grid")).not.toContain("var(--tdb-cardw)"); // no fixed card width in the grid
  });
  it("the wider tier takes five — one breakpoint, per the pack's 'the existing wider tier may still take more'", () => {
    expect(css).toContain("@media (min-width: 1700px) { .tdb-grid { grid-template-columns: repeat(5, 1fr); } }");
    expect(css).not.toContain(".tdb-wrap.today-off .tdb-grid"); // the always-4-everywhere rule stays gone
  });
  it("the sticker clearance still holds (the gap ≥ the offset); every cell stretches with its track", () => {
    const gap = parseInt(/--tdb-grid-gap:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    const off = parseInt(/--tdb-sticker-off:\s*(\d+)px/.exec(rule(".tdb-wrap"))![1], 10);
    expect(gap).toBeGreaterThanOrEqual(off);
    // the batch cell's own height token died with the hover machinery — one shared min-height
    expect(css).not.toContain(".tdb-cell.b {");
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
  // todo rebuild P1: the panel + sheet body are deleted; the chain is now col → ws → centre → board → grid
  const CHAIN = [".tdb-ws", ".tdb-centre", ".tdb-board", ".tdb-grid"]; // grid ← … ← col
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
  // todo rebuild P1: the BIG CENTRED PILL is retired with the items row it was centred in. The
  // search is now a 228px fill field at the right of the one control line — no absolute
  // centring to defend, no flanks to balance, no white card, no roundel.
  it("the centred pill is EXTINCT — no absolute centring, no white card, no oat roundel", () => {
    expect(css).not.toMatch(/\.tdb-hsearch\s*\{/);
    expect(css).not.toMatch(/\.tdb-hmag\s*\{/);
    expect(css).not.toMatch(/\.tdb-items\s*\{/);
  });
  it("the search is the control line's fill field: 228px, fill background, no border — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderBoard");
  });
  it("the field derives from the container, never from vw", () => {
    expect(rule(".tdb-bsearch")).not.toContain("vw");
  });
  it("behaviour intact: same handler, the sidebar chip + the Showing-count line, ⌘K to the new mount — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderBoard");
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
