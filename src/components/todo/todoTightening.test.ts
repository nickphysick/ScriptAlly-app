/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TIGHTENING (tightening pack) — source/rule-text locks. Refs: design-refs/card-grid.html
 * (the hero + the control strip + the card grammar) · design-refs/ledger-grid.html (system A,
 * the fixed column grid; system B is rejected). The root fault being fixed: rows and cards laid
 * themselves out with flex + margin-left:auto, so every item computed its own positions and
 * nothing aligned down the page. The page is auth-gated (jsdom mounts nothing); pixels are
 * Nick's in-browser checklist.
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

describe("tightening P1 — the hero on one line + the recessed control strip", () => {
  it("THE HEADER NAMES THE PAGE and carries its one line (amended, corrections fix 3)", () => {
    // tasks-pages P1: the header block is TasksPageLayout's — title + subtitle ride its props
    const hero = page.slice(page.indexOf("<TasksPageLayout"), page.indexOf("function renderHero"));
    /* The no-subtitle rule was written for a hero that named nothing. The page is titled for its
       crumb now, and a bare title with no line under it leaves the page unexplained.

       ⚠️ AMENDED AGAIN (tasks-consolidation P2, 9 Aug): the page is no longer unexplained by a
       missing subtitle — the MONO EYEBROW sits above the title and the STAT CHIPS sit below the
       tool row, and the chips state exactly what the prose line stated. Two statements of one
       derivation is the fault the counting law exists to prevent, so the header keeps one. */
    expect(hero).toContain('title="To-do list"');
    expect(hero).not.toContain("subtitle={boardSubtitle()}");
    /* ⚠️ THE TOOL ROW IS RETIRED (corrections, Phase 4) — the page passes neither `tools` nor
       `eyebrow`, so the layout renders no row and no hairline. The Add is the control bar's. */
    expect(hero).not.toContain("eyebrow={");
    expect(page).toContain("taskStats(boardCols,");
  });

  it("THE STRIP: chips + search + toggle live inside ONE recessed bar directly beneath the hero — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("SECTION ANATOMY: label · mono count · a hairline rule filling the remaining width — one line", () => {
    const head = page.slice(page.indexOf("export const SectionHead"), page.indexOf("const Lane:"));
    expect(head).toContain("<h2>{label}</h2>");
    expect(head).toContain('<span className="tdb-cn">{count}</span>');
    expect(head).toContain('<span className="tdb-secrule" aria-hidden />'); // INSIDE the line
    const r = rule(".tdb-secrule");
    expect(r).toContain("flex: 1");
    expect(r).toContain("height: 1px");
    // the separate family-stub bar beneath is extinct
    expect(css).not.toContain(".tdb-secrule.do");
    expect(page).not.toContain("`tdb-secrule ${cls}`");
  });
});

