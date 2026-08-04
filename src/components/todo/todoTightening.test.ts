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
  it("NO SUBTITLE NODE: the header renders title + actions only, on one row", () => {
    const hdr = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect(hdr).not.toContain("description=");
    // the shared PageHeader's svh-top is a flex row — with no .svh-sub the title and the two
    // buttons share the line; the buttons take the page-scoped 34px step
    expect(rule(".tdb-wrap .svh-btn")).toContain("height: var(--hero-btn-h, 34px)");
  });

  it("THE STRIP: chips + search + toggle live inside ONE recessed bar directly beneath the hero", () => {
    const ctrl = page.slice(page.indexOf('<div className="tdb-ctrl">'), page.indexOf('<div className="tdb-board">'));
    expect(ctrl).toContain("{renderFilterChips()}");
    expect(ctrl).toContain("tdb-bsearch");
    expect(ctrl).toContain("tdb-vtog");
    const row = rule(".tdb-ctrl");
    expect(row).toContain("background: var(--strip-bg)");
    expect(row).toContain("border: 1px solid var(--strip-bd)");
    expect(row).toContain("padding: 6px 8px");
    expect(rule(".tdb-wrap")).toContain("--strip-bg: #f5f0e8");
    expect(rule(".tdb-wrap")).toContain("--strip-bd: #e4dbcd");
    expect(rule(".tdb-wrap")).toContain("--strip-r: 10px");
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

  it("the column header: mono TASK · KIND · STATUS · ACTION, with ACTION right like its lane", () => {
    const ch = page.slice(page.indexOf("function ledgerColhead"), page.indexOf("function renderLedger"));
    expect(ch).toContain("<span>TASK</span>");
    expect(ch).toContain("<span>KIND</span>");
    expect(ch).toContain("<span>STATUS</span>");
    expect(ch).toContain('<span className="r">ACTION</span>');
    expect(rule(".tdb-colhead")).toContain("font-family: var(--f12-mono)");
    expect(rule(".tdb-colhead .r")).toContain("text-align: right");
    // it mounts at the top of each section's rows
    expect((page.match(/\{ledgerColhead\(\)\}/g) ?? []).length).toBe(3);
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
