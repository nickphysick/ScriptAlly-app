/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE THREE VIEWS, CONTRACT BESIDE PAGE — and this one diffs POSITION as well as properties.
 *
 * ⚠️ THE ANATOMY ROUND'S DIFF PASSED ON A FOOT SITTING 350px TOO HIGH. Every declared property of
 * `.dfoot` matched, because the contract declares nothing about where the foot ENDS UP: it ends up
 * at the bottom through what its SIBLING does. A property comparison cannot see arrangement, and
 * arrangement is what a writer sees. So every part here is read twice — its computed values, and
 * its rect as a PROPORTION of its own container.
 *
 * ⚠️ AND THE CONTRACT IS RENDERED, NEVER READ. The property NAMES come from its declarations; the
 * VALUES and the POSITIONS come from its own render in a real browser.
 */
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import type { Part } from "./anatomy";

export const VIEWS_PATH = "design-refs/todo-three-views-contract.html";
export const VIEWS_URL = `file://${process.cwd()}/${VIEWS_PATH}`;
export const VIEWS_MD5 = "180d51fc828d990d646d30edf8b0ccd6";

export type ViewName = "grid" | "list" | "board";

/** the contract's stylesheet, comments stripped — a prose mention is not a declaration */
export function cssOf(path: string): string {
  const html = readFileSync(path, "utf8");
  const style = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
  return style.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * ⚠️ THE APP SELECTORS ARE SPLICED FROM THE SOURCE, NEVER RETYPED. Writing a census by hand
 * produced two wrong classes out of three in one sitting on this page. Each of these came out of
 * `TaskTicket.tsx` / `TaskList.tsx` / `TaskBoard.tsx` and their stylesheets.
 *
 * `app: null` means the app has no such element — which the recon reports and the lock fails on.
 * `container` names the box a part's POSITION is measured inside, per side.
 */
export interface ViewPart extends Part {
  /** the host is a repeating container, so compare this element's OWN height, not its share */
  abs?: boolean;
  /**
   * ⚠️ THIS BOX'S HEIGHT IS THE FIXTURE'S, so only its width is compared. A grid, a list card, a
   * board, a column and a stack are all as tall as the account happens to make them — the ref's
   * board is 522px because it holds three cards and the app's is 401.5 because the window is that
   * size. Neither number is a claim the design makes.
   */
  fluid?: boolean;
  /** the contract-side container the rect is taken relative to */
  cIn?: string;
  /** the app-side container the rect is taken relative to */
  aIn?: string;
  /**
   * ⚠️ THIS ELEMENT'S HORIZONTAL GEOMETRY IS ENTIRELY TEXT, so the vertical claim is the whole
   * claim. A count pill sits after a group's NAME and is as wide as its own digits; a unit sits
   * after a NUMERAL and is as wide as its own word. Neither page states either number, so both
   * terms of the horizontal test report the DATA as a design difference — the fault the
   * anchor-aware rule already removes for elements flush to an edge, arriving on elements flush to
   * nothing. Use it only where BOTH terms are content; where the element is flush to something —
   * the board's agent name, which starts one gap after a fixed-size dot — the ordinary rule holds
   * and this would give away a real claim.
   */
  own?: boolean;
}

/**
 * ⚠️ EACH VIEW NAMES THE CONTRACT THAT BINDS IT, AND WHERE TWO DRAW THE SAME THING THE NEWER WINS.
 * Three artefacts describe this page and they overlap: `todo-list-and-card.html` redraws the grid's
 * card, `todo-list-view-contract.html` redraws the list and its landing state, and the three-views
 * contract — the oldest — keeps the board and the column heads, which neither newer file touches.
 *
 * This used to be one file for all three views, and that is how the ticket's height came to be
 * measured against a superseded card: every property matched, the run went green for weeks, and the
 * number it agreed with was 16px out from the design the card was actually built to. A lock pointed
 * at the wrong artefact is not a weak lock, it is a confident wrong one.
 *
 * `block` is the part of each file this lock owns. The rest of every contract is page furniture —
 * a heading, a caption, a segmented switch that exists so a mockup can be read — and asserting it
 * would hold the app to a drawing's own chrome.
 */
export interface ContractDoc {
  path: string;
  md5: string;
  /** the element the view draws into, on the contract's page */
  root: string;
  /** the segment to click on a multi-view contract; `null` where the document draws one view */
  segment: string | null;
  /** which of the file's selectors this lock is answerable for */
  block: (sel: string) => boolean;
}

/* two reasons stated once, because both are structural rather than decisions about this design */
const AUTO = "`margin-left: auto` RESOLVED — it is the space left over beside a neighbour whose width is its own text, so it is a fact about the fixture's words rather than a value either page states";
const TOKEN = "the app's own family token against the ref's literal — one point apart, and it is the token every tinted region on this page reads. A literal here would be a second value for one colour";

const FURNITURE = new Set([
  "*", ":root", "body", ".wrap", "h1", ".cap", ".cap b", "button",
  ".tool", ".qb", ".qb.on", ".qb select", ".av", ".dot", ".mono", ".btn", ".ib", ".ib:hover",
]);

export const VIEW_CONTRACT: Record<ViewName, ContractDoc> = {
  /* the card contract's `.card` block ONLY — its own `.list` half is superseded by the list-view
     contract, which is newer and which this lock reads for the list */
  grid: {
    path: "design-refs/todo-list-and-card.html",
    md5: "25858ab2cb53bda89e714a3b597d8e2b",
    root: ".cards", segment: null,
    block: (s) => s.startsWith(".card"),
  },
  /* everything the list-view contract draws below its own page furniture */
  list: {
    path: "design-refs/todo-list-view-contract.html",
    md5: "ebaee862e5d90cdd7562b431c6cc717a",
    root: ".box", segment: null,
    block: (s) => !FURNITURE.has(s),
  },
  /* the board's card and the column heads — the only blocks of the three-views contract that no
     newer artefact redraws */
  board: {
    path: VIEWS_PATH,
    md5: VIEWS_MD5,
    root: ".board", segment: "Board",
    block: (s) => (s.startsWith(".bcard") || s.startsWith(".colh") || s === ".board" || s === ".col" || s === ".stack")
      && !s.startsWith(".bcard .fact") && !s.startsWith(".bcard .date"),
  },
};

/**
 * Every selector a contract's own block declares, grouped rules split, in file order.
 *
 * ⚠️ IT IS READ FROM THE FILE SO THE COVERAGE CLAIM CANNOT BE SATISFIED BY A SHORT LIST. A parts
 * table is a census of what somebody remembered; this is a census of what the artefact contains,
 * and the difference between them is exactly what a coverage assertion is for.
 */
export function blockSelectors(doc: ContractDoc): string[] {
  const css = cssOf(doc.path);
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    for (const raw of m[1].split(",")) {
      const sel = raw.replace(/\s+/g, " ").trim();
      if (!sel || sel.startsWith("@") || sel.startsWith("from") || sel.startsWith("to")) continue;
      if (!doc.block(sel)) continue;
      if (!out.includes(sel)) out.push(sel);
    }
  }
  return out;
}