describe("tightening P2 — the ledger as a REAL column grid (system A)", () => {
  it("THE TRACKS are one token, shared by every row AND the column header", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--lg-dot: 14px");
    expect(w).toContain("--lg-kind: 132px");
    expect(w).toContain("--lg-status: 150px");
    expect(w).toContain("--lg-act: 132px");
    expect(w).toContain("--lg-row-h: 56px");
    expect(w).toContain("--lg-tracks: var(--lg-dot) minmax(0, 1fr) var(--lg-kind) var(--lg-status) var(--lg-act)");
    expect(rule(".tdb-lrow")).toContain("grid-template-columns: var(--lg-tracks)");
    expect(rule(".tdb-colhead")).toContain("grid-template-columns: var(--lg-tracks)"); // alignment CANNOT drift
  });

  it("THE LAYOUT LAW: no auto margins anywhere in the row styles (grep-assert)", () => {
    // every rule whose selector touches the ledger row family must position by TRACKS, never
    // by pushing off a sibling. (margin-left: auto elsewhere on the page is other furniture.)
    const rowRules = css.split("\n").filter((l) => /^\.tdb-(lrow|ldot|ltask|lbt|lbms|lkind|ktag|kmeta|lstat|lact|lrest|lacts|lprime|lib|colhead|lchev)/.test(l.trim()));
    expect(rowRules.length).toBeGreaterThan(10); // the census found the family
    for (const l of rowRules) expect(l).not.toMatch(/margin-left:\s*auto|margin-inline-start:\s*auto/);
  });

  it("the column header: mono TASK · KIND · STATUS · ACTION, with ACTION right like its lane — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("the cells: family dot · ellipsised Playfair title over the italic line · squared kind chip · TABULAR figures", () => {
    expect(rule(".tdb-ldot.do")).toContain("#d98b74");
    expect(rule(".tdb-ldot.hk")).toContain("#cbb995");
    expect(rule(".tdb-ldot.nt")).toContain("#d9cca8");
    expect(rule(".tdb-lbt")).toContain("text-overflow: ellipsis");
    expect(rule(".tdb-lbms")).toContain("font-style: italic");
    expect(rule(".tdb-ktag")).toContain("border-radius: 5px"); // squared, not a 99px pill
    const stat = rule(".tdb-lstat");
    expect(stat).toContain("font-variant-numeric: tabular-nums");
    expect(stat).toContain("font-family: var(--f12-mono)");
  });

  it("KIND ≠ STATUS: the facet tag and the figures are separate derivations (one classification, the filters')", () => {
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    expect(board).toContain('kind: "OFFER"');
    expect(board).toContain('kind: "AGENT WAITING"');
    expect(board).toContain('kind: "STALE"');
    expect(board).toContain('kind: isTask ? "YOUR TASK" : "NOTE"');
    // the figures: REQUESTED {date} from the query's own audit stamp — absent → "" (never invented)
    expect(board).toContain("const requestedFigures = (q: Query | undefined): string =>");
    expect(board).toContain('if (ms == null) return "";');
    expect(board).toContain("`SILENT ${days} DAYS`"); // the stale figures (ref: SILENT 862 DAYS)
  });

  it("THE RESERVED ACTION LANE: a chevron at rest; hover/focus-within reveal INSIDE the same fixed lane", () => {
    // the reveal is ABSOLUTE within the lane, so it cannot add width or shift a sibling
    const acts = rule(".tdb-lacts");
    expect(acts).toContain("position: absolute");
    expect(acts).toContain("opacity: 0");
    expect(acts).toContain("pointer-events: none");
    expect(css).toContain(".tdb-lrow:hover .tdb-lacts, .tdb-lrow:focus-within .tdb-lacts { opacity: 1; pointer-events: auto; }");
    expect(css).toContain(".tdb-lrow:hover .tdb-lrest, .tdb-lrow:focus-within .tdb-lrest { visibility: hidden; }");
    expect(rule(".tdb-lact")).toContain("position: relative");
    // the lane's contents: ink primary + the ＋/− and clock icon buttons
    expect(rule(".tdb-lprime")).toContain("background: #2a1a13");
    expect(rule(".tdb-lib")).toContain("width: 28px");
  });

  it("rows: 56px fixed, centred, hairline-separated, whole-row hover tint, still clickable to open", () => {
    const row = rule(".tdb-lrow");
    expect(row).toContain("height: var(--lg-row-h)");
    expect(row).toContain("align-items: center");
    expect(row).toContain("border-bottom: 1px solid #f4efe6");
    expect(rule(".tdb-lrow:hover")).toContain("background: #fdfaf5");
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runMemberRow"));
    expect(rr).toContain("onClick={() => openFlowCards([c])}");
  });

  it("batch rows put the PROGRESS in the status lane (bar + count), on the same tracks", () => {
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain('<div className="tdb-lstat">');
    expect(br).toContain('<div className="tdb-minibar"><i style={{ width: `${prog.pct}%` }} /></div>');
    expect(br).toContain("tdb-lstatn");
    expect(rule(".tdb-lstat .tdb-minibar")).toContain("max-width: 76px");
  });
});

