/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TRIPWIRE FOR THE CHROME BYPASS (corrections fix 3).
 *
 * Phase 2 built the To-do list page's group cards and passed every one of its tests — while the
 * live page showed the OLD era: the "What's on your desk?" hero, the review pill, the retired chip
 * strip, and no page side container at all.
 *
 * TWO CAUSES, COMPOUNDING:
 *
 * 1. **A view-scoped render path.** Phase 2 rewrote `renderLedger()` — the ROWS view — and nothing
 *    else. The default view is `cards`, which Phase 4 then pointed at the board. So the three
 *    group cards were only ever reachable by switching views, and the page's own chrome (header,
 *    control line, side container) was never in Phase 2's scope at all.
 *
 * 2. **Tests that asserted SOURCE PRESENCE, not the rendered page.** Every Phase 2 assertion read
 *    a string inside `renderLedger`, which existed and was correct. A source-string test cannot
 *    see that the function it is reading is unreachable by default, and cannot see what the page
 *    renders ABOVE the branch it lives in.
 *
 * So this file asserts the page's chrome as a WHOLE — the things that are true regardless of which
 * view is showing — and asserts them OUTSIDE any view branch. It is the shape of test that would
 * have failed on the walk's first look.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

/** Everything before the board renders — the page's chrome.
 *  ⚠️ The anchor moved with the view switch (board+dock P1): the page is cards-only now, so the
 *  slice ends at the board's own render call rather than at a branch that no longer exists. */
const chrome = (() => {
  const i = page.indexOf(") : renderBoard()}");
  expect(i, "the board's render call must exist for this slice to mean anything").toBeGreaterThan(-1);
  return page.slice(0, i);
})();

describe("the To-do list page's chrome — present in BOTH views", () => {
  it("the page names itself for its breadcrumb", () => {
    /* ⚠️ The header is CALLED in the chrome and DEFINED below the view switch, so the call and
       the copy are asserted separately. Conflating them is how a test ends up proving a function
       exists while saying nothing about whether the page renders it. */
    expect(chrome).toContain("{renderPageHeader()}");
    const hero = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect(hero).toContain('title="To-do list"');
    expect(hero).toContain("description=");
    /* Scoped to the LIVE header: `renderHero` is the dormant bespoke hero, kept whole behind its
       red gate, and it legitimately still carries the old wording. Asserting over the whole file
       would fail on a thing that is deliberately preserved. */
    expect(hero).not.toContain("What’s on your desk?");
  });

  it("⚠️ THE SIDE CONTAINER IS MOUNTED, and OUTSIDE the view switch", () => {
    // This is the assertion Phase 2 needed and did not have: not "the component exists" but
    // "this page mounts it, before the branch that chooses a view".
    expect(chrome).toContain("<TodoSideContainer");
    expect(chrome).toContain('<div className="tdw">');
  });

  it("the tool row carries the local search and the view toggle, and NOT the retired chip strip — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). The To-do list page is the BOARD now — cards only.
       The Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board (the fold is a column's "+ n more", the snoozed
       band is the Snoozed column, the kind facet is the card's band). The page's chrome is
       locked in todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).toContain("function renderBoard");
  });

  it("the Add is PINK (creation); the session launcher is RETIRED (board fixes II P3)", () => {
    const hero = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect(hero).toContain('className="tdb-addb"');   // pink
    /* ⚠️ SUPERSEDED: "tdb-ghb ▶ Focused session" is gone — the dock's doors (every card, the
       menu's Action now) made a separate launcher a second name for a thing already under your
       pointer. The ENGINE survives whole; only the button went. */
    expect(hero).not.toContain('className="tdb-ghb"');
    expect(hero).not.toContain("Focused session");
  });

  it("the briefing seat still renders above the groups — it is what the pill pointed at", () => {
    expect(chrome).toContain("tdb-brief");
    expect(chrome).toContain("LAST WEEK IN REVIEW");
  });
});

describe("FILTERS is the ONE narrowing surface, and it reaches all four columns (P2)", () => {
  it("the facet is applied to EVERY column, not to one", () => {
    const fn = page.slice(page.indexOf("function renderBoard"), page.indexOf("function renderBoard") + 1400);
    // P5 hoisted the raw columns to the page-level `boardCols`; the narrowing law is unchanged.
    for (const col of ["todo", "today", "snoozed", "done"]) {
      expect(fn, `${col} must be filtered`).toContain(`applyFacet(boardCols.${col}, facet)`);
    }
  });

  it("the sort likewise reaches all four — a per-column sort would be four views of one set", () => {
    const fn = page.slice(page.indexOf("function renderBoard"), page.indexOf("function renderBoard") + 1400);
    expect((fn.match(/sortBoardCards\(/g) ?? []).length).toBe(4);
  });

  it("its counts come from the cards the columns RENDER, never a second tally", () => {
    /* ⚠️ SUPERSEDED FEED (P5): the raw lanes this lock used to pin counted every sweep member
       loose and could not see the flags-built Snoozed — which is exactly how "Everything 27" sat
       beside columns showing fourteen. The feed is now the hoisted columns' own live set. */
    expect(page).toContain("counts={facetCounts(liveBoardCards(boardCols))}");
    expect(page).not.toContain("facetCounts([...board.do");
  });
});