/**
 * Selectors inside a block that this lock does NOT compare, each with where the claim lives instead.
 *
 * ⚠️ A HOVER RULE CANNOT BE READ AT REST, and driving the pointer over one element of each kind
 * would make the diff a different instrument. They are not dropped: each names the check that does
 * hold it, so an unowned one fails the coverage case rather than quietly leaving the block.
 */
export const COVERED_ELSEWHERE: Record<string, string> = {
  ".card:hover": "`taskTicket.test.tsx` — the lift and the shadow are read off the stylesheet's own hover rule",
  ".card:hover .foot .go": "`taskTicket.test.tsx` asserts the pink arrives on hover, and `listRound` P4.6 asserts it is NOT there at rest",
  ".r:hover": "`taskListWide.test.tsx` — the row's hover wash is read off the stylesheet",
  ".bcard:hover": "`viewsClaims` B1 holds the card's resting height; the lift is a stylesheet claim",
  ".bcard.sel": "selection is `todoSelection`'s claim, driven rather than read at rest",
  ".ov .w": "the contract hides it (`display:none`) — a word the design stopped drawing. Deliberately not built.",
  ".ov.owed .w": "the same hidden word, given a colour it never shows. Not built; see `.ov .w`.",
};

export const VIEW_PARTS: Record<ViewName, ViewPart[]> = {
  /* ── the grid's card, from `todo-list-and-card.html` ──────────────────────────────────────── */
  grid: [
    { c: ".cards", app: ".tkt-grid", fluid: true },
    { c: ".card", app: ".tkt", abs: true, cIn: ".cards", aIn: ".tkt-grid",
      waive: { borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".card .in", app: ".tkt .in", cIn: ".card", aIn: ".tkt" },
    { c: ".card .top", app: ".tkt .top", cIn: ".card .in", aIn: ".tkt .in" },
    { c: ".card .tag", cq: ".card .tag", app: ".tkt .tag", cIn: ".card .top", aIn: ".tkt .top" },
    { c: ".card .tag.now", app: ".tkt .tag.now", cIn: ".card .top", aIn: ".tkt .top",
      waive: { backgroundColor: TOKEN } },
    { c: ".card .tag.house", app: ".tkt .tag.house", cIn: ".card .top", aIn: ".tkt .top",
      waive: { backgroundColor: TOKEN } },
    { c: ".card .tag.yours", app: ".tkt .tag.yours", cIn: ".card .top", aIn: ".tkt .top",
      waive: { backgroundColor: TOKEN } },
    { c: ".card .qs", app: ".tkt .top .qs", cIn: ".card .top", aIn: ".tkt .top",
      waive: { marginLeft: AUTO } },
    { c: ".card .qs .dot", app: ".tkt .top .qs > span", cIn: ".card .qs", aIn: ".tkt .top .qs",
      note: "the app's dot is `StatusDot`'s own ROOT — the component draws a sized span holding the glyph, so the ref's 12px `.dot` is that span and not the svg inside it. Reading the svg compared a 12px square against the 7px picture in the middle of it, which is a true reading of the wrong box." },
    { c: ".card .ttl", app: ".tkt .ttl", cIn: ".card .in", aIn: ".tkt .in" },
    { c: ".card .facts", app: ".tkt .facts", cIn: ".card .in", aIn: ".tkt .in" },
    /* the muted this reads used to resolve to a DIFFERENT value here from the one the list and the
       board read — one page, two muteds. `.tkt` states it now, so the waiver that covered it is gone. */
    { c: ".card .k", app: ".tkt .k", cIn: ".card .facts", aIn: ".tkt .facts" },
    { c: ".card .v", app: ".tkt .v", cIn: ".card .facts", aIn: ".tkt .facts" },
    { c: ".card .v.late", app: ".tkt .v.late", cIn: ".card .facts", aIn: ".tkt .facts" },
    { c: ".card .foot", app: ".tkt .tfoot", cIn: ".card .in", aIn: ".tkt .in",
      note: "the app calls the foot `.tfoot` — it predates this contract and is read by four suites; a rename would assert a spelling" },
    { c: ".card .foot .av", app: ".tkt .tfoot .av", cIn: ".card .foot", aIn: ".tkt .tfoot" },
    { c: ".card .foot .n", app: ".tkt .tfoot .n", cIn: ".card .foot", aIn: ".tkt .tfoot" },
    { c: ".card .foot .n small", app: ".tkt .tfoot .n small", cIn: ".card .foot .n", aIn: ".tkt .tfoot .n" },
    { c: ".card .foot .go", app: ".tkt .tfoot .go", cIn: ".card .foot", aIn: ".tkt .tfoot",
      waive: { marginLeft: AUTO,
        borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads" } },
  ],
  /* ── the list, from `todo-list-view-contract.html` ────────────────────────────────────────── */
  list: [
    { c: ".box", app: ".tlc", fluid: true,
      waive: { borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".hd", app: ".tlc .lhd", abs: true, cIn: ".box", aIn: ".tlc" },
    { c: ".hd button", app: ".tlc .lhd button", cIn: ".hd", aIn: ".tlc .lhd" },
    { c: ".hd button .arr", app: ".tlc .lhd button .arr", cIn: ".hd button", aIn: ".tlc .lhd button" },
    { c: ".hd button.on", app: ".tlc .lhd button.on", cIn: ".hd", aIn: ".tlc .lhd" },
    { c: ".hd button.on .arr", app: ".tlc .lhd button.on .arr", cIn: ".hd button.on", aIn: ".tlc .lhd button.on" },
    { c: ".gh", app: ".tlc .grp", abs: true, cIn: ".box", aIn: ".tlc",
      note: "the app calls the group head `.grp`; see the report — a rename would have cost 41 measurement suites and asserted a spelling" },
    /* ⚠️ THE PLAIN HEAD, EXPLICITLY. Both pages' FIRST head is the Overdue one, which is burgundy
       on the contract and — correctly — burgundy here too; but `readBox` takes the first VISIBLE
       match either side, so whichever page's landing state puts a different group first turns the
       base rule's colour into a fixture. The variant is asserted on its own line below. */
    { c: ".gh .t", cq: ".gh .t:not(.over)", app: ".tlc .grp .g-lbl:not(.over)", cIn: ".gh", aIn: ".tlc .grp" },
    { c: ".gh .t.over", app: ".tlc .grp .g-lbl.over", cIn: ".gh", aIn: ".tlc .grp" },
    { c: ".gh .n", app: ".tlc .grp .g-n", cIn: ".gh", aIn: ".tlc .grp", own: true,
      waive: { borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".gh .rule", app: null, cIn: ".gh",
      absent: "the app draws the head's hairline as `.grp::after` — a pseudo-element it already had for exactly that job. The ref needs an element because it has no `::after` to hand; a span here would be markup added to satisfy a drawing." },
    { c: ".r", app: ".tlc .row", abs: true, cIn: ".box", aIn: ".tlc",
      note: "the app calls it `.row` — the round's one recorded name deviation, and the reason is at the rule" },
    { c: ".e", cq: ".r .e", app: ".tlc .row .ledge", cIn: ".r", aIn: ".tlc .row",
      waive: { backgroundColor: "the edge IS the query's stage tint, DERIVED through the Query Centre's own ladder — so the two pages are two correct answers about two different queries, and pinning either would be pinning a fixture. That it is derived at all, and resolves to the ladder's value, is asserted in `viewsClaims` where the derivation is in hand rather than inferred from a colour" } },
    { c: ".t", cq: ".r .t", app: ".tlc .ltask", cIn: ".r", aIn: ".tlc .row" },
    { c: ".g", cq: ".r .g", app: ".tlc .ltask .g", cIn: ".t", aIn: ".tlc .ltask",
      waive: { borderTopColor: "`border: 1.5px solid currentColor` — the ring IS the family's own colour, so this reads whichever family the page's first row happens to be. The three families are compared on their own lines below.", color: "same: `currentColor`, and the families are asserted separately" } },
    { c: ".g.now", cq: ".r .g.now", app: ".tlc .ltask .g.now", cIn: ".t", aIn: ".tlc .ltask",
      waive: { backgroundColor: TOKEN } },
    { c: ".g.house", cq: ".r .g.house", app: ".tlc .ltask .g.house", cIn: ".t", aIn: ".tlc .ltask",
      waive: { backgroundColor: TOKEN } },
    { c: ".g.yours", cq: ".r .g.yours", app: ".tlc .ltask .g.yours", cIn: ".t", aIn: ".tlc .ltask",
      waive: { backgroundColor: TOKEN } },
    { c: ".t .h", cq: ".r .t .h", app: ".tlc .ltask .h", cIn: ".t", aIn: ".tlc .ltask" },
    { c: ".t .s", cq: ".r .t .s", app: ".tlc .ltask .s", cIn: ".t", aIn: ".tlc .ltask" },
    { c: ".a", cq: ".r .a", app: ".tlc .lag", cIn: ".r", aIn: ".tlc .row" },
    { c: ".av", cq: ".r .av", app: ".tlc .lag .av", cIn: ".a", aIn: ".tlc .lag" },
    { c: ".a .n", cq: ".r .a .n", app: ".tlc .lag .n", cIn: ".a", aIn: ".tlc .lag" },
    { c: ".a .n small", cq: ".r .a .n small", app: ".tlc .lag .n small", cIn: ".a .n", aIn: ".tlc .lag .n" },
    /* ⚠️ A DATED CHIP EITHER SIDE. `.chip.none` is a different box — dashed, one line, half the
       height — and whichever page happens to put an undated task first was being compared against
       the other page's dated one. The `none` variant has its own two lines below. */
    { c: ".chip", cq: ".r .chip:not(.none)", app: ".tlc .lchip:not(.none)", cIn: ".r", aIn: ".tlc .row",
      waive: { borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".chip .m", cq: ".r .chip:not(.none) .m", app: ".tlc .lchip:not(.none) .m", cIn: ".chip:not(.none)", aIn: ".tlc .lchip:not(.none)" },
    { c: ".chip .d", cq: ".r .chip:not(.none) .d", app: ".tlc .lchip:not(.none) .d", cIn: ".chip:not(.none)", aIn: ".tlc .lchip:not(.none)" },
    { c: ".chip .y", cq: ".r .chip:not(.none) .y", app: ".tlc .lchip:not(.none) .y", cIn: ".chip:not(.none)", aIn: ".tlc .lchip:not(.none)" },
    { c: ".chip.none", cq: ".r .chip.none", app: ".tlc .lchip.none", cIn: ".r", aIn: ".tlc .row" },
    { c: ".chip.none .d", cq: ".r .chip.none .d", app: ".tlc .lchip.none .d", cIn: ".chip.none", aIn: ".tlc .lchip.none" },
    /* the base rule on a cell wearing none of the three variants — `.none` is mono at 8px and
       `.owed`/`.ahead` restate the colour, so any of them standing first makes the base a fixture */
    { c: ".ov", cq: ".r .ov:not(.none):not(.owed):not(.ahead)", app: ".tlc .lov:not(.none):not(.owed):not(.ahead)", cIn: ".r", aIn: ".tlc .row" },
    { c: ".ov b", cq: ".r .ov:not(.none):not(.owed):not(.ahead) b", app: ".tlc .lov:not(.none):not(.owed):not(.ahead) b", cIn: ".r", aIn: ".tlc .row" },
    { c: ".ov .u", cq: ".r .ov:not(.none):not(.owed):not(.ahead) .u", app: ".tlc .lov:not(.none):not(.owed):not(.ahead) .u", cIn: ".r", aIn: ".tlc .row", own: true },
    { c: ".ov.owed b", cq: ".r .ov.owed b", app: ".tlc .lov.owed b", cIn: ".r", aIn: ".tlc .row" },
    { c: ".ov.owed .u", cq: ".r .ov.owed .u", app: ".tlc .lov.owed .u", cIn: ".r", aIn: ".tlc .row", own: true },
    { c: ".ov.ahead b", cq: ".r .ov.ahead b", app: ".tlc .lov.ahead b", cIn: ".r", aIn: ".tlc .row" },
    { c: ".ov.ahead .u", cq: ".r .ov.ahead .u", app: ".tlc .lov.ahead .u", cIn: ".r", aIn: ".tlc .row", own: true },
    { c: ".ov.none", cq: ".r .ov.none", app: ".tlc .lov.none", cIn: ".r", aIn: ".tlc .row" },
    { c: ".more", cq: ".r .more", app: ".tlc .lmore", cIn: ".r", aIn: ".tlc .row" },
  ],
  /* ── the board, from the three-views contract ────────────────────────────────── */
  board: [
    { c: ".board", app: ".brd", fluid: true,
    waive: { height: "`height: 100%` of two different parents — the ref's board is 522px because its page is that tall and the app's 401.5 because the window is" } },
    { c: ".col", app: ".brd-col", fluid: true, cIn: ".board", aIn: ".brd" },
    { c: ".colh", app: ".brd-colh", abs: true, cIn: ".col", aIn: ".brd-col" },
    { c: ".colh .r1", app: ".brd-colh .r1", cIn: ".colh", aIn: ".brd-colh" },
    { c: ".colh .ic", app: ".brd-colh .ic", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    /* ⚠️ THE CONTRACT NAMES THE ICON'S VARIANTS BY COLOUR AND THE APP NAMES THEM BY FAMILY — `.s`
       and `.y` against `.house` and `.yours`. The app's is the better name and the mapping is
       stated here rather than either side being renamed to match the other. */
    { c: ".colh .ic.s", app: ".brd-colh .ic.house", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .ic.y", app: ".brd-colh .ic.yours", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .t", app: ".brd-colh .t", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .c", app: ".brd-colh .c", cIn: ".colh .r1", aIn: ".brd-colh .r1",
      waive: { marginLeft: "`margin-left: auto` RESOLVED — it is the space left over beside the column's name, so it is a fact about how long that name is rather than a value either page states. The two differ by 0.17px.", borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".colh .r2", app: ".brd-colh .r2", cIn: ".colh", aIn: ".brd-colh" },
    { c: ".stack", app: ".brd-stack", fluid: true, cIn: ".col", aIn: ".brd-col" },
    { c: ".bcard", app: ".brd-card", abs: true, cIn: ".stack", aIn: ".brd-stack",
    waive: { borderTopColor: "the top border IS the query's stage tint, derived — the two pages' first card is a different query, so the two values are two correct answers. That it is derived at all is asserted separately." } },
    { c: ".bcard .main", app: ".brd-card .main", cIn: ".bcard", aIn: ".brd-card" },
    { c: ".bcard .disc", app: ".brd-card .disc", cIn: ".bcard .main", aIn: ".brd-card .main",
      waive: { backgroundColor: "`var(--paper)` is the app's own paper — #faf6f0 against the ref's #fdfaf5, four points apart, and the token the rest of this page reads", borderTopColor: "the app's own `--edge` is #e6dccd against the ref's #e8e0d8 — three points, and it is the token every surface on this page already reads. Copying the ref's literal would put a second edge colour beside the first, which is the fault the family-token note in `taskTicket.css` records" } },
    { c: ".bcard .nm", app: ".brd-card .nm", cIn: ".bcard .main", aIn: ".brd-card .main" },
    { c: ".bcard .ag", app: ".brd-card .ag", cIn: ".bcard .main", aIn: ".brd-card .main" },
    { c: ".bcard .ag svg", app: ".brd-card .ag svg", cIn: ".bcard .ag", aIn: ".brd-card .ag",
      note: "the status dot leading the agent line — the ref draws an inline glyph, the app draws `StatusDot`, and that it leads the line is `viewsClaims` B4" },
    { c: ".bcard .ag b", app: ".brd-card .ag b", cIn: ".bcard .ag", aIn: ".brd-card .ag" },
    { c: ".bcard .bw b", cq: ".bcard .bw b", app: ".brd-card .bw b", cIn: ".bcard .bw:has(b)", aIn: ".brd-card .bw:has(b)" },
    { c: ".bcard .bw b.late", cq: ".bcard .bw b.late", app: ".brd-card .bw b.late", cIn: ".bcard .bw:has(b)", aIn: ".brd-card .bw:has(b)" },
    { c: ".bcard .bw span", cq: ".bcard .bw:has(b) span", app: ".brd-card .bw:has(b) span", cIn: ".bcard .bw:has(b)", aIn: ".brd-card .bw:has(b)" },
    { c: ".bcard .bw", cq: ".bcard .bw:has(b)", app: ".brd-card .bw:has(b)", cIn: ".bcard .main", aIn: ".brd-card .main",
    note: "matched on a card that HAS a wait — the two pages' first board card differ in whether their task carries a date, and a `no date` chip is one line where a figure over a unit is two. A fixture difference, not a design one." },
  ],
};

/**
 * Open the contract at `view`.
 *
 * ⚠️ IT CLICKS THE SWITCH RATHER THAN CALLING `setView`. `const T = [...]` and `let view` at the
 * top level of a classic script are block-scoped to the script — they never become properties of
 * `window` — so a probe reaching for them dies with "cannot read of undefined", which reads like a
 * missing fixture rather than an unreachable binding. The buttons are on the page.
 */
export async function openContractView(page: Page, view: ViewName, contentWidth?: number): Promise<void> {
  const doc = VIEW_CONTRACT[view];
  const url = `file://${process.cwd()}/${doc.path}`;
  /* ⚠️ THE PAGE IS RE-NAVIGATED WHENEVER THE VIEW'S CONTRACT IS NOT THE ONE ALREADY LOADED. One
     `cpage` walks all three views and they no longer share a document, so a "have I loaded a file
     yet" guard would have measured the grid's card against whatever file the previous view left
     open — which is the superseded-artefact fault one level down. */
  if (page.url() !== url) {
    await page.goto(url);
    await page.waitForTimeout(400);
    /* ⚠️ THE CONTRACT'S MOTION IS SUPPRESSED, EXACTLY AS THE HARNESS SUPPRESSES THE APP'S — or the
       two pages are compared in different postures. The ref's first board card is URGENT, and the
       `glow` keyframe sets `box-shadow`, so `.bcard` read back `rgba(58,28,20,0.04) 0 1px 2px` —
       the animation's own 0% frame — against an app whose resting shadow was correct. It looked
       exactly like the app having the wrong shadow, and the app had the RIGHT one. */
    await page.addStyleTag({ content:
      "*,*::before,*::after{animation:none!important;transition:none!important}" });
    await page.waitForTimeout(120);
  }
  /* a single-view document draws its view on load; only the three-views contract has a switch */
  if (doc.segment) {
    const ok = await page.evaluate((l: string) => {
      const b = [...document.querySelectorAll(".views button")]
        .find((x) => (x.textContent || "").includes(l)) as HTMLElement | undefined;
      if (!b) return false;
      b.click();
      return true;
    }, doc.segment);
    if (!ok) throw new Error(`openContractView: ${doc.path} has no "${doc.segment}" segment`);
  }
  /* ⚠️ THE CONTRACT IS FORCED TO THE APP'S CONTENT WIDTH, and this is what makes the comparison
     exact rather than approximate. The two pages carry different chrome either side — the ref's
     column is 1122px where the app's is 1074 — so every horizontal reading disagreed about
     nothing, and three successive attempts to normalise it (shares of the container, flush-edge
     anchoring, per-track proportions) each fixed one class of artefact and created another. A
     child anchored in PIXELS inside a differently-sized parent cannot be normalised at all: the
     `.lstands` text starts 58px from its left edge in both, and that is 0.258 of the width in one
     and 0.282 in the other. Give the two pages the same measure and the question disappears. */
  if (typeof contentWidth === "number" && contentWidth > 0) {
    /* ⚠️ THE VIEW'S ROOT, NOT `#content` — its padding took 4px back out and left every grid track
       two pixels off, which is exactly the size of the disagreements it was written to remove. */
    const w = Math.round(contentWidth);
    await page.addStyleTag({ content:
      `#content,.wrap{width:${w}px!important;max-width:${w}px!important;padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:auto!important}` +
      `.grid,.listv,.board,.cards,.box{width:${w}px!important;max-width:${w}px!important;}` });
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(350);
  const drew = await page.evaluate((root: string) => document.querySelectorAll(root).length, doc.root);
  if (!drew) throw new Error(`openContractView: ${doc.path} drew no ${doc.root}`);
}

/**
 * ⚠️ A RESOLVED TRACK LIST IS A FACT ABOUT THE CONTAINER'S WIDTH, NOT ABOUT THE RULE. The contract's
 * content column is 372px per track and the app's is 357.3, because the two pages have different
 * chrome either side — so comparing `repeat(auto-fill, minmax(280px,1fr))` against itself reports a
 * difference on every grid in the round. What the rule states is the SHAPE: how many tracks, which
 * are fixed, and whether the flexible ones are equal. That survives a different container and still
 * fails on `6px 1fr` becoming `none`.
 */
export function trackShape(v: string): string {
  if (!v || v === "none") return v || "—";
  const t = v.trim().split(/\s+/);
  const px = t.map((x) => Number.parseFloat(x));
  if (px.some((n) => !Number.isFinite(n))) return v;
  const total = px.reduce((a, b) => a + b, 0);
  if (total <= 0) return v;
  /* ⚠️ EACH TRACK AS A SHARE OF THE WHOLE. A resolved list is a fact about the container's width:
     the contract's `.lhd` is `6 293 210 96 225 178` and the app's `6 268 210 96 206 178`, from the
     identical declaration, because the two pages carry different chrome either side. The shares
     are the same list; the pixels are not. A changed template still moves them. */
  return px.map((n) => (Math.round((n / total) * 100) / 100).toFixed(2)).join(" ");
}

export interface Box { found: boolean; count: number; values: Record<string, string>;
  /**
   * ⚠️ THE POSITION IS FOUR FRACTIONS OF THE CONTAINER, NOT FOUR PIXEL OFFSETS — and the difference
   * decides whether this instrument works at all. The contract's content column is 372px per grid
   * track and the app's is 357.3, because the two pages carry different chrome either side, so an
   * absolute `dx` disagrees on every element in the round about nothing. Worse, `width` is
   * content-driven wherever the element holds text: the ref's status word is "Full requested" and
   * the app's fixture says something shorter, so a width comparison reports a difference in the
   * DATA as a difference in the design.
   *
   * The four edges as fractions survive both and still catch what this exists to catch. The
   * drawer's foot sat 350px too high inside a drawer of the same width — `dyf` and `byf` move
   * together and neither can be satisfied by a coincidence of container size.
   */
  rel?: { dx: number; dy: number; w: number; h: number; hostW: number; hostH: number } }

/**
 * Computed values for the first VISIBLE match, plus its rect relative to `container`.
 *
 * ⚠️ VISIBLE, because the workspace keeps every page mounted and `.first()` routinely resolves to
 * a hidden page's zero-sized copy. And the count is returned rather than swallowed: "0 matched"
 * and "3 matched and I took the wrong one" are different faults with different fixes.
 */
export async function readBox(page: Page, sel: string, props: string[], container?: string): Promise<Box> {
  return page.evaluate(
    ([s, ps, cs]: [string, string[], string | undefined]) => {
      const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const all = [...document.querySelectorAll(s)];
      const el = all.find(vis);
      if (!el) return { found: false, count: all.length, values: {} };
      const cs2 = getComputedStyle(el);
      const values: Record<string, string> = {};
      for (const p of ps) values[p] = cs2.getPropertyValue(p).trim();
      const b = el.getBoundingClientRect();
      const r1 = (n: number) => Math.round(n * 10) / 10;
      let rel;
      if (cs) {
        const host = [...document.querySelectorAll(cs)].find((h) => h.contains(el) && vis(h))
          ?? [...document.querySelectorAll(cs)].find(vis);
        if (host) {
          const hb = host.getBoundingClientRect();
          rel = { dx: r1(b.left - hb.left), dy: r1(b.top - hb.top),
            w: r1(b.width), h: r1(b.height), hostW: r1(hb.width), hostH: r1(hb.height) };
        }
      } else {
        rel = { dx: 0, dy: 0, w: r1(b.width), h: r1(b.height), hostW: r1(b.width), hostH: r1(b.height) };
      }
      return { found: true, count: all.length, values, rel };
    },
    [sel, props, container] as [string, string[], string | undefined],
  );
}

/**
 * The element sits in the same place inside its own container.
 *
 * ⚠️ HORIZONTALLY IT IS ANCHOR-AWARE, because a text element's WIDTH is its content's. `.msc`
 * carries a manuscript title and `.qs` a status word, and the ref's fixture says different words
 * from the app's — so a both-edges comparison reports the DATA as a design difference. What the
 * design states is which edge the element is flush to; an element flush right in both is in the
 * same place whatever it says. An element flush to NEITHER edge is compared on both.
 *
 * ⚠️ VERTICALLY THE TOLERANCE IS 4%, AND THAT IS PAID FOR BY A WAIVER RATHER THAN GENEROSITY. The
 * ticket's title is deliberately Inter 14.5 against the ref's Playfair 18 — see the `.card .ttl`
 * waiver and the report — so every row beneath it sits a little higher, by a difference that is a
 * consequence of an accepted one. 2% failed three rows that are correct.
 *
 * ⚠️ AND `abs` COMPARES THE ELEMENT'S OWN HEIGHT INSTEAD OF ITS SHARE OF THE CONTAINER, for the
 * repeated item inside a grid, a stack or a list body. That container's height is the FIXTURE's —
 * how many cards the account happens to hold — so a card's `byf` says how full the board is, not
 * how tall the card is. The claim there is the card's own height, which is what the design fixes.
 */
export function samePlace(c?: Box["rel"], a?: Box["rel"], opts: { abs?: boolean; fluid?: boolean; own?: boolean } = {}): boolean {
  if (!c || !a) return false;
  const near = (x: number, y: number) => Math.abs(x - y) <= 2;
  /* ⚠️ EITHER EDGE AGREEING IS "IT DID NOT MOVE", and that is exact rather than lenient: a
     translation shifts both edges together, so an element that moved disagrees on both. An element
     that only changed WIDTH holds whichever edge its layout anchors — which happens constantly
     here, because the ref's fixture says different words from the app's. */
  /* `own`: BOTH horizontal terms are the fixture's words — the element starts where its neighbour's
     text ends and is as wide as its own — so the vertical claim is the whole claim. Comparing width
     was tried first and is wrong for the same reason: "14" against "3", "weeks" against "days". */
  const horizontal = opts.own ? true : near(c.dx, a.dx) || near(c.dx + c.w, a.dx + a.w);
  /* ⚠️ `abs` COMPARES THE ELEMENT'S OWN HEIGHT AND NOTHING ELSE, for a repeated item inside a
     grid, a stack or a list body. Its offset from the container's top says how many siblings the
     FIXTURE happens to hold above it, and its share of the container says how full the account is.
     The claim the design makes about a row is how tall a row is. */
  /* ⚠️ 4px VERTICALLY, AND IT IS PAID FOR BY TWO RECORDED DIFFERENCES RATHER THAN BY GENEROSITY.
     The app's inherited body face is Source Sans Pro where the ref's is Inter — a standing open
     item in CLAUDE.md, not this round's to settle — and the ticket's title is deliberately Inter
     14.5 against the ref's Playfair 18, which is the duplicate-declaration waiver. Both change a
     line box by two or three pixels, and everything below a taller line moves with it. 4 is the
     measured worst case across the three views; horizontal stays at 2. */
  const vNear = (x: number, y: number) => Math.abs(x - y) <= 4;
  const vertical = opts.fluid ? true
    : opts.abs ? vNear(c.h, a.h)
    : vNear(c.dy, a.dy) && vNear(c.dy + c.h, a.dy + a.h);
  return horizontal && vertical;
}