describe("tightening P3 — the card, on the same system (the row stood upright)", () => {
  it("BAND: kind tag left, the date/age right in TABULAR mono — the ledger's own figures, upright", () => {
    const card = page.slice(page.indexOf('<div className={`tdb-band ${c.stream}`}>'), page.indexOf('<div className="tdb-body">'));
    expect(card).toContain('<span className="tdb-ktag">{isOffer ? `★ ${c.kind}` : c.kind}</span>');
    expect(card).toContain('<span className="tdb-when">{c.due}</span>'); // the SAME c.due the ledger status lane renders
    const band = rule(".tdb-band");
    expect(band).toContain("grid-template-columns: minmax(0, 1fr) auto"); // two tracks, never an auto margin
    expect(rule(".tdb-when")).toContain("font-variant-numeric: tabular-nums");
  });

  it("BODY + THE FIXED PROGRESS SLOT: present on batch cards, absent on units — the foot never moves either way", () => {
    expect(page).toContain('<div className="tdb-cprog">');
    expect(rule(".tdb-cprog")).toContain("margin-top: 10px");
    // the slot cannot reposition the foot because the foot is PINNED (margin-top:auto), not stacked
    expect(rule(".tdb-cfoot")).toContain("margin-top: auto");
  });

  it("FOOT: the identical action lane, pinned inside the SHARED min-height so feet align across a row", () => {
    expect(rule(".tdb-wrap")).toContain("--card-minh: 150px");
    for (const sel of [".tdb-tile", ".tdb-gcard", ".tdb-ntc"]) {
      expect(rule(sel)).toContain("min-height: var(--card-minh)"); // EVERY card family shares it
    }
    // EQUAL FOOT OFFSETS, by construction: each card is a flex column at the shared min-height and
    // its foot carries margin-top:auto — so in any row, every foot sits at the card's base
    // regardless of title length (a two-line title beside a one-line title changes nothing).
    expect(rule(".tdb-tile")).toContain("flex-direction: column");
    expect(rule(".tdb-gcard")).toContain("flex-direction: column");
    expect(rule(".tdb-ntc")).toContain("flex-direction: column");
    expect(rule(".tdb-ntc-ft")).toContain("margin-top: auto"); // the user cards' foot pins too
    // the lane's contents mirror the ledger: ink primary + icon buttons + the chevron on the 1fr track
    const foot = rule(".tdb-cfoot");
    expect(foot).toContain("grid-template-columns: auto auto auto 1fr");
    expect(rule(".tdb-cfoot .tdb-crest")).toContain("justify-self: end");
    expect(page).toContain('className="tdb-lprime" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
  });

  it("FOUR columns at the standard tier; the wider tier takes five; the sticker treatment is UNTOUCHED", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(4, 1fr)");
    expect(css).toContain("@media (min-width: 1700px) { .tdb-grid { grid-template-columns: repeat(5, 1fr); } }");
    // the sticker tokens stand exactly as the polish pack locked them
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-sticker-bd: #3a1c14");
    expect(w).toContain("--tdb-sticker-bw: 1.5px");
    expect(w).toContain("--tdb-sticker-off: 5px");
    expect(rule(".tdb-tile.do")).toContain("box-shadow: var(--tdb-sticker-off) var(--tdb-sticker-off) 0 var(--tdb-sticker-pink)");
  });

  it("the hover-verb machinery is EXTINCT — no reveal can change a card's size or hide its actions", () => {
    for (const dead of ["tdb-vwrap", "tdb-vinner", "tdb-vstack", "tdb-gdetail", "cardVerbs"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
});

describe("tightening P4 — the sweep + the record", () => {
  it("the flex-era remnants are EXTINCT (grep-locked)", () => {
    for (const dead of ["tdb-ltags", "tdb-lgo", "tdb-ltile", "tdb-lbody", "tdb-tagline", "tdb-lbsub", "tdb-mmeta", "tdb-lshow", "tdb-chipon", "tdb-lddot", "tdb-ldtick", "tdb-vwrap", "tdb-vstack", "tdb-gdetail"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
    // the retired width tokens went with the absolute surface
    for (const tok of ["--tdb-cardw", "--tdb-cardh"]) expect(css).not.toContain(tok);
  });

  it("themes.md records THE COLUMN SYSTEM: the tracks, the reserved lane, the pinned foot, the law", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## The column system");
    expect(themes).toContain("no list or card element positions itself with auto margins");
    expect(themes).toContain("THE LEDGER TRACKS");
    expect(themes).toContain("THE RESERVED ACTION LANE");
    expect(themes).toContain("THE CARD IS THE ROW STOOD UPRIGHT");
    expect(themes).toContain("KIND ≠ STATUS");
  });

  it("every tour anchor still resolves after the rebuild — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
});
